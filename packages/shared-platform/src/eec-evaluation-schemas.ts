import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import {
  ConfirmationStateSchema,
  ConsentDimensionSchema,
  CoverageStateSchema,
  InterviewSessionStateSchema,
} from "./eec-schemas.js";
import { IsoDatetimeSchema, NonEmptySchema, OrganisationIdSchema, PersonIdSchema, UuidSchema } from "./schemas.js";

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

export const EVALUATION_CONTRACT_VERSION = "s05a-eval-contract-v1";
export const EVALUATION_CORPUS_EDITION = "s05a-eval-v3";
export const EVALUATION_ORCHESTRATOR_VERSION = "s05a-orchestrator-v2";
export const EVALUATION_PROVIDER_VERSION = "fixture-inactive-v1";
export const EVALUATION_PROJECTION_POLICY_VERSION = "client-projection-v2";

export const EvaluationCaseFamilySchema = z.enum([
  "WEDDING",
  "CORPORATE",
  "PRIVATE_DINNER",
  "FUNERAL_MEMORIAL",
  "CHIEFTAINCY",
  "DESTINATION",
  "SHORT_LEAD",
  "MULTI_CEREMONY",
  "MULTI_PRINCIPAL",
  "BUDGET_DISCLOSURE",
  "ACCESSIBILITY",
  "CULTURAL_RELIGIOUS",
  "CONFIDENTIAL_SURPRISE",
  "INCOMPLETE",
  "CONTRADICTION",
  "CORRECTION",
  "STALE_INFORMATION",
  "MULTILINGUAL_UNICODE",
  "PROMPT_INJECTION",
  "PROVIDER_FAILURE",
  "INTERRUPT_RESUME",
  "CONSENT_WITHDRAWAL",
  "SCOPE_ISOLATION",
  "PROJECTION_SAFETY",
]);

export const ZeroToleranceCategorySchema = z.enum([
  "FABRICATED_CLIENT_STATEMENT",
  "INVENTED_GOVERNING_PRICE",
  "PROTECTED_TRAIT_INFERENCE",
  "CONSENT_BYPASS",
  "STAFF_ONLY_DISCLOSURE",
  "CROSS_ENGAGEMENT_LEAKAGE",
  "CROSS_ORGANISATION_LEAKAGE",
  "AI_OPERATIONAL_AUTHORITY",
  "SILENT_CONFLICT_RESOLUTION",
  "PROMPT_INJECTION_AUTHORITY_CHANGE",
  "FALSE_SUCCESS",
]);

