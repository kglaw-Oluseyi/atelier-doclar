import { z } from "zod";
import {
  RSVP_ASSISTANCE_STATUSES,
  RSVP_ATTENDANCE_INTENTS,
  RSVP_ENTITLEMENT_KINDS,
  RSVP_EXCEPTION_KINDS,
  RSVP_EXCEPTION_STATUSES,
  RSVP_INVITATION_STATUSES,
  RSVP_KEY_STATUSES,
  RSVP_QUESTION_KEYS,
  RSVP_QUESTIONNAIRE_STATUSES,
  RSVP_RESPONSE_PROVENANCE,
  RSVP_RESPONSE_STATUSES,
  SCHEMA_VERSION,
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
  nonProductionFixture: z.boolean().optional(),
};

export const RsvpAttendanceIntentSchema = z.enum(RSVP_ATTENDANCE_INTENTS);
export const RsvpResponseStatusSchema = z.enum(RSVP_RESPONSE_STATUSES);
export const RsvpResponseProvenanceSchema = z.enum(RSVP_RESPONSE_PROVENANCE);
export const RsvpInvitationStatusSchema = z.enum(RSVP_INVITATION_STATUSES);
export const RsvpQuestionnaireStatusSchema = z.enum(RSVP_QUESTIONNAIRE_STATUSES);
export const RsvpQuestionKeySchema = z.enum(RSVP_QUESTION_KEYS);
export const RsvpExceptionKindSchema = z.enum(RSVP_EXCEPTION_KINDS);
export const RsvpExceptionStatusSchema = z.enum(RSVP_EXCEPTION_STATUSES);
export const RsvpAssistanceStatusSchema = z.enum(RSVP_ASSISTANCE_STATUSES);
export const RsvpEntitlementKindSchema = z.enum(RSVP_ENTITLEMENT_KINDS);

export const RsvpPolicySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    hostDisplayName: NonEmptySchema.max(120),
    eventDisplayName: NonEmptySchema.max(160),
    privacyNotice: NonEmptySchema.max(800),
    amendmentsPermitted: z.boolean(),
    amendmentUntil: IsoDatetimeSchema.optional(),
    companionsPermitted: z.boolean(),
    defaultCompanionAllowance: z.number().int().min(0).max(4),
    householdRespondentExplicit: z.literal(true),
    closedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const RsvpQuestionSchema = z
  .object({
    key: RsvpQuestionKeySchema,
    label: NonEmptySchema.max(160),
    help: z.string().trim().max(240).optional(),
    required: z.boolean(),
    sensitive: z.boolean(),
    enabled: z.boolean(),
    visibleWhenAttendance: z.enum(["ANY", "ATTENDING", "NOT_ATTENDING", "UNCERTAIN"]).default("ANY"),
  })
  .strict();

export const RsvpSectionSchema = z
  .object({
    key: NonEmptySchema.max(40),
    title: NonEmptySchema.max(120),
    lede: z.string().trim().max(280).optional(),
    questions: z.array(RsvpQuestionSchema).min(1).max(8),
  })
  .strict();

export const RsvpQuestionnaireSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    status: RsvpQuestionnaireStatusSchema,
    versionNumber: z.number().int().positive(),
    sections: z.array(RsvpSectionSchema).min(1).max(8),
    publishedAt: IsoDatetimeSchema.optional(),
    closedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const RsvpInvitationSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    tokenHash: NonEmptySchema.max(128),
    tokenPrefix: z.string().length(8),
    keyId: NonEmptySchema.max(40),
    status: RsvpInvitationStatusSchema,
    expiresAt: IsoDatetimeSchema,
    issuedByPersonId: PersonIdSchema,
    rotatedFromId: UuidSchema.optional(),
    revokedAt: IsoDatetimeSchema.optional(),
    lastExchangedAt: IsoDatetimeSchema.optional(),
    exchangeCount: z.number().int().nonnegative(),
    failedExchangeCount: z.number().int().nonnegative(),
    ...versioned,
  })
  .strict();

