import { z } from "zod";
import {
  SCHEMA_VERSION,
  VENUE_CROSS_CLIENT_REUSE,
  VENUE_EVIDENCE_STORAGE_STATES,
  VENUE_FACT_ORIGINS,
  VENUE_FACT_SOURCE_KINDS,
  VENUE_FACT_SUBTYPES,
  VENUE_FACT_TYPES,
  VENUE_FACT_UNITS,
  VENUE_FACT_VERIFICATION_STATES,
  VENUE_LAYOUT_STATUSES,
  VENUE_LEASE_STATUSES,
  VENUE_RECORD_STATUSES,
  VENUE_VISIBILITY_POLICIES,
} from "./constants.js";
import {
  CANONICAL_LENGTH_UNIT,
  COORDINATE_ORIGIN,
  DISPLAY_LENGTH_UNITS,
  ELLIPSE_CONVENTION,
  MAX_MILLIDEGREE,
  MAX_MILLIMETRE,
  RECTANGLE_CONVENTION,
  ROTATION_UNIT,
} from "./venue-geometry.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";
import { SpatialObjectSchema } from "./spatial-schemas.js";

export const VenueIdSchema = UuidSchema;
export const VenueFactIdSchema = UuidSchema;
export const EventVenueIdSchema = UuidSchema;
export const EventVenueFactIdSchema = UuidSchema;
export const LayoutIdSchema = UuidSchema;
export const LayoutRevisionIdSchema = UuidSchema;
export const LayoutEditorLeaseIdSchema = UuidSchema;
export const VenueEvidenceAssetIdSchema = UuidSchema;

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

const eventScoped = {
  organisationId: OrganisationIdSchema,
  clientId: ClientIdSchema,
  eventId: EventIdSchema,
};

const mutationBase = {
  organisationId: OrganisationIdSchema,
  reason: NonEmptySchema.max(400),
  idempotencyKey: NonEmptySchema.max(120).optional(),
};

export const MillimetreSchema = z.number().int().min(0).max(MAX_MILLIMETRE);
export const PositiveMillimetreSchema = z.number().int().min(1).max(MAX_MILLIMETRE);
export const MillidegreeSchema = z.number().int().min(0).max(MAX_MILLIDEGREE);
export const DisplayLengthUnitSchema = z.enum(DISPLAY_LENGTH_UNITS);

export const CoordinateSystemSchema = z
  .object({
    origin: z.literal(COORDINATE_ORIGIN),
    axisX: z.literal("RIGHT"),
    axisY: z.literal("DOWN"),
    rectangleConvention: z.literal(RECTANGLE_CONVENTION),
    ellipseConvention: z.literal(ELLIPSE_CONVENTION),
    rotationUnit: z.literal(ROTATION_UNIT),
    canonicalLengthUnit: z.literal(CANONICAL_LENGTH_UNIT),
  })
  .strict();

export const LayoutBoundsSchema = z
  .object({
    minXMm: MillimetreSchema,
    minYMm: MillimetreSchema,
    maxXMm: MillimetreSchema,
    maxYMm: MillimetreSchema,
    widthMm: PositiveMillimetreSchema,
    heightMm: PositiveMillimetreSchema,
  })
  .strict()
  .refine((value) => value.minXMm === 0 && value.minYMm === 0, "Milestone 1 origin is the top-left of the layout")
  .refine((value) => value.maxXMm === value.widthMm && value.maxYMm === value.heightMm, "bounds must equal the stored width and height");

export const S05_CANONICAL_COLLECTIONS = [
  "venues",
  "venueFacts",
  "eventVenues",
  "eventVenueFacts",
  "layouts",
  "layoutRevisions",
  "layoutEditorLeases",
  "layoutCommands",
  "layoutDraftCursors",
  "venueEvidenceAssets",
] as const;

export type S05CanonicalCollection = (typeof S05_CANONICAL_COLLECTIONS)[number];