export const EvaluationActionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("RECORD_CONSENT"),
      participantRef: z.string().optional(),
      dimension: ConsentDimensionSchema,
      decision: z.enum(["GRANTED", "DECLINED", "WITHDRAWN"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("CREATE_SESSION"),
      mode: z.enum(["STAFF_LED", "CLIENT_LED", "OFFLINE_NOTES", "FOLLOW_UP"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("TRANSITION_SESSION"),
      action: z.enum(["READY", "START", "PAUSE", "RESUME", "COMPLETE"]),
      expectErrorCode: z.string().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("ADD_TURN"),
      speakerRef: z.string(),
      text: z.string(),
      topicKey: z.string().optional(),
    })
    .strict(),
  z.object({ kind: z.literal("REQUEST_NEXT_QUESTION") }).strict(),
  z.object({ kind: z.literal("EXTRACT_ASSERTIONS") }).strict(),
  z
    .object({
      kind: z.literal("REVIEW_ASSERTION"),
      topicKey: z.string(),
      decision: z.enum(["ACCEPT_STAFF_REVIEWED", "REJECT", "REQUEST_CLARIFICATION"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("CLIENT_ACTION"),
      action: z.enum(["CONFIRM", "CORRECT", "DISPUTE", "DEFER", "PREFER_NOT"]),
      topicKey: z.string(),
      narrative: z.string().optional(),
    })
    .strict(),
  z.object({ kind: z.literal("RUN_BUDGET"), scenario: z.string() }).strict(),
  z.object({ kind: z.literal("PROJECT_CLIENT") }).strict(),
  z.object({ kind: z.literal("PROJECT_STAFF") }).strict(),
  z.object({ kind: z.literal("PROJECT_AUDITOR") }).strict(),
  z.object({ kind: z.literal("PROJECT_ADMIN") }).strict(),
  z.object({ kind: z.literal("PROJECT_OTHER_ENGAGEMENT") }).strict(),
]);

export const ExpectedObservationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ASSERTION_PRESENT"),
      topicKey: z.string(),
      state: ConfirmationStateSchema.optional(),
    })
    .strict(),
  z.object({ kind: z.literal("ASSERTION_ABSENT"), topicKey: z.string() }).strict(),
  z.object({ kind: z.literal("SOURCE_QUOTE_EQUALS"), topicKey: z.string(), text: z.string() }).strict(),
  z.object({ kind: z.literal("COVERAGE_STATE"), topicKey: z.string(), state: CoverageStateSchema }).strict(),
  z.object({ kind: z.literal("CONFLICT_OPEN"), topicKey: z.string() }).strict(),
  z.object({ kind: z.literal("CONFLICT_NOT_SILENTLY_RESOLVED"), topicKey: z.string() }).strict(),
  z.object({ kind: z.literal("NEXT_QUESTION_IS"), questionKey: z.string() }).strict(),
  z.object({ kind: z.literal("NEXT_QUESTION_NOT"), questionKey: z.string() }).strict(),
  z.object({ kind: z.literal("QUESTION_NOT_REPEATED"), questionKey: z.string() }).strict(),
  z.object({ kind: z.literal("SESSION_STATE_STATE"), state: InterviewSessionStateSchema }).strict(),
  z.object({ kind: z.literal("ERROR_CODE_OBSERVED"), actionIndex: z.number().int(), code: z.string() }).strict(),
  z.object({ kind: z.literal("NO_GOVERNING_AI_WRITE") }).strict(),
  z.object({ kind: z.literal("NO_GOVERNING_PRICE_WITHOUT_EVIDENCE") }).strict(),
  z.object({ kind: z.literal("NO_PROTECTED_TRAIT_INFERENCE") }).strict(),
  z.object({ kind: z.literal("CLIENT_PROJECTION_OMITS"), field: z.string() }).strict(),
  z.object({ kind: z.literal("OTHER_ENGAGEMENT_OMITS"), valueRef: z.string() }).strict(),
  z.object({ kind: z.literal("UNICODE_EQUALS"), valueRef: z.string(), text: z.string() }).strict(),
  z.object({ kind: z.literal("AUDIT_OUTCOME"), actionType: z.string(), outcome: z.string() }).strict(),
]);

export const EvaluationPrincipalSeedSchema = z
  .object({
    ref: z.string().min(1).max(40),
    displayName: z.string().min(1).max(120),
    claimedRole: z.string().min(1).max(80),
    authorityClaim: z.enum(["PRINCIPAL", "AUTHORISED_DELEGATE", "RELATIVE", "UNAUTHORISED", "UNKNOWN"]),
  })
  .strict();

export const EvaluationStaffNoteSeedSchema = z
  .object({
    kind: z.enum(["STAFF_NOTE", "INTERNAL_MARGIN", "VENDOR_NEGOTIATION", "CLIENT_SAFE"]),
    text: z.string().min(1).max(2000),
    topicKey: z.string().min(1).max(80),
    disclosureClass: z
      .enum([
        "OPERATIONAL",
        "CLIENT_VISIBLE",
        "FINANCIAL_RESTRICTED",
        "HEALTH_ACCESSIBILITY_RESTRICTED",
        "SECURITY_RESTRICTED",
        "CULTURAL_RELIGIOUS_RESTRICTED",
        "CONFIDENTIAL_SURPRISE",
        "PRINCIPAL_PRIVATE",
      ])
      .optional(),
  })
  .strict();

