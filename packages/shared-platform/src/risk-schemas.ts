import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import { MoneyDtoSchema } from "./eec-schemas.js";
import { EventIdSchema, IsoDatetimeSchema, NonEmptySchema, OrganisationIdSchema, PersonIdSchema, UuidSchema } from "./schemas.js";

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

export const RiskMoneySchema = MoneyDtoSchema.refine((value) => !value.minor.includes("."), "fractional minor units are forbidden").refine(
  (value) => !value.minor.startsWith("-") || value.minor === "0",
  "negative money is forbidden unless an explicit signed exposure kind is used",
);

export const RiskDateRangeSchema = z
  .object({
    startOn: z.string().date(),
    endOn: z.string().date(),
  })
  .strict()
  .refine((value) => value.startOn <= value.endOn, "date range end must be on or after start");

export const RecordScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ORGANISATION"), organisationId: OrganisationIdSchema }).strict(),
  z.object({ kind: z.literal("EVENT"), organisationId: OrganisationIdSchema, eventId: EventIdSchema }).strict(),
]);

export const RiskCommandEnvelopeSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    assignmentId: UuidSchema,
    expectedVersion: z.number().int().nonnegative(),
    idempotencyKey: z.string().min(12).max(200),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict();

export const RISK_POLICY_TYPES = [
  "EMPLOYEE_COMPENSATION",
  "GROUP_LIFE",
  "PUBLIC_LIABILITY",
  "PROFESSIONAL_INDEMNITY",
  "EQUIPMENT_ALL_RISK",
  "INLAND_TRANSIT",
  "FIRE_SPECIAL_PERILS",
  "BURGLARY",
  "EVENT_CANCELLATION",
  "CONTINGENT_BUSINESS_INTERRUPTION",
  "EXTRA_EXPENSE",
] as const;

