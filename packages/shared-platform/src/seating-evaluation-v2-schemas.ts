import { z } from "zod";
import { exactHash } from "./eec-hash.js";
import { SEATING_V2_PREVIOUS_SOLVER_VERSION, SEATING_V2_SOLVER_VERSION, SEATING_V2_VALIDATOR_VERSION } from "./seating-v2-schemas.js";

export const S06_V3_EVALUATION_CONTRACT_VERSION = "s06-eval-contract-v2";
export const S06_V3_EVALUATION_CORPUS_EDITION = "s06-eval-v3";
export const S06_V3_CORPUS_HASH = "e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c";

export const S06_V2_EVALUATION_CONTRACT_VERSION = "s06-eval-contract-v4";
export const S06_V2_EVALUATION_CORPUS_EDITION = "s06-eval-v4";
export const S06_V2_CORPUS_HASH = "0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369";
export const S06_V2_EVALUATION_PROJECTION_VERSION = "seating-projection-v2";
export const S06_V1_STALE_REASON = "legacy isolated or incomplete production-path assurance";
export const S06_V2_PRIOR_CORPUS_STALE_REASON =
  "prior s06-eval-v3 corpus is STALE after table-identity, solver-claim honesty and capacity-truth change";

export const S06_V3_CASE_IDS = [
  "S06V2-PATH-01",
  "S06V2-PATH-02",
  "S06V2-PATH-03",
  "S06V2-PATH-04",
  "S06V2-PATH-05",
  "S06V2-PATH-06",
  "S06V2-PATH-07",
  "S06V2-PATH-08",
  "S06V2-PATH-09",
  "S06V2-PATH-10",
  "S06V2-M01",
  "S06V2-M02",
  "S06V2-M03",
  "S06V2-M04",
  "S06V2-M05",
  "S06V2-M06",
  "S06V2-M07",
  "S06V2-M08",
  "S06V2-M09",
  "S06V2-M10",
  "S06V2-M11",
  "S06V2-M12",
  "S06V2-M13",
  "S06V2-M14",
  "S06V2-M15",
  "S06V2-M16",
  "S06V2-M17",
  "S06V2-M18",
  "S06V2-M19",
  "S06V2-M20",
  "S06V2-PATH-11",
  "S06V2-PATH-12",
  "S06V2-PATH-13",
  "S06V2-M21",
  "S06V2-M22",
] as const;

export const S06_V4_CASE_IDS = [
  "S06V4-PATH-01",
  "S06V4-PATH-02",
  "S06V4-PATH-03",
  "S06V4-PATH-04",
  "S06V4-PATH-05",
  "S06V4-PATH-06",
  "S06V4-M01",
  "S06V4-M02",
  "S06V4-M03",
  "S06V4-M04",
  "S06V4-M05",
  "S06V4-M06",
  "S06V4-M07",
  "S06V4-M08",
] as const;

export const S06_V2_CASE_IDS = [...S06_V3_CASE_IDS, ...S06_V4_CASE_IDS] as const;

export type S06V3CaseId = (typeof S06_V3_CASE_IDS)[number];
export type S06V4CaseId = (typeof S06_V4_CASE_IDS)[number];
export type S06V2CaseId = (typeof S06_V2_CASE_IDS)[number];

export const S06V2ObservationSchema = z
  .object({
    kind: z.string().min(1),
    name: z.string().min(1),
    value: z.unknown(),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "observations cannot supply pass booleans");

export const S06V2AssertionSchema = z
  .object({
    name: z.string().min(1),
    expected: z.unknown(),
    compare: z.enum(["equals", "includes", "notIncludes", "gte", "truthy", "falsy"]),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "cases cannot supply their own pass booleans");

export type S06V2Observation = z.infer<typeof S06V2ObservationSchema>;
export type S06V2Assertion = z.infer<typeof S06V2AssertionSchema>;

export type S06V2CaseOutcome = {
  caseId: S06V2CaseId;
  observations: S06V2Observation[];
  assertions: S06V2Assertion[];
  status: "PASSED" | "FAILED" | "ERROR";
};

export type S06V2EvaluationResult = {
  corpusEdition: typeof S06_V2_EVALUATION_CORPUS_EDITION;
  corpusHash: string;
  contractVersion: typeof S06_V2_EVALUATION_CONTRACT_VERSION;
  solverVersion: string;
  configHash: string;
  validatorVersion: string;
  projectionVersion: typeof S06_V2_EVALUATION_PROJECTION_VERSION;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  status: "PASSED" | "FAILED" | "ERROR";
  cases: S06V2CaseOutcome[];
};

export function s06V3CorpusHash(): string {
  return exactHash({
    edition: S06_V3_EVALUATION_CORPUS_EDITION,
    contract: S06_V3_EVALUATION_CONTRACT_VERSION,
    solver: SEATING_V2_PREVIOUS_SOLVER_VERSION,
    validator: SEATING_V2_VALIDATOR_VERSION,
    projection: S06_V2_EVALUATION_PROJECTION_VERSION,
    cases: S06_V3_CASE_IDS,
  });
}

export function s06V2CorpusHash(): string {
  return exactHash({
    edition: S06_V2_EVALUATION_CORPUS_EDITION,
    contract: S06_V2_EVALUATION_CONTRACT_VERSION,
    solver: SEATING_V2_SOLVER_VERSION,
    validator: SEATING_V2_VALIDATOR_VERSION,
    projection: S06_V2_EVALUATION_PROJECTION_VERSION,
    cases: S06_V2_CASE_IDS,
  });
}

export function seatingV2EvalReadiness(input: {
  status?: string;
  corpusEdition?: string;
  caseCount?: number;
  failedCount?: number;
}): "RELEASE_READY" | "BLOCKED" {
  if (!input.status || !input.corpusEdition || input.caseCount !== S06_V2_CASE_IDS.length) return "BLOCKED";
  if (input.corpusEdition !== S06_V2_EVALUATION_CORPUS_EDITION) return "BLOCKED";
  if (["UNRUN", "RUNNING", "STALE", "INCOMPATIBLE", "FAILED", "ERROR"].includes(input.status)) return "BLOCKED";
  if (input.status !== "PASSED" || (input.failedCount ?? 1) !== 0) return "BLOCKED";
  return "RELEASE_READY";
}
