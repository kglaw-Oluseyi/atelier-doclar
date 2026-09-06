import { z } from "zod";
import {
  ADDRESSING_RECONCILIATION_STATUSES,
  ADDRESSING_SOURCES,
  ADDRESSING_STATUSES,
  AGE_BANDS,
  CHILD_READINESS_STATES,
  COMPANION_AUTHORITY_KINDS,
  COMPANION_ENTITLEMENT_STATUSES,
  COMPANION_NOMINATION_STATES,
  EVENT_SERIES_OCCURRENCE_TYPES,
  EVENT_SERIES_STATUSES,
  HONORIFICS,
  PARTY_MEMBER_ROLES,
  PARTY_MEMBER_STATUSES,
  PARTY_STATUSES,
  PARTY_TYPES,
  RELATIONSHIP_DIRECTIONS,
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_VISIBILITIES,
  RESPONSIBLE_ADULT_LINK_STATUSES,
  RESPONSIBLE_ADULT_SCOPES,
  SCHEMA_VERSION,
} from "./constants.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  UuidSchema,
} from "./schemas.js";

export const GuestIdSchema = UuidSchema;
export const PartyIdSchema = UuidSchema;
export const PartyMemberIdSchema = UuidSchema;
export const RelationshipIdSchema = UuidSchema;
export const CompanionEntitlementIdSchema = UuidSchema;
export const CompanionNominationIdSchema = UuidSchema;
export const ResponsibleAdultLinkIdSchema = UuidSchema;
export const EventSeriesIdSchema = UuidSchema;
export const AddressingReconciliationIdSchema = UuidSchema;

export const HonorificSchema = z.enum(HONORIFICS);
export const AddressingStatusSchema = z.enum(ADDRESSING_STATUSES);
export const AddressingSourceSchema = z.enum(ADDRESSING_SOURCES);
export const AgeBandSchema = z.enum(AGE_BANDS);
export const ChildReadinessSchema = z.enum(CHILD_READINESS_STATES);
export const PartyTypeSchema = z.enum(PARTY_TYPES);
export const PartyStatusSchema = z.enum(PARTY_STATUSES);
export const PartyMemberRoleSchema = z.enum(PARTY_MEMBER_ROLES);
export const PartyMemberStatusSchema = z.enum(PARTY_MEMBER_STATUSES);
export const RelationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);
export const RelationshipDirectionSchema = z.enum(RELATIONSHIP_DIRECTIONS);
export const RelationshipVisibilitySchema = z.enum(RELATIONSHIP_VISIBILITIES);
export const RelationshipStatusSchema = z.enum(RELATIONSHIP_STATUSES);
export const CompanionEntitlementStatusSchema = z.enum(COMPANION_ENTITLEMENT_STATUSES);
export const CompanionNominationStateSchema = z.enum(COMPANION_NOMINATION_STATES);
export const CompanionAuthorityKindSchema = z.enum(COMPANION_AUTHORITY_KINDS);
export const ResponsibleAdultScopeSchema = z.enum(RESPONSIBLE_ADULT_SCOPES);
export const ResponsibleAdultLinkStatusSchema = z.enum(RESPONSIBLE_ADULT_LINK_STATUSES);
export const EventSeriesStatusSchema = z.enum(EVENT_SERIES_STATUSES);
export const EventSeriesOccurrenceTypeSchema = z.enum(EVENT_SERIES_OCCURRENCE_TYPES);
export const AddressingReconciliationStatusSchema = z.enum(ADDRESSING_RECONCILIATION_STATUSES);

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

const unicodeName = z.string().trim().min(1).max(120);
const optionalUnicodeName = z.string().trim().max(120);

export const GuestAddressingSchema = z
  .object({
    honorific: HonorificSchema.optional(),
    professionalTitle: optionalUnicodeName.optional(),
    professionalTitleSource: AddressingSourceSchema.optional(),
    traditionalTitle: optionalUnicodeName.optional(),
    traditionalTitleSource: AddressingSourceSchema.optional(),
    middleNames: optionalUnicodeName.optional(),
    postNominals: z.array(unicodeName.max(32)).max(8).optional(),
    preferredDisplayName: optionalUnicodeName.optional(),
    preferredFormalSalutation: optionalUnicodeName.max(200).optional(),
    preferredFormalSalutationGovernance: z
      .object({
        decision: z.enum(["RETAINED", "UPDATED"]),
        formerTitles: z.array(z.string().trim().min(1).max(120)).max(8),
        recordedAt: IsoDatetimeSchema,
      })
      .strict()
      .optional(),
    jointAddressForm: optionalUnicodeName.max(240).optional(),
    pronunciationNote: z.string().trim().max(240).optional(),
    addressingStatus: AddressingStatusSchema,
    addressingSource: AddressingSourceSchema,
  })
  .strict()
  .refine((value) => {
    if (value.professionalTitle && !value.professionalTitleSource) return false;
    if (value.traditionalTitle && !value.traditionalTitleSource) return false;
    return true;
  }, "protocol-sensitive titles require an explicit source")
  .refine((value) => {
    if (value.addressingSource === "AUTHORISED_IMPORT") {
      return value.addressingStatus === "UNVERIFIED";
    }
    return true;
  }, "imported addressing remains UNVERIFIED until a governed confirmation");

