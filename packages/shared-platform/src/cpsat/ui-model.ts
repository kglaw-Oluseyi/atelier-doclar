/**
 * CP-SAT run status presentation helpers.
 * Never claims percentage-complete, ETA-to-optimality, or "best possible" without OPTIMAL.
 * Milestone 2 adds claim/running/verify/ready-for-review and fault wording.
 */
import { CPSAT_ORTOOLS_VERSION, CPSAT_PYTHON_VERSION, CPSAT_SHORT_REASON_TEXT, type CpsatShortReasonCode } from "./contract.js";

export type CpsatOperatorLifecycle =
  | "NONE"
  | "LAUNCHING"
  | "QUEUED"
  | "CLAIMED"
  | "CANCELLATION_REQUESTED"
  | "RUNNING"
  | "VERIFYING"
  | "EXPLAINING"
  | "READY_FOR_REVIEW"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ADOPTED"
  | "CANCELLED"
  | "INFEASIBLE"
  | "SEARCH_INCOMPLETE"
  | "TIMED_OUT"
  | "INVALID_INPUT"
  | "SOLVER_FAULT"
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
  completedAtLabel: string | null;
  cancelRequested: boolean;
  faultCode: string | null;
  safeToLeaveAndReturn: boolean;
  cancelAllowed: boolean;
  stopAndKeepBestAllowed: boolean;
  retrySafe: boolean;
  assignmentHashShort: string | null;
  reviewActionLabel: string | null;
  operatorLifecycle: CpsatOperatorLifecycle;
  primaryMessage: string;
  supportingMessage: string;
  validationMessage: string | null;
  showPercentComplete: false;
  showHeuristicFallback: false;
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

