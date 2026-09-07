export const PLATFORM_PACKAGE = "@maison-doclar/shared-platform" as const;
/**
 * Repository generation number. EOS-S04A is a backward-compatible additive
 * extension: missing S04A collections normalise to empty arrays. This value
 * stays 1 because existing guest, event and RSVP records remain readable
 * without a generation change.
 */
export const SCHEMA_VERSION = 1 as const;
export const LOCAL_STORE_PRODUCTION_STATUS = "NON_PRODUCTION" as const;
export const PRODUCTION_STORE_STATUS = "PRODUCTION" as const;
export type StoreProductionStatus =
  | typeof LOCAL_STORE_PRODUCTION_STATUS
  | typeof PRODUCTION_STORE_STATUS;

export const SHARED_PLATFORM_OWNERSHIP = {
  organisation: PLATFORM_PACKAGE,
  client: PLATFORM_PACKAGE,
  event: PLATFORM_PACKAGE,
  person: PLATFORM_PACKAGE,
  membership: PLATFORM_PACKAGE,
  role: PLATFORM_PACKAGE,
  permission: PLATFORM_PACKAGE,
  assignment: PLATFORM_PACKAGE,
  approvalAuthority: PLATFORM_PACKAGE,
  guestReference: PLATFORM_PACKAGE,
  operationalGuest: PLATFORM_PACKAGE,
  guestHousehold: PLATFORM_PACKAGE,
  guestParty: PLATFORM_PACKAGE,
  guestPartyMember: PLATFORM_PACKAGE,
  guestRelationship: PLATFORM_PACKAGE,
  companionEntitlement: PLATFORM_PACKAGE,
  companionNomination: PLATFORM_PACKAGE,
  responsibleAdultLink: PLATFORM_PACKAGE,
  eventSeries: PLATFORM_PACKAGE,
  eventSeriesMember: PLATFORM_PACKAGE,
  addressingReconciliation: PLATFORM_PACKAGE,
  guestDuplicateCandidate: PLATFORM_PACKAGE,
  guestIntakeBatch: PLATFORM_PACKAGE,
  rsvpPolicy: PLATFORM_PACKAGE,
  rsvpQuestionnaire: PLATFORM_PACKAGE,
  rsvpInvitation: PLATFORM_PACKAGE,
  rsvpGuestSession: PLATFORM_PACKAGE,
  staffSession: PLATFORM_PACKAGE,
  rsvpResponse: PLATFORM_PACKAGE,
  rsvpReceipt: PLATFORM_PACKAGE,
  rsvpEntitlement: PLATFORM_PACKAGE,
  rsvpException: PLATFORM_PACKAGE,
  rsvpAssistanceRequest: PLATFORM_PACKAGE,
  rsvpKeyRing: PLATFORM_PACKAGE,
  rsvpEventProjection: PLATFORM_PACKAGE,
  channelPolicy: PLATFORM_PACKAGE,
  guestSafeOccasion: PLATFORM_PACKAGE,
  contactProjection: PLATFORM_PACKAGE,
  suppressionEntry: PLATFORM_PACKAGE,
  messageTemplate: PLATFORM_PACKAGE,
  messageTemplateVersion: PLATFORM_PACKAGE,
  audienceDefinition: PLATFORM_PACKAGE,
  audienceSnapshot: PLATFORM_PACKAGE,
  campaign: PLATFORM_PACKAGE,
  campaignApproval: PLATFORM_PACKAGE,
  commsMessage: PLATFORM_PACKAGE,
  messageContentSnapshot: PLATFORM_PACKAGE,
  messageAttempt: PLATFORM_PACKAGE,
  deliveryEvent: PLATFORM_PACKAGE,
  commsOutbox: PLATFORM_PACKAGE,
  conversationThread: PLATFORM_PACKAGE,
  inboundMessage: PLATFORM_PACKAGE,
  followUpTask: PLATFORM_PACKAGE,
  contactCorrection: PLATFORM_PACKAGE,
  commsNotification: PLATFORM_PACKAGE,
  commsIntelligenceAlert: PLATFORM_PACKAGE,
  consent: PLATFORM_PACKAGE,
  policyVersion: PLATFORM_PACKAGE,
  audit: PLATFORM_PACKAGE,
  masterEventFile: PLATFORM_PACKAGE,
  identifiers: PLATFORM_PACKAGE,
  programmeDay: PLATFORM_PACKAGE,
  programmePhase: PLATFORM_PACKAGE,
  phaseEntitlement: PLATFORM_PACKAGE,
  arrivalRoute: PLATFORM_PACKAGE,
  perimeterCheckpoint: PLATFORM_PACKAGE,
  accessZone: PLATFORM_PACKAGE,
  credentialProjection: PLATFORM_PACKAGE,
  operationalVehicle: PLATFORM_PACKAGE,
  vehicleAssociation: PLATFORM_PACKAGE,
  offlineAccessPackage: PLATFORM_PACKAGE,
  accessException: PLATFORM_PACKAGE,
} as const;

