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
  merchandiseCollection: PLATFORM_PACKAGE,
  merchandiseItem: PLATFORM_PACKAGE,
  merchandiseItemVariant: PLATFORM_PACKAGE,
  merchandiseCohort: PLATFORM_PACKAGE,
  merchandiseCohortMember: PLATFORM_PACKAGE,
  hostOfferRule: PLATFORM_PACKAGE,
  guestOffer: PLATFORM_PACKAGE,
  guestParticipation: PLATFORM_PACKAGE,
  capMeasurement: PLATFORM_PACKAGE,
  merchandiseFulfilment: PLATFORM_PACKAGE,
  vendorAssignment: PLATFORM_PACKAGE,
  vendorUpdate: PLATFORM_PACKAGE,
  vendorSession: PLATFORM_PACKAGE,
  externalContactLink: PLATFORM_PACKAGE,
  merchandiseException: PLATFORM_PACKAGE,
  eventAtelier: PLATFORM_PACKAGE,
  blueprintGenesis: PLATFORM_PACKAGE,
  atelierChapter: PLATFORM_PACKAGE,
  eventNarrativeEdition: PLATFORM_PACKAGE,
  curatedMediaSet: PLATFORM_PACKAGE,
  approvedAssetEdition: PLATFORM_PACKAGE,
  guestJourneyProjection: PLATFORM_PACKAGE,
  hostMilestoneProjection: PLATFORM_PACKAGE,
  budgetAssuranceProjection: PLATFORM_PACKAGE,
  vendorEnsembleProjection: PLATFORM_PACKAGE,
  contingencyAssuranceProjection: PLATFORM_PACKAGE,
  hostDecisionRequest: PLATFORM_PACKAGE,
  hostDecisionReceipt: PLATFORM_PACKAGE,
  curatedUpdate: PLATFORM_PACKAGE,
  atelierAccessGrant: PLATFORM_PACKAGE,
  magicLinkChallenge: PLATFORM_PACKAGE,
  atelierSession: PLATFORM_PACKAGE,
  venue: PLATFORM_PACKAGE,
  venueFact: PLATFORM_PACKAGE,
  eventVenue: PLATFORM_PACKAGE,
  eventVenueFact: PLATFORM_PACKAGE,
  layout: PLATFORM_PACKAGE,
  layoutRevision: PLATFORM_PACKAGE,
  layoutEditorLease: PLATFORM_PACKAGE,
  venueEvidenceAsset: PLATFORM_PACKAGE,
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
  "MerchandiseGuest",
  "MerchPaymentLedger",
  "VendorStaffSession",
  "ParallelMeasurementStore",
  "HouseholdMerchandiseIdentity",
  "HostOsEvent",
  "ParallelAtelierLedger",
  "HostAssurancePortal",
  "ParallelRsvpAtelier",
  "ParallelFinanceAtelier",
  "Tenant",
  "ParallelOrganisation",
  "ParallelVenueLedger",
  "GuestPlacement",
  "GuestSeatAssignment",
  "SeatingSolver",
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
export const ACTOR_TYPES = ["USER", "SERVICE", "SYSTEM", "GUEST_CAPABILITY", "VENDOR_CAPABILITY", "HOST_CAPABILITY"] as const;
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
  "merch.collection.view",
  "merch.collection.manage",
  "merch.offer.view",
  "merch.offer.manage",
  "merch.offer.sponsor",
  "merch.participation.view",
  "merch.participation.manage",
  "merch.capMeasurement.view",
  "merch.capMeasurement.manage",
  "merch.fulfilment.view",
  "merch.fulfilment.manage",
  "merch.vendorAssignment.view",
  "merch.vendorAssignment.manage",
  "merch.exception.view",
  "merch.exception.review",
  "merch.report.view",
  "merch.audit.view",
  "forecast.run",
  "forecast.detail.view",
  "forecast.hostProjection.view",
  "forecast.override.propose",
  "forecast.override.approve",
  "provision.propose",
  "provision.approve",
  "model.parameters.manage",
  "model.evaluate",
  "forecast.audit.view",
  "atelier.view",
  "atelier.manage",
  "atelier.publish",
  "atelier.access.manage",
  "atelier.decision.publish",
  "atelier.decision.review",
  "atelier.audit.view",
  "language.preference.view",
  "language.preference.manage",
  "language.cultural.create",
  "language.cultural.review",
  "language.cultural.approve",
  "language.translation.create",
  "language.translation.review",
  "language.translation.approve",
  "language.edition.manage",
  "language.edition.publish",
  "language.assembly.preview",
  "language.glossary.manage",
  "language.audit.view",
  "venue.registry.view",
  "venue.record.create",
  "venue.record.update",
  "venue.fact.record",
  "venue.fact.verify",
  "venue.adopt",
  "venue.event.override",
  "layout.view",
  "layout.create",
  "layout.update",
  "layout.lease.acquire",
  "layout.constraint.override",
  "layout.asset.manage",
  "layout.capacity.record",
  "layout.validation.run",
  "layout.snapshot.manage",
  "layout.approval.submit",
  "layout.approval.decide",
  "layout.publish",
  "layout.publication.view",
  "layout.downstream.read",
  "engagement.view",
  "engagement.create",
  "engagement.update",
  "engagement.convert",
  "discovery.session.view",
  "discovery.session.manage",
  "discovery.source.view",
  "discovery.source.manage",
  "discovery.assertion.review",
  "discovery.confidential.reveal",
  "discovery.confidential.grant",
  "brief.view",
  "brief.author",
  "brief.submit",
  "brief.decide",
  "brief.publish",
  "investment.view",
  "investment.author",
  "investment.recommend",
  "investment.decide",
  "budget.catalogue.view",
  "budget.catalogue.manage",
  "budget.calculate",
  "budget.scenario.author",
  "budget.recommend",
  "budget.decide",
  "roadmap.view",
  "roadmap.author",
  "roadmap.rebaseline",
  "roadmap.decide",
  "change.view",
  "change.triage",
  "change.decide",
  "change.propagate",
  "executiveCommand.view",
  "executiveCommand.evaluate",
  "risk.catalogue.view",
  "risk.catalogue.manage",
  "risk.rule.review",
  "risk.rule.approve",
  "risk.policy.view",
  "risk.policy.manage",
  "risk.policy.verify",
  "risk.event.view",
  "risk.event.manage",
  "risk.event.decide",
  "risk.vendor.view",
  "risk.vendor.assess",
  "risk.vendor.decide",
  "risk.clause.view",
  "risk.clause.draft",
  "risk.clause.legalReview",
  "risk.clause.commercialApprove",
  "risk.continuity.view",
  "risk.continuity.manage",
  "risk.continuity.authorise",
  "risk.incident.view",
  "risk.incident.report",
  "risk.incident.command",
  "risk.incident.close",
  "risk.reserve.request",
  "risk.reserve.authorise",
  "risk.dossier.view",
  "risk.dossier.assemble",
  "risk.dossier.submit",
  "risk.dossier.approve",
  "risk.dossier.publish",
  "risk.dossier.export",
  "risk.dossier.client_access.manage",
  "risk.export",
  "risk.audit.view",
] as const;

