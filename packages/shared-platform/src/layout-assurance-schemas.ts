import { z } from "zod";
import {
  LAYOUT_APPROVAL_STATUSES,
  LAYOUT_ASSET_MAX_BYTES,
  LAYOUT_ASSET_STORAGE_STATES,
  LAYOUT_DIFF_KINDS,
  LAYOUT_DOWNSTREAM_CONTRACT_ID,
  LAYOUT_EXPORT_STATUSES,
  LAYOUT_FINDING_SEVERITIES,
  LAYOUT_FINDING_STATUSES,
  LAYOUT_FLOOR_PLAN_KINDS,
  LAYOUT_PUBLICATION_STATUSES,
  LAYOUT_VALIDATION_ENGINE_ID,
  LAYOUT_VALIDATION_ENGINE_VERSION,
  SCHEMA_VERSION,
  VENUE_FACT_SOURCE_KINDS,
  VENUE_FACT_VERIFICATION_STATES,
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

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
};

const eventLayoutScoped = {
  organisationId: OrganisationIdSchema,
  clientId: ClientIdSchema,
  eventId: EventIdSchema,
  layoutId: UuidSchema,
};

const mutationBase = {
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  layoutId: UuidSchema,
  expectedVersion: z.number().int().positive(),
  expectedRevisionNumber: z.number().int().positive(),
  reason: NonEmptySchema.max(400),
  idempotencyKey: NonEmptySchema.max(120).optional(),
};

export const LayoutFloorPlanAssetSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    venueId: UuidSchema.optional(),
    originalFileName: NonEmptySchema.max(240),
    declaredMime: NonEmptySchema.max(120),
    detectedKind: z.enum([...LAYOUT_FLOOR_PLAN_KINDS, "UNKNOWN"]),
    byteSize: z.number().int().min(0).max(LAYOUT_ASSET_MAX_BYTES),
    checksumSha256: NonEmptySchema.max(64),
    storageState: z.enum(LAYOUT_ASSET_STORAGE_STATES),
    uploadAvailable: z.boolean(),
    scanStatus: z.enum(["NOT_RUN", "FAILED_CLOSED", "SYNTHETIC_INERT", "PENDING", "CLEAN", "REJECTED", "FAILED", "UNAVAILABLE"]),
    quarantineReason: z.string().trim().max(400).optional(),
    derivativeKind: z.enum(["NONE", "INERT_METADATA", "INERT_SVG", "RASTER_PNG", "JPEG", "PDF_SANDBOX"]).default("NONE"),
    objectKey: z.string().trim().min(8).max(240).regex(/^layout-assets\/[A-Za-z0-9._/-]+$/).optional(),
    derivativeObjectKey: z.string().trim().min(8).max(240).regex(/^layout-assets\/[A-Za-z0-9._/-]+$/).optional(),
    calibrated: z.boolean(),
    supersedesAssetId: UuidSchema.optional(),
    replacedByAssetId: UuidSchema.optional(),
    retentionState: z.enum(["ACTIVE", "SUPERSEDED", "WITHDRAWN"]),
    notes: NonEmptySchema.max(400),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => !value.uploadAvailable || value.storageState === "AVAILABLE" || value.storageState === "SUPERSEDED" || value.storageState === "RETAINED", "uploadAvailable requires a stored clean object")
  .refine((value) => !("signedUrl" in value) && !("storageKey" in value) && !("fileBytes" in value), "assets must not store access secrets or binaries");

export const LayoutAssetCalibrationSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    assetId: UuidSchema,
    measurementMm: z.number().int().min(1).max(100_000_000),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
    spatiallyAuthoritative: z.boolean(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine(
    (value) => value.spatiallyAuthoritative === false || value.verificationState === "VERIFIED",
    "an asset is not spatially authoritative until calibrated from a verified measurement",
  );

export const LayoutCapacityStatementSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    product: z.literal("OPERATIONAL_CAPACITY"),
    quantity: z.number().int().min(0).max(100_000),
    ownerPersonId: PersonIdSchema,
    ownerLabel: NonEmptySchema.max(160),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
    rationale: NonEmptySchema.max(400),
    zoneObjectId: UuidSchema.optional(),
    supersededById: UuidSchema.optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const LayoutValidationRunSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    engineId: z.literal(LAYOUT_VALIDATION_ENGINE_ID),
    engineVersion: z.literal(LAYOUT_VALIDATION_ENGINE_VERSION),
    revisionId: UuidSchema,
    revisionNumber: z.number().int().positive(),
    contentHash: NonEmptySchema.max(64),
    blockingCount: z.number().int().min(0),
    warningCount: z.number().int().min(0),
    recommendationCount: z.number().int().min(0),
    informationCount: z.number().int().min(0),
    overriddenBlockingCount: z.number().int().min(0).default(0),
    unresolvedBlockingCount: z.number().int().min(0).optional(),
    recognisedOverrideCount: z.number().int().min(0).default(0),
    publicationBlocked: z.boolean(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const LayoutValidationFindingSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    runId: UuidSchema,
    ruleId: NonEmptySchema.max(80),
    ruleVersion: NonEmptySchema.max(20),
    severity: z.enum(LAYOUT_FINDING_SEVERITIES),
    status: z.enum(LAYOUT_FINDING_STATUSES),
    revisionId: UuidSchema,
    contentHash: NonEmptySchema.max(64),
    objectIds: z.array(UuidSchema).max(200),
    evidence: NonEmptySchema.max(800),
    explanation: NonEmptySchema.max(800),
    recommendedAction: NonEmptySchema.max(400),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    applicability: z.enum(["ALWAYS", "CONDITIONAL", "UNKNOWN"]),
    ownerLabel: NonEmptySchema.max(160),
    requiredAuthority: z.enum(["PLANNER", "EVENT_DIRECTOR", "QUALIFIED_AUTHORITY"]),
    overrideId: UuidSchema.optional(),
    overrideRecognised: z.boolean().optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => !/certified|compliant|authority-approved|safe to occupy/i.test(value.explanation), "findings must not certify safety");

export const LayoutValidationOverrideSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    findingId: UuidSchema,
    authorityKind: z.enum(["EVENT_DIRECTOR", "QUALIFIED_AUTHORITY"]),
    evidenceLabel: NonEmptySchema.max(240),
    expiresAt: IsoDatetimeSchema,
    recordedByPersonId: PersonIdSchema,
    contentHash: NonEmptySchema.max(64).optional(),
    ruleId: NonEmptySchema.max(80).optional(),
    ruleVersion: NonEmptySchema.max(20).optional(),
    objectIds: z.array(UuidSchema).max(200).default([]),
    applicabilityKey: NonEmptySchema.max(64).optional(),
    reason: NonEmptySchema.max(400).optional(),
    revokedAt: IsoDatetimeSchema.optional(),
    revokedByPersonId: PersonIdSchema.optional(),
    revokedReason: NonEmptySchema.max(400).optional(),
    ...versioned,
  })
  .strict();

export const LayoutSnapshotSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    name: NonEmptySchema.max(160),
    revisionId: UuidSchema,
    revisionNumber: z.number().int().positive(),
    contentHash: NonEmptySchema.max(64),
    canonicalPayload: NonEmptySchema.max(2_000_000),
    immutable: z.literal(true),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const LayoutDiffEntrySchema = z
  .object({
    kind: z.enum(LAYOUT_DIFF_KINDS),
    objectId: UuidSchema.optional(),
    summary: NonEmptySchema.max(400),
  })
  .strict();

export const LayoutApprovalSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    contentHash: NonEmptySchema.max(64),
    revisionId: UuidSchema,
    validationRunId: UuidSchema,
    status: z.enum(LAYOUT_APPROVAL_STATUSES),
    submittedByPersonId: PersonIdSchema,
    decidedByPersonId: PersonIdSchema.optional(),
    materialDiffSummary: NonEmptySchema.max(800),
    capacityBasis: NonEmptySchema.max(400),
    downstreamImpact: NonEmptySchema.max(400),
    /** Set when a CEO governance override was used to complete maker/checker alone. */
    governanceOverrideReason: NonEmptySchema.max(400).optional(),
    ...versioned,
  })
  .strict()
  .refine(
    (value) =>
      !value.decidedByPersonId ||
      value.decidedByPersonId !== value.submittedByPersonId ||
      Boolean(value.governanceOverrideReason),
    "the author of a submitted hash cannot approve it",
  );

