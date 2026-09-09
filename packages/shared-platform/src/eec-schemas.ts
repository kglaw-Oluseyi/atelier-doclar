import { z } from "zod";
import {
  ASSERTION_DIRECTNESS,
  ASSERTION_KINDS,
  COVERAGE_STATES,
  CONFIDENCE_LEVELS,
  CONFIRMATION_STATES,
  CONFLICT_RESOLUTIONS,
  CONFLICT_SEVERITIES,
  DISCOVERY_CONSENT_DIMENSIONS,
  DISCOVERY_DISCLOSURE_CLASSES,
  ENQUIRY_CHANNELS,
  INTERVIEW_SESSION_STATES,
  MONEY_CURRENCIES,
  OPPORTUNITY_STAGES,
  SCHEMA_VERSION,
  SENSITIVITY_CLASSES,
  SOURCE_ARTEFACT_KINDS,
} from "./constants.js";
import {
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";

export type Brand<T, B extends string> = T & { readonly __brand: B };
export type OpportunityId = Brand<string, "OpportunityId">;
export type EngagementId = Brand<string, "EngagementId">;
export type ParticipantId = Brand<string, "ParticipantId">;
export type DiscoveryConsentId = Brand<string, "DiscoveryConsentId">;
export type InterviewSessionId = Brand<string, "InterviewSessionId">;
export type SourceArtefactId = Brand<string, "SourceArtefactId">;
export type SourceSegmentId = Brand<string, "SourceSegmentId">;
export type CandidateAssertionId = Brand<string, "CandidateAssertionId">;
export type AssertionConflictId = Brand<string, "AssertionConflictId">;
export type CoverageRequirementId = Brand<string, "CoverageRequirementId">;
export type CoverageAssessmentId = Brand<string, "CoverageAssessmentId">;
export type CoverageCatalogueEditionId = Brand<string, "CoverageCatalogueEditionId">;
export type DiscoveryDisclosureGrantId = Brand<string, "DiscoveryDisclosureGrantId">;
export type ExtractionOutcomeId = Brand<string, "ExtractionOutcomeId">;
export type BriefEditionId = Brand<string, "BriefEditionId">;
export type InvestmentEditionId = Brand<string, "InvestmentEditionId">;
export type BudgetEntityId = Brand<string, "BudgetEntityId">;
export type RoadmapEntityId = Brand<string, "RoadmapEntityId">;
export type ChangeEntityId = Brand<string, "ChangeEntityId">;

export const OpportunityIdSchema = UuidSchema;
export const EngagementIdSchema = UuidSchema;
export const ParticipantIdSchema = UuidSchema;
export const DiscoveryConsentIdSchema = UuidSchema;
export const InterviewSessionIdSchema = UuidSchema;
export const SourceArtefactIdSchema = UuidSchema;
export const SourceSegmentIdSchema = UuidSchema;
export const CandidateAssertionIdSchema = UuidSchema;
export const AssertionConflictIdSchema = UuidSchema;
export const CoverageRequirementIdSchema = UuidSchema;
export const CoverageAssessmentIdSchema = UuidSchema;
export const CoverageCatalogueEditionIdSchema = UuidSchema;
export const DiscoveryDisclosureGrantIdSchema = UuidSchema;
export const ExtractionOutcomeIdSchema = UuidSchema;

export const AssertionKindSchema = z.enum(ASSERTION_KINDS);
export const ConfirmationStateSchema = z.enum(CONFIRMATION_STATES);
export const SensitivityClassSchema = z.enum(SENSITIVITY_CLASSES);
export const DiscoveryDisclosureClassSchema = z.enum(DISCOVERY_DISCLOSURE_CLASSES);
export const CoverageStateSchema = z.enum(COVERAGE_STATES);
export const InterviewSessionStateSchema = z.enum(INTERVIEW_SESSION_STATES);
export const ConsentDimensionSchema = z.enum(DISCOVERY_CONSENT_DIMENSIONS);
export const EnquiryChannelSchema = z.enum(ENQUIRY_CHANNELS);
export const OpportunityStageSchema = z.enum(OPPORTUNITY_STAGES);
export const SourceArtefactKindSchema = z.enum(SOURCE_ARTEFACT_KINDS);
export const AssertionDirectnessSchema = z.enum(ASSERTION_DIRECTNESS);
export const ConfidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);

