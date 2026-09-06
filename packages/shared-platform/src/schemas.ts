import { z } from "zod";
import {
  ACTOR_TYPES,
  ASSIGNMENT_STATUSES,
  AUDIT_OUTCOMES,
  CLIENT_STATUSES,
  CONSENT_STATUSES,
  EVENT_PHASES,
  EVENT_STATUSES,
  MEF_COMPOSITION_SLOTS,
  MEF_SLOT_STATES,
  ORGANISATION_STATUSES,
  PERMISSION_KEYS,
  ROLE_EFFECTS,
  SCHEMA_VERSION,
  SYSTEM_ROLE_KEYS,
  USER_STATUSES,
  VERIFICATION_STATES,
} from "./constants.js";

export const UuidSchema = z.string().uuid();
export const IsoDatetimeSchema = z.string().datetime({
  message: "Timestamp must be an ISO-8601 datetime with timezone",
});
export const NonEmptySchema = z.string().trim().min(1);
export const SlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");
export const TimezoneSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "timezone must be a valid IANA identifier");

export const OrganisationIdSchema = UuidSchema;
export const ClientIdSchema = UuidSchema;
export const EventIdSchema = UuidSchema;
export const PersonIdSchema = UuidSchema;
export const RoleIdSchema = UuidSchema;
export const PermissionIdSchema = UuidSchema;
export const AssignmentIdSchema = UuidSchema;
export const AuditIdSchema = UuidSchema;
export const MasterEventFileIdSchema = UuidSchema;
export const ConsentIdSchema = UuidSchema;
export const GuestReferenceIdSchema = UuidSchema;
export const PolicyVersionIdSchema = UuidSchema;
export const MembershipIdSchema = UuidSchema;

export const PermissionKeySchema = z.enum(PERMISSION_KEYS);
export const SystemRoleKeySchema = z.enum(SYSTEM_ROLE_KEYS);
export const EventPhaseSchema = z.enum(EVENT_PHASES);
export const EventStatusSchema = z.enum(EVENT_STATUSES);

const scopedRecord = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

export const OrganisationSchema = z
  .object({
    id: OrganisationIdSchema,
    slug: SlugSchema,
    legalName: NonEmptySchema,
    displayName: NonEmptySchema,
    status: z.enum(ORGANISATION_STATUSES),
    defaultTimezone: TimezoneSchema,
    ...scopedRecord,
  })
  .strict();

export const ClientSchema = z
  .object({
    id: ClientIdSchema,
    organisationId: OrganisationIdSchema,
    code: NonEmptySchema.max(32),
    displayName: NonEmptySchema,
    legalName: NonEmptySchema.optional(),
    status: z.enum(CLIENT_STATUSES),
    retentionPolicyId: PolicyVersionIdSchema.optional(),
    ...scopedRecord,
  })
  .strict();

export const EventProgrammeSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    name: NonEmptySchema,
    status: z.enum(["ACTIVE", "ARCHIVED"]),
    startsAt: IsoDatetimeSchema.optional(),
    endsAt: IsoDatetimeSchema.optional(),
    ...scopedRecord,
  })
  .strict();

export const EventRecordSchema = z
  .object({
    id: EventIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    programmeId: UuidSchema.optional(),
    code: NonEmptySchema.max(32),
    name: NonEmptySchema,
    startsAt: IsoDatetimeSchema,
    endsAt: IsoDatetimeSchema,
    timezone: TimezoneSchema,
    venueSummary: z.string().max(240).optional(),
    phase: EventPhaseSchema,
    status: EventStatusSchema,
    archivedAt: IsoDatetimeSchema.optional(),
    masterEventFileId: MasterEventFileIdSchema,
    ...scopedRecord,
  })
  .strict();

export const EventPhaseHistorySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    fromPhase: EventPhaseSchema.optional(),
    toPhase: EventPhaseSchema,
    reason: NonEmptySchema,
    changedByPersonId: PersonIdSchema,
    changedAt: IsoDatetimeSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const PersonSchema = z
  .object({
    id: PersonIdSchema,
    externalSubject: NonEmptySchema,
    email: z.string().email(),
    displayName: NonEmptySchema,
    status: z.enum(USER_STATUSES),
    lastAuthenticatedAt: IsoDatetimeSchema.optional(),
    ...scopedRecord,
  })
  .strict();

export const MembershipSchema = z
  .object({
    id: MembershipIdSchema,
    organisationId: OrganisationIdSchema,
    personId: PersonIdSchema,
    status: z.enum(["ACTIVE", "SUSPENDED", "ENDED"]),
    ...scopedRecord,
  })
  .strict();