export const RISK_AUTHORITY_STATUSES = ["DISCOVERY", "COUNSEL_REVIEWED", "APPROVED", "SUPERSEDED", "WITHDRAWN"] as const;
export const RISK_SOURCE_AUTHORITIES = ["LEGISLATION", "REGULATOR", "VENUE", "INSURER", "BROKER", "COUNSEL", "CLIENT", "INTERNAL_POLICY"] as const;
export const RISK_DOCUMENT_STATES = [
  "PENDING_UPLOAD",
  "UPLOADED",
  "SCAN_PENDING",
  "CLEAN",
  "QUARANTINED",
  "SCAN_FAILED",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
  "SUPERSEDED",
] as const;
export const RISK_SCAN_STATES = ["NOT_SCANNED", "SCAN_PENDING", "CLEAN", "QUARANTINED", "SCAN_FAILED"] as const;
export const RISK_DISCLOSURE_CLASSES = [
  "LEGAL_ADVICE",
  "PERSONAL_DATA",
  "POLICY_IDENTIFIER",
  "LIMIT_DEDUCTIBLE",
  "RESTRICTED_INCIDENT",
  "INTERNAL_VENDOR_ASSESSMENT",
  "OPERATIONAL",
] as const;
export const RISK_APPLICABILITY_DECISIONS = ["APPLIES", "DOES_NOT_APPLY", "INDETERMINATE", "STALE"] as const;
export const RISK_GAP_TAXONOMY = [
  "MISSING_POLICY_OR_CERTIFICATE",
  "EXPIRED_OR_EXPIRING",
  "INSUFFICIENT_OR_INDETERMINATE_LIMIT",
  "EVENT_VENUE_ACTIVITY_NOT_EVIDENCED",
  "PARTY_NAME_MISMATCH",
  "ASSET_OR_TRANSIT_SCOPE_MISMATCH",
  "EXCLUSION_REQUIRING_REVIEW",
  "UNVERIFIED_DOCUMENT",
  "RULE_OR_SOURCE_STALE",
  "EVIDENCE_INACCESSIBLE",
  "DUPLICATE_OR_CONFLICTING_CERTIFICATE",
] as const;
export const RISK_GAP_STATES = ["OPEN", "MITIGATION_PROPOSED", "ACCEPTED_RISK", "RESOLVED", "REOPENED"] as const;
export const RISK_RESIDUAL_CHOICES = [
  "RESOLVE_WITH_EVIDENCE",
  "ACCEPT_RESIDUAL_RISK",
  "ADD_COMPENSATING_CONTROL",
  "REJECT_APPLICABILITY",
  "KEEP_UNRESOLVED",
] as const;
export const RISK_CLAUSE_FAMILIES = [
  "PERFORMANCE_SECURITY",
  "RETENTION",
  "LIQUIDATED_DAMAGES",
  "INDEMNITY",
  "INSURANCE_OBLIGATION",
  "CANCELLATION",
  "FORCE_MAJEURE",
  "STEP_IN",
  "SUBCONTRACTOR_EVIDENCE",
  "DATA_PROTECTION",
  "CONFIDENTIALITY",
  "INTELLECTUAL_PROPERTY",
  "SERVICE_LEVEL",
  "NOTIFICATION",
  "AUDIT_RIGHTS",
  "TERMINATION",
] as const;
export const RISK_VENDOR_BANDS = ["LOWER", "MODERATE", "HEIGHTENED", "CRITICAL", "INDETERMINATE"] as const;
export const RISK_INDICATOR_STATUSES = ["POSITIVE", "NEUTRAL", "CONCERN", "UNKNOWN"] as const;
export const RISK_ROSTER_ROLES = ["PRIMARY", "ALTERNATE", "STANDBY"] as const;
export const RISK_CHECKIN_STATES = ["SCHEDULED", "DUE", "CONFIRMED", "AT_RISK", "MISSED", "ESCALATED", "CLOSED"] as const;
export const RISK_ACTIVATION_STATES = ["PROPOSED", "AUTHORISED", "INITIATED", "CONFIRMED", "FAILED", "CANCELLED", "CLOSED"] as const;
export const RISK_INCIDENT_STATES = ["OPEN", "STABILISED", "RECOVERY", "CLOSED", "POST_INCIDENT_REVIEWED"] as const;
export const RISK_DOSSIER_STATES = ["DRAFT", "SUBMITTED", "APPROVED", "PUBLISHED", "WITHDRAWN", "SUPERSEDED"] as const;
export const RISK_ADAPTER_STATES = ["INACTIVE", "MISCONFIGURED", "READY", "DEGRADED"] as const;
export const RISK_EFFECT_STATES = ["NOT_REQUESTED", "PENDING_APPROVAL", "QUEUED", "SENT", "DELIVERED", "FAILED", "CANCELLED"] as const;
export const RISK_EVALUATION_RUN_STATES = ["QUEUED", "RUNNING", "PASSED", "FAILED", "ERROR"] as const;
export const RISK_EVALUATION_READINESS_STATES = ["UNRUN", "RUNNING", "STALE", "INCOMPATIBLE", "FAILED", "ERROR", "PASSED"] as const;

export const RiskCommandEnvelopeInputSchema = RiskCommandEnvelopeSchema;
export const CoverageLimitSchema = z
  .object({
    coverageKey: NonEmptySchema.max(80),
    limit: MoneyDtoSchema,
    basis: NonEmptySchema.max(80),
  })
  .strict();
export const DeductibleSchema = z
  .object({
    coverageKey: NonEmptySchema.max(80),
    amount: MoneyDtoSchema,
  })
  .strict();