export const LayoutPublicationSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    publicationNumber: z.number().int().positive(),
    contentHash: NonEmptySchema.max(64),
    revisionId: UuidSchema,
    approvalId: UuidSchema,
    status: z.enum(LAYOUT_PUBLICATION_STATUSES),
    purpose: z.enum(["EVENT_LAYOUT"]).default("EVENT_LAYOUT"),
    supersedesPublicationId: UuidSchema.optional(),
    publishedByPersonId: PersonIdSchema,
    publishedAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const LayoutExportJobSchema = z
  .object({
    id: UuidSchema,
    ...eventLayoutScoped,
    format: z.enum(["PDF", "PNG"]),
    marking: z.enum(["DRAFT", "APPROVED", "PUBLISHED", "SUPERSEDED", "WITHDRAWN"]),
    status: z.enum(LAYOUT_EXPORT_STATUSES),
    contentHash: NonEmptySchema.max(64),
    publicationNumber: z.number().int().positive().optional(),
    revisionId: UuidSchema.optional(),
    objectKey: z.string().trim().min(8).max(240).regex(/^layout-exports\/[A-Za-z0-9._/-]+$/).optional(),
    byteSize: z.number().int().min(1).max(LAYOUT_ASSET_MAX_BYTES).optional(),
    checksumSha256: NonEmptySchema.max(64).optional(),
    generatedAt: IsoDatetimeSchema.optional(),
    notes: NonEmptySchema.max(400),
    projectionMasked: z.boolean().default(false),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.status !== "COMPLETED" || Boolean(value.objectKey && value.byteSize && value.checksumSha256 && value.generatedAt), "completed exports require durable object identity")
  .refine((value) => !("fileBytes" in value) && !("signedUrl" in value), "export jobs must not store binaries or signed URLs");

export const RecordFloorPlanIntentInputSchema = z
  .object({
    ...mutationBase,
    originalFileName: NonEmptySchema.max(240),
    declaredMime: NonEmptySchema.max(120),
    byteSize: z.number().int().min(1).max(LAYOUT_ASSET_MAX_BYTES),
    checksumSha256: NonEmptySchema.max(64),
    detectedKind: z.enum(LAYOUT_FLOOR_PLAN_KINDS),
    supersedesAssetId: UuidSchema.optional(),
    svgText: z.string().max(200_000).optional(),
    magicBytesHex: z.string().regex(/^[0-9a-f]*$/i).max(32).optional(),
  })
  .strict();

export const RecordStoredFloorPlanInputSchema = z
  .object({
    ...mutationBase,
    id: UuidSchema,
    originalFileName: NonEmptySchema.max(240),
    declaredMime: NonEmptySchema.max(120),
    byteSize: z.number().int().min(1).max(LAYOUT_ASSET_MAX_BYTES),
    checksumSha256: NonEmptySchema.max(64),
    detectedKind: z.enum(LAYOUT_FLOOR_PLAN_KINDS),
    objectKey: z.string().trim().min(8).max(240).regex(/^layout-assets\/[A-Za-z0-9._/-]+$/),
    derivativeObjectKey: z.string().trim().min(8).max(240).regex(/^layout-assets\/[A-Za-z0-9._/-]+$/).optional(),
    derivativeKind: z.enum(["INERT_SVG", "RASTER_PNG", "JPEG", "PDF_SANDBOX"]),
    scanStatus: z.literal("CLEAN"),
    storageState: z.literal("AVAILABLE"),
    supersedesAssetId: UuidSchema.optional(),
  })
  .strict();

export const CalibrateFloorPlanInputSchema = z
  .object({
    ...mutationBase,
    assetId: UuidSchema,
    measurementMm: z.number().int().min(1).max(100_000_000),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
  })
  .strict();

export const RecordOperationalCapacityInputSchema = z
  .object({
    ...mutationBase,
    quantity: z.number().int().min(0).max(100_000),
    ownerLabel: NonEmptySchema.max(160),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
    rationale: NonEmptySchema.max(400),
    zoneObjectId: UuidSchema.optional(),
  })
  .strict();

export const RunLayoutValidationInputSchema = z.object({ ...mutationBase }).strict();

export const AcknowledgeFindingInputSchema = z
  .object({
    ...mutationBase,
    findingId: UuidSchema,
  })
  .strict();

export const OverrideFindingInputSchema = z
  .object({
    ...mutationBase,
    findingId: UuidSchema,
    authorityKind: z.enum(["EVENT_DIRECTOR", "QUALIFIED_AUTHORITY"]),
    evidenceLabel: NonEmptySchema.max(240),
    expiresAt: IsoDatetimeSchema,
  })
  .strict();

export const CreateLayoutSnapshotInputSchema = z
  .object({
    ...mutationBase,
    name: NonEmptySchema.max(160),
  })
  .strict();

export const RestoreLayoutSnapshotInputSchema = z
  .object({
    ...mutationBase,
    snapshotId: UuidSchema,
    confirmNewVersion: z.literal(true),
  })
  .strict();

export const SubmitLayoutApprovalInputSchema = z.object({ ...mutationBase }).strict();

export const DecideLayoutApprovalInputSchema = z
  .object({
    ...mutationBase,
    approvalId: UuidSchema,
    decision: z.enum(["APPROVED", "REJECTED", "REVOKED"]),
    /** CEO-only: allow the submitter to decide when no independent checker is available. */
    governanceOverrideReason: NonEmptySchema.max(400).optional(),
  })
  .strict();

export const PublishLayoutInputSchema = z.object({ ...mutationBase }).strict();

export const WithdrawLayoutPublicationInputSchema = z
  .object({
    ...mutationBase,
    publicationId: UuidSchema,
  })
  .strict();

export const RequestLayoutExportInputSchema = z
  .object({
    ...mutationBase,
    format: z.enum(["PDF", "PNG"]),
    publicationId: UuidSchema.optional(),
  })
  .strict();

export const RevokeLayoutOverrideInputSchema = z
  .object({
    ...mutationBase,
    overrideId: UuidSchema,
  })
  .strict();

export const CompleteLayoutExportInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    layoutId: UuidSchema,
    jobId: UuidSchema,
    objectKey: z.string().trim().min(8).max(240).regex(/^layout-exports\/[A-Za-z0-9._/-]+$/),
    byteSize: z.number().int().min(1).max(LAYOUT_ASSET_MAX_BYTES),
    checksumSha256: NonEmptySchema.max(64),
    generatedAt: IsoDatetimeSchema,
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120).optional(),
  })
  .strict();

