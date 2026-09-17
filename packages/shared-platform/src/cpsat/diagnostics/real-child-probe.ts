/**
 * Production FeasibilityProbe: always spawns the real Python CP-SAT child.
 * Tests may inject alternate probes; production construction must use this.
 */
import type { ChildExecutor } from "../execute-claimed-run.js";
import { toChildPayload } from "../child-payload.js";
import type { CpsatSolveRequest } from "../compiler.js";
import type { SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../../seating-v2-schemas.js";
import {
  listRelaxableRules,
  type DiagnosticProbeDiagnostics,
  type FeasibilityProbe,
  type FeasibilityProbeResult,
} from "./models.js";

export type { DiagnosticProbeDiagnostics };

function buildRelaxablePayload(
  authored: SeatingV2CompiledRequest,
  allowLockRelaxation: boolean,
): Array<Record<string, unknown>> {
  const relaxable = listRelaxableRules(authored, { allowLockRelaxation });
  const byHash = new Map((authored.rules as SeatingV2CompiledRule[]).map((r) => [r.contentHash, r]));
  const guestsCanonical = [...authored.guests].sort((a, b) =>
    a.token < b.token ? -1 : a.token > b.token ? 1 : 0,
  );
  const guestIndex = new Map(guestsCanonical.map((g, i) => [g.token, i]));
  const tableTokensSorted = [
    ...new Set([...authored.positions].map((p) => p.tableToken)),
  ].sort();
  const tableIndex = new Map(tableTokensSorted.map((t, i) => [t, i]));
  return relaxable.map((r) => {
    const full = byHash.get(r.contentHash);
    const guests = (full?.subjectTokens ?? [])
      .map((t) => guestIndex.get(t))
      .filter((i): i is number => i != null);
    const tables = (full?.tableTokens ?? [])
      .map((t) => tableIndex.get(t))
      .filter((i): i is number => i != null);
    return {
      ref: r.contentHash,
      contentHash: r.contentHash,
      kind: r.kind,
      priority: r.priority,
      guests,
      guestOrUnit: guests[0],
      tables,
      table: tables[0],
      guest: guests[0],
    };
  });
}

export function createRealChildFeasibilityProbe(input: {
  childExecutor: ChildExecutor;
  wallMs: number;
  cancelGraceMs: number;
  allowLockRelaxation?: boolean;
}): FeasibilityProbe {
  return async ({ purpose, authored, request, maxTimeSeconds }) => {
    const allowLocks = input.allowLockRelaxation === true;
    const diagnostic =
      purpose === "DIAG_CORE" || purpose === "DIAG_MCS" || purpose === "DIAG_MAXSEAT"
        ? {
            purpose,
            parentRunId: request.runId,
            budget: maxTimeSeconds,
            coreMinimisationBudget: 24,
            allowLockRelaxation: allowLocks,
            lockRelaxationPolicy: { allow: allowLocks },
            relaxableRules: buildRelaxablePayload(authored, allowLocks),
            togetherUnitsAtomic: true,
          }
        : request.diagnostic;

    const counterfactual = (request as CpsatSolveRequest & { counterfactual?: unknown }).counterfactual;
    const childRequest: Record<string, unknown> = {
      ...toChildPayload({ ...request, purpose }),
      purpose,
      diagnostic,
      ...(counterfactual ? { counterfactual } : {}),
      ...((request as { testHooks?: unknown }).testHooks
        ? { testHooks: (request as { testHooks?: unknown }).testHooks }
        : {}),
      limits: {
        ...request.limits,
        maxTimeSeconds: Math.min(request.limits.maxTimeSeconds, maxTimeSeconds),
      },
    };

    const child = await input.childExecutor({
      request: childRequest,
      wallMs: Math.min(input.wallMs, Math.max(3_000, maxTimeSeconds * 1000 + 2_000)),
      cancelGraceMs: input.cancelGraceMs,
    });
    const finalMsg = [...child.messages].reverse().find((m) => m.type === "final") as
      | { payload?: Record<string, unknown> }
      | undefined;
    const payload = finalMsg?.payload ?? {};
    const result = String(payload.result ?? "SOLVER_FAULT");
    const diagnostics = (payload.diagnostics ?? undefined) as DiagnosticProbeDiagnostics | undefined;
    const assignments = (payload.assignments as FeasibilityProbeResult extends { assignments?: infer A }
      ? A
      : never) ?? [];

    if (result === "INFEASIBLE") {
      return { status: "INFEASIBLE", diagnostics, assignments: [] };
    }
    if (result === "OPTIMAL" || result === "FEASIBLE") {
      return {
        status: result,
        assignments: Array.isArray(assignments) ? assignments : [],
        maxSeated: diagnostics?.maxSeated ?? (payload as { diagnostics?: { maxSeated?: number } }).diagnostics?.maxSeated,
        diagnostics,
      };
    }
    return {
      status: result as "UNKNOWN" | "TIMED_OUT" | "SEARCH_INCOMPLETE" | "SOLVER_FAULT",
      detail: result,
      diagnostics,
    };
  };
}

/** Architectural guard: production default probe factory is the real-child binder. */
export const PRODUCTION_FEASIBILITY_PROBE_FACTORY = createRealChildFeasibilityProbe;
