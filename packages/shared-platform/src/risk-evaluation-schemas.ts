import { z } from "zod";

export const S05B_EVALUATION_CONTRACT_VERSION = "s05b-eval-contract-v6";
export const S05B_EVALUATION_CORPUS_EDITION = "s05b-eval-v6";
export const S05B_EVALUATION_ORCHESTRATOR_VERSION = "s05b-orchestrator-v6";
export const S05B_EVALUATION_PROVIDER_VERSION = "fixture-inactive-v6";
export const S05B_EVALUATION_PROJECTION_POLICY_VERSION = "risk-projection-v6";

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
  z
    .object({
      kind: z.literal("INVOCATIONS"),
      action: z.string(),
      firstResultId: z.string(),
      secondResultId: z.string(),
      firstApplication: z.string(),
      secondApplication: z.string(),
      firstGeneratedAt: z.string(),
      secondGeneratedAt: z.string(),
      firstRecordCount: z.number().int(),
      secondRecordCount: z.number().int(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("UNICODE"),
      stored: z.string(),
      input: z.string(),
      nfcEqual: z.boolean(),
      requiredGlyphsPresent: z.boolean(),
    })
    .strict(),
  z.object({ kind: z.literal("CLASSIFICATION"), recordId: z.string(), classification: z.string() }).strict(),
  z.object({ kind: z.literal("TRANSITION"), aggregateId: z.string(), from: z.string(), to: z.string(), actorId: z.string(), allowed: z.boolean() }).strict(),
  z.object({ kind: z.literal("HASH"), name: z.string(), value: z.string(), matches: z.boolean() }).strict(),
  z.object({ kind: z.literal("SCOPE"), organisationId: z.string(), eventId: z.string().optional(), leaked: z.boolean() }).strict(),
]);

export type RiskObservation = z.infer<typeof RiskObservationSchema>;

export const S05BEvaluationActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CREATE_SOURCE"), title: z.string().optional(), filename: z.string().optional() }).strict(),
  z.object({ kind: z.literal("APPROVE_SOURCE") }).strict(),
  z.object({ kind: z.literal("CREATE_RULE"), stale: z.boolean().optional(), mandatory: z.boolean().optional(), jurisdiction: z.string().optional(), reviewExpired: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal("APPROVE_RULE") }).strict(),
  z.object({ kind: z.literal("RECORD_UNKNOWN_FACT") }).strict(),
  z.object({ kind: z.literal("RECORD_FACT"), factKey: z.string(), value: z.string() }).strict(),
  z.object({ kind: z.literal("CREATE_POLICY") }).strict(),
  z.object({ kind: z.literal("UPLOAD_AND_VERIFY"), filename: z.string().optional() }).strict(),
  z.object({ kind: z.literal("CREATE_EXPIRED_POLICY") }).strict(),
  z.object({ kind: z.literal("CREATE_CONFLICTING_CERTIFICATES") }).strict(),
  z.object({ kind: z.literal("PARTY_MISMATCH") }).strict(),
  z.object({ kind: z.literal("EVALUATE") }).strict(),
  z.object({ kind: z.literal("RESIDUAL_DECISION") }).strict(),
  z.object({ kind: z.literal("RESIDUAL_APPROVE") }).strict(),
  z.object({ kind: z.literal("RESIDUAL_REPLAY") }).strict(),
  z.object({ kind: z.literal("CHANGE_FACT"), factKey: z.string(), value: z.string() }).strict(),
  z.object({ kind: z.literal("EXPIRE_RESIDUAL") }).strict(),
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
  z.object({ kind: z.literal("RECORD_NOTES") }).strict(),
  z.object({ kind: z.literal("LEARNING") }).strict(),
  z.object({ kind: z.literal("BUDGET") }).strict(),
  z.object({ kind: z.literal("BUDGET_SOURCED") }).strict(),
  z.object({ kind: z.literal("BUDGET_REPLAY") }).strict(),
  z.object({ kind: z.literal("STALE_BUDGET") }).strict(),
  z.object({ kind: z.literal("DOSSIER") }).strict(),
  z.object({ kind: z.literal("DOSSIER_PUBLISH_DIRECT") }).strict(),
  z.object({ kind: z.literal("CROSS_EVENT") }).strict(),
  z.object({ kind: z.literal("CROSS_ORG") }).strict(),
  z.object({ kind: z.literal("UNAUTHENTICATED") }).strict(),
  z.object({ kind: z.literal("ADMIN_DENIED") }).strict(),
  z.object({ kind: z.literal("EXPORT") }).strict(),
  z.object({ kind: z.literal("AUDITOR_DOSSIER") }).strict(),
  z.object({ kind: z.literal("DOSSIER_LAST_GOOD") }).strict(),
  z.object({ kind: z.literal("CLIENT_GRANT") }).strict(),
  z.object({ kind: z.literal("CLIENT_GRANT_REVOKE") }).strict(),
  z.object({ kind: z.literal("LEARNING_DECIDE") }).strict(),
  z.object({ kind: z.literal("SOURCE_SELF_APPROVE") }).strict(),
  z.object({ kind: z.literal("INCIDENT_ENTRIES") }).strict(),
  z.object({ kind: z.literal("BUDGET_CONCURRENT_STALE") }).strict(),
  z.object({ kind: z.literal("RETAINED_AUTHORITY_HISTORY") }).strict(),
  z.object({ kind: z.literal("AUTHORITY_REVIEW_SUCCESSOR") }).strict(),
  z.object({ kind: z.literal("CLASSIFY_FIXTURE") }).strict(),
  z.object({ kind: z.literal("WITHDRAW_FIXTURE") }).strict(),
  z.object({ kind: z.literal("BATCH_WITHDRAW_REJECT") }).strict(),
  z.object({ kind: z.literal("INTERRUPTED_FIXTURE_LINEAGE") }).strict(),
]);