export const FailLayoutExportInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    layoutId: UuidSchema,
    jobId: UuidSchema,
    notes: NonEmptySchema.max(400),
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120).optional(),
  })
  .strict();

export const WithdrawLayoutAssetInputSchema = z
  .object({
    ...mutationBase,
    assetId: UuidSchema,
  })
  .strict();

export const LAYOUT_VALIDATION_RULES = [
  { id: "RULE-S05-GEOM-BOUNDS", version: "1.0.0", severity: "BLOCKING" as const, title: "Geometry outside layout bounds" },
  { id: "RULE-S05-OVERLAP-GOVERNED", version: "1.0.0", severity: "BLOCKING" as const, title: "Table or fixture overlaps a governed area" },
  { id: "RULE-S05-ROUTE-OBSTRUCTED", version: "1.0.0", severity: "WARNING" as const, title: "Route or access point may be obstructed" },
  { id: "RULE-S05-ACCESSIBLE-ROUTE", version: "1.0.0", severity: "BLOCKING" as const, title: "Accessible route missing where a verified requirement exists" },
  { id: "RULE-S05-VERIFIED-WIDTH", version: "1.0.0", severity: "BLOCKING" as const, title: "Verified width is breached" },
  { id: "RULE-S05-SEAT-COUNT", version: "1.0.0", severity: "WARNING" as const, title: "Physical seat count differs from table declared capacity" },
  { id: "RULE-S05-OPS-ABOVE-DESIGN", version: "1.0.0", severity: "BLOCKING" as const, title: "Operational capacity exceeds declared or design capacity" },
  { id: "RULE-S05-ATTENDANCE-ABOVE-OPS", version: "1.0.0", severity: "WARNING" as const, title: "Expected attendance exceeds operational capacity" },
  { id: "RULE-S05-CAPACITY-SOURCE", version: "1.0.0", severity: "WARNING" as const, title: "Capacity source is missing, stale, conflicting or inapplicable" },
  { id: "RULE-S05-REQUIRED-OBJECTS", version: "1.0.0", severity: "INFORMATION" as const, title: "Required layout objects for a sourced profile" },
  { id: "RULE-S05-DOWNSTREAM-ID", version: "1.0.0", severity: "BLOCKING" as const, title: "Stable downstream identifier removed or relabelled" },
  { id: "RULE-S05-INTELLIGENCE-GAPS", version: "1.0.0", severity: "RECOMMENDATION" as const, title: "Explainable layout intelligence — missing facts remain visible" },
] as const;