export const VenueSchema = z
  .object({
    id: VenueIdSchema,
    ...orgScoped,
    displayName: NonEmptySchema.max(160),
    locality: z.string().trim().max(120).optional(),
    countryCode: z.string().trim().max(2).optional(),
    visibilityPolicy: z.enum(VENUE_VISIBILITY_POLICIES),
    assignedClientIds: z.array(ClientIdSchema).max(64),
    crossClientReuse: z.enum(VENUE_CROSS_CLIENT_REUSE),
    status: z.enum(VENUE_RECORD_STATUSES),
    notes: z.string().trim().max(400).optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.visibilityPolicy !== "ASSIGNED_CLIENTS" || value.assignedClientIds.length > 0, "assigned-client visibility requires assigned clients")
  .refine((value) => !("guestId" in value) && !("personId" in value), "venues must not store guest identity");

export const VenueFactSchema = z
  .object({
    id: VenueFactIdSchema,
    ...orgScoped,
    venueId: VenueIdSchema,
    factType: z.enum(VENUE_FACT_TYPES),
    subtype: z.enum(VENUE_FACT_SUBTYPES),
    valueText: z.string().trim().max(800).optional(),
    valueIntegerMm: MillimetreSchema.optional(),
    valueInteger: z.number().int().min(0).max(1_000_000).optional(),
    unit: z.enum(VENUE_FACT_UNITS),
    applicability: z.enum(["ALWAYS", "DATED", "CONDITIONAL"]),
    applicableFrom: IsoDatetimeSchema.optional(),
    applicableTo: IsoDatetimeSchema.optional(),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    sourceReference: z.string().trim().max(240).optional(),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
    verifiedByPersonId: PersonIdSchema.optional(),
    verifiedAt: IsoDatetimeSchema.optional(),
    supersedesFactId: VenueFactIdSchema.optional(),
    supersededByFactId: VenueFactIdSchema.optional(),
    evidenceAssetId: VenueEvidenceAssetIdSchema.optional(),
    mayBecomeLockedSafetyConstraint: z.boolean(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.unit !== "MILLIMETRE" || value.valueIntegerMm !== undefined, "millimetre facts require valueIntegerMm")
  .refine((value) => value.unit !== "COUNT" || value.valueInteger !== undefined, "count facts require valueInteger")
  .refine((value) => value.unit !== "TEXT" || Boolean(value.valueText), "text facts require valueText")
  .refine(
    (value) =>
      !value.mayBecomeLockedSafetyConstraint ||
      ((value.sourceKind === "VENUE_SUPPLIED" || value.sourceKind === "QUALIFIED_AUTHORITY") && value.factType === "SAFETY_THRESHOLD"),
    "only venue-supplied or qualified-authority safety thresholds may become locked constraints",
  );

export const EventVenueSchema = z
  .object({
    id: EventVenueIdSchema,
    ...eventScoped,
    venueId: VenueIdSchema,
    adoptedAt: IsoDatetimeSchema,
    adoptedByPersonId: PersonIdSchema,
    sourceVenueVersion: z.number().int().positive(),
    sourceVenueHash: NonEmptySchema.max(64),
    status: z.enum(["ACTIVE", "SUPERSEDED", "WITHDRAWN"]),
    ...versioned,
  })
  .strict();

export const EventVenueFactSchema = z
  .object({
    id: EventVenueFactIdSchema,
    ...eventScoped,
    eventVenueId: EventVenueIdSchema,
    venueFactId: VenueFactIdSchema.optional(),
    origin: z.enum(VENUE_FACT_ORIGINS),
    factType: z.enum(VENUE_FACT_TYPES),
    subtype: z.enum(VENUE_FACT_SUBTYPES),
    valueText: z.string().trim().max(800).optional(),
    valueIntegerMm: MillimetreSchema.optional(),
    valueInteger: z.number().int().min(0).max(1_000_000).optional(),
    unit: z.enum(VENUE_FACT_UNITS),
    applicability: z.enum(["ALWAYS", "DATED", "CONDITIONAL"]),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
    mayBecomeLockedSafetyConstraint: z.boolean(),
    overridesVenueFactId: VenueFactIdSchema.optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.origin !== "INHERITED" || Boolean(value.venueFactId), "inherited facts require the source venue fact")
  .refine((value) => value.origin !== "EVENT_OVERRIDE" || Boolean(value.overridesVenueFactId) || !value.venueFactId, "overrides must not silently rewrite the reusable fact");

export const LayoutRevisionSchema = z
  .object({
    id: LayoutRevisionIdSchema,
    ...eventScoped,
    layoutId: LayoutIdSchema,
    revisionNumber: z.number().int().positive(),
    contentHash: NonEmptySchema.max(64),
    coordinateSystem: CoordinateSystemSchema,
    bounds: LayoutBoundsSchema,
    objects: z.array(SpatialObjectSchema).max(2500),
    createdByPersonId: PersonIdSchema,
    immutable: z.literal(true),
    ...versioned,
  })
  .strict();

export const LayoutSchema = z
  .object({
    id: LayoutIdSchema,
    ...eventScoped,
    eventVenueId: EventVenueIdSchema,
    name: NonEmptySchema.max(160),
    status: z.enum(VENUE_LAYOUT_STATUSES),
    coordinateSystem: CoordinateSystemSchema,
    bounds: LayoutBoundsSchema,
    displayLengthUnit: DisplayLengthUnitSchema,
    currentRevisionId: LayoutRevisionIdSchema,
    currentRevisionNumber: z.number().int().positive(),
    contentHash: NonEmptySchema.max(64),
    editorLeaseId: LayoutEditorLeaseIdSchema.optional(),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const LayoutEditorLeaseSchema = z
  .object({
    id: LayoutEditorLeaseIdSchema,
    ...eventScoped,
    layoutId: LayoutIdSchema,
    holderPersonId: PersonIdSchema,
    acquiredAt: IsoDatetimeSchema,
    expiresAt: IsoDatetimeSchema,
    status: z.enum(VENUE_LEASE_STATUSES),
    ...versioned,
  })
  .strict();

export const VenueEvidenceAssetSchema = z
  .object({
    id: VenueEvidenceAssetIdSchema,
    ...orgScoped,
    venueId: VenueIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    factId: VenueFactIdSchema.optional(),
    kind: z.literal("METADATA_ONLY"),
    fileName: z.string().trim().max(240).optional(),
    mimeType: z.string().trim().max(120).optional(),
    byteSize: z.number().int().min(0).max(50_000_000).optional(),
    checksumSha256: z.string().trim().max(64).optional(),
    storageState: z.enum(VENUE_EVIDENCE_STORAGE_STATES),
    uploadAvailable: z.literal(false),
    notes: NonEmptySchema.max(400),
    recordedByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.storageState === "UNAVAILABLE", "binary storage is unavailable until an approved asset pipeline exists")
  .refine((value) => value.uploadAvailable === false, "binary upload must remain unavailable in Milestone 1");

export const S05MigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: z.enum(["EOS-S05-VENUE-LAYOUT-V1", "EOS-S05-VENUE-OBJECTS-V1"]),
    checksum: NonEmptySchema.max(128),
    status: z.enum(["APPLIED", "REPLAYED", "ROLLED_BACK"]),
    createdRecords: z.array(z.object({ collection: NonEmptySchema.max(80), id: UuidSchema }).strict()),
    notes: z.array(z.object({ code: NonEmptySchema.max(80), subjectType: NonEmptySchema.max(80), subjectId: UuidSchema }).strict()),
    ...versioned,
  })
  .strict();

export const CreateVenueInputSchema = z
  .object({
    ...mutationBase,
    displayName: NonEmptySchema.max(160),
    locality: z.string().trim().max(120).optional(),
    countryCode: z.string().trim().max(2).optional(),
    visibilityPolicy: z.enum(VENUE_VISIBILITY_POLICIES).default("ORGANISATION_STAFF"),
    assignedClientIds: z.array(ClientIdSchema).max(64).default([]),
    notes: z.string().trim().max(400).optional(),
  })
  .strict();

export const RecordVenueFactInputSchema = z
  .object({
    ...mutationBase,
    venueId: VenueIdSchema,
    factType: z.enum(VENUE_FACT_TYPES),
    subtype: z.enum(VENUE_FACT_SUBTYPES),
    valueText: z.string().trim().max(800).optional(),
    valueIntegerMm: MillimetreSchema.optional(),
    valueInteger: z.number().int().min(0).max(1_000_000).optional(),
    unit: z.enum(VENUE_FACT_UNITS),
    applicability: z.enum(["ALWAYS", "DATED", "CONDITIONAL"]).default("ALWAYS"),
    applicableFrom: IsoDatetimeSchema.optional(),
    applicableTo: IsoDatetimeSchema.optional(),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    sourceReference: z.string().trim().max(240).optional(),
    verificationState: z.enum(["UNKNOWN", "UNVERIFIED", "CONFLICTING", "STALE"]).default("UNVERIFIED"),
    evidenceFileName: z.string().trim().max(240).optional(),
    evidenceMimeType: z.string().trim().max(120).optional(),
    expectedVenueVersion: z.number().int().positive().optional(),
  })
  .strict();

export const VerifyVenueFactInputSchema = z
  .object({
    ...mutationBase,
    venueId: VenueIdSchema,
    factId: VenueFactIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const AdoptVenueInputSchema = z
  .object({
    ...mutationBase,
    eventId: EventIdSchema,
    venueId: VenueIdSchema,
  })
  .strict();

export const RecordEventVenueOverrideInputSchema = z
  .object({
    ...mutationBase,
    eventId: EventIdSchema,
    eventVenueId: EventVenueIdSchema,
    overridesVenueFactId: VenueFactIdSchema.optional(),
    factType: z.enum(VENUE_FACT_TYPES),
    subtype: z.enum(VENUE_FACT_SUBTYPES),
    valueText: z.string().trim().max(800).optional(),
    valueIntegerMm: MillimetreSchema.optional(),
    valueInteger: z.number().int().min(0).max(1_000_000).optional(),
    unit: z.enum(VENUE_FACT_UNITS),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
    verificationState: z.enum(["UNKNOWN", "UNVERIFIED", "CONFLICTING", "STALE"]).default("UNVERIFIED"),
  })
  .strict();

export const CreateBlankLayoutInputSchema = z
  .object({
    ...mutationBase,
    eventId: EventIdSchema,
    eventVenueId: EventVenueIdSchema,
    name: NonEmptySchema.max(160),
    widthMm: PositiveMillimetreSchema,
    heightMm: PositiveMillimetreSchema,
    displayLengthUnit: DisplayLengthUnitSchema.default("METRE"),
  })
  .strict();

export const UpdateLayoutSetupInputSchema = z
  .object({
    ...mutationBase,
    eventId: EventIdSchema,
    layoutId: LayoutIdSchema,
    expectedVersion: z.number().int().positive(),
    expectedRevisionNumber: z.number().int().positive(),
    name: NonEmptySchema.max(160).optional(),
    widthMm: PositiveMillimetreSchema.optional(),
    heightMm: PositiveMillimetreSchema.optional(),
    displayLengthUnit: DisplayLengthUnitSchema.optional(),
  })
  .strict();

export const AcquireLayoutLeaseInputSchema = z
  .object({
    ...mutationBase,
    eventId: EventIdSchema,
    layoutId: LayoutIdSchema,
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export type Venue = z.infer<typeof VenueSchema>;
export type VenueFact = z.infer<typeof VenueFactSchema>;
export type EventVenue = z.infer<typeof EventVenueSchema>;
export type EventVenueFact = z.infer<typeof EventVenueFactSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type LayoutRevision = z.infer<typeof LayoutRevisionSchema>;
export type LayoutEditorLease = z.infer<typeof LayoutEditorLeaseSchema>;
export type VenueEvidenceAsset = z.infer<typeof VenueEvidenceAssetSchema>;
export type S05MigrationReceipt = z.infer<typeof S05MigrationReceiptSchema>;
export type CreateVenueInput = z.infer<typeof CreateVenueInputSchema>;
export type RecordVenueFactInput = z.infer<typeof RecordVenueFactInputSchema>;
export type VerifyVenueFactInput = z.infer<typeof VerifyVenueFactInputSchema>;
export type AdoptVenueInput = z.infer<typeof AdoptVenueInputSchema>;
export type RecordEventVenueOverrideInput = z.infer<typeof RecordEventVenueOverrideInputSchema>;
export type CreateBlankLayoutInput = z.infer<typeof CreateBlankLayoutInputSchema>;
export type UpdateLayoutSetupInput = z.infer<typeof UpdateLayoutSetupInputSchema>;
export type AcquireLayoutLeaseInput = z.infer<typeof AcquireLayoutLeaseInputSchema>;