export const SYSTEM_ROLE_KEYS = [
  "CEO",
  "EVENT_DIRECTOR",
  "CLIENT_LEAD",
  "DEPARTMENT_LEAD",
  "PLANNER",
  "SYSTEM_ADMINISTRATOR",
  "READ_ONLY_AUDITOR",
  "RISK_GOVERNANCE_REVIEWER",
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

export const S04C_SENSITIVE_PERMISSIONS = [
  "merch.offer.sponsor",
  "merch.capMeasurement.view",
  "merch.capMeasurement.manage",
  "merch.vendorAssignment.manage",
  "merch.exception.review",
] as const;

export const S04D_SENSITIVE_PERMISSIONS = [
  "forecast.override.approve",
  "provision.approve",
  "model.parameters.manage",
  "model.evaluate",
  "forecast.audit.view",
] as const;

export const S04E_SENSITIVE_PERMISSIONS = [
  "atelier.publish",
  "atelier.access.manage",
  "atelier.decision.review",
  "atelier.audit.view",
] as const;

export const S04F_SENSITIVE_PERMISSIONS = [
  "language.cultural.approve",
  "language.translation.approve",
  "language.edition.publish",
  "language.audit.view",
] as const;

export const S05_SENSITIVE_PERMISSIONS = [
  "venue.fact.verify",
  "venue.adopt",
  "layout.lease.acquire",
  "layout.constraint.override",
  "layout.approval.decide",
  "layout.publish",
] as const;

export const S05A_SENSITIVE_PERMISSIONS = [
  "engagement.convert",
  "brief.decide",
  "brief.publish",
  "investment.decide",
  "budget.decide",
  "roadmap.decide",
  "change.decide",
  "change.propagate",
  "executiveCommand.view",
  "executiveCommand.evaluate",
  "discovery.confidential.reveal",
  "discovery.confidential.grant",
] as const;

export const S05B_SENSITIVE_PERMISSIONS = [
  "risk.rule.approve",
  "risk.policy.verify",
  "risk.event.decide",
  "risk.vendor.decide",
  "risk.clause.legalReview",
  "risk.clause.commercialApprove",
  "risk.continuity.authorise",
  "risk.incident.close",
  "risk.reserve.authorise",
  "risk.dossier.approve",
  "risk.dossier.publish",
  "risk.dossier.export",
  "risk.dossier.client_access.manage",
  "risk.export",
] as const;

export const ASSERTION_KINDS = [
  "FACT",
  "PREFERENCE",
  "ASPIRATION",
  "PRIORITY",
  "CONSTRAINT",
  "NON_NEGOTIABLE",
  "ASSUMPTION",
  "DECISION",
  "UNKNOWN",
  "NOT_APPLICABLE",
  "RISK_SIGNAL",
  "DEPENDENCY_SIGNAL",
  "INVESTMENT_INSTRUCTION",
  "COMMUNICATION_PREFERENCE",
] as const;

export const CONFIRMATION_STATES = [
  "CAPTURED",
  "EXTRACTED",
  "PROPOSED",
  "STAFF_REVIEWED",
  "CLIENT_CONFIRMED",
  "GOVERNING",
  "DISPUTED",
  "SUPERSEDED",
  "REJECTED",
] as const;

export const SENSITIVITY_CLASSES = [
  "STANDARD",
  "CONTACT",
  "FAMILY_PRIVATE",
  "CULTURAL_RELIGIOUS",
  "ACCESSIBILITY_HEALTH",
  "SECURITY",
  "FINANCIAL",
  "CONFIDENTIAL_SURPRISE",
] as const;

export const DISCOVERY_DISCLOSURE_CLASSES = [
  "OPERATIONAL",
  "CLIENT_VISIBLE",
  "FINANCIAL_RESTRICTED",
  "HEALTH_ACCESSIBILITY_RESTRICTED",
  "SECURITY_RESTRICTED",
  "CULTURAL_RELIGIOUS_RESTRICTED",
  "CONFIDENTIAL_SURPRISE",
  "PRINCIPAL_PRIVATE",
] as const;

export const COVERAGE_STATES = [
  "UNASSESSED",
  "NOT_YET_RELEVANT",
  "UNKNOWN",
  "PARTIAL",
  "ANSWERED_UNCONFIRMED",
  "CONFIRMED",
  "NOT_APPLICABLE",
  "CONFLICTED",
  "STALE",
] as const;

export const INTERVIEW_SESSION_STATES = [
  "DRAFT",
  "READY",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ABANDONED",
  "CANCELLED",
] as const;

export const DISCOVERY_CONSENT_DIMENSIONS = [
  "PARTICIPATION",
  "AUDIO_RECORDING",
  "TRANSCRIPTION",
  "AI_ANALYSIS",
  "SOURCE_RETENTION",
  "DEIDENTIFIED_BENCHMARKING",
] as const;

export const ENQUIRY_CHANNELS = ["REFERRAL", "DIRECT", "PARTNER", "OTHER"] as const;
export const OPPORTUNITY_STAGES = ["ENQUIRY", "QUALIFYING", "DISCOVERY", "CONVERTED", "CLOSED"] as const;
export const SOURCE_ARTEFACT_KINDS = [
  "STAFF_NOTE",
  "UPLOADED_DOCUMENT",
  "AUDIO_METADATA",
  "TRANSCRIPT",
  "APPROVED_MESSAGE_INTAKE",
] as const;
export const ASSERTION_DIRECTNESS = ["DIRECT_STATEMENT", "INTERPRETATION"] as const;
export const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export const CONFLICT_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const CONFLICT_RESOLUTIONS = [
  "SELECT",
  "SUPERSEDE",
  "SCOPE_SEPARATE",
  "COEXIST",
  "REQUEST_CLARIFICATION",
] as const;
export const MONEY_CURRENCIES = ["NGN", "GBP", "USD", "EUR"] as const;

export const VENUE_RECORD_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export const VENUE_VISIBILITY_POLICIES = ["ORGANISATION_STAFF", "ASSIGNED_CLIENTS"] as const;
export const VENUE_CROSS_CLIENT_REUSE = ["DENIED", "EXPLICITLY_AUTHORISED"] as const;
export const VENUE_FACT_TYPES = [
  "ADDRESS",
  "DIMENSION",
  "DECLARED_CAPACITY",
  "ACCESS",
  "SAFETY_THRESHOLD",
  "OPERATING_HOURS",
  "CONTACT_CHANNEL",
  "OTHER",
] as const;
export const VENUE_FACT_SUBTYPES = [
  "STREET_LOCALITY",
  "COUNTRY",
  "POSTAL",
  "FLOOR_WIDTH",
  "FLOOR_LENGTH",
  "CEILING_HEIGHT",
  "ROOM_AREA",
  "FIRE_STATED",
  "VENUE_STATED",
  "UNKNOWN_CAPACITY",
  "STEP_FREE",
  "LIFT",
  "PARKING",
  "ENTRANCE",
  "MAX_OCCUPANCY",
  "EXIT_WIDTH",
  "RESTRICTED_ZONE",
  "STANDARD",
  "CURFEW",
  "METADATA_ONLY",
  "GENERAL",
] as const;
export const VENUE_FACT_UNITS = ["NONE", "MILLIMETRE", "COUNT", "TEXT"] as const;
export const VENUE_FACT_SOURCE_KINDS = [
  "VENUE_SUPPLIED",
  "QUALIFIED_AUTHORITY",
  "STAFF_OBSERVED",
  "UNVERIFIED_REPORT",
] as const;
export const VENUE_FACT_VERIFICATION_STATES = ["UNKNOWN", "UNVERIFIED", "VERIFIED", "CONFLICTING", "STALE"] as const;
export const VENUE_FACT_ORIGINS = ["INHERITED", "EVENT_OVERRIDE"] as const;
export const VENUE_LAYOUT_STATUSES = ["DRAFT"] as const;
export const VENUE_LEASE_STATUSES = ["ACTIVE", "RELEASED", "EXPIRED"] as const;
export const VENUE_EVIDENCE_STORAGE_STATES = ["UNAVAILABLE"] as const;
export const VENUE_ASSET_UPLOAD_AVAILABLE = false;
export const LAYOUT_ASSET_PROVIDER_CONFIGURED = false;
export const LAYOUT_PDF_EXPORT_AVAILABLE = false;
export const LAYOUT_ASSET_REQUIRED_VARIABLES = [
  {
    name: "EVENT_OS_LAYOUT_ASSET_STORE_PROVIDER",
    service: "event-os",
    secret: false,
    purpose: "Object-store provider. Production uses railway-bucket inside atelier-doclar.",
    failureBehaviour: "CONFIGURATION_REQUIRED; no bytes stored; no signed URLs.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_BUCKET",
    service: "event-os",
    secret: false,
    purpose: "Private Railway S3-compatible bucket name for floor-plan binaries and exports.",
    failureBehaviour: "CONFIGURATION_REQUIRED.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_ENDPOINT",
    service: "event-os",
    secret: false,
    purpose: "S3-compatible endpoint for the Railway bucket.",
    failureBehaviour: "CONFIGURATION_REQUIRED.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_REGION",
    service: "event-os",
    secret: false,
    purpose: "S3-compatible region identifier.",
    failureBehaviour: "CONFIGURATION_REQUIRED.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_URL_STYLE",
    service: "event-os",
    secret: false,
    purpose: "virtual-host or path-style addressing for the bucket.",
    failureBehaviour: "CONFIGURATION_REQUIRED.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_ACCESS_KEY",
    service: "event-os",
    secret: true,
    purpose: "Railway-generated bucket access key. Never committed or logged.",
    failureBehaviour: "CONFIGURATION_REQUIRED.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_SECRET_KEY",
    service: "event-os",
    secret: true,
    purpose: "Railway-generated bucket secret key. Never committed or logged.",
    failureBehaviour: "CONFIGURATION_REQUIRED.",
  },
  {
    name: "EVENT_OS_LAYOUT_ASSET_SCANNER",
    service: "event-os",
    secret: false,
    purpose: "Content-safety scanner. Production uses in-process-content-safety for allowlisted floor-plan types.",
    failureBehaviour: "Scan remains NOT_RUN; live upload stays disabled.",
  },
  {
    name: "EVENT_OS_LAYOUT_EXPORT_ENABLED",
    service: "event-os",
    secret: false,
    purpose: "Enables deterministic PDF/PNG export from approved or published hashes.",
    failureBehaviour: "Export jobs remain DISABLED; no fabricated files.",
  },
] as const;
export const LAYOUT_ASSET_MAX_BYTES = 20_000_000;
export const LAYOUT_ASSET_MAX_FILES = 8;
export const LAYOUT_VALIDATION_ENGINE_ID = "EOS-S05-VALIDATION" as const;
export const LAYOUT_VALIDATION_ENGINE_VERSION = "1.0.0" as const;
export const LAYOUT_DOWNSTREAM_CONTRACT_ID = "eos-s05-spatial-publication-v1" as const;
export const LAYOUT_FLOOR_PLAN_KINDS = ["PDF", "SVG", "PNG", "JPEG"] as const;
export const LAYOUT_ASSET_STORAGE_STATES = [
  "INTENT_RECORDED",
  "CONFIGURATION_REQUIRED",
  "QUARANTINED",
  "SCAN_PENDING",
  "SCAN_FAILED",
  "REJECTED",
  "AVAILABLE",
  "UNAVAILABLE",
  "SUPERSEDED",
  "RETAINED",
] as const;
export const LAYOUT_FINDING_SEVERITIES = ["BLOCKING", "WARNING", "RECOMMENDATION", "INFORMATION"] as const;
export const LAYOUT_FINDING_STATUSES = ["OPEN", "ACKNOWLEDGED", "OVERRIDDEN", "RESOLVED", "STALE", "OBSOLETE"] as const;
export const LAYOUT_APPROVAL_STATUSES = ["SUBMITTED", "APPROVED", "REJECTED", "REVOKED", "INVALIDATED"] as const;
export const LAYOUT_PUBLICATION_STATUSES = ["CURRENT", "SUPERSEDED", "WITHDRAWN"] as const;
export const LAYOUT_EXPORT_STATUSES = ["QUEUED_UNAVAILABLE", "DISABLED", "PENDING", "COMPLETED", "FAILED"] as const;
export const LAYOUT_DIFF_KINDS = [
  "ADDED",
  "REMOVED",
  "MOVED",
  "RESIZED",
  "ROTATED",
  "RELABELLED",
  "TYPE_OR_PROPERTY",
  "CAPACITY",
  "LOCK_OR_SAFETY",
  "SOURCE_OR_FACT",
  "DOWNSTREAM_IDENTIFIER",
] as const;
export const LAYOUT_EDITOR_LEASE_TTL_SECONDS = 1800;
export const SPATIAL_OBJECT_TYPES = [
  "ZONE",
  "TABLE",
  "SEAT",
  "FIXTURE",
  "ROUTE",
  "SAFE_AREA",
  "RESTRICTED_AREA",
  "CLEARANCE_AREA",
  "ANNOTATION",
  "GROUP",
] as const;
export const SPATIAL_COMMAND_KINDS = [
  "CREATE_OBJECT",
  "UPDATE_PROPERTIES",
  "MOVE",
  "RESIZE",
  "ROTATE",
  "TOMBSTONE",
  "DUPLICATE",
  "GROUP",
  "UNGROUP",
  "REORDER",
  "SET_VISIBILITY",
  "SET_LOCK",
  "GENERATE_SEATS",
  "UNDO",
  "REDO",
] as const;
export const MAX_SPATIAL_OBJECTS = 2500;
export const MAX_SEATS_PER_TABLE = 48;
export const MAX_ROUTE_POINTS = 64;
export const PROHIBITED_VENUE_GUEST_KEYS = [
  "guestId",
  "personId",
  "EventGuest",
  "invitationId",
  "householdId",
  "partyId",
  "entitlementId",
  "seatingAssignment",
  "guestPlacement",
  "seatingRationale",
] as const;

export const LANGUAGE_TAGS = ["en-GB", "en-US", "yo", "ig", "ha", "fr", "de-DE", "zh-Hans"] as const;
export const DEFAULT_FALLBACK_LANGUAGE_TAG = "en-GB" as const;
export const UNICODE_NORMALISATION_FORM = "NFC" as const;
export const LANGUAGE_PREFERENCE_SOURCES = ["GUEST_SUPPLIED", "HOST_SUPPLIED", "STAFF_RECORDED", "UNKNOWN"] as const;
export const LANGUAGE_PRESENTATION_MODES = [
  "PRIMARY_ONLY",
  "PRIMARY_PLUS_SUMMARY",
  "BILINGUAL",
  "TARGET_ONLY_WITH_FALLBACK",
] as const;
export const CULTURAL_TEXT_STATES = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "SUPERSEDED"] as const;
export const CONTENT_EDITION_STATES = ["DRAFT", "IN_REVIEW", "APPROVED", "SUPERSEDED", "WITHDRAWN"] as const;
export const TRANSLATION_SOURCE_TYPES = [
  "HUMAN_AUTHORED",
  "MACHINE_SUGGESTED",
  "AI_SUGGESTED",
  "IMPORTED",
  "SYNTHETIC_FIXTURE",
] as const;
export const TRANSLATION_COVERAGE_STATES = [
  "NOT_STARTED",
  "PARTIAL",
  "COMPLETE",
  "APPROVED",
  "STALE",
  "SUPERSEDED",
] as const;
export const TRANSLATION_REVIEW_STATUSES = ["NOT_REVIEWED", "IN_REVIEW", "APPROVED", "REJECTED", "STALE"] as const;
export const CONTENT_BLOCK_PURPOSES = [
  "PRIMARY",
  "SELECTION",
  "SUMMARY",
  "GREETING",
  "INSTRUCTION",
  "CULTURAL",
  "CLOSING",
] as const;
export const CONTENT_WORK_PURPOSES = [
  "INVITATION_COPY",
  "PROGRAMME_NOTE",
  "ATELIER_NARRATIVE",
  "MERCHANDISE_DESCRIPTION",
  "CULTURAL_TEXT",
  "GUEST_MESSAGE",
] as const;
export const CONTENT_EDITION_KINDS = ["PRIMARY", "PARTIAL", "SUMMARY", "BILINGUAL", "COMPLETE"] as const;
export const ENGLISH_CONVENTIONS = ["en-GB", "en-US"] as const;
export const TERMINOLOGY_POLICIES = ["RETAIN", "TRANSLITERATE", "EXPLAIN", "CONTEXT_SPECIFIC"] as const;
export const FALLBACK_REASONS = [
  "NO_PREFERENCE",
  "UNSUPPORTED_LANGUAGE",
  "MISSING_APPROVED_TARGET",
  "PARTIAL_COVERAGE",
  "STALE_TRANSLATION",
  "EXPLICIT_FALLBACK_RULE",
  "TERMINAL_EN_GB",
] as const;
export const ASSEMBLY_STATUSES = ["READY_FOR_COMMS_REVIEW", "BLOCKED", "SUPERSEDED"] as const;
export const REVIEW_KINDS = ["LINGUISTIC", "CULTURAL", "EDITION"] as const;
export const REVIEW_DECISIONS = ["APPROVED", "REJECTED"] as const;
export const LANGUAGE_REGISTER: readonly {
  tag: (typeof LANGUAGE_TAGS)[number];
  displayName: string;
  htmlLang: string;
  englishConvention?: "en-GB" | "en-US";
}[] = [
  { tag: "en-GB", displayName: "English (United Kingdom)", htmlLang: "en-GB", englishConvention: "en-GB" },
  { tag: "en-US", displayName: "English (United States)", htmlLang: "en-US", englishConvention: "en-US" },
  { tag: "yo", displayName: "Yorùbá", htmlLang: "yo" },
  { tag: "ig", displayName: "Igbo", htmlLang: "ig" },
  { tag: "ha", displayName: "Hausa", htmlLang: "ha" },
  { tag: "fr", displayName: "French", htmlLang: "fr" },
  { tag: "de-DE", displayName: "German", htmlLang: "de" },
  { tag: "zh-Hans", displayName: "Simplified Chinese", htmlLang: "zh-Hans" },
];
export const PROHIBITED_LANGUAGE_INFERENCE_KEYS = [
  "name",
  "surname",
  "familyName",
  "givenName",
  "title",
  "honorific",
  "ethnicity",
  "ethnic",
  "religion",
  "faith",
  "nationality",
  "national",
  "address",
  "household",
  "party",
  "phoneCountryCode",
  "countryCode",
  "previousAttendance",
  "appearance",
] as const;

