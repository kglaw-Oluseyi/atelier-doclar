export {
  PLATFORM_PACKAGE,
  SHARED_PLATFORM_OWNERSHIP,
  FORBIDDEN_PARALLEL_TRUTH,
  PLATFORM_PERSISTENCE_CONTRACT,
  LOCAL_STORE_PRODUCTION_STATUS,
  PRODUCTION_STORE_STATUS,
  SCHEMA_VERSION,
  DEFAULT_TIMEZONE,
  SESSION_COOKIE,
  RSVP_SESSION_COOKIE,
  STAFF_SESSION_REVOCATION_REASONS,
  STAFF_SESSION_DENIAL_STATUSES,
  type StaffSessionDenialStatus,
  RSVP_ATTENDANCE_INTENTS,
  CORRELATION_HEADER,
  MEF_COMPOSITION_SLOTS,
  EVENT_PHASES,
  PERMISSION_KEYS,
  SYSTEM_ROLE_KEYS,
  CEO_RESERVED_ACTIONS,
  FIELD_QUALITY_STATES,
  GUEST_LIFECYCLE_STATES,
  IDENTITY_RESOLUTION_STATES,
  CANONICAL_INTAKE_MAPPING_VERSION,
  MSG_CHANNELS,
  MSG_PURPOSES,
  MSG_CAMPAIGN_STATUSES,
  MSG_MESSAGE_STATUSES,
  type StoreProductionStatus,
} from "./constants.js";
export { PlatformError, PLATFORM_ERROR_CODES, publicMessageFor, type PlatformErrorCode } from "./errors.js";
export {
  OrganisationSchema,
  ClientSchema,
  EventRecordSchema,
  PersonSchema,
  MembershipSchema,
  RoleSchema,
  PermissionSchema,
  AssignmentSchema,
  AuditEventSchema,
  MasterEventFileSchema,
  ConsentRecordSchema,
  GuestReferenceSchema,
  ScopeInputSchema,
  CreateClientInputSchema,
  CreateEventInputSchema,
  UpdateEventInputSchema,
  TransitionEventInputSchema,
  GrantAssignmentInputSchema,
  SignInInputSchema,
  AuthenticateStaffInputSchema,
  StaffSessionSchema,
  StaffSessionActorSchema,
  type Organisation,
  type Client,
  type EventRecord,
  type Person,
  type Membership,
  type Role,
  type Permission,
  type Assignment,
  type AuditEvent,
  type MasterEventFile,
  type ConsentRecord,
  type GuestReference,
  type PermissionKey,
  type EventPhase,
  type ScopeInput,
  type AuthenticateStaffInput,
  type StaffSession,
  type StaffSessionActor,
} from "./schemas.js";
export {
  OperationalGuestSchema,
  GuestHouseholdSchema,
  GuestDuplicateCandidateSchema,
  IntakeGuestInputSchema,
  AmendGuestInputSchema,
  GuestDirectoryQuerySchema,
  type OperationalGuest,
  type GuestHousehold,
  type GuestDuplicateCandidate,
  type GuestIntakeBatch,
  type QualifiedField,
  type FieldQuality,
} from "./guest-schemas.js";
export { operationalDisplayName, normalizeEmail, normalizePhone, findDuplicateMatches, fieldValue } from "./guest-matching.js";
export { parseCanonicalCsv, CANONICAL_CSV_COLUMNS } from "./guest-intake.js";
export { seededPermissions, seededRoles, permissionsForRole, roleIdForKey } from "./catalog.js";
export { authorize, assignmentIsActive, assignmentCoversScope, canSeeClient, canSeeEvent, singleCoveringRoleKey, type ActorSnapshot, type PolicyDecision } from "./policy.js";
export { allowedNextPhases, assertPhaseTransition } from "./transitions.js";
export { redactValue, stableHash } from "./redaction.js";
export {
  NonProductionIdentityAdapter,
  OidcCompatibleIdentityAdapter,
  assertNamedHuman,
  type IdentityAdapter,
} from "./identity.js";
export {
  issueSession,
  readSession,
  assertSessionConfig,
  hashStaffSessionToken,
  DEFAULT_NON_PRODUCTION_STAFF_SESSION,
  type SessionActor,
  type SessionConfig,
} from "./session.js";
export { FIXTURE_IDS, fixturePersons, isFixtureId } from "./fixtures.js";
export { emptyMasterEventFile } from "./mef.js";
export { emptySnapshot, normalizeSnapshot, type PlatformStore, type PlatformSnapshot } from "./store.js";
export { MemoryPlatformStore } from "./memory-store.js";
export { PLATFORM_POSTGRES_SCHEMA, type PgQueryable } from "./postgres-schema.js";
export { PostgresPlatformStore, MemoryPlatformPg } from "./postgres-store.js";
export {
  PlatformService,
  type ActorContext,
  type GuestSelfServiceView,
  type IssuedRsvpInvitation,
  type PlatformServiceOptions,
  type RsvpGuestDirectoryRow,
} from "./service.js";
export { loadNonProductionFixtures } from "./bootstrap.js";
export {
  DEFAULT_NON_PRODUCTION_RSVP_ACCESS,
  assertRsvpAccessConfig,
  readGuestSession,
  type RsvpAccessConfig,
  type GuestSessionActor,
} from "./rsvp-access.js";
export {
  RsvpPolicySchema,
  RsvpQuestionnaireSchema,
  RsvpInvitationSchema,
  RsvpResponseSchema,
  GuestRsvpSaveInputSchema,
  type RsvpPolicy,
  type RsvpQuestionnaire,
  type RsvpInvitation,
  type RsvpResponse,
  type RsvpReceipt,
  type RsvpEntitlement,
  type RsvpException,
  type RsvpAssistanceRequest,
  type RsvpAttendanceIntent,
} from "./rsvp-schemas.js";
export { canonicalQuestionnaireSections, guestVisibleName } from "./rsvp-operations.js";
export {
  ALLOWED_TEMPLATE_VARIABLES,
  presentationLabel,
  replyEligibilityPublicMessage,
  signSyntheticPayload,
  projectGuestSafeOccasion,
} from "./communications-operations.js";
export {
  PrepareCommunicationsInputSchema,
  PublishOccasionInputSchema,
  PublishChannelPolicyInputSchema,
  CreateCampaignInputSchema,
  type ChannelPolicy,
  type GuestSafeOccasion,
  type GuestSafeOccasionView,
  type Campaign,
  type MessageTemplate,
  type MessageTemplateVersion,
  type AudienceDefinition,
  type ConversationThread,
  type InboundMessage,
  type FollowUpTask,
  type ContactCorrection,
  type ContactCorrectionReview,
  type ContactCorrectionSourceEvidence,
  type CommsMessage,
  type MsgChannel,
  type MsgPurpose,
} from "./communications-schemas.js";