/** Parallel product-owned truth stores are forbidden. Product projections may exist. */
export const FORBIDDEN_PARALLEL_TRUTH = [
  "EventOSUser",
  "EventDayUser",
  "EventOsOrganisation",
  "EventDayOrganisation",
  "EventOsEventId",
  "EventDayEventId",
  "AcademyPerson",
  "MarketingPerson",
  "UsheringPerson",
  "EventOSGuest",
  "GuestUser",
  "GuestPerson",
  "EventGuestIdentity",
  "GuestEvent",
  "GuestOrganisation",
  "GuestAccount",
  "RsvpUser",
  "GuestStaffSession",
  "EventGuest",
  "EventOSGuest",
  "CommunicationsGuest",
  "ConciergeGuest",
  "S04BAttendanceLedger",
  "EventDayAttendanceWriter",
  "CheckpointScanner",
  "OfflineAdmissionOutbox",
  "ParallelGuestCredential",
] as const;

export const DEFAULT_TIMEZONE = "Africa/Lagos";

export const ORGANISATION_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"] as const;
export const EVENT_STATUSES = ["DRAFT", "ACTIVE", "CANCELLED", "COMPLETED", "ARCHIVED"] as const;
export const EVENT_PHASES = ["DISCOVER", "DESIGN", "PREPARE", "READY", "LIVE", "CLOSE", "LEARN"] as const;
export const USER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
export const STAFF_SESSION_REVOCATION_REASONS = ["LOGOUT", "SUPERSEDED", "ADMIN"] as const;
export const STAFF_SESSION_DENIAL_STATUSES = [
  "missing",
  "expired",
  "revoked",
  "malformed",
  "legacy",
  "inactive",
] as const;
export type StaffSessionDenialStatus = (typeof STAFF_SESSION_DENIAL_STATUSES)[number];
export const ASSIGNMENT_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"] as const;
export const AUDIT_OUTCOMES = ["SUCCESS", "DENIED", "FAILED"] as const;
export const ACTOR_TYPES = ["USER", "SERVICE", "SYSTEM", "GUEST_CAPABILITY"] as const;
export const ROLE_EFFECTS = ["ALLOW", "DENY"] as const;
export const CONSENT_STATUSES = ["RECORDED", "WITHDRAWN", "EXPIRED"] as const;
export const VERIFICATION_STATES = ["UNVERIFIED", "HUMAN_VERIFIED", "SPECIALIST_REQUIRED"] as const;
export const MEF_SLOT_STATES = ["NOT_COMPOSED", "DRAFT", "VERIFIED", "CONFLICTED"] as const;

/**
 * CEO-ratified doctrine lifecycle. This is Master Event File composition, not the
 * Slice 1 operational EventPhase. They are not collapsed into each other.
 */
export const MEF_COMPOSITION_SLOTS = [
  "CLIENT",
  "DISCOVERY",
  "EVENT_INTELLIGENCE",
  "EVENT_ARCHITECTURE",
  "GUEST_INTELLIGENCE",
  "PROTOCOL_CULTURAL_INTELLIGENCE",
  "VENDOR_RESOURCE_ARCHITECTURE",
  "PRODUCTION_LOGISTICS",
  "COMMAND_CONTROL",
  "LIVE_EVENT",
  "GUEST_DEPARTURE",
  "FOLLOW_UP",
  "POST_EVENT_INTELLIGENCE",
  "KNOWLEDGE",
] as const;