export const ATELIER_SESSION_COOKIE = "md_event_os_atelier";
export const ATELIER_CHAPTER_TYPES = [
  "TODAY",
  "VISION",
  "JOURNEY",
  "BLUEPRINT",
  "ENSEMBLE",
  "DECISIONS",
  "ASSURANCE",
  "EDITIONS",
  "UPDATES",
] as const;
export const ATELIER_LIFECYCLE_STATES = [
  "GENESIS",
  "REVEAL",
  "PLANNING",
  "PRODUCTION",
  "LIVE",
  "AFTER",
] as const;
export const ATELIER_PUBLICATION_STATES = ["DRAFT", "PUBLISHED", "WITHDRAWN", "SUPERSEDED"] as const;
export const ATELIER_HOST_ROLES = [
  "PRINCIPAL_HOST",
  "CO_HOST",
  "FAMILY_REPRESENTATIVE",
  "EXECUTIVE_ASSISTANT",
  "CORPORATE_REPRESENTATIVE",
  "READ_ONLY_HOST",
  "MAISON_LIAISON",
  "AUDITOR",
] as const;
export const ATELIER_GRANT_STATUSES = ["ACTIVE", "REVOKED", "EXPIRED", "SUPERSEDED"] as const;
export const MAGIC_LINK_PURPOSES = ["ATELIER_ENTRY", "STEP_UP"] as const;
export const MAGIC_LINK_STATUSES = ["ISSUED", "REDEEMED", "EXPIRED", "REVOKED", "FAILED"] as const;
export const ATELIER_SESSION_STATUSES = ["ACTIVE", "REVOKED", "EXPIRED"] as const;
export const HOST_DECISION_STATUSES = [
  "PUBLISHED",
  "SUBMITTED",
  "REVIEW_PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "WITHDRAWN",
] as const;
export const HOST_DECISION_KINDS = ["HOST_PREFERENCE", "REQUIRES_STAFF_REVIEW", "CONVERSATION_REQUEST"] as const;
export const ATELIER_DECORATIVE_METAL = "#B79F85" as const;

