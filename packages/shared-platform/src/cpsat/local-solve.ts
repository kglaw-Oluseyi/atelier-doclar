/**
 * Local CP-SAT solve via short-lived Python child (Checkpoint 2 — no Railway worker).
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exactHash } from "../eec-hash.js";
import type { SeatingV2Assignment, SeatingV2CompiledRequest } from "../seating-v2-schemas.js";
import { compileV2ToCpsatRequest } from "./compiler.js";
import { mapChildAssignmentsToV2, toChildPayload } from "./child-payload.js";
import { buildExplanations } from "./explanations.js";
import { CPSAT_ORTOOLS_VERSION, CPSAT_PYTHON_VERSION, type CpsatProductResult } from "./contract.js";
import { verifyCpsatAssignments } from "../cpsat-verifier/verify.js";

export type CpsatLocalSolveResult = {
  productResult: CpsatProductResult;
  solverClaim: "FEASIBLE" | "INFEASIBLE" | "TIMED_OUT" | "SEARCH_INCOMPLETE" | "SOLVER_FAULT";
  assignments: SeatingV2Assignment[];
  rawOutputHash: string;
  explanationsOk: boolean;
  verifierOk: boolean;
  engine: { ortools: string; python: string };
  elapsedMs: number;
  fault?: string;
};

function encodeFrame(payload: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

class FrameDecoder {
  private buffer = Buffer.alloc(0);
  push(chunk: Buffer): unknown[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const out: unknown[] = [];
    while (this.buffer.length >= 4) {
      const len = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + len) break;
      const body = this.buffer.subarray(4, 4 + len);
      this.buffer = this.buffer.subarray(4 + len);
      out.push(JSON.parse(body.toString("utf8")));
    }
    return out;
  }
}

function defaultPaths(): { python: string; script: string } {
  const envPython = process.env.SOLVER_PYTHON;
  const envScript = process.env.SOLVER_CHILD_SCRIPT;
  if (envPython && envScript) return { python: envPython, script: envScript };
  const here = dirname(fileURLToPath(import.meta.url));
  // packages/shared-platform/src/cpsat -> apps/event-os-solver-worker
  const workerRoot = join(here, "../../../../apps/event-os-solver-worker");
  return {
    python: join(workerRoot, ".venv/bin/python"),
    script: join(workerRoot, "python/solver_child.py"),
  };
}

export async function solveSeatingV2CompiledCpSat(
  compiled: SeatingV2CompiledRequest,
  options?: { runId?: string; mode?: "REPLAY" | "PERFORMANCE"; maxTimeSeconds?: number },
): Promise<CpsatLocalSolveResult> {
  const started = Date.now();
  const runId = options?.runId ?? `cpsat-${Date.now()}`;
  const request = compileV2ToCpsatRequest(compiled, {
    runId,
    mode: options?.mode ?? "REPLAY",
    purpose: "PLANNING",
    maxTimeSeconds: options?.maxTimeSeconds ?? 30,
    wallSeconds: (options?.maxTimeSeconds ?? 30) * 3,
    workers: 1,
  });
  const childPayload = toChildPayload(request);
  const { python, script } = defaultPaths();
  const messages: unknown[] = [];
  const decoder = new FrameDecoder();

  const child = spawn(python, [script], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? "/tmp",
      LANG: "C.UTF-8",
      PYTHONUNBUFFERED: "1",
    },
    detached: false,
  });

  const fd3 = child.stdio[3] as NodeJS.ReadableStream | null;
  if (!fd3) {
    return {
      productResult: "SOLVER_FAULT",
      solverClaim: "SOLVER_FAULT",
      assignments: [],
      rawOutputHash: exactHash({ fault: "no_fd3" }),
      explanationsOk: false,
      verifierOk: false,
      engine: { ortools: CPSAT_ORTOOLS_VERSION, python: CPSAT_PYTHON_VERSION },
      elapsedMs: Date.now() - started,
      fault: "SOLVER_FAULT(NO_FD3)",
    };
  }
  fd3.on("data", (chunk: Buffer) => {
    for (const msg of decoder.push(chunk)) messages.push(msg);
  });
  child.stdin?.write(encodeFrame(childPayload));
  child.stdin?.end();

  await new Promise<void>((resolve) => child.on("exit", () => resolve()));

  const finalMsg = [...messages].reverse().find((m) => (m as { type?: string }).type === "final") as
    | { type: "final"; ok: boolean; payload: Record<string, unknown> }
    | undefined;

  if (!finalMsg?.ok || !finalMsg.payload) {
    return {
      productResult: "SOLVER_FAULT",
      solverClaim: "SOLVER_FAULT",
      assignments: [],
      rawOutputHash: exactHash({ messages }),
      explanationsOk: false,
      verifierOk: false,
      engine: { ortools: CPSAT_ORTOOLS_VERSION, python: CPSAT_PYTHON_VERSION },
      elapsedMs: Date.now() - started,
      fault: "SOLVER_FAULT(CHILD_RESPONSE)",
    };
  }

  const payload = finalMsg.payload;
  const productResult = String(payload.result ?? "SOLVER_FAULT") as CpsatProductResult;
  const childAssignments = (payload.assignments as Array<{ guest: number; table: number; seat: number }>) ?? [];

  if (productResult === "INVALID_INPUT" || productResult === "SOLVER_FAULT") {
    return {
      productResult,
      solverClaim: "SOLVER_FAULT",
      assignments: [],
      rawOutputHash: exactHash(payload),
      explanationsOk: false,
      verifierOk: false,
      engine: {
        ortools: String((payload.engine as { ortools?: string } | undefined)?.ortools ?? CPSAT_ORTOOLS_VERSION),
        python: String((payload.engine as { python?: string } | undefined)?.python ?? CPSAT_PYTHON_VERSION),
      },
      elapsedMs: Date.now() - started,
      fault: `SOLVER_FAULT(${String(payload.faultCode ?? productResult)})`,
    };
  }

  if (productResult !== "FEASIBLE" && productResult !== "OPTIMAL") {
    return {
      productResult,
      solverClaim:
        productResult === "INFEASIBLE"
          ? "INFEASIBLE"
          : productResult === "TIMED_OUT"
            ? "TIMED_OUT"
            : productResult === "SEARCH_INCOMPLETE"
              ? "SEARCH_INCOMPLETE"
              : "SOLVER_FAULT",
      assignments: [],
      rawOutputHash: exactHash(payload),
      explanationsOk: false,
      verifierOk: false,
      engine: {
        ortools: String((payload.engine as { ortools?: string } | undefined)?.ortools ?? CPSAT_ORTOOLS_VERSION),
        python: String((payload.engine as { python?: string } | undefined)?.python ?? CPSAT_PYTHON_VERSION),
      },
      elapsedMs: Date.now() - started,
      fault: payload.faultCode ? String(payload.faultCode) : undefined,
    };
  }

  const expl = buildExplanations(request, childAssignments);
  if (!expl.ok) {
    return {
      productResult: "SOLVER_FAULT",
      solverClaim: "SOLVER_FAULT",
      assignments: [],
      rawOutputHash: exactHash(payload),
      explanationsOk: false,
      verifierOk: false,
      engine: {
        ortools: String((payload.engine as { ortools?: string } | undefined)?.ortools ?? CPSAT_ORTOOLS_VERSION),
        python: String((payload.engine as { python?: string } | undefined)?.python ?? CPSAT_PYTHON_VERSION),
      },
      elapsedMs: Date.now() - started,
      fault: expl.fault ?? "SOLVER_FAULT(EXPLANATION_INVALID)",
    };
  }

  const assignments = mapChildAssignmentsToV2(
    request,
    childAssignments,
    expl.explanations.map((e) => ({ guest: e.guest, code: e.code })),
  );
  const verifier = verifyCpsatAssignments(compiled, assignments);
  if (!verifier.ok && (productResult === "FEASIBLE" || productResult === "OPTIMAL")) {
    return {
      productResult: "SOLVER_FAULT",
      solverClaim: "SOLVER_FAULT",
      assignments,
      rawOutputHash: exactHash(payload),
      explanationsOk: true,
      verifierOk: false,
      engine: {
        ortools: String((payload.engine as { ortools?: string } | undefined)?.ortools ?? CPSAT_ORTOOLS_VERSION),
        python: String((payload.engine as { python?: string } | undefined)?.python ?? CPSAT_PYTHON_VERSION),
      },
      elapsedMs: Date.now() - started,
      fault: "SOLVER_FAULT(VERIFICATION_FAILED)",
    };
  }

  const solverClaim =
    productResult === "OPTIMAL" || productResult === "FEASIBLE"
      ? "FEASIBLE"
      : productResult === "INFEASIBLE"
        ? "INFEASIBLE"
        : productResult === "TIMED_OUT"
          ? "TIMED_OUT"
          : productResult === "SEARCH_INCOMPLETE"
            ? "SEARCH_INCOMPLETE"
            : "SOLVER_FAULT";

  return {
    productResult,
    solverClaim,
    assignments,
    rawOutputHash: exactHash(payload),
    explanationsOk: true,
    verifierOk: verifier.ok,
    engine: {
      ortools: String((payload.engine as { ortools?: string } | undefined)?.ortools ?? CPSAT_ORTOOLS_VERSION),
      python: String((payload.engine as { python?: string } | undefined)?.python ?? CPSAT_PYTHON_VERSION),
    },
    elapsedMs: Date.now() - started,
  };
}