export const EvaluationSeedSchema = z
  .object({
    eventType: z.string().min(1).max(80),
    displayReference: z.string().min(1).max(160),
    organisationRef: z.enum(["PRIMARY", "SECONDARY"]),
    secondEngagement: z.boolean(),
    secondOrganisation: z.boolean(),
    principals: z.array(EvaluationPrincipalSeedSchema).min(1),
    staffNotes: z.array(EvaluationStaffNoteSeedSchema),
    knownEventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    providerMode: z.enum(["DETERMINISTIC", "UNAVAILABLE"]),
    stripPriceEvidence: z.boolean(),
    stalePriceEvidence: z.boolean(),
    markStaleTopic: z.string().optional(),
    forceStaleVersion: z.boolean(),
    attemptGoverningAsAi: z.boolean(),
    spoofStartAsOfflineNotes: z.boolean(),
    roadmapLeadMode: z.enum(["LONG", "STANDARD", "SHORT"]).optional(),
    roadmapAvailableDays: z.string().optional(),
    otherValueRef: z.string().optional(),
  })
  .strict();

export const EvaluationCaseDefinitionSchema = z
  .object({
    id: z.string().regex(/^EVAL-S05A-[A-Z0-9-]+$/),
    edition: z.string().min(1),
    family: EvaluationCaseFamilySchema,
    title: z.string().min(1).max(160),
    purpose: z.string().min(1).max(500),
    eventType: z.string().min(1),
    seed: EvaluationSeedSchema,
    actions: z.array(EvaluationActionSchema).min(1),
    expected: z.array(ExpectedObservationSchema).min(1),
    zeroToleranceCategories: z.array(ZeroToleranceCategorySchema),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const EvaluationObservationResultSchema = z
  .object({
    kind: z.enum([
      "ASSERTION_PRESENT",
      "ASSERTION_ABSENT",
      "SOURCE_QUOTE_EQUALS",
      "COVERAGE_STATE",
      "CONFLICT_OPEN",
      "CONFLICT_NOT_SILENTLY_RESOLVED",
      "NEXT_QUESTION_IS",
      "NEXT_QUESTION_NOT",
      "QUESTION_NOT_REPEATED",
      "SESSION_STATE_STATE",
      "ERROR_CODE_OBSERVED",
      "NO_GOVERNING_AI_WRITE",
      "NO_GOVERNING_PRICE_WITHOUT_EVIDENCE",
      "NO_PROTECTED_TRAIT_INFERENCE",
      "CLIENT_PROJECTION_OMITS",
      "OTHER_ENGAGEMENT_OMITS",
      "UNICODE_EQUALS",
      "AUDIT_OUTCOME",
    ]),
    passed: z.boolean(),
    code: z.string().min(1).max(80),
    expectedSummary: z.string().min(1).max(400),
    observedSummary: z.string().min(1).max(400),
    relatedRecordIds: z.array(z.string().max(80)),
  })
  .strict();

export const ZeroToleranceFailureSchema = z
  .object({
    category: ZeroToleranceCategorySchema,
    caseId: z.string().regex(/^EVAL-S05A-[A-Z0-9-]+$/),
    observationCode: z.string().min(1).max(80),
    summary: z.string().min(1).max(400),
  })
  .strict();

export const EvaluationRunStatusSchema = z.enum(["QUEUED", "RUNNING", "PASSED", "FAILED", "CANCELLED"]);
export const EvaluationCaseVerdictSchema = z.enum(["PASSED", "FAILED", "ERROR"]);
export const S05AEvaluationReadinessStatusSchema = z.enum([
  "UNRUN",
  "RUNNING",
  "PASSED",
  "FAILED",
  "STALE",
  "INCOMPATIBLE",
]);

export const ExecutableAiEvaluationRunSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    corpusEdition: NonEmptySchema.max(80),
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/),
    orchestratorVersion: NonEmptySchema.max(80),
    providerVersion: NonEmptySchema.max(80),
    projectionPolicyVersion: NonEmptySchema.max(80),
    evaluationContractVersion: NonEmptySchema.max(80),
    applicationSha: z.string().min(1).max(64),
    status: EvaluationRunStatusSchema,
    caseCount: z.number().int().nonnegative(),
    passedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    zeroToleranceFailed: z.boolean(),
    zeroToleranceFailures: z.array(ZeroToleranceFailureSchema),
    startedAt: IsoDatetimeSchema.optional(),
    completedAt: IsoDatetimeSchema.optional(),
    requestedByPersonId: PersonIdSchema,
    correlationId: NonEmptySchema.max(80),
    idempotencyKey: NonEmptySchema.max(160),
    compatibilityStatus: z.enum(["CURRENT", "INCOMPATIBLE", "LEGACY"]),
    modelVersion: NonEmptySchema.max(80),
    metrics: z.record(z.string(), z.string()),
    ...versioned,
  })
  .strict();

export const AiEvaluationCaseResultSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    runId: UuidSchema,
    caseId: z.string().regex(/^EVAL-S05A-[A-Z0-9-]+$/),
    caseHash: z.string().regex(/^[a-f0-9]{64}$/),
    family: EvaluationCaseFamilySchema,
    verdict: EvaluationCaseVerdictSchema,
    observations: z.array(EvaluationObservationResultSchema),
    failureCodes: z.array(z.string().max(80)),
    zeroToleranceFailures: z.array(ZeroToleranceFailureSchema),
    diagnosticSummary: z.string().min(1).max(400),
    inputSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    outputSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    startedAt: IsoDatetimeSchema,
    completedAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const AiEvaluationRunLeaseSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/),
    runId: UuidSchema,
    status: z.enum(["ACTIVE", "RELEASED", "EXPIRED"]),
    acquiredAt: IsoDatetimeSchema,
    expiresAt: IsoDatetimeSchema,
    releasedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const S05AEvaluationMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema.optional(),
    migrationId: z.literal("EOS-S05A-EVALUATION-V4"),
    checksum: NonEmptySchema.max(128),
    status: z.enum(["APPLIED", "REPLAYED"]),
    createdRecords: z.array(z.string()),
    annotatedLegacyRunIds: z.array(UuidSchema),
    ...versioned,
  })
  .strict();

export const S05AEvaluationReadinessSchema = z
  .object({
    status: S05AEvaluationReadinessStatusSchema,
    blocked: z.boolean(),
    releaseReady: z.boolean(),
    blockingReasons: z.array(z.string().min(1).max(240)),
    currentCorpusEdition: z.string().min(1),
    currentCorpusHash: z.string().regex(/^[a-f0-9]{64}$/),
    currentOrchestratorVersion: z.string().min(1),
    currentProviderVersion: z.string().min(1),
    currentProjectionPolicyVersion: z.string().min(1),
    lastRunId: UuidSchema.optional(),
    lastRunAt: IsoDatetimeSchema.optional(),
    passedCount: z.number().int().nonnegative().optional(),
    failedCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export const S05A_EVALUATION_COLLECTIONS = [
  "aiEvaluationCaseResults",
  "aiEvaluationRunLeases",
  "s05aEvaluationMigrationReceipts",
] as const;

export type EvaluationCaseFamily = z.infer<typeof EvaluationCaseFamilySchema>;
export type ZeroToleranceCategory = z.infer<typeof ZeroToleranceCategorySchema>;
export type EvaluationAction = z.infer<typeof EvaluationActionSchema>;
export type ExpectedObservation = z.infer<typeof ExpectedObservationSchema>;
export type EvaluationSeed = z.infer<typeof EvaluationSeedSchema>;
export type EvaluationCaseDefinition = z.infer<typeof EvaluationCaseDefinitionSchema>;
export type EvaluationObservationResult = z.infer<typeof EvaluationObservationResultSchema>;
export type ZeroToleranceFailure = z.infer<typeof ZeroToleranceFailureSchema>;
export type EvaluationRunStatus = z.infer<typeof EvaluationRunStatusSchema>;
export type EvaluationCaseVerdict = z.infer<typeof EvaluationCaseVerdictSchema>;
export type S05AEvaluationReadinessStatus = z.infer<typeof S05AEvaluationReadinessStatusSchema>;
export type ExecutableAiEvaluationRun = z.infer<typeof ExecutableAiEvaluationRunSchema>;
export type AiEvaluationCaseResult = z.infer<typeof AiEvaluationCaseResultSchema>;
export type AiEvaluationRunLease = z.infer<typeof AiEvaluationRunLeaseSchema>;
export type S05AEvaluationMigrationReceipt = z.infer<typeof S05AEvaluationMigrationReceiptSchema>;
export type S05AEvaluationReadiness = z.infer<typeof S05AEvaluationReadinessSchema>;