export const CurrencyCodeSchema = z.union([z.enum(MONEY_CURRENCIES), z.string().trim().min(3).max(8)]);
export const MoneyDtoSchema = z
  .object({
    currency: CurrencyCodeSchema,
    minor: z.string().regex(/^-?\d+$/, "money minor units must be an integer string"),
  })
  .strict();
export const QuantityDtoSchema = z
  .object({
    value: z.string().regex(/^-?\d+(\.\d+)?$/, "quantity must be a decimal string"),
    unit: NonEmptySchema.max(32),
  })
  .strict();

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

const orgScoped = {
  organisationId: OrganisationIdSchema,
};

export const EecScopedCommandSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    clientId: UuidSchema.optional(),
    eventId: EventIdSchema.optional(),
    expectedVersion: z.number().int().nonnegative(),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const PredicateAstSchema: z.ZodType<{
  kind: "ALWAYS" | "EVENT_TYPE_IN" | "AND" | "OR";
  values?: string[];
  conditions?: unknown[];
}> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("ALWAYS") }).strict(),
    z.object({ kind: z.literal("EVENT_TYPE_IN"), values: z.array(NonEmptySchema.max(80)).min(1) }).strict(),
    z.object({ kind: z.literal("AND"), conditions: z.array(PredicateAstSchema).min(1).max(8) }).strict(),
    z.object({ kind: z.literal("OR"), conditions: z.array(PredicateAstSchema).min(1).max(8) }).strict(),
  ]),
);