export const RiskSourceEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    title: NonEmptySchema.max(240),
    publisher: NonEmptySchema.max(160),
    locator: NonEmptySchema.max(400),
    authority: z.enum(RISK_SOURCE_AUTHORITIES),
    jurisdiction: NonEmptySchema.max(32),
    publicationDate: z.string().date().optional(),
    effectiveFrom: z.string().date().optional(),
    effectiveTo: z.string().date().optional(),
    retrievedAt: IsoDatetimeSchema,
    lastVerifiedAt: IsoDatetimeSchema,
    nextReviewAt: IsoDatetimeSchema,
    fileHash: z.string().max(128).optional(),
    excerpt: z.string().max(1200).optional(),
    summary: NonEmptySchema.max(2000),
    status: z.enum(RISK_AUTHORITY_STATUSES),
    discoveryOnly: z.boolean(),
    contentHash: NonEmptySchema.max(128),
    supersedesEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const RiskRuleEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    ruleKey: NonEmptySchema.max(80),
    jurisdiction: NonEmptySchema.max(32),
    proposition: NonEmptySchema.max(2000),
    sourceEditionIds: z.array(UuidSchema).max(16),
    requirementKey: NonEmptySchema.max(80),
    policyType: z.enum(RISK_POLICY_TYPES).optional(),
    mandatory: z.boolean(),
    effectiveFrom: z.string().date().optional(),
    effectiveTo: z.string().date().optional(),
    lastVerifiedAt: IsoDatetimeSchema,
    nextReviewAt: IsoDatetimeSchema,
    status: z.enum(RISK_AUTHORITY_STATUSES),
    approvedByPersonId: PersonIdSchema.optional(),
    approvedAt: IsoDatetimeSchema.optional(),
    reviewedByPersonId: PersonIdSchema.optional(),
    contentHash: NonEmptySchema.max(128),
    supersedesEditionId: UuidSchema.optional(),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskEvidenceDocumentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    title: NonEmptySchema.max(200),
    classification: z.enum(RISK_DISCLOSURE_CLASSES),
    state: z.enum(RISK_DOCUMENT_STATES),
    scanStatus: z.enum(RISK_SCAN_STATES),
    byteChecksum: z.string().max(128).optional(),
    byteLength: z.number().int().nonnegative().max(25_000_000).optional(),
    contentType: z.string().max(120).optional(),
    originalFilename: z.string().max(200).optional(),
    objectKey: z.string().max(240).optional(),
    uploadedByPersonId: PersonIdSchema,
    verifiedByPersonId: PersonIdSchema.optional(),
    rejectionReason: z.string().max(2000).optional(),
    expiresOn: z.string().date().optional(),
    supersedesDocumentId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const RiskPolicySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    scopeKind: z.enum(["ORGANISATION", "EVENT"]),
    policyType: z.enum(RISK_POLICY_TYPES),
    insurerPartyId: UuidSchema,
    insurerLabel: NonEmptySchema.max(160),
    currentEditionId: UuidSchema.optional(),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskPolicyEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    policyId: UuidSchema,
    policyType: z.enum(RISK_POLICY_TYPES),
    insurerPartyId: UuidSchema,
    insurerLabel: NonEmptySchema.max(160),
    policyNumberCiphertext: NonEmptySchema.max(240),
    currency: NonEmptySchema.max(8),
    period: RiskDateRangeSchema,
    limits: z.array(CoverageLimitSchema).max(16),
    deductibles: z.array(DeductibleSchema).max(16),
    territorialScope: z.string().max(400).optional(),
    activityScope: z.string().max(400).optional(),
    insuredPartyLabels: z.array(NonEmptySchema.max(160)).max(16),
    assetInventoryRefs: z.array(UuidSchema).max(32),
    endorsementNotes: z.string().max(2000).optional(),
    exclusionNotes: z.string().max(2000).optional(),
    documentEditionId: UuidSchema,
    verificationState: z.enum(["DRAFT", "SUBMITTED", "VERIFIED", "REJECTED", "EXPIRED", "SUPERSEDED"]),
    verifiedByPersonId: PersonIdSchema.optional(),
    verifiedAt: IsoDatetimeSchema.optional(),
    submittedByPersonId: PersonIdSchema,
    contentHash: NonEmptySchema.max(128),
    supersedesEditionId: UuidSchema.optional(),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const RiskFactEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    factKey: NonEmptySchema.max(80),
    value: NonEmptySchema.max(400),
    unknown: z.boolean(),
    evidenceIds: z.array(UuidSchema).max(8),
    contentHash: NonEmptySchema.max(128),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskApplicabilitySnapshotSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    evaluatedAt: IsoDatetimeSchema,
    ruleEditionIds: z.array(UuidSchema).max(64),
    factEditionIds: z.array(UuidSchema).max(64),
    policyEditionIds: z.array(UuidSchema).max(64),
    requirements: z
      .array(
        z
          .object({
            requirementKey: NonEmptySchema.max(80),
            decision: z.enum(RISK_APPLICABILITY_DECISIONS),
            factEditionIds: z.array(UuidSchema).max(16),
            ruleEditionId: UuidSchema,
            policyEditionId: UuidSchema.optional(),
            missingFacts: z.array(NonEmptySchema.max(80)).max(16),
            trace: z.array(z.object({ step: NonEmptySchema.max(80), detail: z.string().max(400) }).strict()).max(32),
          })
          .strict(),
      )
      .max(64),
    overall: z.enum(["READY", "GAPS", "INDETERMINATE", "STALE"]),
    contentHash: NonEmptySchema.max(128),
    evaluatedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskGapFindingSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    snapshotId: UuidSchema,
    snapshotHash: NonEmptySchema.max(128),
    requirementKey: NonEmptySchema.max(80),
    taxonomy: z.enum(RISK_GAP_TAXONOMY),
    identityKey: NonEmptySchema.max(240),
    state: z.enum(RISK_GAP_STATES),
    affectedObjectIds: z.array(UuidSchema).max(16),
    explanation: NonEmptySchema.max(2000),
    residualDecisionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const RiskResidualDecisionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    gapId: UuidSchema,
    snapshotHash: NonEmptySchema.max(128),
    choice: z.enum(RISK_RESIDUAL_CHOICES),
    reason: NonEmptySchema.max(2000),
    compensatingControl: z.string().max(2000).optional(),
    evidenceIds: z.array(UuidSchema).max(8),
    expiresOn: z.string().date().optional(),
    submittedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    status: z.enum(["SUBMITTED", "APPROVED", "REJECTED"]),
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const RiskClauseTemplateSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    family: z.enum(RISK_CLAUSE_FAMILIES),
    title: NonEmptySchema.max(200),
    jurisdiction: NonEmptySchema.max(32),
    body: NonEmptySchema.max(8000),
    variables: z.array(z.object({ key: NonEmptySchema.max(40), label: NonEmptySchema.max(80), kind: z.enum(["TEXT", "MONEY", "PERCENT", "DATE"]) }).strict()).max(16),
    status: z.enum(["DRAFT", "LEGAL_REVIEW", "APPROVED", "SUPERSEDED"]),
    aiProposed: z.boolean(),
    currentEditionId: UuidSchema.optional(),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskClauseEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    clauseId: UuidSchema,
    family: z.enum(RISK_CLAUSE_FAMILIES),
    jurisdiction: NonEmptySchema.max(32),
    language: NonEmptySchema.max(16),
    body: NonEmptySchema.max(8000),
    renderedBody: NonEmptySchema.max(8000),
    variables: z.array(z.object({ key: NonEmptySchema.max(40), value: NonEmptySchema.max(240) }).strict()).max(16),
    sourceTemplateEditionId: UuidSchema.optional(),
    vendorId: UuidSchema.optional(),
    legalReviewStatus: z.enum(["NOT_REVIEWED", "CHANGES_REQUESTED", "APPROVED"]),
    commercialApprovalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    aiProposed: z.boolean(),
    enforceabilityClaimed: z.literal(false),
    contentHash: NonEmptySchema.max(128),
    submittedByPersonId: PersonIdSchema,
    legalReviewerPersonId: PersonIdSchema.optional(),
    commercialApproverPersonId: PersonIdSchema.optional(),
    current: z.boolean(),
    supersedesEditionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const RiskVendorEvidenceSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    vendorId: UuidSchema,
    eventId: EventIdSchema.optional(),
    category: NonEmptySchema.max(80),
    sourceLabel: NonEmptySchema.max(160),
    observationDate: z.string().date(),
    summary: NonEmptySchema.max(2000),
    verified: z.boolean(),
    expiresOn: z.string().date().optional(),
    documentId: UuidSchema.optional(),
    supersedesEvidenceId: UuidSchema.optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskVendorAssessmentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    vendorId: UuidSchema,
    eventId: EventIdSchema.optional(),
    evidenceCutoff: IsoDatetimeSchema,
    modelEdition: NonEmptySchema.max(40),
    indicators: z
      .array(
        z
          .object({
            key: NonEmptySchema.max(80),
            status: z.enum(RISK_INDICATOR_STATUSES),
            evidenceIds: z.array(UuidSchema).max(8),
            explanation: NonEmptySchema.max(400),
          })
          .strict(),
      )
      .max(16),
    band: z.enum(RISK_VENDOR_BANDS),
    recommendedControls: z.array(NonEmptySchema.max(240)).max(8),
    humanDecision: z.enum(["APPROVED", "RESTRICTED", "DECLINED"]).optional(),
    decisionReason: z.string().max(2000).optional(),
    decidedByPersonId: PersonIdSchema.optional(),
    submittedByPersonId: PersonIdSchema,
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const RiskRosterAssignmentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    vendorId: UuidSchema,
    vendorLabel: NonEmptySchema.max(160),
    canonicalVendorAssignmentId: UuidSchema.optional(),
    role: z.enum(RISK_ROSTER_ROLES),
    criticalFunctionKey: NonEmptySchema.max(80),
    availabilityWindow: RiskDateRangeSchema.optional(),
    readiness: z.enum(["NOT_READY", "EVIDENCE_PENDING", "READY", "RESTRICTED"]),
    commercialStatus: z.enum(["UNCONFIRMED", "PROPOSED", "CONTRACTED", "NOT_ENGAGED"]),
    booked: z.boolean(),
    bookedAuthority: z.string().max(200).optional(),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskCriticalFunctionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    functionKey: NonEmptySchema.max(80),
    title: NonEmptySchema.max(160),
    venueAreaId: UuidSchema.optional(),
    assetId: UuidSchema.optional(),
    vendorAssignmentId: UuidSchema.optional(),
    maximumTolerableInterruptionMinutes: z.number().int().nonnegative(),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskContinuityPlanSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    title: NonEmptySchema.max(200),
    recoveryObjectiveMinutes: z.number().int().nonnegative(),
    maximumTolerableInterruptionMinutes: z.number().int().nonnegative(),
    primaryAssignmentId: UuidSchema.optional(),
    standbyAssignmentIds: z.array(UuidSchema).max(8),
    prerequisites: z.array(NonEmptySchema.max(240)).max(12),
    evidenceIds: z.array(UuidSchema).max(8),
    decisionRole: NonEmptySchema.max(80),
    communicationIntentIds: z.array(UuidSchema).max(8),
    reserveScenarioRef: UuidSchema.optional(),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "SUPERSEDED"]),
    submittedByPersonId: PersonIdSchema,
    approvedByPersonId: PersonIdSchema.optional(),
    contentHash: NonEmptySchema.max(128),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const RiskCheckpointTemplateSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    offsetHours: z.number().int().positive(),
    title: NonEmptySchema.max(160),
    requiredEvidence: NonEmptySchema.max(400),
    status: z.enum(["DRAFT", "APPROVED", "SUPERSEDED"]),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskCheckpointInstanceSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    templateId: UuidSchema,
    dueAt: IsoDatetimeSchema,
    timezone: NonEmptySchema.max(64),
    ownerPersonId: PersonIdSchema.optional(),
    status: z.enum(RISK_CHECKIN_STATES),
    identityKey: NonEmptySchema.max(240),
    ...versioned,
  })
  .strict();

