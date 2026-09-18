import { z } from "zod";
import {
  CALIBRATION_COMPLETENESS,
  CALIBRATION_EVIDENCE_KINDS,
  DEFAULT_PARAMETER_SET_VERSION,
  FORECAST_ASSUMPTION_KINDS,
  FORECAST_CONFIDENCE_LEVELS,
  FORECAST_HOST_PROJECTION_STATUSES,
  FORECAST_LOCALITY_LABELS,
  FORECAST_MODEL_VERSION,
  FORECAST_OVERRIDE_FIELDS,
  FORECAST_OVERRIDE_STATUSES,
  FORECAST_PARAMETER_SCOPES,
  FORECAST_PARAMETER_STATUSES,
  FORECAST_POLICY_STATUSES,
  FORECAST_POLICY_VERSION,
  FORECAST_POPULATION_KINDS,
  FORECAST_RSVP_CLASSES,
  FORECAST_RUN_STATUSES,
  FORECAST_SCOPES,
  FORECAST_EVALUATION_STATUSES,
  PROVISION_DOMAINS,
  PROVISION_STATUSES,
  SCHEMA_VERSION,
  UNCERTAINTY_DRIVER_CODES,
} from "./constants.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";

export const ForecastPolicyIdSchema = UuidSchema;
export const ModelParameterSetIdSchema = UuidSchema;
export const AttendanceForecastRunIdSchema = UuidSchema;
export const ForecastPopulationMemberIdSchema = UuidSchema;
export const ForecastEstimateIdSchema = UuidSchema;
export const UncertaintyDriverIdSchema = UuidSchema;
export const ConfidenceAssessmentIdSchema = UuidSchema;
export const ForecastOverrideIdSchema = UuidSchema;
export const OperationalProvisionRecommendationIdSchema = UuidSchema;
export const CalibrationObservationIdSchema = UuidSchema;
export const ForecastEvaluationIdSchema = UuidSchema;
export const GuestIdRefSchema = UuidSchema;

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

const scoped = {
  organisationId: OrganisationIdSchema,
  clientId: ClientIdSchema,
  eventId: EventIdSchema,
};

const mutationBase = {
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  reason: NonEmptySchema.max(400),
  idempotencyKey: NonEmptySchema.max(120).optional(),
};

export const RateBandSchema = z
  .object({
    low: z.number().min(0).max(1),
    central: z.number().min(0).max(1),
    high: z.number().min(0).max(1),
  })
  .strict()
  .refine((value) => value.low <= value.central && value.central <= value.high, "rate band must satisfy low ≤ central ≤ high");

