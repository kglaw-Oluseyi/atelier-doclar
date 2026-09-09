import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import { BudgetExprSchema } from "./eec-budget-engine.js";
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
    permittedActions: z.array(z.enum(["CONFIRM", "CORRECT", "INTERVIEW", "INVESTMENT", "ROADMAP", "REVIEW"])),
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
    driverKey: z.string().max(80).optional(),
    mutexGroup: z.string().max(80).optional(),
    taxEmbedded: z.boolean().optional(),
    contingencyClass: z.string().max(40).optional(),
    ...versioned,
  })
  .strict();

export const CostRuleEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    costItemCode: NonEmptySchema.max(80),
    expression: BudgetExprSchema,
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    resultUnit: z.string().max(32).optional(),
    ...versioned,
  })
  .strict();

export const PriceEvidenceSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    costItemCode: z.string().max(80).optional(),
    basis: z.enum([
      "VENDOR_QUOTE",
      "VENDOR_RATE_CARD",
      "CONTRACTED",
      "INTERNAL_BENCHMARK",
      "COMPARABLE_EVENT",
      "MARKET_ESTIMATE",
      "MANUAL_ASSUMPTION",
      "SYNTHETIC_SEED",
    ]),
    money: MoneyDtoSchema,
    lowMinor: z.string().regex(/^-?\d+$/).optional(),
    highMinor: z.string().regex(/^-?\d+$/).optional(),
    validFrom: z.string().date().optional(),
    validUntil: z.string().date().optional(),
    stale: z.boolean(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    sourceLabel: NonEmptySchema.max(160),
    objectKey: z.string().max(240).optional(),
    checksum: z.string().max(128).optional(),
    synthetic: z.boolean().optional(),
    nonProduction: z.boolean().optional(),
    provisional: z.boolean().optional(),
    unsupportedForRealClientReliance: z.boolean().optional(),
    evidenceDated: IsoDatetimeSchema.optional(),
    vendorPriceCardEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const BudgetTemplateCandidateSchema = z
  .object({
    code: NonEmptySchema.max(80),
    classification: z.enum(["REQUIRED", "RECOMMENDED", "CONDITIONAL", "OPTIONAL"]),
    predicate: z.enum(["ALWAYS", "GUESTS_GTE", "ARCHETYPE", "FORMAT", "NEVER"]).optional(),
    predicateValue: z.string().max(80).optional(),
    dependsOn: z.array(NonEmptySchema.max(80)).optional(),
    excludes: z.array(NonEmptySchema.max(80)).optional(),
    mutexGroup: z.string().max(80).optional(),
    driverKey: z.string().max(80).optional(),
    unit: z.string().max(32).optional(),
    pricePreference: z.array(z.string().max(40)).optional(),
    protectedItem: z.boolean().optional(),
    clientVisible: z.boolean().optional(),
  })
  .strict();

export const BudgetTemplateEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    archetype: NonEmptySchema.max(80),
    itemCodes: z.array(NonEmptySchema.max(80)),
    candidates: z.array(BudgetTemplateCandidateSchema).optional(),
    formatOverlays: z.array(NonEmptySchema.max(80)).optional(),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    supersededById: UuidSchema.optional(),
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
    sourceKind: z.enum(["BRIEF", "MANUAL", "SCENARIO", "SCENARIO_OVERRIDE"]).optional(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    expiresAt: IsoDatetimeSchema.optional(),
    confirmed: z.boolean(),
    stale: z.boolean(),
    labelledManualAssumption: z.boolean().optional(),
    governingValue: z.string().max(80).optional(),
    governingBriefEditionId: UuidSchema.optional(),
    governingAssertionId: UuidSchema.optional(),
    reason: z.string().max(500).optional(),
    createdByPersonId: PersonIdSchema.optional(),
    driverCode: z.string().max(80).optional(),
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
    trace: z.array(z.object({ op: NonEmptySchema.max(40), detail: z.string().max(240), value: z.string().max(80) }).strict()),
    submittedByPersonId: PersonIdSchema.optional(),
    decidedByPersonId: PersonIdSchema.optional(),
    current: z.boolean(),
    bomSnapshotId: UuidSchema.optional(),
    assumptionSetHash: z.string().max(128).optional(),
    evidenceHashes: z.array(z.string().max(128)).optional(),
    contingencyMinor: z.string().regex(/^-?\d+$/).optional(),
    contingencyBasis: z.string().max(200).optional(),
    warnings: z.array(z.string().max(240)).optional(),
    missingDrivers: z.array(z.string().max(80)).optional(),
    governingBriefEditionId: UuidSchema.optional(),
    governingBriefContentHash: z.string().max(128).optional(),
    calculationResultId: UuidSchema.optional(),
    calculationGeneratedAt: IsoDatetimeSchema.optional(),
    supersedesScenarioEditionId: UuidSchema.optional(),
    guestCountOverrideReason: z.string().max(500).optional(),
    effectiveDrivers: z
      .array(
        z
          .object({
            code: NonEmptySchema.max(80),
            value: z.string().max(40),
            provenanceKind: z.enum(["CURRENT_BRIEF", "SCENARIO_OVERRIDE"]),
            assumptionId: UuidSchema.optional(),
            governingValue: z.string().max(40).optional(),
            governingBriefEditionId: UuidSchema.optional(),
            governingAssertionId: UuidSchema.optional(),
            reason: z.string().max(500).optional(),
          })
          .strict(),
      )
      .optional(),
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
    editionId: UuidSchema.optional(),
    code: z.string().max(80).optional(),
    title: NonEmptySchema.max(200),
    purpose: z.string().max(400).optional(),
    layer: z.enum(["CLIENT_OUTCOME", "OPERATIONAL_READINESS", "DECISION"]),
    ownerLabel: z.string().max(160).optional(),
    status: z.enum(["PLANNED", "READY", "BLOCKED", "COMPLETE", "UNRESOLVED"]).optional(),
    durationDays: z.string().regex(/^\d+$/),
    leadTimeDays: z.string().regex(/^\d+$/).optional(),
    compressible: z.boolean().optional(),
    targetStart: z.string().date().optional(),
    targetEnd: z.string().date().optional(),
    earliestFeasible: z.string().date().optional(),
    latestSafe: z.string().date().optional(),
    actualCompleted: z.string().date().optional(),
    decisionDeadline: z.string().date().optional(),
    financialWindow: z.string().max(160).optional(),
    readinessRequirements: z.array(z.string().max(160)).optional(),
    evidenceRequirements: z.array(z.string().max(160)).optional(),
    delayConsequence: z.string().max(400).optional(),
    sourceLabel: z.string().max(160).optional(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH", "UNRESOLVED"]).optional(),
    clientVisible: z.boolean(),
    contentHash: z.string().max(128).optional(),
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
    templateEditionId: UuidSchema.optional(),
    briefHash: z.string().max(128).optional(),
    budgetHash: z.string().max(128).optional(),
    scheduleStatus: z.enum(["CALCULATED", "INSUFFICIENT_INFORMATION", "COMPRESSED", "INFEASIBLE"]).optional(),
    unresolvedAssumptions: z.array(z.string().max(200)).optional(),
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
    providerVersion: z.string().max(80).optional(),
    orchestratorVersion: z.string().max(80).optional(),
    status: z.enum(["PASSED", "FAILED", "BLOCKED", "QUEUED", "RUNNING", "CANCELLED"]).optional(),
    zeroToleranceFailed: z.boolean(),
    metrics: z.record(z.string(), z.string()),
    inputCaseHashes: z.array(NonEmptySchema.max(128)).optional(),
    zeroToleranceFailures: z
      .array(
        z.union([
          z.string().max(240),
          z
            .object({
              category: z.string().min(1).max(80),
              caseId: z.string().min(1).max(80),
              observationCode: z.string().min(1).max(80),
              summary: z.string().min(1).max(400),
            })
            .strict(),
        ]),
      )
      .optional(),
    caseEvidence: z.array(z.string().max(400)).optional(),
    durationMs: z.string().regex(/^\d+$/).optional(),
    correlationId: z.string().max(80).optional(),
    executedAt: IsoDatetimeSchema.optional(),
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    projectionPolicyVersion: z.string().max(80).optional(),
    evaluationContractVersion: z.string().max(80).optional(),
    applicationSha: z.string().max(64).optional(),
    caseCount: z.number().int().nonnegative().optional(),
    passedCount: z.number().int().nonnegative().optional(),
    failedCount: z.number().int().nonnegative().optional(),
    errorCount: z.number().int().nonnegative().optional(),
    startedAt: IsoDatetimeSchema.optional(),
    completedAt: IsoDatetimeSchema.optional(),
    requestedByPersonId: PersonIdSchema.optional(),
    idempotencyKey: z.string().max(160).optional(),
    compatibilityStatus: z.enum(["CURRENT", "INCOMPATIBLE", "LEGACY"]).optional(),
    ...versioned,
  })
  .strict();

export const VendorPriceCardSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    vendorSourceLabel: NonEmptySchema.max(160),
    vendorRef: z.string().max(80).optional(),
    costItemCode: NonEmptySchema.max(80),
    currentEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const VendorPriceCardEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    cardId: UuidSchema,
    costItemCode: NonEmptySchema.max(80),
    currency: NonEmptySchema.max(8),
    unitMinor: z.string().regex(/^-?\d+$/),
    lowMinor: z.string().regex(/^-?\d+$/).optional(),
    highMinor: z.string().regex(/^-?\d+$/).optional(),
    pricingBasis: z.enum(["PER_GUEST", "PER_EVENT", "PER_DAY", "PER_HOUR", "PER_UNIT", "FLAT"]),
    geography: z.string().max(80).optional(),
    minimumMinor: z.string().regex(/^-?\d+$/).optional(),
    inclusions: z.array(z.string().max(160)).optional(),
    exclusions: z.array(z.string().max(160)).optional(),
    overtimeNote: z.string().max(200).optional(),
    taxesFeesNote: z.string().max(200).optional(),
    cancellationNote: z.string().max(200).optional(),
    effectiveFrom: z.string().date(),
    effectiveUntil: z.string().date().optional(),
    sourceArtefactKey: z.string().max(240).optional(),
    checksum: z.string().max(128).optional(),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    reviewState: z.enum(["DRAFT", "SUBMITTED", "PUBLISHED", "SUPERSEDED", "REVOKED"]),
    submittedByPersonId: PersonIdSchema.optional(),
    decidedByPersonId: PersonIdSchema.optional(),
    supersedesEditionId: UuidSchema.optional(),
    current: z.boolean(),
    synthetic: z.boolean(),
    nonProduction: z.boolean(),
    provisional: z.boolean(),
    unsupportedForRealClientReliance: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const MarketIndexDefinitionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    code: NonEmptySchema.max(80),
    title: NonEmptySchema.max(160),
    unit: NonEmptySchema.max(32),
    freshnessDays: z.string().regex(/^\d+$/),
    ...versioned,
  })
  .strict();