export const PERMISSION_KEYS = [
  "organisation.view",
  "organisation.manage",
  "client.list",
  "client.view",
  "client.create",
  "client.update",
  "client.archive",
  "event.list",
  "event.view",
  "event.create",
  "event.update",
  "event.phase.transition",
  "event.archive",
  "assignment.view",
  "assignment.manage",
  "role.view",
  "role.manage",
  "audit.view",
  "audit.export",
  "system.health.view",
  "support.impersonate",
  "mef.view",
  "mef.update",
  "consent.view",
  "consent.record",
  "guest.reference.view",
  "guest.reference.register",
  "guest.directory.view",
  "guest.intake.create",
  "guest.record.amend",
  "guest.duplicate.resolve",
  "guest.person.link",
  "guest.addressing.view",
  "guest.addressing.manage",
  "guest.addressing.confirm",
  "guest.relationship.view",
  "guest.relationship.manage",
  "guest.entitlement.view",
  "guest.entitlement.manage",
  "guest.entitlement.exception.review",
  "guest.child.view",
  "guest.child.manage",
  "guest.protocolNote.view",
  "rsvp.policy.manage",
  "rsvp.form.manage",
  "rsvp.invitation.manage",
  "rsvp.directory.view",
  "rsvp.response.amend",
  "rsvp.exception.review",
  "rsvp.entitlement.manage",
  "msg.policy.manage",
  "msg.template.manage",
  "msg.template.publish",
  "msg.audience.manage",
  "msg.campaign.manage",
  "msg.campaign.approve",
  "msg.campaign.run",
  "msg.inbox.view",
  "msg.inbox.respond",
  "msg.inbox.assign",
  "msg.inbound.unmatched.resolve",
  "msg.task.manage",
  "msg.contactCorrection.review",
  "msg.analytics.view",
  "programme.view",
  "programme.phase.manage",
  "programme.route.manage",
  "programme.checkpoint.manage",
  "programme.entitlement.manage",
  "programme.protectedAccess.grant",
  "programme.vehicle.manage",
  "programme.accessPlan.publish",
  "programme.exception.review",
] as const;

export const SYSTEM_ROLE_KEYS = [
  "CEO",
  "EVENT_DIRECTOR",
  "CLIENT_LEAD",
  "DEPARTMENT_LEAD",
  "PLANNER",
  "SYSTEM_ADMINISTRATOR",
  "READ_ONLY_AUDITOR",
] as const;

export const BUSINESS_PERMISSIONS: readonly string[] = [
  "organisation.manage",
  "client.create",
  "client.update",
  "client.archive",
  "event.create",
  "event.update",
  "event.phase.transition",
  "event.archive",
  "mef.update",
];

export const FIELD_QUALITY_STATES = [
  "MISSING",
  "NOT_SUPPLIED",
  "NOT_APPLICABLE",
  "UNVERIFIED",
  "PENDING_VERIFICATION",
  "CONFLICTING",
  "VERIFIED",
] as const;

export const GUEST_LIFECYCLE_STATES = ["ACTIVE", "WITHDRAWN", "ARCHIVED"] as const;
export const IDENTITY_RESOLUTION_STATES = [
  "UNRESOLVED",
  "LINKED",
  "DUPLICATE_RISK",
  "CONFLICTING",
  "KEEP_SEPARATE",
] as const;
export const GUEST_INTAKE_SOURCES = ["MANUAL_STAFF", "CSV_IMPORT"] as const;
export const DUPLICATE_MATCH_KINDS = ["EXACT_EMAIL", "EXACT_PHONE", "FUZZY_NAME", "PERSON_EMAIL"] as const;
export const DUPLICATE_DECISIONS = ["KEEP_SEPARATE", "DISMISS", "LINK_PERSON"] as const;
export const INTAKE_BATCH_STATUSES = ["RECEIVED", "VALIDATED", "PROMOTED", "FAILED"] as const;
export const INTAKE_ROW_STATUSES = ["RAW", "INVALID", "PROMOTED", "SKIPPED"] as const;
export const CANONICAL_INTAKE_MAPPING_VERSION = "canonical-v1" as const;