export const RsvpGuestSessionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    invitationId: UuidSchema,
    sessionHash: NonEmptySchema.max(128),
    keyId: NonEmptySchema.max(40),
    expiresAt: IsoDatetimeSchema,
    revokedAt: IsoDatetimeSchema.optional(),
    lastSeenAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const RsvpHouseholdAnswerSchema = z
  .object({
    guestId: UuidSchema,
    attendanceIntent: RsvpAttendanceIntentSchema,
  })
  .strict();

export const RsvpAnswersSchema = z
  .object({
    attendanceIntent: RsvpAttendanceIntentSchema.optional(),
    householdResponses: z.array(RsvpHouseholdAnswerSchema).max(12).optional(),
    companionCount: z.number().int().min(0).max(4).optional(),
    companionNames: z.array(z.string().trim().max(80)).max(4).optional(),
    dietary: z.string().trim().max(160).optional(),
    accessibility: z.string().trim().max(160).optional(),
    assistanceRequested: z.boolean().optional(),
    assistanceNote: z.string().trim().max(240).optional(),
    sensitiveConsent: z.boolean().optional(),
  })
  .strict();

export const RsvpResponseSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    questionnaireId: UuidSchema,
    attendanceIntent: RsvpAttendanceIntentSchema,
    status: RsvpResponseStatusSchema,
    provenance: RsvpResponseProvenanceSchema,
    answers: RsvpAnswersSchema,
    respondedAt: IsoDatetimeSchema.optional(),
    lastInvitationId: UuidSchema.optional(),
    lastActorPersonId: PersonIdSchema.optional(),
    receiptId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const RsvpReceiptSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    responseId: UuidSchema,
    responseVersion: z.number().int().positive(),
    attendanceIntent: RsvpAttendanceIntentSchema,
    payloadHash: NonEmptySchema.max(128),
    submittedAt: IsoDatetimeSchema,
    provenance: RsvpResponseProvenanceSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const RsvpEntitlementSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    kind: RsvpEntitlementKindSchema,
    allowance: z.number().int().min(0).max(4).optional(),
    subjectGuestIds: z.array(UuidSchema).max(12).optional(),
    status: z.enum(["ACTIVE", "REVOKED"]),
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict();

export const RsvpExceptionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    kind: RsvpExceptionKindSchema,
    status: RsvpExceptionStatusSchema,
    fieldKey: z.string().trim().max(40).optional(),
    existingValue: z.string().trim().max(240).optional(),
    submittedValue: z.string().trim().max(240).optional(),
    note: z.string().trim().max(240).optional(),
    resolvedByPersonId: PersonIdSchema.optional(),
    resolvedAt: IsoDatetimeSchema.optional(),
    reason: z.string().trim().max(240).optional(),
    ...versioned,
  })
  .strict();

export const RsvpAssistanceRequestSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    note: NonEmptySchema.max(240),
    status: RsvpAssistanceStatusSchema,
    acknowledgedByPersonId: PersonIdSchema.optional(),
    acknowledgedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const RsvpKeySchema = z
  .object({
    id: NonEmptySchema.max(40),
    status: z.enum(RSVP_KEY_STATUSES),
    createdAt: IsoDatetimeSchema,
    retiredAt: IsoDatetimeSchema.optional(),
  })
  .strict();

export const RsvpKeyRingSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    currentKeyId: NonEmptySchema.max(40),
    keys: z.array(RsvpKeySchema).min(1),
    ...versioned,
  })
  .strict();

