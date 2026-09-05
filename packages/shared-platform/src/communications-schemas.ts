import { z } from "zod";
import {
  FIELD_QUALITY_STATES,
  MSG_AUDIENCE_PREDICATES,
  MSG_CAMPAIGN_STATUSES,
  MSG_CHANNELS,
  MSG_CORRECTION_STATUSES,
  MSG_DIRECTIONS,
  MSG_ELIGIBILITY,
  MSG_INBOUND_MATCH,
  MSG_MESSAGE_STATUSES,
  MSG_OCCASION_STATUSES,
  MSG_PURPOSES,
  MSG_RETRY_CLASSES,
  MSG_TASK_STATUSES,
  MSG_TEMPLATE_STATUSES,
  MSG_THREAD_STATUSES,
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

const scoped = {
  organisationId: OrganisationIdSchema,
  clientId: ClientIdSchema,
  eventId: EventIdSchema,
};

export const MsgChannelSchema = z.enum(MSG_CHANNELS);
export const MsgPurposeSchema = z.enum(MSG_PURPOSES);

export const OccasionFieldSchema = z
  .object({
    value: NonEmptySchema.max(240),
    quality: z.enum(FIELD_QUALITY_STATES),
  })
  .strict();

export const GuestSafeOccasionSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    status: z.enum(MSG_OCCASION_STATUSES),
    eventName: OccasionFieldSchema.optional(),
    when: OccasionFieldSchema.optional(),
    timezone: OccasionFieldSchema.optional(),
    venue: OccasionFieldSchema.optional(),
    arrival: OccasionFieldSchema.optional(),
    dress: OccasionFieldSchema.optional(),
    context: OccasionFieldSchema.optional(),
    publishedAt: IsoDatetimeSchema.optional(),
    publishedByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const ChannelPolicySchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    status: z.enum(["DRAFT", "PUBLISHED"]),
    enabledChannels: z.array(MsgChannelSchema).min(1),
    allowedPurposes: z.array(MsgPurposeSchema).min(1),
    fallbackOrder: z.array(MsgChannelSchema),
    timezone: NonEmptySchema.max(64),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
    frequencyCapPerDay: z.number().int().min(1).max(24),
    acknowledgementMinutes: z.number().int().positive().optional(),
    resolutionMinutes: z.number().int().positive().optional(),
    escalationOwnerPersonId: PersonIdSchema.optional(),
    sandboxDispatchEnabled: z.boolean(),
    publishedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const ContactProjectionSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    guestId: UuidSchema,
    channel: MsgChannelSchema,
    displayValue: NonEmptySchema.max(180),
    normalizedValue: NonEmptySchema.max(180),
    preferred: z.boolean(),
    quality: z.enum(FIELD_QUALITY_STATES),
    valid: z.boolean(),
    source: z.enum(["INTAKE_FIELD", "CORRECTION"]),
    lastConfirmedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const SuppressionEntrySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    guestId: UuidSchema.optional(),
    channel: MsgChannelSchema.optional(),
    purpose: MsgPurposeSchema.optional(),
    reason: NonEmptySchema.max(240),
    source: z.enum(["STAFF", "GUEST_OPT_OUT", "POLICY"]),
    effectiveAt: IsoDatetimeSchema,
    expiresAt: IsoDatetimeSchema.optional(),
    releasedAt: IsoDatetimeSchema.optional(),
    releasedByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const MessageTemplateSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    clientId: ClientIdSchema.optional(),
    key: NonEmptySchema.max(64),
    purpose: MsgPurposeSchema,
    channel: MsgChannelSchema,
    status: z.enum(MSG_TEMPLATE_STATUSES),
    activeVersionId: UuidSchema.optional(),
    ...versioned,
  })
  .strict();

export const MessageTemplateVersionSchema = z
  .object({
    id: UuidSchema,
    templateId: UuidSchema,
    organisationId: OrganisationIdSchema,
    versionNumber: z.number().int().positive(),
    locale: NonEmptySchema.max(16),
    subject: z.string().max(180).optional(),
    body: NonEmptySchema.max(4000),
    requiredVariables: z.array(NonEmptySchema.max(64)),
    contentHash: NonEmptySchema.max(128),
    status: z.enum(MSG_TEMPLATE_STATUSES),
    approvedByPersonId: PersonIdSchema.optional(),
    approvedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const AudienceFilterSchema = z
  .object({
    predicate: z.enum(MSG_AUDIENCE_PREDICATES),
    value: NonEmptySchema.max(64),
  })
  .strict();

export const AudienceDefinitionSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    name: NonEmptySchema.max(120),
    filters: z.array(AudienceFilterSchema).max(12),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    ...versioned,
  })
  .strict();