export const RiskCheckInSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    checkpointId: UuidSchema,
    response: z.enum(["CONFIRMED", "AT_RISK", "UNAVAILABLE"]),
    source: z.enum(["STAFF", "VENDOR_MESSAGE", "SYSTEM_DERIVED"]),
    actorPersonId: PersonIdSchema,
    note: z.string().max(2000).optional(),
    supersedesCheckInId: UuidSchema.optional(),
    reminderReceiptDoesNotConfirm: z.literal(true),
    ...versioned,
  })
  .strict();

export const RiskCommunicationIntentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    purpose: NonEmptySchema.max(160),
    recipientLabel: NonEmptySchema.max(160),
    channel: z.enum(["EMAIL", "SMS", "INTERNAL"]),
    templateEdition: z.string().max(80).optional(),
    status: z.enum(RISK_EFFECT_STATES),
    providerStatus: z.enum(RISK_ADAPTER_STATES),
    approvalRequired: z.boolean(),
    dispatched: z.literal(false),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskEscalationIntentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    checkpointId: UuidSchema,
    communicationIntentId: UuidSchema.optional(),
    identityKey: NonEmptySchema.max(240),
    approvalRequired: z.boolean(),
    dispatched: z.literal(false),
    createdAtEvaluation: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const RiskFallbackActivationSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    planId: UuidSchema,
    triggerEvidence: NonEmptySchema.max(2000),
    impact: NonEmptySchema.max(2000),
    eligibleAlternativeIds: z.array(UuidSchema).max(8),
    unmetPrerequisites: z.array(NonEmptySchema.max(240)).max(12),
    budgetVarianceNote: z.string().max(400).optional(),
    status: z.enum(RISK_ACTIVATION_STATES),
    proposedByPersonId: PersonIdSchema,
    authorisedByPersonId: PersonIdSchema.optional(),
    bookingRequested: z.literal(false),
    paymentRequested: z.literal(false),
    dispatchRequested: z.literal(false),
    ...versioned,
  })
  .strict();

