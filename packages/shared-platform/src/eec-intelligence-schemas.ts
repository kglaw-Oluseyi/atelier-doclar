import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import { EventIdSchema, IsoDatetimeSchema, NonEmptySchema, OrganisationIdSchema, PersonIdSchema, UuidSchema } from "./schemas.js";
import { EngagementIdSchema, MoneyDtoSchema, OpportunityIdSchema } from "./eec-schemas.js";

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

export const EventBriefDraftSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    eventId: EventIdSchema.optional(),
    gate: z.enum(["INDICATIVE", "WORKING", "APPROVED"]),
    assertionIds: z.array(UuidSchema),
    unknownTopics: z.array(NonEmptySchema.max(80)),
    currentEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const EventBriefEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    eventId: EventIdSchema.optional(),
    draftId: UuidSchema,
    status: z.enum(["SUBMITTED", "APPROVED", "REJECTED", "PUBLISHED", "SUPERSEDED"]),
    gate: z.enum(["INDICATIVE", "WORKING", "APPROVED"]),
    contentHash: NonEmptySchema.max(128),
    assertionIds: z.array(UuidSchema),
    unknownTopics: z.array(NonEmptySchema.max(80)),
    submittedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    supersedesEditionId: UuidSchema.optional(),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const ClientBriefDecisionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    assertionId: UuidSchema,
    decision: z.enum(["CONFIRM", "CORRECT", "DISPUTE", "DEFER", "PREFER_NOT"]),
    narrative: z.string().max(2000).optional(),
    participantLabel: NonEmptySchema.max(160),
    ...versioned,
  })
  .strict();

export const DiscoveryClientAccessSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    tokenHash: NonEmptySchema.max(128),
    expiresAt: IsoDatetimeSchema,
    revokedAt: IsoDatetimeSchema.optional(),
    permittedActions: z.array(z.enum(["CONFIRM", "CORRECT", "INTERVIEW"])),
    ...versioned,
  })
  .strict();

export const ConversionReceiptSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    opportunityId: OpportunityIdSchema,
    clientId: UuidSchema,
    eventId: EventIdSchema,
    sourceBriefHash: NonEmptySchema.max(128),
    clientDisposition: z.enum(["LINK_EXISTING", "CREATE_NEW"]),
    eventDisposition: z.enum(["LINK_EXISTING", "CREATE_NEW"]),
    ...versioned,
  })
  .strict();

export const BudgetTaxonomyEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    editionLabel: NonEmptySchema.max(80),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const CostItemDefinitionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    taxonomyEditionId: UuidSchema,
    code: NonEmptySchema.max(80),
    title: NonEmptySchema.max(160),
    categoryPath: NonEmptySchema.max(160),
    unitKind: NonEmptySchema.max(32),
    requirement: z.enum(["REQUIRED", "CONDITIONAL", "RECOMMENDED", "OPTIONAL", "EXCLUDED_BY_CLIENT", "NOT_APPLICABLE", "UNRESOLVED"]),
    protectedItem: z.boolean(),
    clientDescription: NonEmptySchema.max(400),
    internalNotes: z.string().max(400).optional(),
    retired: z.boolean(),
    ...versioned,
  })
  .strict();

export const CostRuleEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    costItemCode: NonEmptySchema.max(80),
    expression: z.unknown(),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const PriceEvidenceSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    basis: z.enum(["VENDOR_QUOTE", "VENDOR_RATE_CARD", "CONTRACTED", "INTERNAL_BENCHMARK", "COMPARABLE_EVENT", "MARKET_ESTIMATE", "MANUAL_ASSUMPTION"]),
    money: MoneyDtoSchema,
    validUntil: z.string().date().optional(),
    stale: z.boolean(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    sourceLabel: NonEmptySchema.max(160),
    objectKey: z.string().max(240).optional(),
    ...versioned,
  })
  .strict();