export const EngagementOpportunitySchema = z
  .object({
    id: OpportunityIdSchema,
    displayReference: NonEmptySchema.max(160),
    eventConceptLabel: z.string().max(200).optional(),
    enquiryChannel: EnquiryChannelSchema,
    knownEventDate: z.string().date().optional(),
    knownEventType: z.string().max(80).optional(),
    stage: OpportunityStageSchema,
    ownerPersonId: PersonIdSchema.optional(),
    closedReason: z.string().max(400).optional(),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const DiscoveryEngagementSchema = z
  .object({
    id: EngagementIdSchema,
    opportunityId: OpportunityIdSchema,
    displayReference: NonEmptySchema.max(160),
    eventConceptLabel: z.string().max(200).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "CONVERTED"]),
    ownerPersonId: PersonIdSchema.optional(),
    convertedEventId: EventIdSchema.optional(),
    convertedClientId: UuidSchema.optional(),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const DiscoveryParticipantSchema = z
  .object({
    id: ParticipantIdSchema,
    engagementId: EngagementIdSchema,
    displayName: NonEmptySchema.max(160),
    claimedRole: NonEmptySchema.max(80),
    authorityClaim: z.enum(["PRINCIPAL", "AUTHORISED_DELEGATE", "RELATIVE", "UNAUTHORISED", "UNKNOWN"]),
    linkedPersonId: PersonIdSchema.optional(),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const DiscoveryConsentRecordSchema = z
  .object({
    id: DiscoveryConsentIdSchema,
    engagementId: EngagementIdSchema,
    participantId: ParticipantIdSchema.optional(),
    dimension: ConsentDimensionSchema,
    decision: z.enum(["GRANTED", "DECLINED", "WITHDRAWN", "NOT_APPLICABLE"]),
    policyVersion: NonEmptySchema.max(80),
    wordingEdition: NonEmptySchema.max(80),
    decidedAt: IsoDatetimeSchema,
    withdrawnAt: IsoDatetimeSchema.optional(),
    legalBasisPlaceholder: z.string().max(200).optional(),
    actorPersonId: PersonIdSchema.optional(),
    source: z.enum(["STAFF", "CLIENT_TOKEN"]).optional(),
    accessId: UuidSchema.optional(),
    ...orgScoped,
    schemaVersion: z.literal(SCHEMA_VERSION),
    version: z.number().int().positive(),
    createdAt: IsoDatetimeSchema,
    updatedAt: IsoDatetimeSchema,
    nonProductionFixture: z.boolean().optional(),
  })
  .strict();

export const InterviewSessionSchema = z
  .object({
    id: InterviewSessionIdSchema,
    engagementId: EngagementIdSchema,
    mode: z.enum(["STAFF_LED", "CLIENT_LED", "OFFLINE_NOTES", "FOLLOW_UP"]),
    language: NonEmptySchema.max(32),
    status: InterviewSessionStateSchema,
    startedAt: IsoDatetimeSchema.optional(),
    pausedAt: IsoDatetimeSchema.optional(),
    completedAt: IsoDatetimeSchema.optional(),
    providerState: z.enum(["INACTIVE", "FIXTURE", "UNAVAILABLE"]),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const SourceArtefactSchema = z
  .object({
    id: SourceArtefactIdSchema,
    engagementId: EngagementIdSchema,
    sessionId: InterviewSessionIdSchema.optional(),
    kind: SourceArtefactKindSchema,
    title: NonEmptySchema.max(200),
    contentSafetyStatus: z.enum(["CLEAN", "QUARANTINED", "FAILED"]),
    objectKey: z.string().max(240).optional(),
    byteChecksum: z.string().max(128).optional(),
    language: z.string().max(32).optional(),
    disclosureClass: DiscoveryDisclosureClassSchema.optional(),
    disclosureBackfillRule: z.string().max(80).optional(),
    ...orgScoped,
    schemaVersion: z.literal(SCHEMA_VERSION),
    version: z.number().int().positive(),
    createdAt: IsoDatetimeSchema,
    updatedAt: IsoDatetimeSchema,
    nonProductionFixture: z.boolean().optional(),
  })
  .strict();

export const SourceSegmentSchema = z
  .object({
    id: SourceSegmentIdSchema,
    artefactId: SourceArtefactIdSchema,
    engagementId: EngagementIdSchema,
    sequence: z.number().int().nonnegative(),
    speakerParticipantId: ParticipantIdSchema.optional(),
    speakerClaim: z.enum(["RESOLVED", "UNRESOLVED"]),
    text: NonEmptySchema.max(8000),
    language: z.string().max(32).optional(),
    transcriptionConfidence: ConfidenceLevelSchema.optional(),
    contentHash: NonEmptySchema.max(128),
    ...orgScoped,
    schemaVersion: z.literal(SCHEMA_VERSION),
    version: z.number().int().positive(),
    createdAt: IsoDatetimeSchema,
    updatedAt: IsoDatetimeSchema,
    nonProductionFixture: z.boolean().optional(),
  })
  .strict();

export const CandidateAssertionSchema = z
  .object({
    id: CandidateAssertionIdSchema,
    engagementId: EngagementIdSchema,
    kind: AssertionKindSchema,
    topicKey: NonEmptySchema.max(80),
    structuredValue: z.unknown(),
    narrative: NonEmptySchema.max(2000),
    sourceSegmentIds: z.array(SourceSegmentIdSchema).min(1),
    assertedByParticipantId: ParticipantIdSchema.optional(),
    capturedByPersonId: PersonIdSchema,
    origin: z.enum(["HUMAN", "AI_FIXTURE"]),
    directness: AssertionDirectnessSchema,
    confidence: ConfidenceLevelSchema,
    rationale: NonEmptySchema.max(2000),
    confirmationState: ConfirmationStateSchema,
    sensitivity: SensitivityClassSchema,
    effectiveFrom: IsoDatetimeSchema,
    effectiveUntil: IsoDatetimeSchema.optional(),
    ceremonyScope: z.string().max(80).optional(),
    supersedesAssertionId: CandidateAssertionIdSchema.optional(),
    contentHash: NonEmptySchema.max(128),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const AssertionConflictSchema = z
  .object({
    id: AssertionConflictIdSchema,
    engagementId: EngagementIdSchema,
    topicKey: NonEmptySchema.max(80),
    assertionIds: z.array(CandidateAssertionIdSchema).min(2),
    sourceSegmentIds: z.array(SourceSegmentIdSchema).min(1),
    severity: z.enum(CONFLICT_SEVERITIES),
    explanation: NonEmptySchema.max(2000),
    decisionOwnerPersonId: PersonIdSchema.optional(),
    blockingGates: z.array(z.enum(["INDICATIVE_BRIEF", "WORKING_BRIEF", "APPROVED_BRIEF"])),
    status: z.enum(["OPEN", "RESOLVED", "CLARIFICATION_REQUIRED"]),
    resolution: z.enum(CONFLICT_RESOLUTIONS).optional(),
    clarificationWording: z.string().max(2000).optional(),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const CoverageCatalogueEditionSchema = z
  .object({
    id: CoverageCatalogueEditionIdSchema,
    editionLabel: NonEmptySchema.max(80),
    current: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    ...orgScoped,
    schemaVersion: z.literal(SCHEMA_VERSION),
    version: z.number().int().positive(),
    createdAt: IsoDatetimeSchema,
    updatedAt: IsoDatetimeSchema,
    nonProductionFixture: z.boolean().optional(),
  })
  .strict();

export const CoverageRequirementSchema = z
  .object({
    id: CoverageRequirementIdSchema,
    catalogueEditionId: CoverageCatalogueEditionIdSchema,
    topicKey: NonEmptySchema.max(80),
    title: NonEmptySchema.max(200),
    purpose: NonEmptySchema.max(400),
    omissionRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
    applicability: PredicateAstSchema,
    acceptableEvidence: z.array(SourceArtefactKindSchema).min(1),
    confirmationRequired: z.boolean(),
    sensitivity: SensitivityClassSchema,
    earliestPhase: z.enum(["FIRST_CONTACT", "DISCOVERY", "WORKING_BRIEF"]),
    latestSafePhase: z.enum(["FIRST_CONTACT", "DISCOVERY", "WORKING_BRIEF", "APPROVED_BRIEF"]),
    completenessGate: z.enum(["INDICATIVE", "WORKING", "APPROVED"]),
    eventTypeOverlays: z.array(NonEmptySchema.max(80)),
    ...orgScoped,
    schemaVersion: z.literal(SCHEMA_VERSION),
    version: z.number().int().positive(),
    createdAt: IsoDatetimeSchema,
    updatedAt: IsoDatetimeSchema,
    nonProductionFixture: z.boolean().optional(),
  })
  .strict();

export const CoverageAssessmentSchema = z
  .object({
    id: CoverageAssessmentIdSchema,
    engagementId: EngagementIdSchema,
    requirementId: CoverageRequirementIdSchema,
    topicKey: NonEmptySchema.max(80),
    state: CoverageStateSchema,
    evidenceAssertionIds: z.array(CandidateAssertionIdSchema),
    rankScore: z.string().regex(/^\d+(\.\d+)?$/),
    explanation: NonEmptySchema.max(800),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const S05AMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: z.literal("EOS-S05A-DISCOVERY-V1"),
    checksum: NonEmptySchema.max(128),
    status: z.enum(["APPLIED", "REPLAYED"]),
    createdRecords: z.array(z.string()),
    notes: z.array(
      z
        .object({
          code: NonEmptySchema.max(80),
          subjectType: NonEmptySchema.max(80),
          subjectId: UuidSchema,
        })
        .strict(),
    ),
    ...versioned,
  })
  .strict();

export const CreateOpportunityInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    displayReference: NonEmptySchema.max(160),
    eventConceptLabel: z.string().max(200).optional(),
    enquiryChannel: EnquiryChannelSchema,
    knownEventDate: z.string().date().optional(),
    knownEventType: z.string().max(80).optional(),
    expectedVersion: z.number().int().nonnegative().default(0),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const UpdateOpportunityInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    opportunityId: OpportunityIdSchema,
    stage: OpportunityStageSchema.optional(),
    ownerPersonId: PersonIdSchema.optional(),
    closedReason: z.string().max(400).optional(),
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const StartDiscoveryEngagementInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    opportunityId: OpportunityIdSchema,
    displayReference: NonEmptySchema.max(160).optional(),
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const AddParticipantInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    displayName: NonEmptySchema.max(160),
    claimedRole: NonEmptySchema.max(80),
    authorityClaim: z.enum(["PRINCIPAL", "AUTHORISED_DELEGATE", "RELATIVE", "UNAUTHORISED", "UNKNOWN"]),
    linkedPersonId: PersonIdSchema.optional(),
    expectedVersion: z.number().int().nonnegative().default(0),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const RecordDiscoveryConsentInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    participantId: ParticipantIdSchema.optional(),
    dimension: ConsentDimensionSchema,
    decision: z.enum(["GRANTED", "DECLINED", "WITHDRAWN", "NOT_APPLICABLE"]),
    policyVersion: NonEmptySchema.max(80),
    wordingEdition: NonEmptySchema.max(80),
    legalBasisPlaceholder: z.string().max(200).optional(),
    expectedVersion: z.number().int().nonnegative().default(0),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

const SessionCommandBase = {
  organisationId: OrganisationIdSchema,
  engagementId: EngagementIdSchema,
  expectedVersion: z.number().int().nonnegative().default(0),
  reason: NonEmptySchema.max(400),
  idempotencyKey: NonEmptySchema.max(120),
};

export const CreateInterviewSessionInputSchema = z
  .object({
    action: z.literal("CREATE"),
    mode: z.enum(["STAFF_LED", "CLIENT_LED", "OFFLINE_NOTES", "FOLLOW_UP"]).optional(),
    language: z.string().max(32).optional(),
    ...SessionCommandBase,
  })
  .strict();

export const TransitionInterviewSessionInputSchema = z
  .object({
    action: z.enum(["READY", "START", "PAUSE", "RESUME", "COMPLETE", "ABANDON", "CANCEL"]),
    sessionId: InterviewSessionIdSchema,
    ...SessionCommandBase,
  })
  .strict();

export const SessionLifecycleInputSchema = z.union([
  CreateInterviewSessionInputSchema,
  TransitionInterviewSessionInputSchema,
]);

export const RecordSourceArtefactInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    sessionId: InterviewSessionIdSchema.optional(),
    kind: SourceArtefactKindSchema,
    title: NonEmptySchema.max(200),
    text: NonEmptySchema.max(8000),
    language: z.string().max(32).optional(),
    objectKey: z.string().max(240).optional(),
    byteChecksum: z.string().max(128).optional(),
    contentSafetyStatus: z.enum(["CLEAN", "QUARANTINED", "FAILED"]).optional(),
    speakerParticipantId: ParticipantIdSchema.optional(),
    disclosureClass: DiscoveryDisclosureClassSchema.optional(),
    expectedVersion: z.number().int().nonnegative().default(0),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const CandidateAssertionProposalSchema = z
  .object({
    kind: AssertionKindSchema,
    topicKey: NonEmptySchema.max(80),
    value: z.unknown(),
    sourceSegmentIds: z.array(SourceSegmentIdSchema).min(1),
    directness: AssertionDirectnessSchema,
    confidence: ConfidenceLevelSchema,
    rationale: NonEmptySchema.max(2000),
    sensitivity: SensitivityClassSchema,
  })
  .strict();

export const ExtractAssertionsInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    artefactId: SourceArtefactIdSchema,
    expectedVersion: z.number().int().nonnegative().default(0),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const ReviewAssertionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    assertionId: CandidateAssertionIdSchema,
    decision: z.enum(["ACCEPT_STAFF_REVIEWED", "AMEND", "REJECT", "REQUEST_CLARIFICATION"]),
    amendedValue: z.unknown().optional(),
    amendedNarrative: z.string().max(2000).optional(),
    confirmationState: ConfirmationStateSchema.optional(),
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const ResolveConflictInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema,
    conflictId: AssertionConflictIdSchema,
    resolution: z.enum(CONFLICT_RESOLUTIONS),
    selectedAssertionId: CandidateAssertionIdSchema.optional(),
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const ExtractionDispositionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ASSERTION_PROPOSED"),
      sourceSegmentId: SourceSegmentIdSchema,
      assertionId: CandidateAssertionIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("DUPLICATE_SUPPORTED"),
      sourceSegmentId: SourceSegmentIdSchema,
      existingAssertionId: CandidateAssertionIdSchema,
      explanationCode: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({
      kind: z.literal("NO_MATERIAL_ASSERTION"),
      sourceSegmentId: SourceSegmentIdSchema,
      explanationCode: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({
      kind: z.literal("NEEDS_HUMAN_REVIEW"),
      sourceSegmentId: SourceSegmentIdSchema,
      explanationCode: z.string().min(1).max(80),
      safeSummary: z.string().min(1).max(400),
    })
    .strict(),
  z
    .object({
      kind: z.literal("REJECTED_UNSUPPORTED"),
      sourceSegmentId: SourceSegmentIdSchema,
      explanationCode: z.string().min(1).max(80),
    })
    .strict(),
]);

export const ExtractionOutcomeSchema = z
  .object({
    id: ExtractionOutcomeIdSchema,
    engagementId: EngagementIdSchema,
    artefactId: SourceArtefactIdSchema,
    artefactVersion: z.number().int().nonnegative(),
    sourceContentHash: NonEmptySchema.max(128),
    dispositions: z.array(ExtractionDispositionSchema),
    consideredCount: z.number().int().nonnegative(),
    proposedCount: z.number().int().nonnegative(),
    duplicateCount: z.number().int().nonnegative(),
    noMaterialCount: z.number().int().nonnegative(),
    needsReviewCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
    idempotencyKey: NonEmptySchema.max(120),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const DiscoveryDisclosureGrantSchema = z
  .object({
    id: DiscoveryDisclosureGrantIdSchema,
    engagementId: EngagementIdSchema.optional(),
    personId: PersonIdSchema,
    disclosureClass: DiscoveryDisclosureClassSchema,
    grantedByPersonId: PersonIdSchema,
    expiresAt: IsoDatetimeSchema.optional(),
    revokedAt: IsoDatetimeSchema.optional(),
    revokeReason: z.string().max(400).optional(),
    reason: NonEmptySchema.max(400),
    ...orgScoped,
    ...versioned,
  })
  .strict();

export const GrantDiscoveryDisclosureInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    engagementId: EngagementIdSchema.optional(),
    personId: PersonIdSchema,
    disclosureClass: DiscoveryDisclosureClassSchema,
    expiresAt: IsoDatetimeSchema.optional(),
    expectedVersion: z.number().int().nonnegative().default(0),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const RevokeDiscoveryDisclosureInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    grantId: DiscoveryDisclosureGrantIdSchema,
    revokeReason: NonEmptySchema.max(400),
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export const RecordClientDiscoveryConsentInputSchema = z
  .object({
    dimension: ConsentDimensionSchema,
    decision: z.enum(["GRANTED", "DECLINED", "WITHDRAWN", "NOT_APPLICABLE"]),
    policyVersion: NonEmptySchema.max(80).optional(),
    wordingEdition: NonEmptySchema.max(80).optional(),
    idempotencyKey: NonEmptySchema.max(120).optional(),
  })
  .strict();

export const S05A_CANONICAL_COLLECTIONS = [
  "engagementOpportunities",
  "discoveryEngagements",
  "discoveryParticipants",
  "discoveryConsentRecords",
  "interviewSessions",
  "sourceArtefacts",
  "sourceSegments",
  "candidateAssertions",
  "assertionConflicts",
  "coverageCatalogueEditions",
  "coverageRequirements",
  "coverageAssessments",
  "discoveryDisclosureGrants",
  "extractionOutcomes",
] as const;

export type CoverageState = z.infer<typeof CoverageStateSchema>;
export type EngagementOpportunity = z.infer<typeof EngagementOpportunitySchema>;
export type DiscoveryEngagement = z.infer<typeof DiscoveryEngagementSchema>;
export type DiscoveryParticipant = z.infer<typeof DiscoveryParticipantSchema>;
export type DiscoveryConsentRecord = z.infer<typeof DiscoveryConsentRecordSchema>;
export type InterviewSession = z.infer<typeof InterviewSessionSchema>;
export type SourceArtefact = z.infer<typeof SourceArtefactSchema>;
export type SourceSegment = z.infer<typeof SourceSegmentSchema>;
export type CandidateAssertion = z.infer<typeof CandidateAssertionSchema>;
export type AssertionConflict = z.infer<typeof AssertionConflictSchema>;
export type CoverageCatalogueEdition = z.infer<typeof CoverageCatalogueEditionSchema>;
export type CoverageRequirement = z.infer<typeof CoverageRequirementSchema>;
export type CoverageAssessment = z.infer<typeof CoverageAssessmentSchema>;
export type S05AMigrationReceipt = z.infer<typeof S05AMigrationReceiptSchema>;
export type CreateOpportunityInput = z.infer<typeof CreateOpportunityInputSchema>;
export type StartDiscoveryEngagementInput = z.infer<typeof StartDiscoveryEngagementInputSchema>;
export type CandidateAssertionProposal = z.infer<typeof CandidateAssertionProposalSchema>;
export type MoneyDto = z.infer<typeof MoneyDtoSchema>;
export type QuantityDto = z.infer<typeof QuantityDtoSchema>;
export type PredicateAst = z.infer<typeof PredicateAstSchema>;
export type DiscoveryDisclosureClass = z.infer<typeof DiscoveryDisclosureClassSchema>;
export type ExtractionDisposition = z.infer<typeof ExtractionDispositionSchema>;
export type ExtractionOutcome = z.infer<typeof ExtractionOutcomeSchema>;
export type DiscoveryDisclosureGrant = z.infer<typeof DiscoveryDisclosureGrantSchema>;
export type GrantDiscoveryDisclosureInput = z.infer<typeof GrantDiscoveryDisclosureInputSchema>;
export type RevokeDiscoveryDisclosureInput = z.infer<typeof RevokeDiscoveryDisclosureInputSchema>;
export type RecordClientDiscoveryConsentInput = z.infer<typeof RecordClientDiscoveryConsentInputSchema>;
