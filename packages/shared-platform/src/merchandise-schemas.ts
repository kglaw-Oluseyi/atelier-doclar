import { z } from "zod";
import {
  CAP_CIRCUMFERENCE_MAX_INCHES,
  CAP_CIRCUMFERENCE_MIN_INCHES,
  CAP_MEASUREMENT_SOURCES,
  CAP_MEASUREMENT_STATUSES,
  EXTERNAL_COMMERCIAL_STATUSES,
  EXTERNAL_CONTACT_CHANNELS,
  FULFILMENT_STATES,
  GUEST_OFFER_STATES,
  HOST_OFFER_RULE_STATUSES,
  MERCHANDISE_AUDIENCE_KINDS,
  MERCHANDISE_COLLECTION_STATUSES,
  MERCHANDISE_EXCEPTION_STATUSES,
  MERCHANDISE_EXCEPTION_TYPES,
  MERCHANDISE_ITEM_STATUSES,
  MERCHANDISE_ITEM_TYPES,
  PARTICIPATION_CHOICES,
  PARTICIPATION_STATUSES,
  SCHEMA_VERSION,
  VENDOR_ASSIGNMENT_STATUSES,
  VENDOR_UPDATE_REVIEW_STATES,
} from "./constants.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  UuidSchema,
} from "./schemas.js";

export const MerchandiseCollectionIdSchema = UuidSchema;
export const MerchandiseItemIdSchema = UuidSchema;
export const ItemVariantIdSchema = UuidSchema;
export const MerchandiseCohortIdSchema = UuidSchema;
export const MerchandiseCohortMemberIdSchema = UuidSchema;
export const HostOfferRuleIdSchema = UuidSchema;
export const GuestOfferIdSchema = UuidSchema;
export const GuestParticipationIdSchema = UuidSchema;
export const CapMeasurementIdSchema = UuidSchema;
export const FulfilmentIdSchema = UuidSchema;
export const VendorAssignmentIdSchema = UuidSchema;
export const VendorUpdateIdSchema = UuidSchema;
export const VendorSessionIdSchema = UuidSchema;
export const ExternalContactLinkIdSchema = UuidSchema;
export const MerchandiseExceptionIdSchema = UuidSchema;
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
  reason: NonEmptySchema,
  idempotencyKey: NonEmptySchema.optional(),
};

export const HeadCircumferenceInchesSchema = z
  .number()
  .min(CAP_CIRCUMFERENCE_MIN_INCHES)
  .max(CAP_CIRCUMFERENCE_MAX_INCHES)
  .refine((value) => Number.isFinite(value) && Math.round(value * 4) === value * 4, {
    message: "cap circumference must be in quarter-inch increments",
  });

export const MerchandiseCollectionSchema = z
  .object({
    id: MerchandiseCollectionIdSchema,
    ...scoped,
    name: NonEmptySchema.max(160),
    hostOwnerLabel: NonEmptySchema.max(120),
    phaseIds: z.array(UuidSchema).max(16),
    windowStartsAt: IsoDatetimeSchema,
    windowEndsAt: IsoDatetimeSchema,
    status: z.enum(MERCHANDISE_COLLECTION_STATUSES),
    ...versioned,
  })
  .strict()
  .refine((value) => Date.parse(value.windowEndsAt) > Date.parse(value.windowStartsAt), "collection window end must be after start");

export const MerchandiseItemSchema = z
  .object({
    id: MerchandiseItemIdSchema,
    ...scoped,
    collectionId: MerchandiseCollectionIdSchema,
    type: z.enum(MERCHANDISE_ITEM_TYPES),
    name: NonEmptySchema.max(160),
    description: NonEmptySchema.max(400),
    vendorId: NonEmptySchema.max(80).optional(),
    madeToMeasureCap: z.boolean(),
    status: z.enum(MERCHANDISE_ITEM_STATUSES),
    ...versioned,
  })
  .strict()
  .refine((value) => value.madeToMeasureCap === (value.type === "MADE_TO_MEASURE_CAP"), "only made-to-measure cap items may request cap circumference");