export const FORECAST_MODEL_VERSION = "FORECAST-MODEL-V1" as const;
export const FORECAST_POLICY_VERSION = "FORECAST-POLICY-V1" as const;
export const DEFAULT_PARAMETER_SET_VERSION = "PARAM-SET-V1" as const;
export const FORECAST_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
export const FORECAST_RATE_SCALE = 10_000;

export const FORECAST_RSVP_CLASSES = ["YES", "NO", "NO_RESPONSE", "UNKNOWN"] as const;
export const FORECAST_SCOPES = ["PROGRAMME", "DAY", "PHASE", "LOCATION", "TRANSITION"] as const;
export const FORECAST_RUN_STATUSES = ["SUCCEEDED", "FAILED", "SUPERSEDED"] as const;
export const FORECAST_HOST_PROJECTION_STATUSES = ["DRAFT", "APPROVED", "WITHDRAWN"] as const;
export const FORECAST_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export const FORECAST_PARAMETER_SCOPES = ["GLOBAL", "EVENT"] as const;
export const FORECAST_PARAMETER_STATUSES = ["DRAFT", "ACTIVE", "SUPERSEDED", "WITHDRAWN"] as const;
export const FORECAST_POLICY_STATUSES = ["ACTIVE", "SUPERSEDED", "WITHDRAWN"] as const;
export const FORECAST_OVERRIDE_STATUSES = ["PROPOSED", "APPROVED", "REJECTED", "SUPERSEDED", "EXPIRED"] as const;
export const FORECAST_OVERRIDE_FIELDS = ["LOW", "EXPECTED", "HIGH", "RANGE", "CONFIDENCE"] as const;
export const PROVISION_DOMAINS = ["CATERING", "SEATING", "TRANSPORT", "PARKING", "STAFFING"] as const;
export const PROVISION_STATUSES = ["PROPOSED", "APPROVED", "REJECTED", "SUPERSEDED", "EXPIRED"] as const;
export const CALIBRATION_EVIDENCE_KINDS = ["SYNTHETIC_SHADOW", "RECONCILED_OPERATIONAL"] as const;
export const CALIBRATION_COMPLETENESS = ["INCOMPLETE", "ACCEPTED"] as const;
export const FORECAST_EVALUATION_STATUSES = ["SHADOW", "REVIEWED", "NOT_RELEASED"] as const;
export const FORECAST_POPULATION_KINDS = ["PERSON", "UNNAMED_ENTITLEMENT"] as const;
export const FORECAST_ASSUMPTION_KINDS = ["DATA_BACKED", "EXPLICIT_PARAMETER", "OPERATOR_JUDGMENT", "APPROVED_OVERRIDE", "UNRESOLVED_UNCERTAINTY"] as const;
export const UNCERTAINTY_DRIVER_CODES = [
  "NON_RESPONSE",
  "UNNAMED_ENTITLEMENT",
  "DATA_GAP",
  "STALE_EVIDENCE",
  "LOW_COVERAGE",
  "PHASE_ELIGIBILITY_INCOMPLETE",
  "PROVISIONAL_DEFAULTS",
] as const;
export const FORECAST_LOCALITY_LABELS = ["PROVISIONAL_DEFAULT_NOT_LAGOS_FACT"] as const;