export const RiskIncidentSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    title: NonEmptySchema.max(200),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "LIFE_SAFETY"]),
    state: z.enum(RISK_INCIDENT_STATES),
    lifeSafety: z.boolean(),
    phaseLabel: z.string().max(80).optional(),
    spatialRef: UuidSchema.optional(),
    vendorAssignmentId: UuidSchema.optional(),
    reportedByPersonId: PersonIdSchema,
    sensitive: z.boolean(),
    ...versioned,
  })
  .strict();

export const RiskIncidentNoteSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    incidentId: UuidSchema,
    kind: z.enum(["FACT", "CLAIM", "HYPOTHESIS", "DECISION", "ACTION", "IMPACT"]),
    body: NonEmptySchema.max(4000),
    classification: z.enum(RISK_DISCLOSURE_CLASSES),
    actorPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskLearningProposalSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    incidentId: UuidSchema,
    target: z.enum(["RULE", "VENDOR_INDICATOR", "CONTINUITY_TEMPLATE"]),
    proposal: NonEmptySchema.max(2000),
    adopted: z.boolean(),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const RiskBudgetDriverSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("INSURANCE_PREMIUM_ASSUMPTION"), money: MoneyDtoSchema, evidenceIds: z.array(UuidSchema).max(8), assumptionLabel: z.string().max(200).optional() }).strict(),
  z.object({ kind: z.literal("DEDUCTIBLE_EXPOSURE"), money: MoneyDtoSchema, policyEditionId: UuidSchema }).strict(),
  z.object({ kind: z.literal("CONTRACT_RETENTION"), basisPoints: z.number().int().nonnegative(), contractEditionId: UuidSchema }).strict(),
  z
    .object({
      kind: z.literal("CONTINUITY_RESERVE"),
      basis: z.enum(["FIXED", "BUDGET_PERCENTAGE", "EXPOSURE_MODEL"]),
      value: z.number().nonnegative(),
      reason: NonEmptySchema.max(400),
      provenance: NonEmptySchema.max(200),
    })
    .strict(),
  z.object({ kind: z.literal("FALLBACK_REPLACEMENT_EXPOSURE"), money: MoneyDtoSchema, vendorAssignmentId: UuidSchema }).strict(),
  z.object({ kind: z.literal("UNQUANTIFIED_EXPOSURE"), reason: NonEmptySchema.max(400), evidenceIds: z.array(UuidSchema).max(8) }).strict(),
]);

