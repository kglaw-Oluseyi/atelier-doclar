import { z } from "zod";
import { exactHash } from "./eec-hash.js";
import { SEATING_SOLVER_VERSION } from "./seating-solver-types.js";

export const S06_EVALUATION_CONTRACT_VERSION = "s06-eval-contract-v1";
export const S06_EVALUATION_CORPUS_EDITION = "s06-eval-v1";
export const S06_EVALUATION_PROJECTION_VERSION = "seating-projection-v1";

export const S06_CASE_IDS = [
  "S06-ISO-01",
  "S06-ISO-02",
  "S06-ISO-03",
  "S06-ID-01",
  "S06-ID-02",
  "S06-IN-01",
  "S06-IN-02",
  "S06-IN-03",
  "S06-IN-04",
  "S06-IN-05",
  "S06-PRI-01",
  "S06-PRI-02",
  "S06-PRI-03",
  "S06-PRI-04",
  "S06-LAY-01",
  "S06-LAY-02",
  "S06-CAP-01",
  "S06-CAP-02",
  "S06-HARD-01",
  "S06-HARD-02",
  "S06-HARD-03",
  "S06-HARD-04",
  "S06-WGT-01",
  "S06-WGT-02",
  "S06-RES-01",
  "S06-RES-02",
  "S06-RES-03",
  "S06-SOL-01",
  "S06-SOL-02",
  "S06-SOL-03",
  "S06-SOL-04",
  "S06-RUN-01",
  "S06-RUN-02",
  "S06-RUN-03",
  "S06-EDIT-01",
  "S06-EDIT-02",
  "S06-EDIT-03",
  "S06-EDIT-04",
  "S06-EDIT-05",
  "S06-AUTH-01",
  "S06-AUTH-02",
  "S06-AUTH-03",
  "S06-AUTH-04",
  "S06-AUTH-05",
  "S06-AUTH-06",
  "S06-PUB-01",
  "S06-PUB-02",
  "S06-PUB-03",
  "S06-PUB-04",
  "S06-UI-01",
  "S06-UI-02",
  "S06-EVAL-01",
  "S06-EVAL-02",
  "S06-MUT-01",
  "S06-MUT-02",
  "S06-MUT-03",
  "S06-MUT-04",
  "S06-MUT-05",
  "S06-MUT-06",
] as const;

export type S06CaseId = (typeof S06_CASE_IDS)[number];

export const S06ObservationSchema = z
  .object({
    kind: z.string().min(1),
    name: z.string().min(1),
    value: z.unknown(),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "observations cannot supply pass booleans");

export const S06AssertionSchema = z
  .object({
    name: z.string().min(1),
    expected: z.unknown(),
    compare: z.enum(["equals", "includes", "notIncludes", "gte", "truthy", "falsy"]),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "cases cannot supply their own pass booleans");

export const S06CaseDefinitionSchema = z
  .object({
    id: z.enum(S06_CASE_IDS),
    title: z.string().min(1),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "cases cannot supply their own pass booleans");

export type S06Observation = z.infer<typeof S06ObservationSchema>;
export type S06Assertion = z.infer<typeof S06AssertionSchema>;

export function s06CorpusHash(): string {
  return exactHash({
    edition: S06_EVALUATION_CORPUS_EDITION,
    contract: S06_EVALUATION_CONTRACT_VERSION,
    solver: SEATING_SOLVER_VERSION,
    projection: S06_EVALUATION_PROJECTION_VERSION,
    cases: S06_CASE_IDS,
  });
}

export function assertionHolds(observation: S06Observation | undefined, assertion: S06Assertion): boolean {
  if (!observation) return false;
  const actual = observation.value;
  if (assertion.compare === "equals") return JSON.stringify(actual) === JSON.stringify(assertion.expected);
  if (assertion.compare === "includes") return JSON.stringify(actual).includes(String(assertion.expected));
  if (assertion.compare === "notIncludes") return !JSON.stringify(actual).includes(String(assertion.expected));
  if (assertion.compare === "gte") return Number(actual) >= Number(assertion.expected);
  if (assertion.compare === "truthy") return Boolean(actual);
  return !actual;
}