function deriveOperatorLifecycle(input: {
  lifecycle: string;
  productResult: string;
  cancelRequested: boolean;
  phase?: string;
  operatorLifecycle?: CpsatOperatorLifecycle;
}): CpsatOperatorLifecycle {
  if (input.operatorLifecycle) return input.operatorLifecycle;
  const lifecycle = input.lifecycle;
  const product = input.productResult;
  const phase = (input.phase ?? "").toLowerCase();

  if (lifecycle === "QUEUED" || input.phase === "queued") {
    return input.cancelRequested ? "CANCELLATION_REQUESTED" : "QUEUED";
  }
  if (lifecycle === "CLAIMED") return "CLAIMED";
  if (lifecycle === "CANCELLED" || product === "CANCELLED") return "CANCELLED";
  if (lifecycle === "READY_FOR_REVIEW") return "READY_FOR_REVIEW";
  if (lifecycle === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (lifecycle === "APPROVED") return "APPROVED";
  if (lifecycle === "REJECTED") return "REJECTED";
  if (lifecycle === "ADOPTED") return "ADOPTED";
  if (product === "INFEASIBLE" || lifecycle === "CLOSED_NO_PLAN" && product === "INFEASIBLE") return "INFEASIBLE";
  if (product === "SEARCH_INCOMPLETE") return "SEARCH_INCOMPLETE";
  if (product === "TIMED_OUT") return "TIMED_OUT";
  if (product === "INVALID_INPUT") return "INVALID_INPUT";
  if (product === "SOLVER_FAULT" || lifecycle === "FAILED") return "SOLVER_FAULT";
  if (lifecycle === "RUNNING" || lifecycle === "BUILDING" || lifecycle === "SEARCHING") {
    if (input.cancelRequested) return "CANCELLATION_REQUESTED";
    if (phase.includes("verif")) return "VERIFYING";
    if (phase.includes("explain") || phase.includes("preparing placement")) return "EXPLAINING";
    return "RUNNING";
  }
  if (phase.includes("verif")) return "VERIFYING";
  if (phase.includes("explain")) return "EXPLAINING";
  if (product) return "SETTLED";
  return "NONE";
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
  completedAt?: string | null;
  cancelRequested?: boolean;
  hasCompleteIncumbent?: boolean;
  operatorLifecycle?: CpsatOperatorLifecycle;
  validationMessage?: string | null;
  assignmentHash?: string | null;
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

  const operatorLifecycle = deriveOperatorLifecycle({
    lifecycle,
    productResult,
    cancelRequested,
    phase: input.phase,
    operatorLifecycle: input.operatorLifecycle,
  });

  let primaryMessage = "";
  let supportingMessage = "";
  let retrySafe = false;
  let reviewActionLabel: string | null = null;

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
    case "CLAIMED":
      primaryMessage = "Generating seating plan";
      supportingMessage = "A worker claimed this run and is preparing the solver child.";
      break;
    case "CANCELLATION_REQUESTED":
      primaryMessage = "Cancellation requested";
      supportingMessage = "The worker will acknowledge this request. The run is not cancelled yet.";
      break;
    case "RUNNING":
      primaryMessage = "Generating seating plan";
      supportingMessage = "Safe to leave and return — progress is durable on the run record.";
      break;
    case "VERIFYING":
      primaryMessage = "Checking every placement and rule";
      supportingMessage = "Independent verification is comparing the solver result to governed authority.";
      break;
    case "EXPLAINING":
      primaryMessage = "Preparing placement reasons";
      supportingMessage = "Short placement reasons are being built and checked before sealing.";
      break;
    case "READY_FOR_REVIEW":
      primaryMessage = "Seating plan ready for review";
      supportingMessage = "All eligible guests are seated under verified HARD rules. Adoption is not available yet.";
      reviewActionLabel = "Review seating plan";
      break;
    case "PENDING_APPROVAL":
      primaryMessage = "Seating plan awaiting approval";
      supportingMessage = "A maker submitted this sealed candidate. A different authorised checker must decide.";
      reviewActionLabel = "Open approval review";
      break;
    case "APPROVED":
      primaryMessage = "Seating plan approved";
      supportingMessage = "An authorised checker approved the exact sealed candidate. Adoption publishes it operationally.";
      reviewActionLabel = "Adopt seating plan";
      break;
    case "REJECTED":
      primaryMessage = "Seating plan rejected";
      supportingMessage = "The sealed candidate is preserved. A governed resubmission is allowed when authority remains current.";
      reviewActionLabel = "Review rejected plan";
      break;
    case "ADOPTED":
      primaryMessage = "Seating plan adopted";
      supportingMessage = "This sealed candidate is the current operational seating publication.";
      reviewActionLabel = "View operational plan";
      break;
    case "CANCELLED":
      primaryMessage = "Seating run cancelled";
      supportingMessage = "No seating candidate was published. You can launch a new run when ready.";
      retrySafe = true;
      break;
    case "INFEASIBLE":
      primaryMessage = "No complete seating satisfies the mandatory rules";
      supportingMessage = "This is a solver proof of impossibility — not a temporary search failure.";
      retrySafe = false;
      break;
    case "SEARCH_INCOMPLETE":
      primaryMessage = "Search finished without a complete plan";
      supportingMessage = "This is not a proof of impossibility. Retrying with the same authority may help.";
      retrySafe = true;
      break;
    case "TIMED_OUT":
      primaryMessage = "Seating run stopped on the safety time limit";
      supportingMessage = "No plan was sealed. Retry is safe with the same governed authority.";
      retrySafe = true;
      break;
    case "INVALID_INPUT":
      primaryMessage = "The seating request could not be accepted";
      supportingMessage = "Correct the governed seating authority, then launch a new run.";
      retrySafe = true;
      break;
    case "SOLVER_FAULT":
      primaryMessage = "Solver fault — do not treat as infeasibility";
      supportingMessage = input.faultCode
        ? `A contained fault stopped publication (${input.faultCode}). Retry may be safe after review.`
        : "A contained fault stopped publication. No candidate was sealed.";
      retrySafe = true;
      break;
    case "VALIDATION_FAILED":
      primaryMessage = "Launch could not proceed";
      supportingMessage = input.validationMessage ?? "Check seating authority and try again.";
      retrySafe = true;
      break;
    case "ACCESS_DENIED":
      primaryMessage = "Not available";
      supportingMessage = "This seating run could not be found for this event.";
      break;
    default:
      primaryMessage = productResult || lifecycle;
      supportingMessage = "Safe to leave and return — progress is durable on the run record.";
  }

  if (
    input.freshness === "STALE" &&
    (operatorLifecycle === "READY_FOR_REVIEW" ||
      operatorLifecycle === "PENDING_APPROVAL" ||
      operatorLifecycle === "APPROVED" ||
      operatorLifecycle === "SETTLED")
  ) {
    supportingMessage = `${supportingMessage} Authority is now stale; the sealed result status remains ${productResult || "unchanged"}.`;
  }

  const assignmentHashShort = input.assignmentHash ? input.assignmentHash.slice(0, 12) : null;

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
    completedAtLabel: input.completedAt ?? null,
    cancelRequested,
    faultCode: input.faultCode ?? null,
    safeToLeaveAndReturn: true,
    cancelAllowed:
      operatorLifecycle === "QUEUED" ||
      operatorLifecycle === "CLAIMED" ||
      operatorLifecycle === "RUNNING" ||
      operatorLifecycle === "VERIFYING" ||
      operatorLifecycle === "EXPLAINING" ||
      (!cancelRequested && lifecycle === "QUEUED"),
    stopAndKeepBestAllowed: false,
    retrySafe,
    assignmentHashShort,
    reviewActionLabel,
    operatorLifecycle,
    primaryMessage,
    supportingMessage,
    validationMessage: input.validationMessage ?? null,
    showPercentComplete: false,
    showHeuristicFallback: false,
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
    case "INVALID_INPUT":
      return "Invalid seating request";
    default:
      return result;
  }
}