export const HONORIFICS = [
  "Mr",
  "Mrs",
  "Ms",
  "Mx",
  "Dr",
  "Dr (Mrs)",
  "Dr (Mr)",
  "Dr (Ms)",
  "Professor",
  "Rev",
  "Pastor",
  "Chief",
  "Alhaji",
  "Alhaja",
  "Engr",
  "Barrister",
  "Hon",
  "HRH",
  "Sir",
  "Dame",
] as const;
export const ADDRESSING_STATUSES = [
  "UNVERIFIED",
  "GUEST_CONFIRMED",
  "HOST_CONFIRMED",
  "PROTOCOL_CONFIRMED",
] as const;
export const ADDRESSING_SOURCES = [
  "GUEST",
  "HOST",
  "AUTHORISED_IMPORT",
  "PROTOCOL_TEAM",
  "STAFF",
] as const;
export const AGE_BANDS = [
  "INFANT",
  "EARLY_CHILDHOOD",
  "CHILD",
  "PRE_TEEN",
  "TEEN",
  "ADULT",
  "UNKNOWN",
] as const;
export const CHILD_AGE_BANDS = ["INFANT", "EARLY_CHILDHOOD", "CHILD", "PRE_TEEN", "TEEN"] as const;
export const CHILD_READINESS_STATES = [
  "DRAFT",
  "BLOCKED_MISSING_RESPONSIBLE_ADULT",
  "READY_FOR_EVENT",
] as const;
export const PARTY_TYPES = [
  "HOUSEHOLD",
  "INVITATION_PARTY",
  "ARRIVAL_PARTY",
  "PROTOCOL_PARTY",
  "PROTECTION_PARTY",
  "CARE_PARTY",
  "FAMILY_UNIT",
] as const;
export const PARTY_STATUSES = ["ACTIVE", "SUSPENDED", "CLOSED"] as const;
export const PARTY_MEMBER_ROLES = [
  "PRINCIPAL",
  "MEMBER",
  "AIDE",
  "CARER",
  "DRIVER",
  "PROTECTION_OFFICER",
  "PROTOCOL_REPRESENTATIVE",
  "RESPONSIBLE_ADULT",
  "CHILD",
] as const;
export const PARTY_MEMBER_STATUSES = ["ACTIVE", "LEFT", "REMOVED"] as const;
export const RELATIONSHIP_TYPES = [
  "SPOUSE_PARTNER",
  "PARENT_CHILD",
  "RESPONSIBLE_ADULT",
  "CARER_FOR",
  "COMPANION_OF",
  "AIDE_TO",
  "DRIVER_FOR",
  "PROTECTION_FOR",
  "PROTOCOL_FOR",
  "OTHER_DECLARED",
] as const;
export const RELATIONSHIP_DIRECTIONS = ["FORWARD", "BIDIRECTIONAL"] as const;
export const RELATIONSHIP_VISIBILITIES = ["STAFF", "PROTOCOL", "RESTRICTED"] as const;
export const RELATIONSHIP_STATUSES = ["ACTIVE", "SUSPENDED", "DISPUTED", "ENDED"] as const;
export const COMPANION_ENTITLEMENT_STATUSES = [
  "AVAILABLE",
  "NOMINATED",
  "CONFIRMED",
  "DECLINED",
  "WITHDRAWN",
  "EXPIRED",
  "REVOKED",
  "EXCEPTION_REVIEW",
] as const;
export const COMPANION_NOMINATION_STATES = [
  "DRAFT",
  "SUBMITTED",
  "MATERIALISED",
  "REPLACED",
  "WITHDRAWN",
  "REJECTED",
] as const;
export const COMPANION_AUTHORITY_KINDS = ["RSVP_ENTITLEMENT", "RSVP_POLICY_DEFAULT"] as const;
export const RESPONSIBLE_ADULT_SCOPES = ["EVENT", "COMMUNICATIONS", "ARRIVAL", "SAFEGUARDING"] as const;
export const RESPONSIBLE_ADULT_LINK_STATUSES = ["ACTIVE", "SUSPENDED", "ENDED"] as const;
export const EVENT_SERIES_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const EVENT_SERIES_OCCURRENCE_TYPES = ["PRIMARY", "RELATED", "REHEARSAL", "OTHER"] as const;
export const ADDRESSING_RECONCILIATION_STATUSES = ["OPEN", "RESOLVED", "DEFERRED"] as const;
export const S04A_SENSITIVE_PERMISSIONS = [
  "guest.addressing.confirm",
  "guest.entitlement.exception.review",
  "guest.protocolNote.view",
  "guest.child.manage",
] as const;

export const S04B_SENSITIVE_PERMISSIONS = [
  "programme.protectedAccess.grant",
  "programme.accessPlan.publish",
  "programme.exception.review",
] as const;