export const AudienceMemberSchema = z
  .object({
    guestId: UuidSchema,
    channel: MsgChannelSchema,
    eligibility: z.enum(MSG_ELIGIBILITY),
    exclusionCodes: z.array(NonEmptySchema.max(64)),
    contactProjectionId: UuidSchema.optional(),
  })
  .strict();

export const AudienceSnapshotSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    definitionId: UuidSchema,
    definitionHash: NonEmptySchema.max(128),
    memberCount: z.number().int().nonnegative(),
    excludedCount: z.number().int().nonnegative(),
    members: z.array(AudienceMemberSchema),
    ...versioned,
  })
  .strict();

export const CampaignSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    name: NonEmptySchema.max(160),
    purpose: MsgPurposeSchema,
    channel: MsgChannelSchema,
    status: z.enum(MSG_CAMPAIGN_STATUSES),
    templateId: UuidSchema,
    templateVersionId: UuidSchema,
    audienceDefinitionId: UuidSchema,
    audienceSnapshotId: UuidSchema.optional(),
    scheduledAt: IsoDatetimeSchema.optional(),
    linkedInvitationId: UuidSchema.optional(),
    testOnly: z.boolean(),
    createdByPersonId: PersonIdSchema.optional(),
    ...versioned,
  })
  .strict();

export const CampaignApprovalSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    campaignId: UuidSchema,
    campaignVersion: z.number().int().positive(),
    snapshotId: UuidSchema,
    contentHash: NonEmptySchema.max(128),
    audienceHash: NonEmptySchema.max(128),
    decision: z.enum(["APPROVED", "REJECTED"]),
    decidedByPersonId: PersonIdSchema,
    decidedAt: IsoDatetimeSchema,
    comment: z.string().max(240).optional(),
    invalidatedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const CommsMessageSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    guestId: UuidSchema.optional(),
    campaignId: UuidSchema.optional(),
    threadId: UuidSchema.optional(),
    purpose: MsgPurposeSchema,
    channel: MsgChannelSchema,
    direction: z.enum(MSG_DIRECTIONS),
    status: z.enum(MSG_MESSAGE_STATUSES),
    idempotencyKey: NonEmptySchema.max(180),
    contentSnapshotId: UuidSchema.optional(),
    contactProjectionId: UuidSchema.optional(),
    testWatermark: z.boolean(),
    blockedReason: z.string().max(180).optional(),
    ...versioned,
  })
  .strict();

export const MessageContentSnapshotSchema = z
  .object({
    id: UuidSchema,
    messageId: UuidSchema,
    templateVersionId: UuidSchema.optional(),
    subject: z.string().max(180).optional(),
    body: NonEmptySchema.max(4000),
    variablesHash: NonEmptySchema.max(128),
    contentHash: NonEmptySchema.max(128),
    createdAt: IsoDatetimeSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const MessageAttemptSchema = z
  .object({
    id: UuidSchema,
    messageId: UuidSchema,
    attemptNo: z.number().int().positive(),
    status: z.enum(["SUBMITTED", "ACCEPTED", "FAILED"]),
    retryClass: z.enum(MSG_RETRY_CLASSES).optional(),
    providerRequestKey: NonEmptySchema.max(180),
    providerRef: z.string().max(180).optional(),
    submittedAt: IsoDatetimeSchema,
    responseCode: z.string().max(40).optional(),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const DeliveryEventSchema = z
  .object({
    id: UuidSchema,
    messageAttemptId: UuidSchema,
    type: z.enum(["SUBMITTED", "ACCEPTED", "DELIVERED", "TEMPORARY_FAILURE", "PERMANENT_FAILURE"]),
    occurredAt: IsoDatetimeSchema,
    receivedAt: IsoDatetimeSchema,
    providerEventId: NonEmptySchema.max(180),
    payloadHash: NonEmptySchema.max(128),
    authenticated: z.boolean(),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const CommsOutboxSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    campaignId: UuidSchema.optional(),
    messageId: UuidSchema,
    status: z.enum(["PENDING", "LEASED", "DONE", "FAILED"]),
    leaseExpiresAt: IsoDatetimeSchema.optional(),
    nextAttemptAt: IsoDatetimeSchema,
    ...versioned,
  })
  .strict();

export const ConversationThreadSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    guestId: UuidSchema.optional(),
    channel: MsgChannelSchema,
    status: z.enum(MSG_THREAD_STATUSES),
    ownerPersonId: PersonIdSchema.optional(),
    lastMessageAt: IsoDatetimeSchema,
    slaDueAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const InboundMessageSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    clientId: ClientIdSchema.optional(),
    threadId: UuidSchema.optional(),
    guestId: UuidSchema.optional(),
    channel: MsgChannelSchema,
    providerMessageId: NonEmptySchema.max(180),
    senderNormalized: NonEmptySchema.max(180),
    body: NonEmptySchema.max(4000),
    receivedAt: IsoDatetimeSchema,
    matchStatus: z.enum(MSG_INBOUND_MATCH),
    matchConfidence: z.enum(["HIGH", "LOW", "NONE"]),
    attachmentFileName: z.string().max(180).optional(),
    attachmentQuarantined: z.boolean().optional(),
    ...versioned,
  })
  .strict();

export const FollowUpTaskSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    threadId: UuidSchema,
    inboundMessageId: UuidSchema.optional(),
    category: z.enum(["ENQUIRY", "SERVICE_RECOVERY", "UNMATCHED", "ASSISTANCE"]),
    status: z.enum(MSG_TASK_STATUSES),
    ownerPersonId: PersonIdSchema.optional(),
    dueAt: IsoDatetimeSchema.optional(),
    escalationLevel: z.number().int().min(0).max(3),
    resolution: z.string().max(240).optional(),
    privateNote: z.string().max(240).optional(),
    ...versioned,
  })
  .strict();