export const S05BAssertionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("COMMAND_DENIAL"), code: z.string(), didDataChange: z.literal(false) }).strict(),
  z.object({ kind: z.literal("RECORD_COUNT"), collection: z.string(), min: z.number().int().optional(), eq: z.number().int().optional() }).strict(),
  z.object({ kind: z.literal("STATE"), state: z.string() }).strict(),
  z.object({ kind: z.literal("EXTERNAL_EFFECT_COUNT"), effect: z.string(), count: z.number().int() }).strict(),
  z.object({ kind: z.literal("PROJECTION_OMITS"), path: z.string(), forbiddenEmpty: z.boolean() }).strict(),
  z.object({ kind: z.literal("BUDGET_RESULT"), quantifiedMinor: z.string().optional(), unquantifiedMin: z.number().int().optional() }).strict(),
  z.object({ kind: z.literal("CONTENT_BYTES"), mediaType: z.string(), forbiddenEmpty: z.boolean() }).strict(),
  z.object({ kind: z.literal("INVOCATIONS"), action: z.string(), sameIds: z.boolean(), secondApplication: z.literal("REPLAYED") }).strict(),
  z.object({ kind: z.literal("UNICODE"), requiredSubstring: z.string(), storedMustBeNfc: z.boolean(), inputWasDecomposed: z.boolean() }).strict(),
  z.object({ kind: z.literal("CLASSIFICATION"), classification: z.string() }).strict(),
  z.object({ kind: z.literal("TRANSITION"), to: z.string(), allowed: z.boolean() }).strict(),
  z.object({ kind: z.literal("HASH"), name: z.string(), matches: z.boolean() }).strict(),
  z.object({ kind: z.literal("SCOPE"), leaked: z.literal(false) }).strict(),
]);

export const S05BEvaluationCaseDefinitionSchema = z
  .object({
    id: z.string().min(4).max(80),
    edition: z.literal(S05B_EVALUATION_CORPUS_EDITION),
    family: z.string().min(2).max(80),
    title: z.string().min(4).max(200),
    actions: z.array(S05BEvaluationActionSchema).max(32),
    expected: z.array(S05BAssertionSchema).max(24),
    zeroToleranceCategories: z.array(z.enum(S05B_ZERO_TOLERANCE)).max(8),
  })
  .strict()
  .refine((value) => !JSON.stringify(value).includes('"passed":'), "cases cannot supply their own pass booleans");

export type S05BEvaluationCaseDefinition = z.infer<typeof S05BEvaluationCaseDefinitionSchema>;
export type S05BEvaluationAction = z.infer<typeof S05BEvaluationActionSchema>;
export type S05BAssertion = z.infer<typeof S05BAssertionSchema>;