export const CompanionAuthoritySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("RSVP_ENTITLEMENT"),
      rsvpEntitlementId: UuidSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("RSVP_POLICY_DEFAULT"),
      rsvpPolicyId: UuidSchema,
    })
    .strict(),
]);

export const GuestPartySchema = z
  .object({
    id: PartyIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    type: PartyTypeSchema,
    principalGuestId: GuestIdSchema.optional(),
    label: NonEmptySchema.max(120),
    status: PartyStatusSchema,
    legacyHouseholdId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const GuestPartyMemberSchema = z
  .object({
    id: PartyMemberIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    partyId: PartyIdSchema,
    guestId: GuestIdSchema,
    role: PartyMemberRoleSchema,
    joinedAt: IsoDatetimeSchema,
    leftAt: IsoDatetimeSchema.optional(),
    status: PartyMemberStatusSchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.partyId !== value.guestId, "a party cannot substitute for guest identity");

export const GuestRelationshipSchema = z
  .object({
    id: RelationshipIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    fromGuestId: GuestIdSchema,
    toGuestId: GuestIdSchema,
    type: RelationshipTypeSchema,
    direction: RelationshipDirectionSchema,
    source: AddressingSourceSchema,
    visibility: RelationshipVisibilitySchema,
    status: RelationshipStatusSchema,
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.fromGuestId !== value.toGuestId, "a relationship requires two distinct guest identities");

export const CompanionEntitlementSchema = z
  .object({
    id: CompanionEntitlementIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    invitationId: UuidSchema.optional(),
    principalGuestId: GuestIdSchema,
    nominatedGuestId: GuestIdSchema.optional(),
    allowance: z.number().int().min(0).max(4),
    authority: CompanionAuthoritySchema,
    status: CompanionEntitlementStatusSchema,
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict()
  .refine((value) => {
    if (value.status === "AVAILABLE" || value.status === "DECLINED" || value.status === "EXPIRED") {
      return value.nominatedGuestId === undefined;
    }
    return true;
  }, "an unnamed allowance must not carry a fabricated guestId");

export const CompanionNominationSchema = z
  .object({
    id: CompanionNominationIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    entitlementId: CompanionEntitlementIdSchema,
    guestId: GuestIdSchema.optional(),
    suppliedGivenName: optionalUnicodeName.optional(),
    suppliedFamilyName: optionalUnicodeName.optional(),
    suppliedEmail: z.string().trim().email().max(180).optional(),
    suppliedPhone: z.string().trim().max(32).optional(),
    state: CompanionNominationStateSchema,
    replacedNominationId: CompanionNominationIdSchema.optional(),
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict()
  .refine((value) => {
    if (value.state === "MATERIALISED") return Boolean(value.guestId);
    return true;
  }, "materialisation requires exactly one guestId");

export const ResponsibleAdultLinkSchema = z
  .object({
    id: ResponsibleAdultLinkIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    childGuestId: GuestIdSchema,
    responsibleAdultGuestId: GuestIdSchema,
    scope: ResponsibleAdultScopeSchema,
    status: ResponsibleAdultLinkStatusSchema,
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.childGuestId !== value.responsibleAdultGuestId, "a child cannot be their own responsible adult");

export const EventSeriesSchema = z
  .object({
    id: EventSeriesIdSchema,
    organisationId: OrganisationIdSchema,
    name: NonEmptySchema.max(160),
    status: EventSeriesStatusSchema,
    ...versioned,
  })
  .strict();

export const EventSeriesMemberSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventSeriesId: EventSeriesIdSchema,
    eventId: EventIdSchema,
    occurrenceType: EventSeriesOccurrenceTypeSchema,
    order: z.number().int().nonnegative(),
    ...versioned,
  })
  .strict()
  .refine((value) => value.eventSeriesId !== value.eventId, "eventSeriesId never replaces eventId");

export const AddressingReconciliationItemSchema = z
  .object({
    id: AddressingReconciliationIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: GuestIdSchema,
    legacyDisplayText: NonEmptySchema.max(240),
    status: AddressingReconciliationStatusSchema,
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict();

export const S04A_CANONICAL_COLLECTIONS = [
  "guestParties",
  "guestPartyMembers",
  "guestRelationships",
  "companionEntitlements",
  "companionNominations",
  "responsibleAdultLinks",
  "eventSeries",
  "eventSeriesMembers",
  "addressingReconciliationItems",
] as const;

export type S04ACanonicalCollection = (typeof S04A_CANONICAL_COLLECTIONS)[number];

export const S04ACanonicalCollectionSchema = z.enum(S04A_CANONICAL_COLLECTIONS);
export const S04AMigrationReceiptStatusSchema = z.enum(["APPLIED", "ROLLED_BACK"]);
export const S04AMigrationSubjectTypeSchema = z.enum([
  "HOUSEHOLD",
  "GUEST",
  "PARTY",
  "PARTY_MEMBER",
  "MIGRATION",
]);

export const S04ACreatedRecordRefSchema = z
  .object({
    collection: S04ACanonicalCollectionSchema,
    id: UuidSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const S04AMigrationNoteSchema = z
  .object({
    code: NonEmptySchema.max(80),
    subjectType: S04AMigrationSubjectTypeSchema,
    subjectId: UuidSchema.optional(),
  })
  .strict();

export const S04AMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: NonEmptySchema.max(80),
    status: S04AMigrationReceiptStatusSchema,
    createdRecords: z.array(S04ACreatedRecordRefSchema).max(10_000),
    notes: z.array(S04AMigrationNoteSchema).max(10_000),
    ...versioned,
  })
  .strict();

const mutationBase = {
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  reason: NonEmptySchema,
  idempotencyKey: NonEmptySchema.optional(),
};

export const UpdateGuestAddressingInputSchema = z
  .object({
    ...mutationBase,
    guestId: GuestIdSchema,
    expectedVersion: z.number().int().positive(),
    honorific: HonorificSchema.optional(),
    clearHonorific: z.boolean().optional(),
    professionalTitle: z.string().trim().max(120).optional(),
    traditionalTitle: z.string().trim().max(120).optional(),
    middleNames: z.string().trim().max(120).optional(),
    postNominals: z.array(z.string().trim().max(32)).max(8).optional(),
    preferredDisplayName: z.string().trim().max(120).optional(),
    preferredFormalSalutation: z.string().trim().max(200).optional(),
    salutationDecision: z.enum(["RETAIN", "UPDATE"]).optional(),
    jointAddressForm: z.string().trim().max(240).optional(),
    pronunciationNote: z.string().trim().max(240).optional(),
    addressingStatus: AddressingStatusSchema.optional(),
    addressingSource: AddressingSourceSchema,
    ageBand: AgeBandSchema.optional(),
  })
  .strict();

export const CreatePartyInputSchema = z
  .object({
    ...mutationBase,
    type: PartyTypeSchema,
    label: NonEmptySchema.max(120),
    principalGuestId: GuestIdSchema.optional(),
    legacyHouseholdId: UuidSchema.optional(),
  })
  .strict();

export const AddPartyMemberInputSchema = z
  .object({
    ...mutationBase,
    partyId: PartyIdSchema,
    guestId: GuestIdSchema,
    expectedPartyVersion: z.number().int().positive(),
    role: PartyMemberRoleSchema,
  })
  .strict();

export const RemovePartyMemberInputSchema = z
  .object({
    ...mutationBase,
    partyMemberId: PartyMemberIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const CreateRelationshipInputSchema = z
  .object({
    ...mutationBase,
    fromGuestId: GuestIdSchema,
    toGuestId: GuestIdSchema,
    type: RelationshipTypeSchema,
    direction: RelationshipDirectionSchema,
    source: AddressingSourceSchema,
    visibility: RelationshipVisibilitySchema,
  })
  .strict()
  .refine((value) => value.fromGuestId !== value.toGuestId, "a relationship requires two distinct guest identities");

export const AdministerRelationshipInputSchema = z
  .object({
    ...mutationBase,
    relationshipId: RelationshipIdSchema,
    expectedVersion: z.number().int().positive(),
    type: RelationshipTypeSchema.optional(),
    source: AddressingSourceSchema.optional(),
    visibility: RelationshipVisibilitySchema.optional(),
    status: RelationshipStatusSchema.optional(),
  })
  .strict();

export const AdministerCompanionEntitlementInputSchema = z
  .object({
    ...mutationBase,
    principalGuestId: GuestIdSchema,
    invitationId: UuidSchema.optional(),
    allowance: z.number().int().min(0).max(4),
    authority: CompanionAuthoritySchema,
    status: CompanionEntitlementStatusSchema.optional(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict();

export const NominateCompanionInputSchema = z
  .object({
    ...mutationBase,
    entitlementId: CompanionEntitlementIdSchema,
    expectedVersion: z.number().int().positive(),
    guestId: GuestIdSchema.optional(),
    suppliedGivenName: z.string().trim().max(120).optional(),
    suppliedFamilyName: z.string().trim().max(120).optional(),
    suppliedEmail: z.string().trim().email().max(180).optional(),
    suppliedPhone: z.string().trim().max(32).optional(),
  })
  .strict();

export const CreateResponsibleAdultLinkInputSchema = z
  .object({
    ...mutationBase,
    childGuestId: GuestIdSchema,
    responsibleAdultGuestId: GuestIdSchema,
    scope: ResponsibleAdultScopeSchema,
  })
  .strict()
  .refine((value) => value.childGuestId !== value.responsibleAdultGuestId, "a child cannot be their own responsible adult");

export const EndResponsibleAdultLinkInputSchema = z
  .object({
    ...mutationBase,
    linkId: ResponsibleAdultLinkIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const ReconcileCompanionNamesInputSchema = z
  .object({
    ...mutationBase,
    guestId: GuestIdSchema,
  })
  .strict();

export type Honorific = z.infer<typeof HonorificSchema>;
export type AddressingStatus = z.infer<typeof AddressingStatusSchema>;
export type CompanionEntitlementStatus = z.infer<typeof CompanionEntitlementStatusSchema>;
export type AddressingSource = z.infer<typeof AddressingSourceSchema>;
export type AgeBand = z.infer<typeof AgeBandSchema>;
export type ChildReadiness = z.infer<typeof ChildReadinessSchema>;
export type GuestAddressing = z.infer<typeof GuestAddressingSchema>;
export type GuestParty = z.infer<typeof GuestPartySchema>;
export type GuestPartyMember = z.infer<typeof GuestPartyMemberSchema>;
export type GuestRelationship = z.infer<typeof GuestRelationshipSchema>;
export type CompanionEntitlement = z.infer<typeof CompanionEntitlementSchema>;
export type CompanionNomination = z.infer<typeof CompanionNominationSchema>;
export type ResponsibleAdultLink = z.infer<typeof ResponsibleAdultLinkSchema>;
export type EventSeries = z.infer<typeof EventSeriesSchema>;
export type EventSeriesMember = z.infer<typeof EventSeriesMemberSchema>;
export type AddressingReconciliationItem = z.infer<typeof AddressingReconciliationItemSchema>;
export type UpdateGuestAddressingInput = z.infer<typeof UpdateGuestAddressingInputSchema>;
export type CreatePartyInput = z.infer<typeof CreatePartyInputSchema>;
export type AddPartyMemberInput = z.infer<typeof AddPartyMemberInputSchema>;
export type RemovePartyMemberInput = z.infer<typeof RemovePartyMemberInputSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipInputSchema>;
export type AdministerRelationshipInput = z.infer<typeof AdministerRelationshipInputSchema>;
export type AdministerCompanionEntitlementInput = z.infer<typeof AdministerCompanionEntitlementInputSchema>;
export type NominateCompanionInput = z.infer<typeof NominateCompanionInputSchema>;
export type CreateResponsibleAdultLinkInput = z.infer<typeof CreateResponsibleAdultLinkInputSchema>;
export type EndResponsibleAdultLinkInput = z.infer<typeof EndResponsibleAdultLinkInputSchema>;
export type ReconcileCompanionNamesInput = z.infer<typeof ReconcileCompanionNamesInputSchema>;
export type CompanionAuthority = z.infer<typeof CompanionAuthoritySchema>;
export type S04ACreatedRecordRef = z.infer<typeof S04ACreatedRecordRefSchema>;
export type S04AMigrationNote = z.infer<typeof S04AMigrationNoteSchema>;
export type S04AMigrationReceipt = z.infer<typeof S04AMigrationReceiptSchema>;
export type S04AMigrationReceiptStatus = z.infer<typeof S04AMigrationReceiptStatusSchema>;