export const ContactCorrectionSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    guestId: UuidSchema,
    channel: MsgChannelSchema,
    existingValue: z.string().max(180).optional(),
    proposedValue: NonEmptySchema.max(180),
    status: z.enum(MSG_CORRECTION_STATUSES),
    sourceMessageId: UuidSchema.optional(),
    reason: NonEmptySchema.max(240),
    decidedByPersonId: PersonIdSchema.optional(),
    decidedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const CommsNotificationSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    kind: z.enum(["APPROVAL", "FAILURE", "UNMATCHED", "SLA", "CORRECTION", "INTELLIGENCE"]),
    title: NonEmptySchema.max(160),
    body: NonEmptySchema.max(240),
    href: NonEmptySchema.max(240),
    readAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const CommsIntelligenceAlertSchema = z
  .object({
    id: UuidSchema,
    ...scoped,
    ruleId: NonEmptySchema.max(64),
    ruleVersion: NonEmptySchema.max(16),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    summary: NonEmptySchema.max(240),
    evidence: NonEmptySchema.max(400),
    recommendedAction: NonEmptySchema.max(240),
    status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
    ...versioned,
  })
  .strict();

export const GuestSafeOccasionViewSchema = z
  .object({
    eventName: z.string().optional(),
    when: z.string().optional(),
    timezone: z.string().optional(),
    venue: z.string().optional(),
    arrival: z.string().optional(),
    dress: z.string().optional(),
    context: z.string().optional(),
    published: z.boolean(),
  })
  .strict();

export const PrepareCommunicationsInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const PublishOccasionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    expectedVersion: z.number().int().positive(),
    verifyWhen: z.boolean().optional(),
    verifyVenue: z.boolean().optional(),
    arrival: z.string().trim().max(240).optional(),
    dress: z.string().trim().max(240).optional(),
    context: z.string().trim().max(240).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const PublishChannelPolicyInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    expectedVersion: z.number().int().positive(),
    enabledChannels: z.array(MsgChannelSchema).min(1).optional(),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    frequencyCapPerDay: z.number().int().min(1).max(24).optional(),
    acknowledgementMinutes: z.number().int().positive().optional(),
    resolutionMinutes: z.number().int().positive().optional(),
    sandboxDispatchEnabled: z.boolean().optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const SuppressContactInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema.optional(),
    channel: MsgChannelSchema.optional(),
    purpose: MsgPurposeSchema.optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const CreateTemplateVersionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    templateId: UuidSchema,
    subject: z.string().max(180).optional(),
    body: NonEmptySchema.max(4000),
    requiredVariables: z.array(NonEmptySchema.max(64)).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ApproveTemplateInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    templateVersionId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const UpsertAudienceInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    audienceId: UuidSchema.optional(),
    expectedVersion: z.number().int().positive().optional(),
    name: NonEmptySchema.max(120),
    filters: z.array(AudienceFilterSchema).max(12),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const CreateCampaignInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    name: NonEmptySchema.max(160),
    purpose: MsgPurposeSchema,
    channel: MsgChannelSchema,
    templateId: UuidSchema,
    audienceDefinitionId: UuidSchema,
    scheduledAt: IsoDatetimeSchema.optional(),
    linkedInvitationId: UuidSchema.optional(),
    testOnly: z.boolean().optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RequestCampaignApprovalInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    campaignId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const CampaignActionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    campaignId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    action: z.enum(["SCHEDULE", "RUN", "PAUSE", "CANCEL", "TEST_SEND", "DISPATCH"]),
    scheduledAt: IsoDatetimeSchema.optional(),
    failMode: z.enum(["TRANSIENT", "PERMANENT"]).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const PreviewAudienceInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    audienceId: UuidSchema,
    channel: MsgChannelSchema,
    purpose: MsgPurposeSchema,
  })
  .strict();