export const PROGRAMME_PHASE_TYPES = [
  "PRIMARY",
  "REGISTRY",
  "TRADITIONAL",
  "CHURCH",
  "RECEPTION",
  "AFTER_PARTY",
  "BRUNCH",
  "OTHER",
] as const;
export const PROGRAMME_PHASE_STATUSES = [
  "DRAFT",
  "READY",
  "PUBLISHED",
  "ACTIVE",
  "CLOSED",
  "CANCELLED",
  "SUPERSEDED",
] as const;
export const PROGRAMME_DAY_STATUSES = ["DRAFT", "READY", "ACTIVE", "CLOSED"] as const;
export const CHECKPOINT_TYPES = [
  "ESTATE_MAIN_GATE",
  "SECONDARY_GATE",
  "VIP_PRIVATE_GATE",
  "SERVICE_VENDOR_GATE",
  "VEHICLE_SCREENING",
  "PARKING_GENERAL",
  "PARKING_ACCESSIBLE",
  "PARKING_STAFF",
  "CHAUFFEUR_HOLDING",
  "VENUE_GENERAL",
  "VENUE_FAST_TRACK",
  "VENUE_ACCESSIBLE",
  "VENUE_FAMILY",
  "RECEPTION",
  "STAFF_SERVICE",
] as const;
export const CHECKPOINT_STATUSES = ["DRAFT", "READY", "ACTIVE", "CLOSED"] as const;
export const ARRIVAL_ROUTE_KINDS = [
  "GENERAL",
  "DISCREET_FAST_TRACK",
  "ACCESSIBLE",
  "FAMILY_PRIVATE",
  "SERVICE",
  "CONVOY",
] as const;
export const ARRIVAL_ROUTE_STATUSES = ["DRAFT", "READY", "ACTIVE", "SUPERSEDED"] as const;
export const ACCESS_ZONE_KINDS = [
  "GENERAL_FLOOR",
  "VIP_LOUNGE",
  "BACKSTAGE",
  "FAMILY_PRIVATE",
  "SERVICE_AREA",
  "PARKING",
] as const;
export const PHASE_ENTITLEMENT_SUBJECT_TYPES = [
  "GUEST",
  "OPERATIONAL_PERSON",
  "VEHICLE",
] as const;
export const PHASE_ENTITLEMENT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
  "EXPIRED",
  "REPLACED",
] as const;
export const CREDENTIAL_PROJECTION_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SUPERSEDED",
  "REVOKED",
  "EXPIRED",
] as const;
export const VEHICLE_CLASSES = ["SALOON", "SUV", "VAN", "COACH", "OTHER"] as const;
export const VEHICLE_STATUSES = ["REGISTERED", "SUBSTITUTED", "REVOKED"] as const;
export const VEHICLE_ASSOCIATION_ROLES = ["DRIVER", "PROTECTION", "ENTOURAGE", "PASSENGER"] as const;
export const OFFLINE_PACKAGE_STATUSES = ["ACTIVE", "SUPERSEDED", "EXPIRED", "REVOKED"] as const;
export const ACCESS_EXCEPTION_STATUSES = ["OPEN", "APPROVED", "REFUSED", "SUPERSEDED"] as const;
export const CHECKPOINT_RESOLUTION_OUTCOMES = [
  "AUTHORISED",
  "REFER",
  "INSUFFICIENT",
  "REVOKED",
  "STALE",
  "WRONG_CHECKPOINT",
  "WRONG_EVENT",
  "WRONG_PHASE",
] as const;
export const S04B_OFFLINE_HMAC_KEY_REF = "s04b-offline-v1" as const;
export const S04B_NON_PRODUCTION_HMAC_KEY = "s04b-offline-hmac-non-production-v1" as const;

export const CEO_RESERVED_ACTIONS: readonly string[] = [
  "organisation.manage",
  "client.archive",
  "event.archive",
  "approval.strategic",
  "approval.brand",
  "approval.client",
  "approval.escalation",
  "approval.reputation",
  "approval.commercial",
  "approval.protected_production",
];