export const MarketIndexObservationSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    definitionId: UuidSchema,
    value: NonEmptySchema.max(40),
    observedAt: IsoDatetimeSchema,
    effectiveAt: IsoDatetimeSchema,
    sourceKind: z.enum(["MANUAL", "PROVIDER", "SYNTHETIC"]),
    approvalState: z.enum(["DRAFT", "APPROVED", "STALE"]),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    stale: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const FxObservationSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    fromCurrency: NonEmptySchema.max(8),
    toCurrency: NonEmptySchema.max(8),
    rate: z.string().regex(/^-?\d+(\.\d+)?$/),
    locked: z.boolean(),
    observedAt: IsoDatetimeSchema,
    effectiveAt: IsoDatetimeSchema,
    sourceKind: z.enum(["MANUAL", "PROVIDER", "SYNTHETIC"]),
    approvalState: z.enum(["DRAFT", "APPROVED", "STALE"]),
    stale: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const LocationCostZoneSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    code: NonEmptySchema.max(80),
    title: NonEmptySchema.max(160),
    locality: NonEmptySchema.max(80),
    currentEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const LocationFactorEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    zoneId: UuidSchema,
    factor: z.string().regex(/^-?\d+(\.\d+)?$/),
    accessNote: z.string().max(200).optional(),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const SeasonWindowEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    title: NonEmptySchema.max(160),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    factor: z.string().regex(/^-?\d+(\.\d+)?$/),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const LookupTableEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    tableId: NonEmptySchema.max(80),
    entries: z.record(z.string(), z.string()),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const BudgetLineSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    scenarioId: UuidSchema,
    itemCode: NonEmptySchema.max(80),
    inclusionReason: NonEmptySchema.max(240),
    classification: NonEmptySchema.max(40),
    quantity: NonEmptySchema.max(40),
    unit: NonEmptySchema.max(32),
    quantityDriverKey: z.string().max(80).optional(),
    priceSource: NonEmptySchema.max(80),
    priceEvidenceDate: z.string().max(40).optional(),
    priceConfidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    stale: z.boolean(),
    synthetic: z.boolean(),
    expectedMinor: z.string().regex(/^-?\d+$/),
    lowMinor: z.string().regex(/^-?\d+$/),
    highMinor: z.string().regex(/^-?\d+$/),
    currency: NonEmptySchema.max(8),
    ruleEditionHash: z.string().max(128),
    warnings: z.array(z.string().max(240)),
    unresolvedAssumptions: z.array(z.string().max(200)),
    assumptionId: UuidSchema.optional(),
    effectiveDriverValue: z.string().max(40).optional(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const BudgetBomSnapshotSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    scenarioId: UuidSchema.optional(),
    templateEditionHash: NonEmptySchema.max(128),
    briefHash: z.string().max(128).optional(),
    assertionHashes: z.array(z.string().max(128)),
    assumptionSetHash: NonEmptySchema.max(128),
    observationHashes: z.array(z.string().max(128)),
    itemCodes: z.array(NonEmptySchema.max(80)),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const ContingencyRuleEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    basis: z.enum(["PERCENT_OF_PRICED_SCOPE", "FIXED_MONEY"]),
    percent: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    money: MoneyDtoSchema.optional(),
    riskLink: z.string().max(160).optional(),
    minimumMinor: z.string().regex(/^-?\d+$/).optional(),
    maximumMinor: z.string().regex(/^-?\d+$/).optional(),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const SensitivityRunSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    scenarioId: UuidSchema,
    drivers: z.array(z.object({ key: NonEmptySchema.max(80), movementMinor: z.string().regex(/^-?\d+$/), explanation: NonEmptySchema.max(240) }).strict()),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const ScenarioComparisonSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    leftScenarioId: UuidSchema,
    rightScenarioId: UuidSchema,
    added: z.array(z.string().max(80)),
    removed: z.array(z.string().max(80)),
    quantityChanged: z.array(z.string().max(80)),
    priceChanged: z.array(z.string().max(80)),
    assumptionChanged: z.array(z.string().max(80)),
    evidenceChanged: z.array(z.string().max(80)),
    protectedItems: z.array(z.string().max(80)),
    totalMovementMinor: z.string().regex(/^-?\d+$/),
    cashFlowEffect: z.string().max(240),
    operationalConsequence: z.string().max(240),
    clientExperienceConsequence: z.string().max(240),
    unresolvedRisk: z.string().max(240),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const RoadmapTemplateEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    archetype: NonEmptySchema.max(80),
    leadMode: z.enum(["LONG", "STANDARD", "SHORT"]),
    milestones: z.array(
      z.object({
        code: NonEmptySchema.max(80),
        title: NonEmptySchema.max(200),
        purpose: NonEmptySchema.max(400),
        layer: z.enum(["CLIENT_OUTCOME", "OPERATIONAL_READINESS", "DECISION"]),
        durationDays: z.string().regex(/^\d+$/),
        leadTimeDays: z.string().regex(/^\d+$/),
        compressible: z.boolean(),
        clientVisible: z.boolean(),
        delayConsequence: NonEmptySchema.max(400),
        dependsOn: z.array(NonEmptySchema.max(80)).optional(),
        dependencyKind: z.enum(["FINISH_TO_START", "START_TO_START", "DECISION_GATES", "EVIDENCE_GATES", "FINANCIAL_GATES", "SCOPE_DEPENDS_ON"]).optional(),
      }).strict(),
    ),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const RoadmapScheduleResultSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    editionId: UuidSchema,
    status: z.enum(["CALCULATED", "INSUFFICIENT_INFORMATION", "COMPRESSED", "INFEASIBLE"]),
    compressionClass: z.enum(["STANDARD", "COMPRESSED_FEASIBLE", "FEASIBLE_WITH_DECISIONS", "FEASIBLE_WITH_RISK", "INFEASIBLE"]).optional(),
    critical: z.array(z.object({ milestoneId: UuidSchema, title: NonEmptySchema.max(200), floatDays: z.string(), explanation: NonEmptySchema.max(400) }).strict()),
    totalDurationDays: z.string().regex(/^\d+$/),
    inputHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const ConversationTurnSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    sessionId: UuidSchema.optional(),
    accessId: UuidSchema.optional(),
    turnIndex: z.number().int().nonnegative(),
    phase: z.enum(["WELCOME", "CONSENT", "PRINCIPALS", "ADDRESS", "LANGUAGE", "COVERAGE", "REVIEW", "COMPLETE"]),
    questionId: NonEmptySchema.max(80),
    questionEdition: NonEmptySchema.max(40),
    topicKeys: z.array(NonEmptySchema.max(80)),
    prompt: NonEmptySchema.max(800),
    answerSource: z.enum(["CLIENT_DIRECT", "STAFF", "UNKNOWN", "NOT_YET", "NOT_APPLICABLE", "PREFER_NOT", "CORRECTION", "PAUSE"]),
    speakerLabel: z.string().max(160).optional(),
    formOfAddress: z.string().max(80).optional(),
    languagePreference: z.string().max(32).optional(),
    directClientText: z.string().max(2000).optional(),
    proposedNarrative: z.string().max(800).optional(),
    confirmationState: z.enum(["UNANSWERED", "CAPTURED", "CONFIRMED", "REVISIT"]).optional(),
    revisitReason: z.string().max(240).optional(),
    correlationId: z.string().max(80).optional(),
    ...versioned,
  })
  .strict();