export const S05_ASSURANCE_COLLECTIONS = [
  "layoutFloorPlanAssets",
  "layoutAssetCalibrations",
  "layoutCapacityStatements",
  "layoutValidationRuns",
  "layoutValidationFindings",
  "layoutValidationOverrides",
  "layoutSnapshots",
  "layoutApprovals",
  "layoutPublications",
  "layoutExportJobs",
] as const;

export type LayoutFloorPlanAsset = z.infer<typeof LayoutFloorPlanAssetSchema>;
export type LayoutAssetCalibration = z.infer<typeof LayoutAssetCalibrationSchema>;
export type LayoutCapacityStatement = z.infer<typeof LayoutCapacityStatementSchema>;
export type LayoutValidationRun = z.infer<typeof LayoutValidationRunSchema>;
export type LayoutValidationFinding = z.infer<typeof LayoutValidationFindingSchema>;
export type LayoutValidationOverride = z.infer<typeof LayoutValidationOverrideSchema>;
export type LayoutSnapshot = z.infer<typeof LayoutSnapshotSchema>;
export type LayoutDiffEntry = z.infer<typeof LayoutDiffEntrySchema>;
export type LayoutApproval = z.infer<typeof LayoutApprovalSchema>;
export type LayoutPublication = z.infer<typeof LayoutPublicationSchema>;
export type LayoutExportJob = z.infer<typeof LayoutExportJobSchema>;
export type RecordFloorPlanIntentInput = z.infer<typeof RecordFloorPlanIntentInputSchema>;
export type CalibrateFloorPlanInput = z.infer<typeof CalibrateFloorPlanInputSchema>;
export type RecordOperationalCapacityInput = z.infer<typeof RecordOperationalCapacityInputSchema>;
export type RunLayoutValidationInput = z.infer<typeof RunLayoutValidationInputSchema>;
export type AcknowledgeFindingInput = z.infer<typeof AcknowledgeFindingInputSchema>;
export type OverrideFindingInput = z.infer<typeof OverrideFindingInputSchema>;
export type CreateLayoutSnapshotInput = z.infer<typeof CreateLayoutSnapshotInputSchema>;
export type RestoreLayoutSnapshotInput = z.infer<typeof RestoreLayoutSnapshotInputSchema>;
export type SubmitLayoutApprovalInput = z.infer<typeof SubmitLayoutApprovalInputSchema>;
export type DecideLayoutApprovalInput = z.infer<typeof DecideLayoutApprovalInputSchema>;
export type PublishLayoutInput = z.infer<typeof PublishLayoutInputSchema>;
export type WithdrawLayoutPublicationInput = z.infer<typeof WithdrawLayoutPublicationInputSchema>;
export type RequestLayoutExportInput = z.infer<typeof RequestLayoutExportInputSchema>;
export type CompleteLayoutExportInput = z.infer<typeof CompleteLayoutExportInputSchema>;
export type FailLayoutExportInput = z.infer<typeof FailLayoutExportInputSchema>;
export type WithdrawLayoutAssetInput = z.infer<typeof WithdrawLayoutAssetInputSchema>;
export type RevokeLayoutOverrideInput = z.infer<typeof RevokeLayoutOverrideInputSchema>;
export type LayoutDownstreamContractId = typeof LAYOUT_DOWNSTREAM_CONTRACT_ID;