export const BudgetTemplateEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    archetype: NonEmptySchema.max(80),
    itemCodes: z.array(NonEmptySchema.max(80)),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const BudgetAssumptionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    key: NonEmptySchema.max(80),
    value: NonEmptySchema.max(80),
    unit: NonEmptySchema.max(32),
    sourceAssertionId: UuidSchema.optional(),
    confirmed: z.boolean(),
    stale: z.boolean(),
    ...versioned,
  })
  .strict();

export const BudgetScenarioEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    purpose: z.enum(["PROTECT_INVESTMENT", "PROTECT_PRIORITIES", "PROTECT_FULL_BRIEF", "MAISON_RECOMMENDED", "CLIENT_ALTERNATIVE"]),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED", "SUPERSEDED", "STALE"]),
    alignment: z.enum(["INSUFFICIENT_INFORMATION", "ALIGNED", "PRESSURED", "MISALIGNED", "SURPLUS_CAPACITY", "STALE"]),
    calculationStatus: z.enum(["COMPLETE", "PARTIAL", "BLOCKED", "STALE"]),
    currency: NonEmptySchema.max(8),
    expectedMinor: z.string().regex(/^-?\d+$/),
    lowMinor: z.string().regex(/^-?\d+$/),
    highMinor: z.string().regex(/^-?\d+$/),
    inputHash: NonEmptySchema.max(128),
    resultHash: NonEmptySchema.max(128),
    trace: z.array(z.object({ op: NonEmptySchema.max(40), detail: z.string().max(200), value: z.string().max(80) }).strict()),
    submittedByPersonId: PersonIdSchema.optional(),
    decidedByPersonId: PersonIdSchema.optional(),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const BudgetRecommendationEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    scenarioId: UuidSchema,
    advice: NonEmptySchema.max(800),
    holdRecommended: z.boolean(),
    status: z.enum(["SUBMITTED", "APPROVED", "PUBLISHED", "SUPERSEDED"]),
    contentHash: NonEmptySchema.max(128),
    submittedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const FinancialStateDeclarationSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    kind: z.enum(["ENVELOPE", "TARGET", "FORECAST", "APPROVED_COMMITMENT", "CONTRACTED_COMMITMENT", "INVOICE", "PAYMENT", "REFUND", "CASH_REQUIREMENT"]),
    money: MoneyDtoSchema,
    basis: NonEmptySchema.max(200),
    ...versioned,
  })
  .strict();

export const RoadmapMilestoneSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    engagementId: EngagementIdSchema.optional(),
    title: NonEmptySchema.max(200),
    layer: z.enum(["CLIENT_OUTCOME", "OPERATIONAL_READINESS", "DECISION"]),
    durationDays: z.string().regex(/^\d+$/),
    clientVisible: z.boolean(),
    ...versioned,
  })
  .strict();

export const RoadmapEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    engagementId: EngagementIdSchema.optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "SUPERSEDED", "INFEASIBLE"]),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const RoadmapDependencySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    editionId: UuidSchema,
    fromMilestoneId: UuidSchema,
    toMilestoneId: UuidSchema,
    kind: z.enum(["FINISH_TO_START", "START_TO_START", "DECISION_GATES", "EVIDENCE_GATES", "FINANCIAL_GATES", "SCOPE_DEPENDS_ON"]),
    ...versioned,
  })
  .strict();

export const ChangeProposalSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    status: z.enum(["DETECTED", "TRIAGED", "IMPACT_ASSESSED", "CLARIFICATION_REQUIRED", "READY_FOR_DECISION", "APPROVED", "REJECTED", "PROPAGATED", "VERIFIED"]),
    semanticHash: NonEmptySchema.max(128),
    summary: NonEmptySchema.max(400),
    sourceAssertionId: UuidSchema.optional(),
    governingBriefHash: z.string().max(128).optional(),
    submittedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const ImpactAssessmentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    changeProposalId: UuidSchema,
    impacts: z.array(z.object({ target: NonEmptySchema.max(80), kind: z.enum(["DIRECT", "POTENTIAL", "NONE", "UNKNOWN"]), explanation: NonEmptySchema.max(400) }).strict()),
    inputHash: NonEmptySchema.max(128),
    stale: z.boolean(),
    ...versioned,
  })
  .strict();

