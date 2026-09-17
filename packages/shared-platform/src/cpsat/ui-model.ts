/**
 * CP-SAT run status presentation helpers.
 * Never claims percentage-complete, ETA-to-optimality, or "best possible" without OPTIMAL.
 * Milestone 1 adds durable QUEUED / cancellation-requested operator lifecycle copy.
 */
import { CPSAT_ORTOOLS_VERSION, CPSAT_PYTHON_VERSION, CPSAT_SHORT_REASON_TEXT, type CpsatShortReasonCode } from "./contract.js";

export type CpsatOperatorLifecycle =
  | "NONE"
  | "LAUNCHING"
  | "QUEUED"
  | "CANCELLATION_REQUESTED"
  | "RUNNING"
  | "SETTLED"
  | "VALIDATION_FAILED"
  | "ACCESS_DENIED";

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
  /** Terminal solver product result — separate from lifecycle. */
  productResult: string;
  /** Authority freshness — separate from lifecycle and result. */
  freshness: "CURRENT" | "FRESH" | "STALE";
  /** Evidence grade — separate; empty while queued. */
  evidenceGrade: string | null;
  /** Durable lifecycle (QUEUED, RUNNING, …). */
  lifecycle: string;
  /** Result status — null/empty while queued with no terminal result. */
  resultStatus: string | null;
  purposeLabel: string;
  modeLabel: string;
  createdAtLabel: string | null;
  cancelRequested: boolean;
  faultCode: string | null;
  safeToLeaveAndReturn: boolean;
  cancelAllowed: boolean;
  stopAndKeepBestAllowed: boolean;
  operatorLifecycle: CpsatOperatorLifecycle;
  primaryMessage: string;
  supportingMessage: string;
  validationMessage: string | null;
  showPercentComplete: false;
};

function purposeLabel(purpose: string | undefined): string {
  switch (purpose) {
    case "EVENT_DAY_REPAIR":
      return "Event-day repair";
    case "SHADOW":
      return "Shadow";
    case "QUALIFICATION":
      return "Qualification";
    case "PLANNING":
    default:
      return "Planning";
  }
}

function modeLabel(mode: string | undefined): string {
  return mode === "PERFORMANCE" ? "Performance" : "Replay";
}

