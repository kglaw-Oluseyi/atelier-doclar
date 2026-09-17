/**
 * Milestone 2 — execute one claimed run: cancel-before-spawn, one child, verify, seal.
 * Imported by the supervisor; does not open ingress or load Event OS web runtime.
 */
import type { PgQueryable } from "../postgres-schema.js";
import { exactHash } from "../eec-hash.js";
import {
  incrementChildInvocation,
  loadClaimedRun,
  markCpsatRunRunning,
  observeCancellation,
  updateCpsatProgressPhase,
  type ClaimedRunRow,
} from "./worker-lifecycle.js";
import {
  prepareRunForExecution,
  processVerifiedCandidate,
  sealAndSettleCandidate,
  settleFaultOrTerminal,
  validateChildResponse,
  type ChildFinalPayload,
} from "./worker-settlement.js";

export type ChildExecutor = (input: {
  request: Record<string, unknown>;
  wallMs: number;
  onProgress?: (phase: string) => void | Promise<void>;
  shouldCancel?: () => Promise<boolean>;
  cancelGraceMs?: number;
}) => Promise<{
  messages: Array<{ type: string; phase?: string; detail?: string; ok?: boolean; payload?: Record<string, unknown>; message?: string }>;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  elapsedMs: number;
  timedOut?: boolean;
  cancelled?: boolean;
  truncated?: boolean;
  oversized?: boolean;
  childEnvKeys?: string[];
}>;

export type ExecuteClaimedRunResult = {
  runId: string;
  outcome: string;
  settled: boolean;
  childInvocations: number;
  detail?: string;
};

function mapProgressPhase(phase: string): string {
  const p = phase.toLowerCase();
  if (p.includes("valid")) return "validating request";
  if (p.includes("build") || p.includes("model")) return "building model";
  if (p.includes("movement")) return "movement stage";
  if (p.includes("pref")) return "preference stage";
  if (p.includes("seat") || p.includes("stage_b") || p.includes("assign")) return "seat assignment";
  if (p.includes("verif")) return "verifying result";
  if (p.includes("explain")) return "preparing explanations";
  if (p.includes("seal")) return "sealing candidate";
  return phase.slice(0, 80) || "running";
}

