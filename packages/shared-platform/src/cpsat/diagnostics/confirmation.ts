/**
 * L3 confirmation re-solve for unrestricted full-model INFEASIBLE.
 * Restricted / diagnostic / counterfactual infeasibility never becomes authoritative.
 */
import { exactHash } from "../../eec-hash.js";
import type { CpsatSolveRequest } from "../compiler.js";
import { foldToPositiveInt32 } from "../seed.js";
import type { FeasibilityProbe, FeasibilityProbeResult } from "./models.js";
import type { SeatingV2CompiledRequest } from "../../seating-v2-schemas.js";

export type ConfirmationOutcome =
  | {
      kind: "CONFIRMED_INFEASIBLE";
      evidenceGrade: "SOLVER_PROOF";
      confirmationSeed: number;
      confirmationRequestHash: string;
      confirmationResponseHash: string;
      confirmationResult: "INFEASIBLE";
    }
  | {
      kind: "INCONSISTENT_PROOF";
      fault: "SOLVER_FAULT(INCONSISTENT_PROOF)";
      confirmationSeed: number;
      confirmationRequestHash: string;
      confirmationResponseHash: string;
      confirmationResult: "FEASIBLE" | "OPTIMAL";
      assignments: Array<{ guest: number; table: number; seat: number }>;
    }
  | {
      kind: "CONFIRMATION_LIMITED";
      evidenceGrade: "SOLVER_PROOF";
      confirmationSeed: number;
      confirmationRequestHash: string;
      confirmationResponseHash: string;
      confirmationResult: string;
      limitation: string;
    };

function differentSeed(original: number): number {
  const next = foldToPositiveInt32(original ^ 0x9e3779b9);
  return next === original ? foldToPositiveInt32(original + 1) : next;
}

export function isAuthoritativeFullModelPurpose(purpose: string): boolean {
  return purpose === "PLANNING" || purpose === "EVENT_DAY_REPAIR" || purpose === "SHADOW" || purpose === "QUALIFICATION";
}

export function isDiagnosticOrRestrictedPurpose(purpose: string): boolean {
  return purpose.startsWith("DIAG_") || purpose === "COUNTERFACTUAL" || purpose === "NEIGHBOURHOOD";
}

/** Confirm native full-model INFEASIBLE with Replay + different seed. */
export async function confirmFullModelInfeasibility(input: {
  authored: SeatingV2CompiledRequest;
  request: CpsatSolveRequest;
  probe: FeasibilityProbe;
  initialResponseHash?: string;
}): Promise<ConfirmationOutcome> {
  if (isDiagnosticOrRestrictedPurpose(input.request.purpose)) {
    throw new Error("CONFIRMATION_REFUSED:restricted_or_diagnostic_purpose");
  }
  if (!isAuthoritativeFullModelPurpose(input.request.purpose)) {
    throw new Error("CONFIRMATION_REFUSED:non_authoritative_purpose");
  }

  const confirmationSeed = differentSeed(input.request.seed);
  const confirmationRequest: CpsatSolveRequest & { confirmation?: Record<string, unknown> } = {
    ...input.request,
    mode: "REPLAY",
    seed: confirmationSeed,
    purpose: input.request.purpose,
    runId: `${input.request.runId}:confirm`,
    confirmation: {
      ofRequestHash: exactHash((({ runId: _r, ...rest }) => rest)(input.request)),
      ofResponseHash: input.initialResponseHash ?? null,
      originalSeed: input.request.seed,
    },
  };
  const confirmationRequestHash = exactHash((({ runId: _r, ...rest }) => rest)(confirmationRequest));

  const probeResult: FeasibilityProbeResult = await input.probe({
    purpose: "PLANNING",
    authored: input.authored,
    request: confirmationRequest,
    maxTimeSeconds: confirmationRequest.limits.maxTimeSeconds,
  });
  const confirmationResponseHash = exactHash(probeResult);

  if (probeResult.status === "INFEASIBLE") {
    return {
      kind: "CONFIRMED_INFEASIBLE",
      evidenceGrade: "SOLVER_PROOF",
      confirmationSeed,
      confirmationRequestHash,
      confirmationResponseHash,
      confirmationResult: "INFEASIBLE",
    };
  }

  if (probeResult.status === "FEASIBLE" || probeResult.status === "OPTIMAL") {
    return {
      kind: "INCONSISTENT_PROOF",
      fault: "SOLVER_FAULT(INCONSISTENT_PROOF)",
      confirmationSeed,
      confirmationRequestHash,
      confirmationResponseHash,
      confirmationResult: probeResult.status,
      assignments: probeResult.assignments ?? [],
    };
  }

  return {
    kind: "CONFIRMATION_LIMITED",
    evidenceGrade: "SOLVER_PROOF",
    confirmationSeed,
    confirmationRequestHash,
    confirmationResponseHash,
    confirmationResult: probeResult.status,
    limitation: probeResult.detail ?? probeResult.status,
  };
}