export const ForecastPolicySchema = z
  .object({
    id: ForecastPolicyIdSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    name: NonEmptySchema.max(120),
    status: z.enum(FORECAST_POLICY_STATUSES),
    policyVersion: z.literal(FORECAST_POLICY_VERSION),
    localityLabel: z.enum(FORECAST_LOCALITY_LABELS),
    explanation: NonEmptySchema.max(800),
    effectiveFrom: IsoDatetimeSchema,
    effectiveUntil: IsoDatetimeSchema.optional(),
    ownerPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const ModelParameterSetSchema = z
  .object({
    id: ModelParameterSetIdSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    policyId: ForecastPolicyIdSchema,
    parameterSetVersion: z.literal(DEFAULT_PARAMETER_SET_VERSION).or(NonEmptySchema.max(40)),
    applicability: z.enum(FORECAST_PARAMETER_SCOPES),
    status: z.enum(FORECAST_PARAMETER_STATUSES),
    yesBand: RateBandSchema,
    noResponseBand: RateBandSchema,
    noBand: RateBandSchema,
    unnamedEntitlementBand: RateBandSchema,
    localityLabel: z.enum(FORECAST_LOCALITY_LABELS),
    explanation: NonEmptySchema.max(800),
    source: NonEmptySchema.max(160),
    effectiveFrom: IsoDatetimeSchema,
    effectiveUntil: IsoDatetimeSchema.optional(),
    ownerPersonId: PersonIdSchema,
    approvedByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => value.applicability !== "EVENT" || Boolean(value.eventId), "event-scoped parameter sets require eventId")
  .refine((value) => value.applicability !== "GLOBAL" || value.eventId === undefined, "global parameter sets must not carry eventId");

export const ForecastObservedRsvpCountsSchema = z
  .object({
    yes: z.number().int().nonnegative(),
    no: z.number().int().nonnegative(),
    noResponse: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
    eligiblePeople: z.number().int().nonnegative(),
    unnamedAllowanceUnits: z.number().int().nonnegative(),
  })
  .strict();

export const ForecastSourceRefSchema = z
  .object({
    collection: NonEmptySchema.max(80),
    id: UuidSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const AttendanceForecastRunSchema = z
  .object({
    id: AttendanceForecastRunIdSchema,
    ...scoped,
    asOf: IsoDatetimeSchema,
    modelVersion: z.literal(FORECAST_MODEL_VERSION),
    policyId: ForecastPolicyIdSchema,
    parameterSetId: ModelParameterSetIdSchema,
    parameterSetVersion: NonEmptySchema.max(40),
    inputSnapshotId: UuidSchema,
    populationChecksum: NonEmptySchema.max(64),
    sourceRefs: z.array(ForecastSourceRefSchema).max(20_000),
    observedRsvp: ForecastObservedRsvpCountsSchema,
    status: z.enum(FORECAST_RUN_STATUSES),
    hostProjectionStatus: z.enum(FORECAST_HOST_PROJECTION_STATUSES),
    supersededRunId: AttendanceForecastRunIdSchema.optional(),
    actorPersonId: PersonIdSchema,
    reason: NonEmptySchema.max(400),
    explanation: NonEmptySchema.max(800),
    ...versioned,
  })
  .strict()
  .refine((value) => value.sourceRefs.length <= 20_000, "forecast runs store source references, never wholesale snapshots");

export const ForecastPopulationMemberSchema = z
  .object({
    id: ForecastPopulationMemberIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    kind: z.enum(FORECAST_POPULATION_KINDS),
    guestId: GuestIdRefSchema.optional(),
    entitlementId: UuidSchema.optional(),
    phaseIds: z.array(UuidSchema).max(32),
    rsvpClass: z.enum(FORECAST_RSVP_CLASSES),
    inclusionReason: NonEmptySchema.max(240),
    probabilityLow: z.number().min(0).max(1),
    probabilityCentral: z.number().min(0).max(1),
    probabilityHigh: z.number().min(0).max(1),
    assumptionKind: z.enum(FORECAST_ASSUMPTION_KINDS),
    ...versioned,
  })
  .strict()
  .refine((value) => (value.kind === "PERSON" ? Boolean(value.guestId) : value.guestId === undefined), "people count by guestId; unnamed allowances must not fabricate guestId")
  .refine((value) => value.probabilityLow <= value.probabilityCentral && value.probabilityCentral <= value.probabilityHigh, "member probabilities must satisfy low ≤ central ≤ high");

export const ForecastEstimateSchema = z
  .object({
    id: ForecastEstimateIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    scope: z.enum(FORECAST_SCOPES),
    phaseId: UuidSchema.optional(),
    dayKey: z.string().trim().max(32).optional(),
    locationLabel: z.string().trim().max(160).optional(),
    product: z.enum(["FORECAST", "OBSERVED_RSVP", "PROVISION"]).default("FORECAST"),
    countsPeople: z.boolean(),
    eligiblePeople: z.number().int().nonnegative(),
    unnamedAllowanceUnits: z.number().int().nonnegative(),
    exactLow: z.number().min(0),
    exactExpected: z.number().min(0),
    exactHigh: z.number().min(0),
    low: z.number().int().nonnegative(),
    expected: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    explanation: NonEmptySchema.max(800),
    ...versioned,
  })
  .strict()
  .refine((value) => value.product === "FORECAST", "forecast estimates are never RSVP truth or provision")
  .refine((value) => value.exactLow <= value.exactExpected && value.exactExpected <= value.exactHigh, "exact range must satisfy low ≤ expected ≤ high")
  .refine((value) => value.low <= value.expected && value.expected <= value.high, "displayed range must satisfy low ≤ expected ≤ high")
  .refine((value) => {
    const cap = value.countsPeople ? value.eligiblePeople : value.eligiblePeople + value.unnamedAllowanceUnits;
    return value.high <= cap && value.low >= 0;
  }, "bounds cannot be negative or exceed the eligible population")
  .refine((value) => value.scope !== "PHASE" || Boolean(value.phaseId), "phase estimates require phaseId");

export const UncertaintyDriverSchema = z
  .object({
    id: UncertaintyDriverIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    estimateId: ForecastEstimateIdSchema.optional(),
    code: z.enum(UNCERTAINTY_DRIVER_CODES),
    contribution: z.number().min(0),
    explanation: NonEmptySchema.max(400),
    hostSafeLabel: NonEmptySchema.max(160),
    ...versioned,
  })
  .strict();

export const ConfidenceAssessmentSchema = z
  .object({
    id: ConfidenceAssessmentIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    estimateId: ForecastEstimateIdSchema,
    level: z.enum(FORECAST_CONFIDENCE_LEVELS),
    responseCoverage: z.number().min(0).max(1),
    freshnessAsOf: IsoDatetimeSchema,
    stale: z.boolean(),
    dataQualityReason: NonEmptySchema.max(400),
    plainLanguage: NonEmptySchema.max(240),
    ...versioned,
  })
  .strict();

export const ForecastOverrideSchema = z
  .object({
    id: ForecastOverrideIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    estimateId: ForecastEstimateIdSchema,
    field: z.enum(FORECAST_OVERRIDE_FIELDS),
    originalLow: z.number().int().nonnegative(),
    originalExpected: z.number().int().nonnegative(),
    originalHigh: z.number().int().nonnegative(),
    proposedLow: z.number().int().nonnegative(),
    proposedExpected: z.number().int().nonnegative(),
    proposedHigh: z.number().int().nonnegative(),
    reason: NonEmptySchema.max(400),
    evidence: NonEmptySchema.max(400),
    status: z.enum(FORECAST_OVERRIDE_STATUSES),
    proposedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    decidedAt: IsoDatetimeSchema.optional(),
    decisionReason: z.string().trim().max(400).optional(),
    inputChecksumAtProposal: NonEmptySchema.max(64),
    expiresAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => value.proposedLow <= value.proposedExpected && value.proposedExpected <= value.proposedHigh, "override range must satisfy low ≤ expected ≤ high");
  // Maker/checker same-person refusal is enforced in decideForecastOverrideOnSnap (CEO may self-check).

export const OperationalProvisionRecommendationSchema = z
  .object({
    id: OperationalProvisionRecommendationIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    domain: z.enum(PROVISION_DOMAINS),
    proposedQuantity: z.number().int().nonnegative(),
    buffer: z.number().int().nonnegative(),
    rationale: NonEmptySchema.max(400),
    capacityLimit: z.number().int().nonnegative().optional(),
    ownerLabel: NonEmptySchema.max(80),
    status: z.enum(PROVISION_STATUSES),
    proposedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    decidedAt: IsoDatetimeSchema.optional(),
    decisionReason: z.string().trim().max(400).optional(),
    inputChecksumAtProposal: NonEmptySchema.max(64),
    reviewAt: IsoDatetimeSchema.optional(),
    expiresAt: IsoDatetimeSchema.optional(),
    product: z.literal("PROVISION"),
    ...versioned,
  })
  .strict();
  // Maker/checker same-person refusal is enforced in decideProvisionOnSnap (CEO may self-check).

export const CalibrationObservationSchema = z
  .object({
    id: CalibrationObservationIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    estimateId: ForecastEstimateIdSchema,
    evidenceKind: z.enum(CALIBRATION_EVIDENCE_KINDS),
    completeness: z.enum(CALIBRATION_COMPLETENESS),
    observedCount: z.number().int().nonnegative().optional(),
    sourceLedger: NonEmptySchema.max(80),
    originalLow: z.number().int().nonnegative(),
    originalExpected: z.number().int().nonnegative(),
    originalHigh: z.number().int().nonnegative(),
    variance: z.number().int().optional(),
    intervalCovered: z.boolean().optional(),
    notes: NonEmptySchema.max(400),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const ForecastEvaluationSchema = z
  .object({
    id: ForecastEvaluationIdSchema,
    ...scoped,
    forecastRunId: AttendanceForecastRunIdSchema,
    observationId: CalibrationObservationIdSchema,
    status: z.enum(FORECAST_EVALUATION_STATUSES),
    absoluteError: z.number().nonnegative().optional(),
    intervalCovered: z.boolean().optional(),
    releaseRecommendation: z.literal("NOT_RELEASED"),
    notes: NonEmptySchema.max(400),
    evaluatedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.releaseRecommendation === "NOT_RELEASED", "automated model release is not authorised in EOS-S04D");

export const S04DCreatedRecordRefSchema = z
  .object({
    collection: NonEmptySchema.max(80),
    id: UuidSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const S04DMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: NonEmptySchema.max(80),
    checksum: NonEmptySchema.max(64),
    status: z.enum(["APPLIED", "ROLLED_BACK"]),
    createdRecords: z.array(S04DCreatedRecordRefSchema).max(10_000),
    notes: z.array(z.object({ code: NonEmptySchema.max(80), subjectType: NonEmptySchema.max(40), subjectId: UuidSchema }).strict()).max(10_000),
    ...versioned,
  })
  .strict();

export const S04D_CANONICAL_COLLECTIONS = [
  "forecastPolicies",
  "modelParameterSets",
  "attendanceForecastRuns",
  "forecastPopulationMembers",
  "forecastEstimates",
  "uncertaintyDrivers",
  "confidenceAssessments",
  "forecastOverrides",
  "operationalProvisionRecommendations",
  "calibrationObservations",
  "forecastEvaluations",
] as const;

export type S04DCanonicalCollection = (typeof S04D_CANONICAL_COLLECTIONS)[number];

export const RunAttendanceForecastInputSchema = z
  .object({
    ...mutationBase,
  })
  .strict();

export const ProposeForecastOverrideInputSchema = z
  .object({
    ...mutationBase,
    forecastRunId: AttendanceForecastRunIdSchema,
    estimateId: ForecastEstimateIdSchema,
    field: z.enum(FORECAST_OVERRIDE_FIELDS).default("RANGE"),
    proposedLow: z.number().int().nonnegative(),
    proposedExpected: z.number().int().nonnegative(),
    proposedHigh: z.number().int().nonnegative(),
    evidence: NonEmptySchema.max(400),
    expectedVersion: z.number().int().positive().optional(),
    expiresAt: IsoDatetimeSchema.optional(),
  })
  .strict();

export const DecideForecastOverrideInputSchema = z
  .object({
    ...mutationBase,
    overrideId: ForecastOverrideIdSchema,
    decision: z.enum(["APPROVE", "REJECT"]),
    expectedVersion: z.number().int().positive(),
    decisionReason: NonEmptySchema.max(400),
  })
  .strict();

export const ProposeProvisionInputSchema = z
  .object({
    ...mutationBase,
    forecastRunId: AttendanceForecastRunIdSchema,
    domain: z.enum(PROVISION_DOMAINS),
    proposedQuantity: z.number().int().nonnegative(),
    buffer: z.number().int().nonnegative(),
    rationale: NonEmptySchema.max(400),
    ownerLabel: NonEmptySchema.max(80),
    capacityLimit: z.number().int().nonnegative().optional(),
    reviewAt: IsoDatetimeSchema.optional(),
    expiresAt: IsoDatetimeSchema.optional(),
  })
  .strict();

export const DecideProvisionInputSchema = z
  .object({
    ...mutationBase,
    provisionId: OperationalProvisionRecommendationIdSchema,
    decision: z.enum(["APPROVE", "REJECT"]),
    expectedVersion: z.number().int().positive(),
    decisionReason: NonEmptySchema.max(400),
  })
  .strict();

export const ApproveHostProjectionInputSchema = z
  .object({
    ...mutationBase,
    forecastRunId: AttendanceForecastRunIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const RecordCalibrationObservationInputSchema = z
  .object({
    ...mutationBase,
    forecastRunId: AttendanceForecastRunIdSchema,
    estimateId: ForecastEstimateIdSchema,
    evidenceKind: z.enum(CALIBRATION_EVIDENCE_KINDS),
    completeness: z.enum(CALIBRATION_COMPLETENESS),
    observedCount: z.number().int().nonnegative().optional(),
    sourceLedger: NonEmptySchema.max(80),
    notes: NonEmptySchema.max(400),
  })
  .strict();

export const EvaluateForecastInputSchema = z
  .object({
    ...mutationBase,
    observationId: CalibrationObservationIdSchema,
  })
  .strict();

export const CreateEventParameterSetInputSchema = z
  .object({
    ...mutationBase,
    yesLow: z.number().min(0).max(1),
    yesCentral: z.number().min(0).max(1),
    yesHigh: z.number().min(0).max(1),
    noResponseLow: z.number().min(0).max(1),
    noResponseCentral: z.number().min(0).max(1),
    noResponseHigh: z.number().min(0).max(1),
    noLow: z.number().min(0).max(1),
    noCentral: z.number().min(0).max(1),
    noHigh: z.number().min(0).max(1),
    unnamedLow: z.number().min(0).max(1),
    unnamedCentral: z.number().min(0).max(1),
    unnamedHigh: z.number().min(0).max(1),
    explanation: NonEmptySchema.max(800),
  })
  .strict();

export type ForecastPolicy = z.infer<typeof ForecastPolicySchema>;
export type ModelParameterSet = z.infer<typeof ModelParameterSetSchema>;
export type AttendanceForecastRun = z.infer<typeof AttendanceForecastRunSchema>;
export type ForecastPopulationMember = z.infer<typeof ForecastPopulationMemberSchema>;
export type ForecastEstimate = z.infer<typeof ForecastEstimateSchema>;
export type UncertaintyDriver = z.infer<typeof UncertaintyDriverSchema>;
export type ConfidenceAssessment = z.infer<typeof ConfidenceAssessmentSchema>;
export type ForecastOverride = z.infer<typeof ForecastOverrideSchema>;
export type OperationalProvisionRecommendation = z.infer<typeof OperationalProvisionRecommendationSchema>;
export type CalibrationObservation = z.infer<typeof CalibrationObservationSchema>;
export type ForecastEvaluation = z.infer<typeof ForecastEvaluationSchema>;
export type S04DMigrationReceipt = z.infer<typeof S04DMigrationReceiptSchema>;
export type RunAttendanceForecastInput = z.infer<typeof RunAttendanceForecastInputSchema>;
export type ProposeForecastOverrideInput = z.infer<typeof ProposeForecastOverrideInputSchema>;
export type DecideForecastOverrideInput = z.infer<typeof DecideForecastOverrideInputSchema>;
export type ProposeProvisionInput = z.infer<typeof ProposeProvisionInputSchema>;
export type DecideProvisionInput = z.infer<typeof DecideProvisionInputSchema>;
export type ApproveHostProjectionInput = z.infer<typeof ApproveHostProjectionInputSchema>;
export type RecordCalibrationObservationInput = z.infer<typeof RecordCalibrationObservationInputSchema>;
export type EvaluateForecastInput = z.infer<typeof EvaluateForecastInputSchema>;
export type CreateEventParameterSetInput = z.infer<typeof CreateEventParameterSetInputSchema>;
export type ForecastRsvpClass = z.infer<typeof ForecastObservedRsvpCountsSchema> extends never ? never : (typeof FORECAST_RSVP_CLASSES)[number];