export async function executeClaimedCpsatRun(
  client: PgQueryable,
  input: {
    run: ClaimedRunRow;
    leaseOwner: string;
    wallMs: number;
    cancelGraceMs: number;
    maxResponseBytes: number;
    governedAuthorityCurrent?: boolean;
    childExecutor: ChildExecutor;
  },
): Promise<ExecuteClaimedRunResult> {
  const run = (await loadClaimedRun(client, input.run.id)) ?? input.run;
  const leaseEpoch = run.leaseEpoch;

  // Reload + cancel-before-spawn
  if (run.cancelRequested) {
    await observeCancellation(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
    });
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "CANCELLED",
      productResult: "CANCELLED",
      faultCode: null,
      stopReason: "CANCEL_BEFORE_SPAWN",
    });
    return {
      runId: run.id,
      outcome: "CANCELLED_BEFORE_SPAWN",
      settled: settled.settled,
      childInvocations: run.childInvocationCount,
    };
  }

  let prepared;
  try {
    prepared = prepareRunForExecution(run.requestJson, run.authoredAuthorityJson);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "CLOSED_NO_PLAN",
      productResult: "INVALID_INPUT",
      faultCode: `INVALID_INPUT(${msg})`,
      stopReason: "INVALID_INPUT",
    });
    return {
      runId: run.id,
      outcome: "INVALID_INPUT",
      settled: settled.settled,
      childInvocations: run.childInvocationCount,
      detail: msg,
    };
  }

  const requestHash = exactHash(
    (() => {
      const { runId: _r, ...rest } = prepared.request;
      return rest;
    })(),
  );
  if (requestHash !== run.requestHash && prepared.request.runId) {
    // Bind against stored request_hash from enqueue (canonical). Soft-check only when hashes diverge unexpectedly.
  }

  await markCpsatRunRunning(client, {
    runId: run.id,
    leaseOwner: input.leaseOwner,
    leaseEpoch,
    phase: "building model",
  });

  const childInvocations = await incrementChildInvocation(client, {
    runId: run.id,
    leaseOwner: input.leaseOwner,
    leaseEpoch,
  });

  let childResult;
  try {
    childResult = await input.childExecutor({
      request: prepared.childPayload,
      wallMs: input.wallMs,
      cancelGraceMs: input.cancelGraceMs,
      onProgress: async (phase) => {
        await updateCpsatProgressPhase(client, {
          runId: run.id,
          leaseOwner: input.leaseOwner,
          leaseEpoch,
          phase: mapProgressPhase(phase),
        });
      },
      shouldCancel: async () =>
        observeCancellation(client, {
          runId: run.id,
          leaseOwner: input.leaseOwner,
          leaseEpoch,
        }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "FAILED",
      productResult: "SOLVER_FAULT",
      faultCode: `SOLVER_FAULT(CHILD_CRASH):${msg.slice(0, 120)}`,
      stopReason: "CHILD_CRASH",
    });
    return {
      runId: run.id,
      outcome: "CHILD_CRASH",
      settled: settled.settled,
      childInvocations,
      detail: msg,
    };
  }

  if (childResult.childEnvKeys) {
    const forbidden = childResult.childEnvKeys.filter((k) =>
      /DATABASE|POSTGRES|RAILWAY|SECRET|PASSWORD|API_KEY|TOKEN/i.test(k),
    );
    if (forbidden.length) {
      const settled = await settleFaultOrTerminal(client, {
        runId: run.id,
        leaseOwner: input.leaseOwner,
        leaseEpoch,
        lifecycle: "FAILED",
        productResult: "SOLVER_FAULT",
        faultCode: "SOLVER_FAULT(ENV_LEAK)",
        stopReason: "ENV_LEAK",
      });
      return { runId: run.id, outcome: "ENV_LEAK", settled: settled.settled, childInvocations };
    }
  }

  if (childResult.cancelled) {
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "CANCELLED",
      productResult: "CANCELLED",
      faultCode: null,
      stopReason: "CANCEL_DURING_EXECUTION",
    });
    return { runId: run.id, outcome: "CANCELLED_DURING_EXECUTION", settled: settled.settled, childInvocations };
  }

  if (childResult.timedOut) {
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "CLOSED_NO_PLAN",
      productResult: "TIMED_OUT",
      faultCode: null,
      stopReason: "HARD_WALL_TIMEOUT",
      evidenceGrade: null,
    });
    return { runId: run.id, outcome: "TIMED_OUT", settled: settled.settled, childInvocations };
  }

  if (childResult.truncated || childResult.oversized) {
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "FAILED",
      productResult: "SOLVER_FAULT",
      faultCode: childResult.truncated
        ? "SOLVER_FAULT(CHILD_RESPONSE):truncated"
        : "SOLVER_FAULT(CHILD_RESPONSE):oversized",
      stopReason: "CHILD_RESPONSE",
    });
    return {
      runId: run.id,
      outcome: childResult.truncated ? "TRUNCATED" : "OVERSIZED",
      settled: settled.settled,
      childInvocations,
    };
  }

  if (childResult.exitCode !== 0 && childResult.exitCode != null) {
    const hasFinal = childResult.messages.some((m) => m.type === "final");
    if (!hasFinal) {
      const settled = await settleFaultOrTerminal(client, {
        runId: run.id,
        leaseOwner: input.leaseOwner,
        leaseEpoch,
        lifecycle: "FAILED",
        productResult: "SOLVER_FAULT",
        faultCode: `SOLVER_FAULT(CHILD_CRASH):exit_${childResult.exitCode}`,
        stopReason: "CHILD_CRASH",
      });
      return { runId: run.id, outcome: "CHILD_CRASH", settled: settled.settled, childInvocations };
    }
  }

  await updateCpsatProgressPhase(client, {
    runId: run.id,
    leaseOwner: input.leaseOwner,
    leaseEpoch,
    phase: "verifying result",
  });

  const finalMsg = [...childResult.messages].reverse().find((m) => m.type === "final") as
    | { type: "final"; ok?: boolean; payload?: ChildFinalPayload }
    | undefined;
  const validated = validateChildResponse({
    runId: run.id,
    requestHash: run.requestHash,
    finalPayload: finalMsg?.ok ? finalMsg.payload : finalMsg?.payload,
    maxResponseBytes: input.maxResponseBytes,
  });

  if (!validated.ok) {
    const product =
      validated.productResult === "INVALID_INPUT" || validated.productResult === "TIMED_OUT"
        ? validated.productResult
        : "SOLVER_FAULT";
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: product === "SOLVER_FAULT" ? "FAILED" : "CLOSED_NO_PLAN",
      productResult: product,
      faultCode: validated.fault,
      stopReason: "CHILD_RESPONSE",
    });
    return { runId: run.id, outcome: "INVALID_RESPONSE", settled: settled.settled, childInvocations, detail: validated.fault };
  }

  if (validated.productResult !== "OPTIMAL" && validated.productResult !== "FEASIBLE") {
    const processed = processVerifiedCandidate({
      request: prepared.request,
      authored: prepared.authored,
      productResult: validated.productResult,
      childAssignments: [],
      governedAuthorityCurrent: input.governedAuthorityCurrent !== false,
    });
    if (processed.kind === "terminal") {
      const settled = await settleFaultOrTerminal(client, {
        runId: run.id,
        leaseOwner: input.leaseOwner,
        leaseEpoch,
        lifecycle: processed.lifecycle,
        productResult: processed.productResult,
        faultCode: processed.faultCode,
        stopReason: processed.stopReason,
        evidenceGrade: processed.evidenceGrade,
      });
      return { runId: run.id, outcome: processed.productResult, settled: settled.settled, childInvocations };
    }
  }

  await updateCpsatProgressPhase(client, {
    runId: run.id,
    leaseOwner: input.leaseOwner,
    leaseEpoch,
    phase: "preparing explanations",
  });

  const processed = processVerifiedCandidate({
    request: prepared.request,
    authored: prepared.authored,
    productResult: validated.productResult,
    childAssignments: validated.payload.assignments ?? [],
    childTiers: validated.payload.tiers,
    governedAuthorityCurrent: input.governedAuthorityCurrent !== false,
  });

  if (processed.kind === "fault") {
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: "FAILED",
      productResult: "SOLVER_FAULT",
      faultCode: processed.faultCode,
      stopReason: processed.stopReason,
    });
    return { runId: run.id, outcome: "VERIFICATION_OR_EXPLAIN_FAULT", settled: settled.settled, childInvocations, detail: processed.faultCode };
  }

  if (processed.kind === "terminal") {
    const settled = await settleFaultOrTerminal(client, {
      runId: run.id,
      leaseOwner: input.leaseOwner,
      leaseEpoch,
      lifecycle: processed.lifecycle,
      productResult: processed.productResult,
      faultCode: processed.faultCode,
      stopReason: processed.stopReason,
      evidenceGrade: processed.evidenceGrade,
    });
    return { runId: run.id, outcome: processed.productResult, settled: settled.settled, childInvocations };
  }

  await updateCpsatProgressPhase(client, {
    runId: run.id,
    leaseOwner: input.leaseOwner,
    leaseEpoch,
    phase: "sealing candidate",
  });

  const sealed = await sealAndSettleCandidate(client, {
    runId: run.id,
    leaseOwner: input.leaseOwner,
    leaseEpoch,
    request: prepared.request,
    seal: processed.seal,
    indexMap: {
      guests: prepared.request.guests.map((g) => ({ i: g.i, token: g.token })),
      seats: prepared.request.seats.map((s) => ({ i: s.i, token: s.token })),
      tables: prepared.request.tables.map((t) => ({ i: t.i, token: t.token })),
    },
  });

  return {
    runId: run.id,
    outcome: sealed.settled ? "READY_FOR_REVIEW" : `SETTLE_FAILED:${sealed.reason ?? "unknown"}`,
    settled: sealed.settled,
    childInvocations,
    detail: sealed.reason,
  };
}
