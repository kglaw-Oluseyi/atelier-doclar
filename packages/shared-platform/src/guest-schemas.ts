import { z } from "zod";
import {
  CANONICAL_INTAKE_MAPPING_VERSION,
  DUPLICATE_DECISIONS,
  DUPLICATE_MATCH_KINDS,
  FIELD_QUALITY_STATES,
  GUEST_INTAKE_SOURCES,
  GUEST_LIFECYCLE_STATES,
  IDENTITY_RESOLUTION_STATES,
  INTAKE_BATCH_STATUSES,
  INTAKE_ROW_STATUSES,
  SCHEMA_VERSION,
} from "./constants.js";
import {
  AgeBandSchema,
  ChildReadinessSchema,
  GuestAddressingSchema,
  HonorificSchema,
} from "./addressing-schemas.js";
import {
  ClientIdSchema,
  EventIdSchema,
  GuestReferenceIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";

export const FieldQualitySchema = z.enum(FIELD_QUALITY_STATES);
export const GuestLifecycleSchema = z.enum(GUEST_LIFECYCLE_STATES);
export const IdentityResolutionSchema = z.enum(IDENTITY_RESOLUTION_STATES);
export const GuestIntakeSourceSchema = z.enum(GUEST_INTAKE_SOURCES);
export const DuplicateMatchKindSchema = z.enum(DUPLICATE_MATCH_KINDS);
export const DuplicateDecisionSchema = z.enum(DUPLICATE_DECISIONS);

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

export const QualifiedFieldSchema = z
  .object({
    value: z.string().trim().max(240).optional(),
    quality: FieldQualitySchema,
  })
  .strict()
  .refine((field) => {
    if (field.quality === "NOT_SUPPLIED" || field.quality === "NOT_APPLICABLE" || field.quality === "MISSING") {
      return !field.value;
    }
    return true;
  }, "absent-quality fields must not carry a value");

export const GuestProvenanceSchema = z
  .object({
    source: GuestIntakeSourceSchema,
    recordedByPersonId: PersonIdSchema,
    recordedAt: IsoDatetimeSchema,
    correlationId: NonEmptySchema,
    reason: NonEmptySchema,
  })
  .strict();

export const OperationalGuestSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    personId: PersonIdSchema.optional(),
    guestReferenceId: GuestReferenceIdSchema.optional(),
    householdId: UuidSchema.optional(),
    givenName: QualifiedFieldSchema,
    familyName: QualifiedFieldSchema,
    preferredName: QualifiedFieldSchema,
    email: QualifiedFieldSchema,
    phone: QualifiedFieldSchema,
    dietaryRequirement: QualifiedFieldSchema,
    accessibilityRequirement: QualifiedFieldSchema,
    operationalNote: QualifiedFieldSchema,
    addressing: GuestAddressingSchema.optional(),
    ageBand: AgeBandSchema.optional(),
    childReadiness: ChildReadinessSchema.optional(),
    lifecycle: GuestLifecycleSchema,
    identityResolution: IdentityResolutionSchema,
    intakeSource: GuestIntakeSourceSchema,
    provenance: GuestProvenanceSchema,
    attentionRequired: z.boolean(),
    ...versioned,
  })
  .strict();

export const GuestHouseholdSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    key: NonEmptySchema.max(64),
    label: NonEmptySchema.max(120),
    ...versioned,
  })
  .strict();

export const GuestDuplicateCandidateSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    subjectGuestId: UuidSchema,
    otherGuestId: UuidSchema.optional(),
    otherPersonId: PersonIdSchema.optional(),
    kind: DuplicateMatchKindSchema,
    status: z.enum(["OPEN", "RESOLVED"]),
    decision: DuplicateDecisionSchema.optional(),
    decidedByPersonId: PersonIdSchema.optional(),
    decidedAt: IsoDatetimeSchema.optional(),
    reason: z.string().optional(),
    ...versioned,
  })
  .strict();

export const GuestIntakeBatchSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    filename: NonEmptySchema.max(180),
    mappingVersion: z.literal(CANONICAL_INTAKE_MAPPING_VERSION),
    status: z.enum(INTAKE_BATCH_STATUSES),
    rowCount: z.number().int().nonnegative(),
    promotedCount: z.number().int().nonnegative(),
    invalidCount: z.number().int().nonnegative(),
    ...versioned,
  })
  .strict();

export const GuestIntakeRowSchema = z
  .object({
    id: UuidSchema,
    batchId: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    rowNumber: z.number().int().positive(),
    raw: z.record(z.string()),
    issues: z.array(
      z
        .object({
          field: NonEmptySchema,
          code: NonEmptySchema,
          severity: z.enum(["ERROR", "WARNING"]),
        })
        .strict(),
    ),
    status: z.enum(INTAKE_ROW_STATUSES),
    promotedGuestId: UuidSchema.optional(),
    schemaVersion: z.literal(SCHEMA_VERSION),
    createdAt: IsoDatetimeSchema,
  })
  .strict();

export const GuestDirectoryQuerySchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    query: z.string().trim().max(120).optional(),
    lifecycle: GuestLifecycleSchema.optional(),
    identityResolution: IdentityResolutionSchema.optional(),
    attentionRequired: z.boolean().optional(),
    householdId: UuidSchema.optional(),
    attendanceIntent: z.enum(["NOT_SUPPLIED", "ATTENDING", "NOT_ATTENDING", "UNCERTAIN"]).optional(),
    rsvpStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "AMENDED", "WITHDRAWN"]).optional(),
    sort: z.enum(["FAMILY_NAME", "CREATED_AT"]).default("FAMILY_NAME"),
  })
  .strict();

export const IntakeGuestInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    givenName: z.string().trim().max(80).optional(),
    familyName: z.string().trim().max(80).optional(),
    preferredName: z.string().trim().max(80).optional(),
    email: z.string().trim().email().max(180).optional(),
    phone: z.string().trim().max(32).optional(),
    dietaryRequirement: z.string().trim().max(160).optional(),
    accessibilityRequirement: z.string().trim().max(160).optional(),
    operationalNote: z.string().trim().max(240).optional(),
    householdKey: z.string().trim().max(64).optional(),
    honorific: HonorificSchema.optional(),
    professionalTitle: z.string().trim().max(120).optional(),
    traditionalTitle: z.string().trim().max(120).optional(),
    middleNames: z.string().trim().max(120).optional(),
    postNominals: z.array(z.string().trim().max(32)).max(8).optional(),
    preferredDisplayName: z.string().trim().max(120).optional(),
    preferredFormalSalutation: z.string().trim().max(200).optional(),
    jointAddressForm: z.string().trim().max(240).optional(),
    ageBand: AgeBandSchema.optional(),
    personId: PersonIdSchema.optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const AmendGuestInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    givenName: z.string().trim().max(80).optional(),
    familyName: z.string().trim().max(80).optional(),
    preferredName: z.string().trim().max(80).optional(),
    email: z.string().trim().email().max(180).optional(),
    phone: z.string().trim().max(32).optional(),
    dietaryRequirement: z.string().trim().max(160).optional(),
    accessibilityRequirement: z.string().trim().max(160).optional(),
    operationalNote: z.string().trim().max(240).optional(),
    honorific: HonorificSchema.optional(),
    clearHonorific: z.boolean().optional(),
    professionalTitle: z.string().trim().max(120).optional(),
    traditionalTitle: z.string().trim().max(120).optional(),
    middleNames: z.string().trim().max(120).optional(),
    postNominals: z.array(z.string().trim().max(32)).max(8).optional(),
    preferredDisplayName: z.string().trim().max(120).optional(),
    preferredFormalSalutation: z.string().trim().max(200).optional(),
    jointAddressForm: z.string().trim().max(240).optional(),
    ageBand: AgeBandSchema.optional(),
    lifecycle: GuestLifecycleSchema.optional(),
    replaceVerifiedField: z.boolean().optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ResolveDuplicateInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    candidateId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    decision: DuplicateDecisionSchema,
    personId: PersonIdSchema.optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const LinkGuestPersonInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    personId: PersonIdSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const UnlinkGuestPersonInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ImportGuestsInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    filename: NonEmptySchema.max(180),
    csv: NonEmptySchema.max(200_000),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export type FieldQuality = z.infer<typeof FieldQualitySchema>;
export type DuplicateMatchKind = z.infer<typeof DuplicateMatchKindSchema>;
export type QualifiedField = z.infer<typeof QualifiedFieldSchema>;
export type OperationalGuest = z.infer<typeof OperationalGuestSchema>;
export type GuestHousehold = z.infer<typeof GuestHouseholdSchema>;
export type GuestDuplicateCandidate = z.infer<typeof GuestDuplicateCandidateSchema>;
export type GuestIntakeBatch = z.infer<typeof GuestIntakeBatchSchema>;
export type GuestIntakeRow = z.infer<typeof GuestIntakeRowSchema>;
export type GuestDirectoryQuery = z.infer<typeof GuestDirectoryQuerySchema>;
export type IntakeGuestInput = z.infer<typeof IntakeGuestInputSchema>;
export type AmendGuestInput = z.infer<typeof AmendGuestInputSchema>;
export type ResolveDuplicateInput = z.infer<typeof ResolveDuplicateInputSchema>;
export type LinkGuestPersonInput = z.infer<typeof LinkGuestPersonInputSchema>;
export type UnlinkGuestPersonInput = z.infer<typeof UnlinkGuestPersonInputSchema>;
export type ImportGuestsInput = z.infer<typeof ImportGuestsInputSchema>;