export const RSVP_ATTENDANCE_INTENTS = ["NOT_SUPPLIED", "ATTENDING", "NOT_ATTENDING", "UNCERTAIN"] as const;
export const RSVP_RESPONSE_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "AMENDED", "WITHDRAWN"] as const;
export const RSVP_RESPONSE_PROVENANCE = ["GUEST_SELF_SERVICE", "STAFF_ENTERED", "STAFF_CORRECTED"] as const;
export const RSVP_INVITATION_STATUSES = ["ISSUED", "ROTATED", "REVOKED", "EXPIRED"] as const;
export const RSVP_QUESTIONNAIRE_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;
export const RSVP_QUESTION_KEYS = [
  "ATTENDANCE",
  "HOUSEHOLD",
  "COMPANION",
  "DIETARY",
  "ACCESSIBILITY",
  "ASSISTANCE",
  "SENSITIVE_CONSENT",
] as const;
export const RSVP_EXCEPTION_KINDS = [
  "HEADCOUNT_EXCEEDED",
  "VERIFIED_FIELD_CONFLICT",
  "HOUSEHOLD_AUTHORITY",
  "COMPANION_LIMIT",
] as const;
export const RSVP_EXCEPTION_STATUSES = ["OPEN", "REVIEWED", "RESOLVED", "DISMISSED"] as const;
export const RSVP_ASSISTANCE_STATUSES = ["OPEN", "ACKNOWLEDGED", "CLOSED"] as const;
export const RSVP_ENTITLEMENT_KINDS = ["COMPANION", "HOUSEHOLD_RESPONDENT"] as const;
export const RSVP_KEY_STATUSES = ["ACTIVE", "RETIRED"] as const;
export const RSVP_SESSION_COOKIE = "md_event_os_guest_rsvp";

export const MSG_CHANNELS = ["EMAIL", "WHATSAPP", "SMS"] as const;
export const MSG_PURPOSES = [
  "INVITATION",
  "RSVP_ACKNOWLEDGEMENT",
  "CONFIRMATION",
  "PRE_EVENT_INFO",
  "REMINDER",
  "ARRIVAL_SUPPORT",
  "CONCIERGE",
  "SERVICE_RECOVERY",
  "DEPARTURE",
  "FOLLOW_UP",
] as const;
export const MSG_ELIGIBILITY = ["ALLOW", "DENY", "UNKNOWN"] as const;
export const MSG_TEMPLATE_STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED", "WITHDRAWN", "ARCHIVED"] as const;
export const MSG_CAMPAIGN_STATUSES = [
  "DRAFT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
  "DISPATCHING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;
export const MSG_MESSAGE_STATUSES = [
  "PLANNED",
  "BLOCKED",
  "QUEUED",
  "SUBMITTED",
  "ACCEPTED",
  "DELIVERED",
  "FAILED",
  "RETRYING",
  "DEAD_LETTER",
  "CANCELLED",
] as const;
export const MSG_THREAD_STATUSES = [
  "OPEN",
  "WAITING_ON_GUEST",
  "WAITING_ON_TEAM",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export const MSG_TASK_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;
export const MSG_CORRECTION_STATUSES = [
  "PROPOSED",
  "APPROVED",
  "REJECTED",
  "APPLIED",
  "SUPERSEDED",
] as const;
export const MSG_INBOUND_MATCH = ["MATCHED", "AMBIGUOUS", "UNMATCHED", "QUARANTINED"] as const;
export const MSG_OCCASION_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export const MSG_RETRY_CLASSES = ["TRANSIENT", "PERMANENT", "POLICY"] as const;
export const MSG_DIRECTIONS = ["OUTBOUND", "INBOUND"] as const;
export const MSG_AUDIENCE_PREDICATES = [
  "LIFECYCLE",
  "ATTENDANCE",
  "RSVP_STATUS",
  "HAS_EMAIL",
  "HAS_PHONE",
  "IDENTITY",
  "SEATING",
] as const;

export const SESSION_COOKIE = "md_event_os_session";
export const CORRELATION_HEADER = "x-md-correlation-id";

export const PLATFORM_PERSISTENCE_CONTRACT = {
  kind: "shared-platform-repository",
  productionDatabaseDecision: "POSTGRESQL",
  localAdapterStatus: LOCAL_STORE_PRODUCTION_STATUS,
  // Safe Event OS schema migrations and atelier-doclar Railway mutation are
  // standing-authorised by docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md.
  // This is not production-operations authorisation and does not admit real data.
  productionMigrationAuthorised: true,
  railwayMutationAuthorised: true,
  railwayProject: "atelier-doclar",
  competingTruthStores: false,
} as const;