export const RiskBudgetProjectionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    budgetScenarioEditionId: UuidSchema.optional(),
    successorScenarioEditionId: UuidSchema.optional(),
    governingScenarioUnchanged: z.boolean(),
    drivers: z.array(RiskBudgetDriverSchema).max(16),
    quantifiedMinor: z.string().regex(/^-?\d+$/),
    currency: NonEmptySchema.max(8),
    unquantifiedReasons: z.array(NonEmptySchema.max(400)).max(8),
    modelEdition: NonEmptySchema.max(40),
    trace: z.array(z.object({ op: NonEmptySchema.max(40), detail: z.string().max(400), value: z.string().max(80) }).strict()).max(32),
    generatedAt: IsoDatetimeSchema,
    createdByPersonId: PersonIdSchema,
    contentHash: NonEmptySchema.max(128),
    ...versioned,
  })
  .strict();

export const RiskDossierEditionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    status: z.enum(RISK_DOSSIER_STATES),
    componentHashes: z.array(NonEmptySchema.max(128)).max(32),
    contentHash: NonEmptySchema.max(128),
    languageApproved: z.boolean(),
    submittedByPersonId: PersonIdSchema,
    approvedByPersonId: PersonIdSchema.optional(),
    publishedByPersonId: PersonIdSchema.optional(),
    publishedAt: IsoDatetimeSchema.optional(),
    dispatched: z.literal(false),
    exportKind: z.enum(["NONE", "PDF"]).default("NONE"),
    limitations: NonEmptySchema.max(800),
    current: z.boolean(),
    ...versioned,
  })
  .strict();