export const RoleSchema = z
  .object({
    id: RoleIdSchema,
    organisationId: OrganisationIdSchema.optional(),
    key: NonEmptySchema,
    name: NonEmptySchema,
    description: NonEmptySchema,
    systemRole: z.boolean(),
    organisationWide: z.boolean(),
    status: z.enum(["ACTIVE", "ARCHIVED"]),
    ...scopedRecord,
  })
  .strict();

export const PermissionSchema = z
  .object({
    id: PermissionIdSchema,
    key: PermissionKeySchema,
    resource: NonEmptySchema,
    action: NonEmptySchema,
    description: NonEmptySchema,
    sensitivity: z.enum(["NORMAL", "SENSITIVE", "RESERVED"]),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const RolePermissionSchema = z
  .object({
    roleId: RoleIdSchema,
    permissionId: PermissionIdSchema,
    effect: z.enum(ROLE_EFFECTS),
    createdAt: IsoDatetimeSchema,
  })
  .strict();

export const AssignmentSchema = z
  .object({
    id: AssignmentIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    personId: PersonIdSchema,
    roleId: RoleIdSchema,
    startsAt: IsoDatetimeSchema.optional(),
    endsAt: IsoDatetimeSchema.optional(),
    status: z.enum(ASSIGNMENT_STATUSES),
    grantedByPersonId: PersonIdSchema,
    reason: NonEmptySchema,
    ...scopedRecord,
  })
  .strict();

export const ApprovalPolicySchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    key: NonEmptySchema,
    action: NonEmptySchema,
    minimumRoleKey: SystemRoleKeySchema.optional(),
    reservedToCEO: z.boolean(),
    active: z.boolean(),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const AuditEventSchema = z
  .object({
    id: AuditIdSchema,
    occurredAt: IsoDatetimeSchema,
    actorType: z.enum(ACTOR_TYPES),
    actorPersonId: PersonIdSchema.optional(),
    service: NonEmptySchema,
    action: NonEmptySchema,
    outcome: z.enum(AUDIT_OUTCOMES),
    organisationId: OrganisationIdSchema.optional(),
    clientId: ClientIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    resourceType: NonEmptySchema,
    resourceId: NonEmptySchema.optional(),
    correlationId: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
    reason: z.string().optional(),
    beforeHash: z.string().optional(),
    afterHash: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const MefSlotSchema = z
  .object({
    key: z.enum(MEF_COMPOSITION_SLOTS),
    status: z.enum(MEF_SLOT_STATES),
    verificationState: z.enum(VERIFICATION_STATES),
    provenance: z
      .object({
        source: NonEmptySchema,
        recordedByPersonId: PersonIdSchema,
        recordedAt: IsoDatetimeSchema,
      })
      .strict()
      .optional(),
    authorityPersonId: PersonIdSchema.optional(),
    note: z.string().optional(),
  })
  .strict();

export const MasterEventFileSchema = z
  .object({
    id: MasterEventFileIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    slots: z.array(MefSlotSchema).length(MEF_COMPOSITION_SLOTS.length),
    ...scopedRecord,
  })
  .strict();

export const ConsentRecordSchema = z
  .object({
    id: ConsentIdSchema,
    organisationId: OrganisationIdSchema,
    personId: PersonIdSchema,
    eventId: EventIdSchema.optional(),
    purpose: NonEmptySchema,
    status: z.enum(CONSENT_STATUSES),
    policyVersionId: PolicyVersionIdSchema.optional(),
    recordedByPersonId: PersonIdSchema,
    recordedAt: IsoDatetimeSchema,
    withdrawnAt: IsoDatetimeSchema.optional(),
    ...scopedRecord,
  })
  .strict();

export const GuestReferenceSchema = z
  .object({
    id: GuestReferenceIdSchema,
    organisationId: OrganisationIdSchema,
    personId: PersonIdSchema,
    eventId: EventIdSchema.optional(),
    householdId: UuidSchema.optional(),
    invitationContext: z.string().optional(),
    status: z.literal("REFERENCE_ONLY"),
    ...scopedRecord,
  })
  .strict();

export const PolicyVersionRefSchema = z
  .object({
    id: PolicyVersionIdSchema,
    organisationId: OrganisationIdSchema,
    key: NonEmptySchema,
    version: NonEmptySchema,
    status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED"]),
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const ScopeInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema.optional(),
    eventId: EventIdSchema.optional(),
  })
  .strict();

export const CreateClientInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    code: NonEmptySchema.max(32),
    displayName: NonEmptySchema,
    legalName: NonEmptySchema.optional(),
    status: z.enum(CLIENT_STATUSES).default("PROSPECT"),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const UpdateClientInputSchema = z
  .object({
    clientId: ClientIdSchema,
    organisationId: OrganisationIdSchema,
    expectedVersion: z.number().int().positive(),
    displayName: NonEmptySchema.optional(),
    legalName: NonEmptySchema.optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    reason: NonEmptySchema.optional(),
  })
  .strict();

export const CreateEventInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    programmeId: UuidSchema.optional(),
    code: NonEmptySchema.max(32),
    name: NonEmptySchema,
    startsAt: IsoDatetimeSchema,
    endsAt: IsoDatetimeSchema,
    timezone: TimezoneSchema,
    venueSummary: z.string().max(240).optional(),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const UpdateEventInputSchema = z
  .object({
    eventId: EventIdSchema,
    organisationId: OrganisationIdSchema,
    expectedVersion: z.number().int().positive(),
    name: NonEmptySchema.optional(),
    startsAt: IsoDatetimeSchema.optional(),
    endsAt: IsoDatetimeSchema.optional(),
    timezone: TimezoneSchema.optional(),
    venueSummary: z.string().max(240).optional(),
    reason: NonEmptySchema.optional(),
  })
  .strict();

export const TransitionEventInputSchema = z
  .object({
    eventId: EventIdSchema,
    organisationId: OrganisationIdSchema,
    expectedVersion: z.number().int().positive(),
    toPhase: EventPhaseSchema,
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const GrantAssignmentInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema.optional(),
    eventId: EventIdSchema.optional(),
    personId: PersonIdSchema,
    roleKey: SystemRoleKeySchema,
    reason: NonEmptySchema,
    startsAt: IsoDatetimeSchema.optional(),
    endsAt: IsoDatetimeSchema.optional(),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RevokeAssignmentInputSchema = z
  .object({
    assignmentId: AssignmentIdSchema,
    organisationId: OrganisationIdSchema,
    expectedVersion: z.number().int().positive(),
    reason: NonEmptySchema,
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const UpdateMefSlotInputSchema = z
  .object({
    masterEventFileId: MasterEventFileIdSchema,
    organisationId: OrganisationIdSchema,
    expectedVersion: z.number().int().positive(),
    slot: z.enum(MEF_COMPOSITION_SLOTS),
    status: z.enum(["DRAFT", "CONFLICTED"]),
    note: z.string().optional(),
    reason: NonEmptySchema,
  })
  .strict();

export const RecordConsentInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    personId: PersonIdSchema,
    eventId: EventIdSchema.optional(),
    purpose: NonEmptySchema,
    policyVersionId: PolicyVersionIdSchema.optional(),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const RegisterGuestReferenceInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    personId: PersonIdSchema,
    eventId: EventIdSchema.optional(),
    householdId: UuidSchema.optional(),
    invitationContext: z.string().optional(),
    idempotencyKey: NonEmptySchema.optional(),
  })
  .strict();

export const SignInInputSchema = z
  .object({
    externalSubject: NonEmptySchema.optional(),
    email: z.string().email().optional(),
    accessToken: NonEmptySchema,
  })
  .strict()
  .refine((value) => Boolean(value.externalSubject || value.email), {
    message: "externalSubject or email is required",
  });

export type Organisation = z.infer<typeof OrganisationSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type EventProgramme = z.infer<typeof EventProgrammeSchema>;
export type EventRecord = z.infer<typeof EventRecordSchema>;
export type EventPhaseHistory = z.infer<typeof EventPhaseHistorySchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type RolePermission = z.infer<typeof RolePermissionSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type ApprovalPolicy = z.infer<typeof ApprovalPolicySchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type MasterEventFile = z.infer<typeof MasterEventFileSchema>;
export type MefSlot = z.infer<typeof MefSlotSchema>;
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export type GuestReference = z.infer<typeof GuestReferenceSchema>;
export type PolicyVersionRef = z.infer<typeof PolicyVersionRefSchema>;
export type ScopeInput = z.infer<typeof ScopeInputSchema>;
export type PermissionKey = z.infer<typeof PermissionKeySchema>;
export type SystemRoleKey = z.infer<typeof SystemRoleKeySchema>;
export type EventPhase = z.infer<typeof EventPhaseSchema>;
export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientInputSchema>;
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;
export type TransitionEventInput = z.infer<typeof TransitionEventInputSchema>;
export type GrantAssignmentInput = z.infer<typeof GrantAssignmentInputSchema>;
export type RevokeAssignmentInput = z.infer<typeof RevokeAssignmentInputSchema>;
export type UpdateMefSlotInput = z.infer<typeof UpdateMefSlotInputSchema>;
export type RecordConsentInput = z.infer<typeof RecordConsentInputSchema>;
export type RegisterGuestReferenceInput = z.infer<typeof RegisterGuestReferenceInputSchema>;
