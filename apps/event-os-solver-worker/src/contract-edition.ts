/**
 * Canonical contract edition constants (P1 groundwork).
 * Full JSON Schema shared with Python lands with P1 implementation.
 */
export const SOLVER_CONTRACT_VERSION = "cpsat-contract-v0";
export const SOLVER_MODEL_VERSION = "cpsat-model-v0";
export const SOLVER_ARCHITECTURE = "ts-supervisor+python-ortools-child";

export const PRODUCT_RESULTS = [
  "OPTIMAL",
  "FEASIBLE",
  "INFEASIBLE",
  "SEARCH_INCOMPLETE",
  "TIMED_OUT",
  "INVALID_INPUT",
  "SOLVER_FAULT",
  "CANCELLED",
] as const;

export type ProductResult = (typeof PRODUCT_RESULTS)[number];