export const S05BMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema.optional(),
    migrationId: NonEmptySchema.max(80),
    checksum: NonEmptySchema.max(128),
    status: z.enum(["APPLIED", "REPLAYED", "FAILED"]),
    createdRecords: z.record(z.string(), z.number().int().nonnegative()),
    ...versioned,
  })
  .strict();

export const RiskEvaluationRunSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    corpusEdition: NonEmptySchema.max(40),
    corpusHash: NonEmptySchema.max(128),
    orchestratorVersion: NonEmptySchema.max(40),
    providerVersion: NonEmptySchema.max(40),
    projectionPolicyVersion: NonEmptySchema.max(40),
    evaluationContractVersion: NonEmptySchema.max(40),
    applicationSha: z.string().max(64),
    status: z.enum(RISK_EVALUATION_RUN_STATES),
    caseCount: z.number().int().nonnegative(),
    passedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    zeroToleranceFailed: z.boolean(),
    requestedByPersonId: PersonIdSchema,
    correlationId: NonEmptySchema.max(80),
    idempotencyKey: NonEmptySchema.max(200),
    completedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const RiskEvaluationCaseResultSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    runId: UuidSchema,
    caseId: NonEmptySchema.max(80),
    family: NonEmptySchema.max(80),
    verdict: z.enum(["PASSED", "FAILED", "ERROR"]),
    observations: z
      .array(
        z
          .object({
            code: NonEmptySchema.max(80),
            expectedSummary: z.string().max(400),
            observedSummary: z.string().max(400),
            passed: z.boolean(),
          })
          .strict(),
      )
      .max(32),
    diagnosticSummary: NonEmptySchema.max(800),
    zeroToleranceCategories: z.array(NonEmptySchema.max(80)).max(8),
    ...versioned,
  })
  .strict();

export const RiskEvaluationRunLeaseSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    corpusHash: NonEmptySchema.max(128),
    runId: UuidSchema,
    status: z.enum(["ACTIVE", "RELEASED", "EXPIRED"]),
    acquiredAt: IsoDatetimeSchema,
    expiresAt: IsoDatetimeSchema,
    releasedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const S05B_CANONICAL_COLLECTIONS = [
  "riskSourceEditions",
  "riskRuleEditions",
  "riskEvidenceDocuments",
  "riskPolicies",
  "riskPolicyEditions",
  "riskFactEditions",
  "riskApplicabilitySnapshots",
  "riskGapFindings",
  "riskResidualDecisions",
  "riskClauseTemplates",
  "riskClauseEditions",
  "riskVendorEvidence",
  "riskVendorAssessments",
  "riskRosterAssignments",
  "riskCriticalFunctions",
  "riskContinuityPlans",
  "riskCheckpointTemplates",
  "riskCheckpointInstances",
  "riskCheckIns",
  "riskCommunicationIntents",
  "riskEscalationIntents",
  "riskFallbackActivations",
  "riskIncidents",
  "riskIncidentNotes",
  "riskLearningProposals",
  "riskBudgetProjections",
  "riskDossierEditions",
  "riskEvaluationRuns",
  "riskEvaluationCaseResults",
  "riskEvaluationRunLeases",
  "s05bMigrationReceipts",
] as const;

export type RecordScope = z.infer<typeof RecordScopeSchema>;
export type RiskCommandEnvelope = z.infer<typeof RiskCommandEnvelopeSchema>;
export type RiskSourceEdition = z.infer<typeof RiskSourceEditionSchema>;
export type RiskRuleEdition = z.infer<typeof RiskRuleEditionSchema>;
export type RiskEvidenceDocument = z.infer<typeof RiskEvidenceDocumentSchema>;
export type RiskPolicy = z.infer<typeof RiskPolicySchema>;
export type RiskPolicyEdition = z.infer<typeof RiskPolicyEditionSchema>;
export type RiskFactEdition = z.infer<typeof RiskFactEditionSchema>;
export type RiskApplicabilitySnapshot = z.infer<typeof RiskApplicabilitySnapshotSchema>;
export type RiskGapFinding = z.infer<typeof RiskGapFindingSchema>;
export type RiskResidualDecision = z.infer<typeof RiskResidualDecisionSchema>;
export type RiskClauseTemplate = z.infer<typeof RiskClauseTemplateSchema>;
export type RiskClauseEdition = z.infer<typeof RiskClauseEditionSchema>;
export type RiskVendorEvidence = z.infer<typeof RiskVendorEvidenceSchema>;
export type RiskVendorAssessment = z.infer<typeof RiskVendorAssessmentSchema>;
export type RiskRosterAssignment = z.infer<typeof RiskRosterAssignmentSchema>;
export type RiskCriticalFunction = z.infer<typeof RiskCriticalFunctionSchema>;
export type RiskContinuityPlan = z.infer<typeof RiskContinuityPlanSchema>;
export type RiskCheckpointTemplate = z.infer<typeof RiskCheckpointTemplateSchema>;
export type RiskCheckpointInstance = z.infer<typeof RiskCheckpointInstanceSchema>;
export type RiskCheckIn = z.infer<typeof RiskCheckInSchema>;
export type RiskCommunicationIntent = z.infer<typeof RiskCommunicationIntentSchema>;
export type RiskEscalationIntent = z.infer<typeof RiskEscalationIntentSchema>;
export type RiskFallbackActivation = z.infer<typeof RiskFallbackActivationSchema>;
export type RiskIncident = z.infer<typeof RiskIncidentSchema>;
export type RiskIncidentNote = z.infer<typeof RiskIncidentNoteSchema>;
export type RiskLearningProposal = z.infer<typeof RiskLearningProposalSchema>;
export type RiskBudgetDriver = z.infer<typeof RiskBudgetDriverSchema>;
export type RiskBudgetProjection = z.infer<typeof RiskBudgetProjectionSchema>;
export type RiskDossierEdition = z.infer<typeof RiskDossierEditionSchema>;
export type S05BMigrationReceipt = z.infer<typeof S05BMigrationReceiptSchema>;
export type RiskEvaluationRun = z.infer<typeof RiskEvaluationRunSchema>;
export type RiskEvaluationCaseResult = z.infer<typeof RiskEvaluationCaseResultSchema>;
export type RiskEvaluationRunLease = z.infer<typeof RiskEvaluationRunLeaseSchema>;