export function buildCpsatRunUiModel(input: {
  productResult?: string;
  phase?: string;
  elapsedMs?: number;
  deterministicBudgetSeconds?: number;
  firstSolutionFound?: boolean;
  tiers?: Array<{ tier: string; value?: number; bound?: number | null; proven?: boolean }>;
  seated?: number;
  eligible?: number;
  occupiedTables?: number;
  tableCapacity?: number;
  faultCode?: string | null;
  freshness?: "CURRENT" | "FRESH" | "STALE";
  evidenceGrade?: string | null;
  lifecycle?: string;
  resultStatus?: string | null;
  purpose?: string;
  mode?: string;
  createdAt?: string | null;
  cancelRequested?: boolean;
  hasCompleteIncumbent?: boolean;
  operatorLifecycle?: CpsatOperatorLifecycle;
  validationMessage?: string | null;
}): CpsatRunUiModel {
  const tiers = input.tiers ?? [];
  const allProven = tiers.length > 0 && tiers.every((t) => t.proven);
  const movement = tiers.find((t) => /movement/i.test(t.tier));
  const preference = tiers.find((t) => /pref/i.test(t.tier));
  const productResult = input.productResult ?? input.resultStatus ?? "";
  const lifecycle = input.lifecycle ?? input.phase ?? "idle";
  const cancelRequested = Boolean(input.cancelRequested);
  const isFault = productResult === "SOLVER_FAULT" || Boolean(input.faultCode);
  const isInfeasible = productResult === "INFEASIBLE";
  const seated = input.seated ?? 0;
  const eligible = input.eligible ?? 0;

  let operatorLifecycle: CpsatOperatorLifecycle =
    input.operatorLifecycle ??
    (lifecycle === "QUEUED" || input.phase === "queued"
      ? cancelRequested
        ? "CANCELLATION_REQUESTED"
        : "QUEUED"
      : lifecycle === "RUNNING" || input.phase === "search"
        ? "RUNNING"
        : productResult
          ? "SETTLED"
          : "NONE");

  let primaryMessage = "";
  let supportingMessage = "";
  switch (operatorLifecycle) {
    case "NONE":
      primaryMessage = "Generate seating plan";
      supportingMessage =
        "Launching freezes the current governed layout, rules, guests and objectives, then queues an exact CP-SAT seating run.";
      break;
    case "LAUNCHING":
      primaryMessage = "Preparing the governed seating request…";
      supportingMessage = "Authority is being frozen. Solving has not started.";
      break;
    case "QUEUED":
      primaryMessage = "Seating run queued";
      supportingMessage =
        "You may leave and return. Solving has not started; a worker will claim this run later.";
      break;
    case "CANCELLATION_REQUESTED":
      primaryMessage = "Cancellation requested";
      supportingMessage = "The worker will acknowledge this request. The run is not cancelled yet.";
      break;
    case "VALIDATION_FAILED":
      primaryMessage = "Launch could not proceed";
      supportingMessage = input.validationMessage ?? "Check seating authority and try again.";
      break;
    case "ACCESS_DENIED":
      primaryMessage = "Not available";
      supportingMessage = "This seating run could not be found for this event.";
      break;
    default:
      primaryMessage = productResult || lifecycle;
      supportingMessage = "Safe to leave and return — progress is durable on the run record.";
  }

  return {
    engineLabel: `OR-Tools CP-SAT ${CPSAT_ORTOOLS_VERSION} · Python ${CPSAT_PYTHON_VERSION}`,
    phase: input.phase ?? lifecycle,
    elapsedMs: input.elapsedMs ?? 0,
    deterministicBudgetSeconds: input.deterministicBudgetSeconds ?? null,
    firstSolutionFound: Boolean(input.firstSolutionFound ?? input.hasCompleteIncumbent),
    currentObjective: movement ? String(movement.value ?? "") : null,
    currentBound: movement?.bound != null ? String(movement.bound) : null,
    proofStatus: allProven ? "PROVEN" : tiers.length ? "NOT_PROVEN" : "N_A",
    guestTotals: { seated, eligible },
    tableTotals: { occupied: input.occupiedTables ?? 0, capacity: input.tableCapacity ?? 0 },
    hardResult: isFault ? "UNKNOWN" : isInfeasible ? "FAIL" : seated === eligible && eligible > 0 ? "PASS" : "UNKNOWN",
    movementResult: movement ? `movement=${movement.value}${movement.proven ? " (proven)" : ""}` : null,
    preferenceResult: preference ? `preference=${preference.value}${preference.proven ? " (proven)" : ""}` : null,
    productResult,
    freshness: input.freshness ?? "CURRENT",
    evidenceGrade: input.evidenceGrade ?? null,
    lifecycle,
    resultStatus: input.resultStatus ?? (productResult || null),
    purposeLabel: purposeLabel(input.purpose),
    modeLabel: modeLabel(input.mode),
    createdAtLabel: input.createdAt ?? null,
    cancelRequested,
    faultCode: input.faultCode ?? null,
    safeToLeaveAndReturn: true,
    cancelAllowed:
      operatorLifecycle === "QUEUED" ||
      (!cancelRequested && (lifecycle === "QUEUED" || ["QUEUED", "RUNNING", "SEARCH_INCOMPLETE"].includes(productResult))),
    stopAndKeepBestAllowed: Boolean(input.hasCompleteIncumbent),
    operatorLifecycle,
    primaryMessage,
    supportingMessage,
    validationMessage: input.validationMessage ?? null,
    showPercentComplete: false,
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
