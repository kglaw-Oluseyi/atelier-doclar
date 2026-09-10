import { z } from "zod";

export const S05B_EVALUATION_CONTRACT_VERSION = "s05b-eval-contract-v1";
export const S05B_EVALUATION_CORPUS_EDITION = "s05b-eval-v1";
export const S05B_EVALUATION_ORCHESTRATOR_VERSION = "s05b-orchestrator-v1";
export const S05B_EVALUATION_PROVIDER_VERSION = "fixture-inactive-v1";
export const S05B_EVALUATION_PROJECTION_POLICY_VERSION = "risk-projection-v1";

export const S05B_ZERO_TOLERANCE = [
  "FABRICATED_COVERAGE",
  "INVENTED_PRICE",
  "PROTECTED_TRAIT_SCORING",
  "AUTHORITY_ESCALATION",
  "CROSS_SCOPE_LEAKAGE",
  "SILENT_DISPATCH",
  "FALSE_SUCCESS",
] as const;

export const S05BEvaluationActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CREATE_SOURCE") }).strict(),
  z.object({ kind: z.literal("APPROVE_SOURCE") }).strict(),
  z.object({ kind: z.literal("CREATE_RULE") }).strict(),
  z.object({ kind: z.literal("APPROVE_RULE") }).strict(),
  z.object({ kind: z.literal("RECORD_UNKNOWN_FACT") }).strict(),
  z.object({ kind: z.literal("RECORD_FACT"), factKey: z.string(), value: z.string() }).strict(),
  z.object({ kind: z.literal("CREATE_POLICY") }).strict(),
  z.object({ kind: z.literal("UPLOAD_AND_VERIFY") }).strict(),
  z.object({ kind: z.literal("EVALUATE") }).strict(),
  z.object({ kind: z.literal("RESIDUAL_DECISION") }).strict(),
  z.object({ kind: z.literal("CLAUSE_REVIEW") }).strict(),
  z.object({ kind: z.literal("VENDOR_ASSESS") }).strict(),
  z.object({ kind: z.literal("VENDOR_DECIDE") }).strict(),
  z.object({ kind: z.literal("ROSTER_STANDBY") }).strict(),
  z.object({ kind: z.literal("CHECKPOINTS") }).strict(),
  z.object({ kind: z.literal("MISSED_CHECKIN") }).strict(),
  z.object({ kind: z.literal("ESCALATE") }).strict(),
  z.object({ kind: z.literal("FALLBACK_PROPOSE") }).strict(),
  z.object({ kind: z.literal("FALLBACK_AUTHORISE") }).strict(),
  z.object({ kind: z.literal("INCIDENT") }).strict(),
  z.object({ kind: z.literal("BUDGET") }).strict(),
  z.object({ kind: z.literal("DOSSIER") }).strict(),
  z.object({ kind: z.literal("CROSS_EVENT") }).strict(),
]);

export const S05BExpectedObservationSchema = z
  .object({
    code: z.string().min(2).max(80),
    summary: z.string().max(400),
  })
  .strict();

export const S05BEvaluationCaseDefinitionSchema = z
  .object({
    id: z.string().min(4).max(80),
    edition: z.literal(S05B_EVALUATION_CORPUS_EDITION),
    family: z.string().min(2).max(80),
    title: z.string().min(4).max(200),
    actions: z.array(S05BEvaluationActionSchema).max(24),
    expected: z.array(S05BExpectedObservationSchema).max(24),
    zeroToleranceCategories: z.array(z.enum(S05B_ZERO_TOLERANCE)).max(8),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "cases cannot supply their own pass booleans");

export type S05BEvaluationCaseDefinition = z.infer<typeof S05BEvaluationCaseDefinitionSchema>;
