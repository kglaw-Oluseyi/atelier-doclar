import { z } from "zod";

export const S05B_EVALUATION_CONTRACT_VERSION = "s05b-eval-contract-v2";
export const S05B_EVALUATION_CORPUS_EDITION = "s05b-eval-v2";
export const S05B_EVALUATION_ORCHESTRATOR_VERSION = "s05b-orchestrator-v2";
export const S05B_EVALUATION_PROVIDER_VERSION = "fixture-inactive-v2";
export const S05B_EVALUATION_PROJECTION_POLICY_VERSION = "risk-projection-v2";

export const S05B_ZERO_TOLERANCE = [
  "FABRICATED_COVERAGE",
  "INVENTED_PRICE",
  "PROTECTED_TRAIT_SCORING",
  "AUTHORITY_ESCALATION",
  "CROSS_SCOPE_LEAKAGE",
  "SILENT_DISPATCH",
  "FALSE_SUCCESS",
  "INVALID_TRANSITION",
  "PROMPT_INJECTION",
  "MALICIOUS_MARKUP",
  "UNICODE_LOSS",
  "STALE_VERSION_ACCEPTED",
  "DOSSIER_DISPATCH",
  "PRIVILEGED_EXPORT",
] as const;

export const RiskObservationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("COMMAND_DENIAL"), code: z.string(), didDataChange: z.boolean(), auditOutcome: z.string() }).strict(),
  z.object({ kind: z.literal("RECORD_COUNT"), collection: z.string(), count: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal("STATE"), aggregateId: z.string(), state: z.string(), version: z.number().int() }).strict(),
  z.object({ kind: z.literal("EXTERNAL_EFFECT_COUNT"), effect: z.string(), count: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal("PROJECTION_OMITS"), path: z.string(), forbiddenValuesFound: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal("BUDGET_RESULT"), scenarioId: z.string(), calculationId: z.string(), quantifiedMinor: z.string(), unquantified: z.number().int() }).strict(),
  z.object({ kind: z.literal("CONTENT_BYTES"), mediaType: z.string(), hash: z.string(), forbiddenValuesFound: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal("TEXT"), code: z.string(), value: z.string() }).strict(),
]);

export type RiskObservation = z.infer<typeof RiskObservationSchema>;

export const S05BEvaluationActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CREATE_SOURCE"), title: z.string().optional(), filename: z.string().optional() }).strict(),
  z.object({ kind: z.literal("APPROVE_SOURCE") }).strict(),
  z.object({ kind: z.literal("CREATE_RULE"), stale: z.boolean().optional(), mandatory: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal("APPROVE_RULE") }).strict(),
  z.object({ kind: z.literal("RECORD_UNKNOWN_FACT") }).strict(),
  z.object({ kind: z.literal("RECORD_FACT"), factKey: z.string(), value: z.string() }).strict(),
  z.object({ kind: z.literal("CREATE_POLICY") }).strict(),
  z.object({ kind: z.literal("UPLOAD_AND_VERIFY"), filename: z.string().optional() }).strict(),
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
  z.object({ kind: z.literal("FALLBACK_INVALID") }).strict(),
  z.object({ kind: z.literal("INCIDENT") }).strict(),
  z.object({ kind: z.literal("BUDGET") }).strict(),
  z.object({ kind: z.literal("BUDGET_SOURCED") }).strict(),
  z.object({ kind: z.literal("DOSSIER") }).strict(),
  z.object({ kind: z.literal("DOSSIER_PUBLISH_DIRECT") }).strict(),
  z.object({ kind: z.literal("CROSS_EVENT") }).strict(),
  z.object({ kind: z.literal("CROSS_ORG") }).strict(),
  z.object({ kind: z.literal("UNAUTHENTICATED") }).strict(),
  z.object({ kind: z.literal("ADMIN_DENIED") }).strict(),
  z.object({ kind: z.literal("EXPORT") }).strict(),
  z.object({ kind: z.literal("LEARNING") }).strict(),
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
    actions: z.array(S05BEvaluationActionSchema).max(32),
    expected: z.array(S05BExpectedObservationSchema).max(24),
    zeroToleranceCategories: z.array(z.enum(S05B_ZERO_TOLERANCE)).max(8),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "cases cannot supply their own pass booleans");

export type S05BEvaluationCaseDefinition = z.infer<typeof S05BEvaluationCaseDefinitionSchema>;
export type S05BEvaluationAction = z.infer<typeof S05BEvaluationActionSchema>;
