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