export const PROHIBITED_FORECAST_TRAIT_KEYS = [
  "ethnicity",
  "ethnic",
  "religion",
  "faith",
  "health",
  "disability",
  "wealth",
  "socioeconomic",
  "socialClass",
  "class",
  "political",
  "politics",
  "biometric",
  "surnameProxy",
  "titleProxy",
  "addressProxy",
  "protectedCharacteristic",
] as const;

export const MERCHANDISE_ITEM_TYPES = [
  "ASO_EBI_FABRIC",
  "ASO_OKE_GELE",
  "ASO_OKE_FILA",
  "ASO_OKE_IPELE",
  "ASO_OKE_SET",
  "ACCESSORY",
  "GIFT",
  "EVENT_MERCHANDISE",
  "MADE_TO_MEASURE_CAP",
] as const;
export const MERCHANDISE_COLLECTION_STATUSES = ["DRAFT", "ACTIVE", "CLOSED", "WITHDRAWN"] as const;
export const MERCHANDISE_ITEM_STATUSES = ["DRAFT", "ACTIVE", "WITHDRAWN"] as const;
export const HOST_OFFER_RULE_STATUSES = ["DRAFT", "ISSUED", "AMENDED", "WITHDRAWN", "CONFLICT_REVIEW"] as const;
export const GUEST_OFFER_STATES = ["OFFERED", "ISSUED", "AMENDED", "WITHDRAWN", "CONFLICT_HOLD"] as const;
export const PARTICIPATION_CHOICES = [
  "FULL_PARTICIPATION",
  "FABRIC_ONLY",
  "ACCESSORY_ONLY",
  "ALTERNATIVE",
  "HOST_SPONSORED",
  "DECLINE_GRACEFULLY",
  "UNDECIDED",
] as const;
export const PARTICIPATION_STATUSES = ["RECORDED", "AMENDED", "WITHDRAWN"] as const;
export const CAP_MEASUREMENT_SOURCES = ["GUEST_ENTERED", "STAFF_ASSISTED", "VENDOR_REPORTED"] as const;
export const CAP_MEASUREMENT_STATUSES = ["ACTIVE", "CORRECTED", "WITHDRAWN"] as const;
export const FULFILMENT_STATES = [
  "OFFERED",
  "GUEST_SELECTED",
  "VENDOR_ACKNOWLEDGED",
  "IN_PREPARATION",
  "READY_FOR_COLLECTION",
  "DISPATCHED",
  "COLLECTED",
  "DELIVERED",
  "CLOSED",
  "DECLINED",
  "ON_HOLD",
  "DELAYED",
  "SHORTAGE",
  "DAMAGED",
  "REPLACEMENT_REQUIRED",
  "UNCOLLECTED",
  "CANCELLED",
  "DISPUTED",
] as const;
export const EXTERNAL_COMMERCIAL_STATUSES = [
  "NOT_REQUIRED",
  "PAYMENT_PENDING_WITH_VENDOR",
  "VENDOR_CONFIRMED",
  "DISPUTED_WITH_VENDOR",
  "WAIVED_OR_HOST_SPONSORED",
] as const;
export const VENDOR_ASSIGNMENT_STATUSES = ["ACTIVE", "EXPIRED", "REVOKED"] as const;
export const MERCHANDISE_GUEST_GRANT_STATUSES = ["ACTIVE", "EXPIRED", "REVOKED", "SUPERSEDED"] as const;
export const VENDOR_UPDATE_REVIEW_STATES = ["PENDING_REVIEW", "ACCEPTED", "REJECTED"] as const;
export const MERCHANDISE_EXCEPTION_TYPES = [
  "DELAY",
  "SHORTAGE",
  "DAMAGE",
  "REPLACEMENT",
  "NON_COLLECTION",
  "WRONG_RECIPIENT",
  "WRONG_ITEM",
  "DISPUTE",
  "CONFLICTING_OFFERS",
] as const;
export const MERCHANDISE_EXCEPTION_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
export const MERCHANDISE_AUDIENCE_KINDS = ["NAMED_GUESTS", "EXPLICIT_COHORT", "PHASE_AUDIENCE"] as const;
export const EXTERNAL_CONTACT_CHANNELS = ["WHATSAPP", "TELEPHONE", "EMAIL", "WEB"] as const;
export const CAP_CIRCUMFERENCE_MIN_INCHES = 18 as const;
export const CAP_CIRCUMFERENCE_MAX_INCHES = 26 as const;
export const VENDOR_SESSION_COOKIE = "md_event_os_vendor";
export const MERCHANDISE_GUEST_SESSION_COOKIE = "md_event_os_offers";
export const S04C_VENDOR_PEPPER_REF = "s04c-vendor-pepper-not-for-production";
export const PROHIBITED_MEASUREMENT_KEYS = [
  "waist",
  "waistInches",
  "chest",
  "chestInches",
  "hip",
  "hips",
  "bust",
  "height",
  "heightInches",
  "weight",
  "neck",
  "sleeve",
  "inseam",
  "dressSize",
  "shoeSize",
  "hatSize",
  "bodyMeasurement",
  "fittingPhoto",
  "tailorNote",
] as const;
export const PROHIBITED_PAYMENT_KEYS = [
  "amount",
  "amountPaid",
  "balance",
  "price",
  "cardNumber",
  "bankAccount",
  "sortCode",
  "receipt",
  "refund",
  "iban",
  "paymentInstrument",
  "deposit",
  "settlement",
] as const;
export const PROHIBITED_CORE_AUTHORITY_KEYS = [
  "invitation",
  "invitationId",
  "rsvpEntitlement",
  "attendance",
  "credential",
  "perimeter",
  "companion",
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