export const AiJobSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    kind: z.enum(["ASSERTIONS", "NEXT_QUESTION", "SUMMARY", "CHANGE"]),
    status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
    providerState: z.enum(["INACTIVE", "FIXTURE", "UNAVAILABLE"]),
    output: z.unknown().optional(),
    ...versioned,
  })
  .strict();

export const AiEvaluationRunSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    corpusEdition: NonEmptySchema.max(80),
    modelVersion: NonEmptySchema.max(80),
    zeroToleranceFailed: z.boolean(),
    metrics: z.record(z.string(), z.string()),
    ...versioned,
  })
  .strict();

export const S05AIntelligenceReceiptSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    migrationId: z.literal("EOS-S05A-INTELLIGENCE-V1"),
    checksum: NonEmptySchema.max(128),
    status: z.enum(["APPLIED", "REPLAYED"]),
    createdRecords: z.array(z.string()),
    ...versioned,
  })
  .strict();

export const S05A_INTELLIGENCE_COLLECTIONS = [
  "eventBriefDrafts",
  "eventBriefEditions",
  "clientBriefDecisions",
  "discoveryClientAccess",
  "conversionReceipts",
  "budgetTaxonomyEditions",
  "costItemDefinitions",
  "costRuleEditions",
  "priceEvidenceRecords",
  "budgetTemplateEditions",
  "budgetAssumptions",
  "budgetScenarioEditions",
  "budgetRecommendationEditions",
  "financialStateDeclarations",
  "roadmapMilestones",
  "roadmapEditions",
  "roadmapDependencies",
  "changeProposals",
  "impactAssessments",
  "aiJobs",
  "aiEvaluationRuns",
  "s05aIntelligenceReceipts",
] as const;

export type EventBriefDraft = z.infer<typeof EventBriefDraftSchema>;
export type EventBriefEdition = z.infer<typeof EventBriefEditionSchema>;
export type ClientBriefDecision = z.infer<typeof ClientBriefDecisionSchema>;
export type DiscoveryClientAccess = z.infer<typeof DiscoveryClientAccessSchema>;
export type ConversionReceipt = z.infer<typeof ConversionReceiptSchema>;
export type BudgetScenarioEdition = z.infer<typeof BudgetScenarioEditionSchema>;
export type BudgetRecommendationEdition = z.infer<typeof BudgetRecommendationEditionSchema>;
export type FinancialStateDeclaration = z.infer<typeof FinancialStateDeclarationSchema>;
export type RoadmapMilestone = z.infer<typeof RoadmapMilestoneSchema>;
export type RoadmapEdition = z.infer<typeof RoadmapEditionSchema>;
export type RoadmapDependency = z.infer<typeof RoadmapDependencySchema>;
export type ChangeProposal = z.infer<typeof ChangeProposalSchema>;
export type ImpactAssessment = z.infer<typeof ImpactAssessmentSchema>;
export type AiJob = z.infer<typeof AiJobSchema>;
export type AiEvaluationRun = z.infer<typeof AiEvaluationRunSchema>;
export type CostItemDefinition = z.infer<typeof CostItemDefinitionSchema>;
export type BudgetTemplateEdition = z.infer<typeof BudgetTemplateEditionSchema>;
export type BudgetAssumption = z.infer<typeof BudgetAssumptionSchema>;
export type PriceEvidence = z.infer<typeof PriceEvidenceSchema>;
export type CostRuleEdition = z.infer<typeof CostRuleEditionSchema>;
export type BudgetTaxonomyEdition = z.infer<typeof BudgetTaxonomyEditionSchema>;
export type S05AIntelligenceReceipt = z.infer<typeof S05AIntelligenceReceiptSchema>;