export const ClientOverviewEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    vision: z.string().max(800).optional(),
    priorities: z.array(z.string().max(200)),
    nonNegotiables: z.array(z.string().max(200)),
    knownFacts: z.array(z.string().max(240)),
    openQuestions: z.array(z.string().max(240)),
    decisionsRequired: z.array(z.string().max(240)),
    investmentFraming: z.string().max(400).optional(),
    roadmapExpectation: z.string().max(400).optional(),
    conflicts: z.array(z.string().max(240)),
    changesSinceLastReview: z.array(z.string().max(240)),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const ClientReviewEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    status: z.enum([
      "DRAFT",
      "ISSUED",
      "IN_REVIEW",
      "CORRECTION_REQUIRED",
      "CLIENT_CONFIRMED",
      "EXPIRED",
      "REVOKED",
      "SUPERSEDED",
    ]),
    briefHash: z.string().max(128).optional(),
    assertionHashes: z.array(NonEmptySchema.max(128)),
    openQuestions: z.array(z.string().max(240)),
    conflicts: z.array(z.string().max(240)),
    investmentFraming: z.string().max(400).optional(),
    roadmapSummary: z.string().max(400).optional(),
    projectionPolicyVersion: NonEmptySchema.max(80),
    expiresAt: IsoDatetimeSchema,
    confirmedAt: IsoDatetimeSchema.optional(),
    confirmedByAccessId: UuidSchema.optional(),
    confirmationScopes: z.array(
      z.object({
        accessId: UuidSchema,
        scope: NonEmptySchema.max(80),
        itemKey: z.string().max(80).optional(),
      }),
    ),
    stale: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    supersedesEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const ClientReviewActionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    reviewEditionId: UuidSchema,
    accessId: UuidSchema,
    kind: z.enum(["CONFIRM_ITEM", "CORRECT", "DISPUTE", "DEFER", "PREFER_NOT", "CLARIFY", "SUBMIT_REVIEW", "CONFIRM_EDITION"]),
    itemKey: z.string().max(80).optional(),
    narrative: z.string().max(2000).optional(),
    expectedHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const ClientInvestmentActionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    accessId: UuidSchema,
    kind: z.enum([
      "CONFIRM_ENVELOPE",
      "NO_ENVELOPE",
      "CORRECT_AMOUNT",
      "CHOOSE_SCENARIO",
      "REJECT_SCENARIO",
      "CLARIFY",
      "DEFER",
      "PREFER_NOT",
      "CONFIRM_PRIORITIES",
    ]),
    amountMinor: z.string().regex(/^\d+$/).optional(),
    scenarioPurpose: z.string().max(80).optional(),
    narrative: z.string().max(2000).optional(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const CalendarDefinitionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    label: NonEmptySchema.max(160),
    timezone: NonEmptySchema.max(80),
    workingWeekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    blackoutDates: z.array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        label: NonEmptySchema.max(160),
        synthetic: z.boolean(),
      }),
    ),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const EventCalendarOverlaySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    timezone: NonEmptySchema.max(80),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    unavailableDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    schedulingAssumptions: z.array(z.string().max(240)),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const S05AIntelligenceReceiptSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    migrationId: z.enum([
      "EOS-S05A-INTELLIGENCE-V1",
      "EOS-S05A-INTELLIGENCE-V2",
      "EOS-S05A-INTELLIGENCE-V3",
      "EOS-S05A-DISCLOSURE-V5",
    ]),
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
  "vendorPriceCards",
  "vendorPriceCardEditions",
  "marketIndexDefinitions",
  "marketIndexObservations",
  "fxObservations",
  "locationCostZones",
  "locationFactorEditions",
  "seasonWindowEditions",
  "lookupTableEditions",
  "budgetLines",
  "budgetBomSnapshots",
  "contingencyRuleEditions",
  "sensitivityRuns",
  "scenarioComparisons",
  "roadmapTemplateEditions",
  "roadmapScheduleResults",
  "conversationTurns",
  "clientOverviewEditions",
  "clientReviewEditions",
  "clientReviewActions",
  "clientInvestmentActions",
  "calendarDefinitions",
  "eventCalendarOverlays",
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
export type BudgetTemplateCandidate = z.infer<typeof BudgetTemplateCandidateSchema>;
export type BudgetAssumption = z.infer<typeof BudgetAssumptionSchema>;
export type PriceEvidence = z.infer<typeof PriceEvidenceSchema>;
export type CostRuleEdition = z.infer<typeof CostRuleEditionSchema>;
export type BudgetTaxonomyEdition = z.infer<typeof BudgetTaxonomyEditionSchema>;
export type S05AIntelligenceReceipt = z.infer<typeof S05AIntelligenceReceiptSchema>;
export type VendorPriceCard = z.infer<typeof VendorPriceCardSchema>;
export type VendorPriceCardEdition = z.infer<typeof VendorPriceCardEditionSchema>;
export type MarketIndexDefinition = z.infer<typeof MarketIndexDefinitionSchema>;
export type MarketIndexObservation = z.infer<typeof MarketIndexObservationSchema>;
export type FxObservation = z.infer<typeof FxObservationSchema>;
export type LocationCostZone = z.infer<typeof LocationCostZoneSchema>;
export type LocationFactorEdition = z.infer<typeof LocationFactorEditionSchema>;
export type SeasonWindowEdition = z.infer<typeof SeasonWindowEditionSchema>;
export type LookupTableEdition = z.infer<typeof LookupTableEditionSchema>;
export type BudgetLine = z.infer<typeof BudgetLineSchema>;
export type BudgetBomSnapshot = z.infer<typeof BudgetBomSnapshotSchema>;
export type ContingencyRuleEdition = z.infer<typeof ContingencyRuleEditionSchema>;
export type SensitivityRun = z.infer<typeof SensitivityRunSchema>;
export type ScenarioComparison = z.infer<typeof ScenarioComparisonSchema>;
export type RoadmapTemplateEdition = z.infer<typeof RoadmapTemplateEditionSchema>;
export type RoadmapScheduleResult = z.infer<typeof RoadmapScheduleResultSchema>;
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type ClientOverviewEdition = z.infer<typeof ClientOverviewEditionSchema>;
export type ClientReviewEdition = z.infer<typeof ClientReviewEditionSchema>;
export type ClientReviewAction = z.infer<typeof ClientReviewActionSchema>;
export type ClientInvestmentAction = z.infer<typeof ClientInvestmentActionSchema>;
export type CalendarDefinition = z.infer<typeof CalendarDefinitionSchema>;
export type EventCalendarOverlay = z.infer<typeof EventCalendarOverlaySchema>;
