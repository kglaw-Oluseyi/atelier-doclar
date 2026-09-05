export const PLATFORM_PACKAGE = "@maison-doclar/shared-platform" as const;
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
  consent: PLATFORM_PACKAGE,
  policyVersion: PLATFORM_PACKAGE,
  audit: PLATFORM_PACKAGE,
  masterEventFile: PLATFORM_PACKAGE,
  identifiers: PLATFORM_PACKAGE,
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
] as const;

export const DEFAULT_TIMEZONE = "Africa/Lagos";

export const ORGANISATION_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
export const CLIENT_STATUSES = ["PROSPECT", "ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"] as const;
export const EVENT_STATUSES = ["DRAFT", "ACTIVE", "CANCELLED", "COMPLETED", "ARCHIVED"] as const;
export const EVENT_PHASES = ["DISCOVER", "DESIGN", "PREPARE", "READY", "LIVE", "CLOSE", "LEARN"] as const;
export const USER_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
export const ASSIGNMENT_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"] as const;
export const AUDIT_OUTCOMES = ["SUCCESS", "DENIED", "FAILED"] as const;
export const ACTOR_TYPES = ["USER", "SERVICE", "SYSTEM"] as const;
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

export const SESSION_COOKIE = "md_event_os_session";
export const CORRELATION_HEADER = "x-md-correlation-id";

export const PLATFORM_PERSISTENCE_CONTRACT = {
  kind: "shared-platform-repository",
  productionDatabaseDecision: "POSTGRESQL",
  localAdapterStatus: LOCAL_STORE_PRODUCTION_STATUS,
  productionMigrationAuthorised: false,
  railwayMutationAuthorised: false,
  competingTruthStores: false,
} as const;