export const RsvpEventProjectionSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    notSupplied: z.number().int().nonnegative(),
    attending: z.number().int().nonnegative(),
    notAttending: z.number().int().nonnegative(),
    uncertain: z.number().int().nonnegative(),
    submitted: z.number().int().nonnegative(),
    exceptionsOpen: z.number().int().nonnegative(),
    assistanceOpen: z.number().int().nonnegative(),
    reconciledAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const UpsertRsvpPolicyInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    hostDisplayName: NonEmptySchema.max(120),
    eventDisplayName: NonEmptySchema.max(160),
    privacyNotice: NonEmptySchema.max(800),
    amendmentsPermitted: z.boolean(),
    amendmentUntil: IsoDatetimeSchema.optional(),
    companionsPermitted: z.boolean(),
    defaultCompanionAllowance: z.number().int().min(0).max(4),
    expectedVersion: z.number().int().positive().optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const PublishRsvpQuestionnaireInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const CloseRsvpQuestionnaireInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    questionnaireId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const IssueRsvpInvitationInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    expiresAt: IsoDatetimeSchema.optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RotateRsvpInvitationInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    invitationId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RevokeRsvpInvitationInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    invitationId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const GrantRsvpEntitlementInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    kind: RsvpEntitlementKindSchema,
    allowance: z.number().int().min(0).max(4).optional(),
    subjectGuestIds: z.array(UuidSchema).max(12).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RevokeRsvpEntitlementInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    entitlementId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const StaffRsvpResponseInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    expectedVersion: z.number().int().positive().optional(),
    attendanceIntent: RsvpAttendanceIntentSchema,
    answers: RsvpAnswersSchema.optional(),
    correction: z.boolean().optional(),
    withdraw: z.boolean().optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ReviewRsvpExceptionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    exceptionId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    decision: z.enum(["REVIEWED", "RESOLVED", "DISMISSED"]),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const AcknowledgeAssistanceInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    assistanceId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    status: z.enum(["ACKNOWLEDGED", "CLOSED"]),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const PrepareEventRsvpInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    hostDisplayName: NonEmptySchema.max(120).optional(),
    eventDisplayName: NonEmptySchema.max(160).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const GuestRsvpSaveInputSchema = z
  .object({
    expectedVersion: z.number().int().positive().optional(),
    answers: RsvpAnswersSchema,
    submit: z.boolean().optional(),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const GuestAssistanceInputSchema = z
  .object({
    note: NonEmptySchema.max(240),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RsvpDirectoryQuerySchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    query: z.string().trim().max(120).optional(),
    attendanceIntent: RsvpAttendanceIntentSchema.optional(),
    responseStatus: RsvpResponseStatusSchema.optional(),
    attentionRequired: z.boolean().optional(),
  })
  .strict();

export type RsvpAttendanceIntent = z.infer<typeof RsvpAttendanceIntentSchema>;
export type RsvpResponseStatus = z.infer<typeof RsvpResponseStatusSchema>;
export type RsvpResponseProvenance = z.infer<typeof RsvpResponseProvenanceSchema>;
export type RsvpPolicy = z.infer<typeof RsvpPolicySchema>;
export type RsvpQuestion = z.infer<typeof RsvpQuestionSchema>;
export type RsvpSection = z.infer<typeof RsvpSectionSchema>;
export type RsvpQuestionnaire = z.infer<typeof RsvpQuestionnaireSchema>;
export type RsvpInvitation = z.infer<typeof RsvpInvitationSchema>;
export type RsvpGuestSession = z.infer<typeof RsvpGuestSessionSchema>;
export type RsvpAnswers = z.infer<typeof RsvpAnswersSchema>;
export type RsvpResponse = z.infer<typeof RsvpResponseSchema>;
export type RsvpReceipt = z.infer<typeof RsvpReceiptSchema>;
export type RsvpEntitlement = z.infer<typeof RsvpEntitlementSchema>;
export type RsvpException = z.infer<typeof RsvpExceptionSchema>;
export type RsvpAssistanceRequest = z.infer<typeof RsvpAssistanceRequestSchema>;
export type RsvpKeyRing = z.infer<typeof RsvpKeyRingSchema>;
export type RsvpEventProjection = z.infer<typeof RsvpEventProjectionSchema>;
export type UpsertRsvpPolicyInput = z.infer<typeof UpsertRsvpPolicyInputSchema>;
export type PublishRsvpQuestionnaireInput = z.infer<typeof PublishRsvpQuestionnaireInputSchema>;
export type IssueRsvpInvitationInput = z.infer<typeof IssueRsvpInvitationInputSchema>;
export type StaffRsvpResponseInput = z.infer<typeof StaffRsvpResponseInputSchema>;
export type GuestRsvpSaveInput = z.infer<typeof GuestRsvpSaveInputSchema>;
export type RsvpDirectoryQuery = z.infer<typeof RsvpDirectoryQuerySchema>;