export const ItemVariantSchema = z
  .object({
    id: ItemVariantIdSchema,
    ...scoped,
    itemId: MerchandiseItemIdSchema,
    label: NonEmptySchema.max(120),
    colour: z.string().trim().max(80).optional(),
    pattern: z.string().trim().max(80).optional(),
    material: z.string().trim().max(80).optional(),
    presentation: z.string().trim().max(80).optional(),
    ...versioned,
  })
  .strict();

export const MerchandiseCohortSchema = z
  .object({
    id: MerchandiseCohortIdSchema,
    ...scoped,
    label: NonEmptySchema.max(80),
    hostAssigned: z.literal(true),
    inferred: z.literal(false),
    ...versioned,
  })
  .strict();

export const MerchandiseCohortMemberSchema = z
  .object({
    id: MerchandiseCohortMemberIdSchema,
    ...scoped,
    cohortId: MerchandiseCohortIdSchema,
    guestId: GuestIdRefSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.cohortId !== value.guestId, "a cohort cannot substitute for guest identity");

export const HostOfferRuleSchema = z
  .object({
    id: HostOfferRuleIdSchema,
    ...scoped,
    collectionId: MerchandiseCollectionIdSchema,
    itemId: MerchandiseItemIdSchema,
    variantIds: z.array(ItemVariantIdSchema).max(16),
    audienceKind: z.enum(MERCHANDISE_AUDIENCE_KINDS),
    audienceGuestIds: z.array(GuestIdRefSchema).max(500),
    cohortId: MerchandiseCohortIdSchema.optional(),
    phaseId: UuidSchema.optional(),
    hostSponsored: z.boolean(),
    priority: z.number().int().nonnegative(),
    status: z.enum(HOST_OFFER_RULE_STATUSES),
    conflictReason: z.string().trim().max(240).optional(),
    ...versioned,
  })
  .strict();

export const GuestOfferSchema = z
  .object({
    id: GuestOfferIdSchema,
    ...scoped,
    guestId: GuestIdRefSchema,
    collectionId: MerchandiseCollectionIdSchema,
    itemId: MerchandiseItemIdSchema,
    variantIds: z.array(ItemVariantIdSchema).max(16),
    sourceRuleId: HostOfferRuleIdSchema,
    individualOverride: z.boolean(),
    hostSponsored: z.boolean(),
    state: z.enum(GUEST_OFFER_STATES),
    ...versioned,
  })
  .strict();

export const GuestParticipationSchema = z
  .object({
    id: GuestParticipationIdSchema,
    ...scoped,
    guestOfferId: GuestOfferIdSchema,
    guestId: GuestIdRefSchema,
    choice: z.enum(PARTICIPATION_CHOICES),
    selectedVariantId: ItemVariantIdSchema.optional(),
    status: z.enum(PARTICIPATION_STATUSES),
    private: z.literal(true),
    ...versioned,
  })
  .strict();

export const CapMeasurementSchema = z
  .object({
    id: CapMeasurementIdSchema,
    ...scoped,
    guestId: GuestIdRefSchema,
    itemId: MerchandiseItemIdSchema,
    headCircumferenceInches: HeadCircumferenceInchesSchema,
    consentGiven: z.literal(true),
    consentRecordedAt: IsoDatetimeSchema,
    consentWithdrawnAt: IsoDatetimeSchema.optional(),
    source: z.enum(CAP_MEASUREMENT_SOURCES),
    status: z.enum(CAP_MEASUREMENT_STATUSES),
    purpose: z.literal("NAMED_CAP_MANUFACTURE"),
    ...versioned,
  })
  .strict();

export const FulfilmentSchema = z
  .object({
    id: FulfilmentIdSchema,
    ...scoped,
    guestId: GuestIdRefSchema,
    guestOfferId: GuestOfferIdSchema,
    itemId: MerchandiseItemIdSchema,
    variantId: ItemVariantIdSchema.optional(),
    vendorReference: NonEmptySchema.max(40),
    milestoneStatus: z.enum(FULFILMENT_STATES),
    commercialStatus: z.enum(EXTERNAL_COMMERCIAL_STATUSES),
    commercialAttributed: z.boolean(),
    ...versioned,
  })
  .strict();

export const VendorAssignmentSchema = z
  .object({
    id: VendorAssignmentIdSchema,
    ...scoped,
    vendorId: NonEmptySchema.max(80),
    vendorDisplayName: NonEmptySchema.max(120),
    collectionIds: z.array(MerchandiseCollectionIdSchema).max(16),
    itemIds: z.array(MerchandiseItemIdSchema).max(32),
    tokenHash: NonEmptySchema.max(128),
    tokenPrefix: NonEmptySchema.max(8),
    status: z.enum(VENDOR_ASSIGNMENT_STATUSES),
    expiresAt: IsoDatetimeSchema,
    revokedAt: IsoDatetimeSchema.optional(),
    failedExchangeCount: z.number().int().nonnegative(),
    portalPermissions: z.array(z.enum(["fulfilment.view", "fulfilment.update", "exception.report"])).max(8),
    ...versioned,
  })
  .strict();

export const VendorUpdateSchema = z
  .object({
    id: VendorUpdateIdSchema,
    ...scoped,
    assignmentId: VendorAssignmentIdSchema,
    fulfilmentId: FulfilmentIdSchema,
    reportedState: z.enum(FULFILMENT_STATES),
    commercialStatus: z.enum(EXTERNAL_COMMERCIAL_STATUSES).optional(),
    evidenceReference: z.string().trim().max(160).optional(),
    reviewState: z.enum(VENDOR_UPDATE_REVIEW_STATES),
    vendorActorLabel: NonEmptySchema.max(80),
    reportedAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const VendorSessionSchema = z
  .object({
    id: VendorSessionIdSchema,
    assignmentId: VendorAssignmentIdSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    vendorId: NonEmptySchema.max(80),
    issuedAt: IsoDatetimeSchema,
    expiresAt: IsoDatetimeSchema,
    revokedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const ExternalContactLinkSchema = z
  .object({
    id: ExternalContactLinkIdSchema,
    ...scoped,
    collectionId: MerchandiseCollectionIdSchema,
    itemId: MerchandiseItemIdSchema.optional(),
    channel: z.enum(EXTERNAL_CONTACT_CHANNELS),
    label: NonEmptySchema.max(80),
    urlTemplate: NonEmptySchema.max(240),
    published: z.boolean(),
    ...versioned,
  })
  .strict();

export const MerchandiseExceptionSchema = z
  .object({
    id: MerchandiseExceptionIdSchema,
    ...scoped,
    type: z.enum(MERCHANDISE_EXCEPTION_TYPES),
    guestId: GuestIdRefSchema.optional(),
    fulfilmentId: FulfilmentIdSchema.optional(),
    ownerLabel: NonEmptySchema.max(80),
    decision: z.string().trim().max(240).optional(),
    reason: NonEmptySchema.max(240),
    guestSafeMessage: z.string().trim().max(240).optional(),
    status: z.enum(MERCHANDISE_EXCEPTION_STATUSES),
    ...versioned,
  })
  .strict();

export const S04CCreatedRecordRefSchema = z
  .object({
    collection: NonEmptySchema.max(80),
    id: UuidSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const S04CMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: NonEmptySchema.max(80),
    checksum: NonEmptySchema.max(64),
    status: z.enum(["APPLIED", "ROLLED_BACK"]),
    createdRecords: z.array(S04CCreatedRecordRefSchema).max(10_000),
    notes: z.array(z.object({ code: NonEmptySchema.max(80), subjectType: NonEmptySchema.max(40), subjectId: UuidSchema }).strict()).max(10_000),
    ...versioned,
  })
  .strict();

export const S04C_CANONICAL_COLLECTIONS = [
  "merchandiseCollections",
  "merchandiseItems",
  "merchandiseItemVariants",
  "merchandiseCohorts",
  "merchandiseCohortMembers",
  "hostOfferRules",
  "guestOffers",
  "guestParticipations",
  "capMeasurements",
  "merchandiseFulfilments",
  "vendorAssignments",
  "vendorUpdates",
  "vendorSessions",
  "externalContactLinks",
  "merchandiseExceptions",
] as const;

export type S04CCanonicalCollection = (typeof S04C_CANONICAL_COLLECTIONS)[number];

export const CreateMerchandiseCollectionInputSchema = z
  .object({
    ...mutationBase,
    name: NonEmptySchema.max(160),
    hostOwnerLabel: NonEmptySchema.max(120),
    phaseIds: z.array(UuidSchema).max(16).default([]),
    windowStartsAt: IsoDatetimeSchema,
    windowEndsAt: IsoDatetimeSchema,
  })
  .strict();

export const CreateMerchandiseItemInputSchema = z
  .object({
    ...mutationBase,
    collectionId: MerchandiseCollectionIdSchema,
    type: z.enum(MERCHANDISE_ITEM_TYPES),
    name: NonEmptySchema.max(160),
    description: NonEmptySchema.max(400),
    madeToMeasureCap: z.boolean().default(false),
    variantLabel: NonEmptySchema.max(120),
  })
  .strict();

export const CreateMerchandiseCohortInputSchema = z
  .object({
    ...mutationBase,
    label: NonEmptySchema.max(80),
    guestIds: z.array(GuestIdRefSchema).min(1).max(200),
  })
  .strict();

export const CreateHostOfferRuleInputSchema = z
  .object({
    ...mutationBase,
    collectionId: MerchandiseCollectionIdSchema,
    itemId: MerchandiseItemIdSchema,
    variantIds: z.array(ItemVariantIdSchema).min(1).max(16),
    audienceKind: z.enum(MERCHANDISE_AUDIENCE_KINDS),
    audienceGuestIds: z.array(GuestIdRefSchema).max(500).default([]),
    cohortId: MerchandiseCohortIdSchema.optional(),
    phaseId: UuidSchema.optional(),
    hostSponsored: z.boolean().default(false),
    priority: z.number().int().nonnegative().default(0),
    issueImmediately: z.boolean().default(false),
    expectedCollectionVersion: z.number().int().positive(),
  })
  .strict();

export const IssueHostOfferRuleInputSchema = z
  .object({
    ...mutationBase,
    ruleId: HostOfferRuleIdSchema,
    expectedRuleVersion: z.number().int().positive(),
  })
  .strict();

export const RecordGuestParticipationInputSchema = z
  .object({
    ...mutationBase,
    guestOfferId: GuestOfferIdSchema,
    guestId: GuestIdRefSchema,
    choice: z.enum(PARTICIPATION_CHOICES),
    selectedVariantId: ItemVariantIdSchema.optional(),
    expectedOfferVersion: z.number().int().positive(),
  })
  .strict();

export const CaptureCapMeasurementInputSchema = z
  .object({
    ...mutationBase,
    guestId: GuestIdRefSchema,
    itemId: MerchandiseItemIdSchema,
    headCircumferenceInches: HeadCircumferenceInchesSchema,
    consentGiven: z.literal(true),
    source: z.enum(CAP_MEASUREMENT_SOURCES),
  })
  .strict();

export const WithdrawCapMeasurementInputSchema = z
  .object({
    ...mutationBase,
    measurementId: CapMeasurementIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const CreateVendorAssignmentInputSchema = z
  .object({
    ...mutationBase,
    vendorId: NonEmptySchema.max(80),
    vendorDisplayName: NonEmptySchema.max(120),
    collectionIds: z.array(MerchandiseCollectionIdSchema).min(1).max(16),
    itemIds: z.array(MerchandiseItemIdSchema).min(1).max(32),
    expiresAt: IsoDatetimeSchema,
  })
  .strict();

export const RevokeVendorAssignmentInputSchema = z
  .object({
    ...mutationBase,
    assignmentId: VendorAssignmentIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const SubmitVendorUpdateInputSchema = z
  .object({
    assignmentId: VendorAssignmentIdSchema,
    fulfilmentId: FulfilmentIdSchema,
    reportedState: z.enum(FULFILMENT_STATES),
    commercialStatus: z.enum(EXTERNAL_COMMERCIAL_STATUSES).optional(),
    evidenceReference: z.string().trim().max(160).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
    expectedFulfilmentVersion: z.number().int().positive(),
  })
  .strict();

export const ReviewVendorUpdateInputSchema = z
  .object({
    ...mutationBase,
    updateId: VendorUpdateIdSchema,
    accept: z.boolean(),
    expectedUpdateVersion: z.number().int().positive(),
  })
  .strict();

export const RaiseMerchandiseExceptionInputSchema = z
  .object({
    ...mutationBase,
    type: z.enum(MERCHANDISE_EXCEPTION_TYPES),
    guestId: GuestIdRefSchema.optional(),
    fulfilmentId: FulfilmentIdSchema.optional(),
    ownerLabel: NonEmptySchema.max(80),
    guestSafeMessage: z.string().trim().max(240).optional(),
  })
  .strict();

export const CreateExternalContactLinkInputSchema = z
  .object({
    ...mutationBase,
    collectionId: MerchandiseCollectionIdSchema,
    itemId: MerchandiseItemIdSchema.optional(),
    channel: z.enum(EXTERNAL_CONTACT_CHANNELS),
    label: NonEmptySchema.max(80),
    urlTemplate: NonEmptySchema.max(240),
  })
  .strict();

export type MerchandiseCollection = z.infer<typeof MerchandiseCollectionSchema>;
export type MerchandiseItem = z.infer<typeof MerchandiseItemSchema>;
export type ItemVariant = z.infer<typeof ItemVariantSchema>;
export type MerchandiseCohort = z.infer<typeof MerchandiseCohortSchema>;
export type MerchandiseCohortMember = z.infer<typeof MerchandiseCohortMemberSchema>;
export type HostOfferRule = z.infer<typeof HostOfferRuleSchema>;
export type GuestOffer = z.infer<typeof GuestOfferSchema>;
export type GuestParticipation = z.infer<typeof GuestParticipationSchema>;
export type CapMeasurement = z.infer<typeof CapMeasurementSchema>;
export type Fulfilment = z.infer<typeof FulfilmentSchema>;
export type VendorAssignment = z.infer<typeof VendorAssignmentSchema>;
export type VendorUpdate = z.infer<typeof VendorUpdateSchema>;
export type VendorSession = z.infer<typeof VendorSessionSchema>;
export type ExternalContactLink = z.infer<typeof ExternalContactLinkSchema>;
export type MerchandiseException = z.infer<typeof MerchandiseExceptionSchema>;
export type S04CMigrationReceipt = z.infer<typeof S04CMigrationReceiptSchema>;
export type CreateMerchandiseCollectionInput = z.infer<typeof CreateMerchandiseCollectionInputSchema>;
export type CreateMerchandiseItemInput = z.infer<typeof CreateMerchandiseItemInputSchema>;
export type CreateMerchandiseCohortInput = z.infer<typeof CreateMerchandiseCohortInputSchema>;
export type CreateHostOfferRuleInput = z.infer<typeof CreateHostOfferRuleInputSchema>;
export type IssueHostOfferRuleInput = z.infer<typeof IssueHostOfferRuleInputSchema>;
export type RecordGuestParticipationInput = z.infer<typeof RecordGuestParticipationInputSchema>;
export type CaptureCapMeasurementInput = z.infer<typeof CaptureCapMeasurementInputSchema>;
export type WithdrawCapMeasurementInput = z.infer<typeof WithdrawCapMeasurementInputSchema>;
export type CreateVendorAssignmentInput = z.infer<typeof CreateVendorAssignmentInputSchema>;
export type RevokeVendorAssignmentInput = z.infer<typeof RevokeVendorAssignmentInputSchema>;
export type SubmitVendorUpdateInput = z.infer<typeof SubmitVendorUpdateInputSchema>;
export type ReviewVendorUpdateInput = z.infer<typeof ReviewVendorUpdateInputSchema>;
export type RaiseMerchandiseExceptionInput = z.infer<typeof RaiseMerchandiseExceptionInputSchema>;
export type CreateExternalContactLinkInput = z.infer<typeof CreateExternalContactLinkInputSchema>;
