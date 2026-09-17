/**
 * CP-SAT run status presentation helpers (Checkpoint 2 UI preparation).
 * Never claims percentage-complete, ETA-to-optimality, or "best possible" without OPTIMAL.
 */
import { CPSAT_ORTOOLS_VERSION, CPSAT_PYTHON_VERSION, CPSAT_SHORT_REASON_TEXT, type CpsatShortReasonCode } from "./contract.js";

export type CpsatRunUiModel = {
  engineLabel: string;
  phase: string;
  elapsedMs: number;
  deterministicBudgetSeconds: number | null;
  firstSolutionFound: boolean;
  currentObjective: string | null;
  currentBound: string | null;
  proofStatus: "PROVEN" | "NOT_PROVEN" | "N_A";
  guestTotals: { seated: number; eligible: number };
  tableTotals: { occupied: number; capacity: number };
  hardResult: "PASS" | "FAIL" | "UNKNOWN";
  movementResult: string | null;
  preferenceResult: string | null;
  productResult: string;
  freshness: "FRESH" | "STALE";
  faultCode: string | null;
  safeToLeaveAndReturn: boolean;
  cancelAllowed: boolean;
  stopAndKeepBestAllowed: boolean;
};

export function buildCpsatRunUiModel(input: {
  productResult: string;
  phase?: string;
  elapsedMs: number;
  deterministicBudgetSeconds?: number;
  firstSolutionFound?: boolean;
  tiers?: Array<{ tier: string; value?: number; bound?: number | null; proven?: boolean }>;
  seated: number;
  eligible: number;
  occupiedTables: number;
  tableCapacity: number;
  faultCode?: string | null;
  freshness?: "FRESH" | "STALE";
  hasCompleteIncumbent?: boolean;
}): CpsatRunUiModel {
  const tiers = input.tiers ?? [];
  const allProven = tiers.length > 0 && tiers.every((t) => t.proven);
  const movement = tiers.find((t) => /movement/i.test(t.tier));
  const preference = tiers.find((t) => /pref/i.test(t.tier));
  const isFault = input.productResult === "SOLVER_FAULT" || Boolean(input.faultCode);
  const isInfeasible = input.productResult === "INFEASIBLE";
  return {
    engineLabel: `OR-Tools CP-SAT ${CPSAT_ORTOOLS_VERSION} · Python ${CPSAT_PYTHON_VERSION}`,
    phase: input.phase ?? "idle",
    elapsedMs: input.elapsedMs,
    deterministicBudgetSeconds: input.deterministicBudgetSeconds ?? null,
    firstSolutionFound: Boolean(input.firstSolutionFound ?? input.hasCompleteIncumbent),
    currentObjective: movement ? String(movement.value ?? "") : null,
    currentBound: movement?.bound != null ? String(movement.bound) : null,
    proofStatus: allProven ? "PROVEN" : tiers.length ? "NOT_PROVEN" : "N_A",
    guestTotals: { seated: input.seated, eligible: input.eligible },
    tableTotals: { occupied: input.occupiedTables, capacity: input.tableCapacity },
    hardResult: isFault ? "UNKNOWN" : isInfeasible ? "FAIL" : input.seated === input.eligible ? "PASS" : "UNKNOWN",
    movementResult: movement ? `movement=${movement.value}${movement.proven ? " (proven)" : ""}` : null,
    preferenceResult: preference ? `preference=${preference.value}${preference.proven ? " (proven)" : ""}` : null,
    productResult: input.productResult,
    freshness: input.freshness ?? "FRESH",
    faultCode: input.faultCode ?? null,
    safeToLeaveAndReturn: true,
    cancelAllowed: ["QUEUED", "RUNNING", "SEARCH_INCOMPLETE"].includes(input.productResult) || input.phase === "search",
    stopAndKeepBestAllowed: Boolean(input.hasCompleteIncumbent),
  };
}

export function shortReasonText(code: string): string {
  if (code in CPSAT_SHORT_REASON_TEXT) {
    return CPSAT_SHORT_REASON_TEXT[code as CpsatShortReasonCode];
  }
  return CPSAT_SHORT_REASON_TEXT.GLOBAL;
}

/** Copy rules — never emit forbidden optimism phrasing. */
export function productResultCopy(result: string, proofStatus: CpsatRunUiModel["proofStatus"]): string {
  switch (result) {
    case "OPTIMAL":
      return proofStatus === "PROVEN" ? "Optimal — every objective tier proven" : "Feasible plan (proof incomplete)";
    case "FEASIBLE":
      return "Feasible plan found — optimisation proof incomplete";
    case "INFEASIBLE":
      return "Infeasible — solver proof that no complete seating satisfies HARD rules";
    case "SEARCH_INCOMPLETE":
      return "Search incomplete under deterministic budget";
    case "TIMED_OUT":
      return "Stopped on wall-time safety limit";
    case "SOLVER_FAULT":
      return "Solver fault — do not treat as infeasibility";
    case "CANCELLED":
      return "Cancelled";
    default:
      return result;
  }
}
