/**
 * CP-SAT canonical contract editions and product result vocabulary.
 * Shared with Python child via JSON Schema under apps/event-os-solver-worker/schemas/.
 */
export const CPSAT_REQUEST_CONTRACT = "md.seating.solve.request/1" as const;
export const CPSAT_RESPONSE_CONTRACT = "md.seating.solve.response/1" as const;
export const CPSAT_MODEL_VERSION = "cpsat-model-v1" as const;
export const CPSAT_ENGINE_ID = "ortools-cpsat" as const;
export const CPSAT_ORTOOLS_VERSION = "9.15.6755" as const;
export const CPSAT_PYTHON_VERSION = "3.12.14" as const;

export const CPSAT_PRODUCT_RESULTS = [
  "OPTIMAL",
  "FEASIBLE",
  "INFEASIBLE",
  "SEARCH_INCOMPLETE",
  "TIMED_OUT",
  "INVALID_INPUT",
  "SOLVER_FAULT",
  "CANCELLED",
] as const;

export type CpsatProductResult = (typeof CPSAT_PRODUCT_RESULTS)[number];

/** Truthful evidence grades for abnormal / infeasible results. */
export const CPSAT_EVIDENCE_GRADES = [
  "CERTIFIED",
  "SOLVER_PROOF",
  "DIAGNOSTIC",
  "OPTIMAL_PROOF",
  "FEASIBLE_VERIFIED",
  "PROOF",
] as const;
export type CpsatEvidenceGrade = (typeof CPSAT_EVIDENCE_GRADES)[number];

export const CPSAT_CERTIFICATE_TYPES = [
  "EMPTY_DOMAIN",
  "LOCKS_SPLIT_UNIT",
  "APART_WITHIN_UNIT",
  "TOTAL_CAPACITY",
  "HALL_VIOLATION",
  "APART_PIGEONHOLE",
] as const;
export type CpsatCertificateType = (typeof CPSAT_CERTIFICATE_TYPES)[number];

export const CPSAT_DIAGNOSTIC_LAYERS = [
  "L0",
  "L1",
  "L1P",
  "L2",
  "L3",
  "L4_CORE",
  "L4_MCS",
  "L4_MAXSEAT",
] as const;
export type CpsatDiagnosticLayer = (typeof CPSAT_DIAGNOSTIC_LAYERS)[number];

export const CPSAT_STOP_MODES = ["CANCEL", "KEEP_BEST"] as const;
export type CpsatStopMode = (typeof CPSAT_STOP_MODES)[number];

export const CPSAT_COUNTERFACTUAL_RESULT_CODES = [
  "PROHIBITED_VISIBLE_RULE",
  "PROHIBITED_RESTRICTED_RULE",
  "COMPLETE_SEATING_IMPOSSIBLE",
  "FEASIBLE_WITH_TIER_DELTAS",
  "SEARCH_INCOMPLETE",
  "CANDIDATE_STALE",
] as const;
export type CpsatCounterfactualResultCode = (typeof CPSAT_COUNTERFACTUAL_RESULT_CODES)[number];

export const CPSAT_DIAGNOSTIC_BUDGET_EDITION = "cpsat-diag-budget-v1" as const;

export const CPSAT_PREFERENCE_BANDS = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 10,
  PRINCIPAL: 30,
} as const;

export type CpsatPreferenceBand = keyof typeof CPSAT_PREFERENCE_BANDS;

export const CPSAT_SHORT_REASON_CODES = [
  "LOCKED_SEAT",
  "LOCKED_TABLE",
  "RESERVED",
  "ONLY_PERMITTED",
  "MOVED_RULE",
  "RETAINED",
  "GROUP",
  "SEPARATED",
  "MOVED_FIT",
  "PREF_MET",
  "EQUAL_OPTIONS",
  "GLOBAL",
] as const;

export type CpsatShortReasonCode = (typeof CPSAT_SHORT_REASON_CODES)[number];

export const CPSAT_SHORT_REASON_TEXT: Record<CpsatShortReasonCode, string> = {
  LOCKED_SEAT: "Locked to this seat",
  LOCKED_TABLE: "Locked to this table",
  RESERVED: "Reserved placement",
  ONLY_PERMITTED: "Only permitted table",
  MOVED_RULE: "Moved for mandatory rule",
  RETAINED: "Existing seat retained",
  GROUP: "Seated with required group",
  SEPARATED: "Separated by mandatory rule",
  MOVED_FIT: "Moved to fit changes",
  PREF_MET: "Preference met",
  EQUAL_OPTIONS: "Equal options · stable choice",
  GLOBAL: "Placed by whole-plan optimisation",
};
