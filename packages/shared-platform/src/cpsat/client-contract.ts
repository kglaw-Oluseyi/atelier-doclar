/**
 * Client-safe CP-SAT presentation contract.
 *
 * Pure TypeScript types and pure string helpers only.
 * No Node APIs, database, filesystem, crypto, queue, or solver runtime.
 * Browser components must import from `@maison-doclar/shared-platform/cpsat-client`
 * — never from the shared-platform root barrel.
 */

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

export type CpsatPlacementMovement = "RETAINED" | "MOVED" | "NEW" | "RELEASED" | "UNSEATED";

/** Serialisable tier-verification evidence for review presentation. */
export type CpsatTierVerificationView = {
  required: { movement: boolean; preferences: boolean };
  present: { A1_movement: boolean; A2_preferences: boolean };
  recomputed: { movement: number; preference: number };
  reported: { A1_movement: number | null; A2_preferences: number | null };
  ok: boolean;
  fault: string | null;
};

export type CpsatCandidateReviewModel = {
  runId: string;
  candidateId: string;
  assignmentHash: string;
  engineIdentity: string;
  modelVersion: string;
  resultStatus: string | null;
  lifecycle: string;
  freshness: string;
  evidenceGrade: string | null;
  eligibleGuestCount: number;
  seatedGuestCount: number;
  unseatedGuestCount: number;
  hardRuleVerification: "PASS" | "FAIL" | "UNKNOWN";
  movementTier: { value: number | null; required: boolean; proofStatus: string };
  preferenceTier: { value: number | null; required: boolean; proofStatus: string };
  tierVerification: CpsatTierVerificationView | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sealedAt: string | null;
  tables: Array<{
    tableToken: string;
    capacity: number;
    occupied: number;
    available: number;
    reserved: boolean;
    locked: boolean;
    guestTokens: string[];
  }>;
  placements: Array<{
    guestToken: string;
    displayName: string | null;
    partyContext: string | null;
    tableToken: string | null;
    seatToken: string | null;
    reasonCode: string;
    reasonText: string;
    movement: CpsatPlacementMovement;
    warning: string | null;
  }>;
  changeComparison: {
    retained: number;
    moved: number;
    newlySeated: number;
    released: number;
    tableChanges: Array<{ tableToken: string; delta: number }>;
  };
  ruleAssurance: {
    hardRulesSatisfied: boolean;
    categories: Array<{ category: string; status: string }>;
  };
  approvalHistory: {
    proposalId: string | null;
    submission: { makerActor: string; at: string } | null;
    decision: {
      checkerActor: string;
      at: string;
      decision: string;
      reason: string | null;
    } | null;
    adoption: {
      adoptionId: string;
      version: number;
      at: string;
      status: string;
      supersedesAdoptionId: string | null;
    } | null;
  };
  operationalComparison: {
    currentAdoptionId: string | null;
    currentAssignmentHash: string | null;
    differsFromCandidate: boolean | null;
  };
  actions: {
    canSubmit: boolean;
    canApprove: boolean;
    canReject: boolean;
    canAdopt: boolean;
  };
};

/** Operator confirm copy for cancel — pure, no Node APIs. */
export function cancelConfirmCopy(): string {
  return "Stop this run and discard its current search result.";
}

/** Operator confirm copy for stop-and-keep-best — pure, no Node APIs. */
export function keepBestConfirmCopy(): string {
  return "Stop searching and keep the best complete plan found so far. It will still be checked before review.";
}