export const CampaignDecisionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    campaignId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    comment: z.string().max(240).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const SyntheticCallbackInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    providerEventId: NonEmptySchema.max(180),
    providerRequestKey: NonEmptySchema.max(180),
    type: z.enum(["ACCEPTED", "DELIVERED", "TEMPORARY_FAILURE", "PERMANENT_FAILURE"]),
    signature: NonEmptySchema.max(180),
    occurredAt: IsoDatetimeSchema.optional(),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const IngestInboundInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    channel: MsgChannelSchema,
    providerMessageId: NonEmptySchema.max(180),
    sender: NonEmptySchema.max(180),
    body: NonEmptySchema.max(4000),
    attachmentFileName: z.string().max(180).optional(),
    signature: NonEmptySchema.max(180),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ResolveUnmatchedInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    inboundId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    guestId: UuidSchema.optional(),
    action: z.enum(["LINK", "DISMISS", "ESCALATE"]),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ConciergeReplyInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    threadId: UuidSchema,
    body: NonEmptySchema.max(4000),
    privateNote: z.string().max(240).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const TaskActionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    taskId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    action: z.enum(["ACKNOWLEDGE", "ASSIGN", "ESCALATE", "RESOLVE"]),
    ownerPersonId: PersonIdSchema.optional(),
    resolution: z.string().max(240).optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const ProposeCorrectionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    guestId: UuidSchema,
    channel: MsgChannelSchema,
    proposedValue: NonEmptySchema.max(180),
    sourceMessageId: UuidSchema.optional(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const DecideCorrectionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    correctionId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export type GuestSafeOccasion = z.infer<typeof GuestSafeOccasionSchema>;
export type ChannelPolicy = z.infer<typeof ChannelPolicySchema>;
export type ContactProjection = z.infer<typeof ContactProjectionSchema>;
export type SuppressionEntry = z.infer<typeof SuppressionEntrySchema>;
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;
export type MessageTemplateVersion = z.infer<typeof MessageTemplateVersionSchema>;
export type AudienceDefinition = z.infer<typeof AudienceDefinitionSchema>;
export type AudienceSnapshot = z.infer<typeof AudienceSnapshotSchema>;
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>;
export type AudienceMember = z.infer<typeof AudienceMemberSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type CampaignApproval = z.infer<typeof CampaignApprovalSchema>;
export type CommsMessage = z.infer<typeof CommsMessageSchema>;
export type MessageContentSnapshot = z.infer<typeof MessageContentSnapshotSchema>;
export type MessageAttempt = z.infer<typeof MessageAttemptSchema>;
export type DeliveryEvent = z.infer<typeof DeliveryEventSchema>;
export type CommsOutbox = z.infer<typeof CommsOutboxSchema>;
export type ConversationThread = z.infer<typeof ConversationThreadSchema>;
export type InboundMessage = z.infer<typeof InboundMessageSchema>;
export type FollowUpTask = z.infer<typeof FollowUpTaskSchema>;
export type ContactCorrection = z.infer<typeof ContactCorrectionSchema>;
export type CommsNotification = z.infer<typeof CommsNotificationSchema>;
export type CommsIntelligenceAlert = z.infer<typeof CommsIntelligenceAlertSchema>;
export type GuestSafeOccasionView = z.infer<typeof GuestSafeOccasionViewSchema>;
export type MsgChannel = z.infer<typeof MsgChannelSchema>;
export type MsgPurpose = z.infer<typeof MsgPurposeSchema>;
