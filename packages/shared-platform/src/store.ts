import type { StoreProductionStatus } from "./constants.js";
import type {
  Assignment,
  AuditEvent,
  Client,
  ConsentRecord,
  EventPhaseHistory,
  EventProgramme,
  EventRecord,
  GuestReference,
  MasterEventFile,
  Membership,
  Organisation,
  Permission,
  Person,
  PolicyVersionRef,
  Role,
  RolePermission,
  StaffSession,
} from "./schemas.js";
import type {
  AddressingReconciliationItem,
  CompanionEntitlement,
  CompanionNomination,
  EventSeries,
  EventSeriesMember,
  GuestParty,
  GuestPartyMember,
  GuestRelationship,
  ResponsibleAdultLink,
  S04AMigrationReceipt,
} from "./addressing-schemas.js";
import type {
  AccessException,
  AccessZone,
  ArrivalRoute,
  CredentialProjection,
  OfflineAccessPackage,
  OperationalVehicle,
  PerimeterCheckpoint,
  PhaseEntitlement,
  ProgrammeDay,
  ProgrammePhase,
  S04BMigrationReceipt,
  VehicleAssociation,
} from "./programme-schemas.js";
import type {
  GuestDuplicateCandidate,
  GuestHousehold,
  GuestIntakeBatch,
  GuestIntakeRow,
  OperationalGuest,
} from "./guest-schemas.js";
import type {
  RsvpAssistanceRequest,
  RsvpEntitlement,
  RsvpEventProjection,
  RsvpException,
  RsvpGuestSession,
  RsvpInvitation,
  RsvpKeyRing,
  RsvpPolicy,
  RsvpQuestionnaire,
  RsvpReceipt,
  RsvpResponse,
} from "./rsvp-schemas.js";
import type {
  AudienceDefinition,
  AudienceSnapshot,
  Campaign,
  CampaignApproval,
  ChannelPolicy,
  CommsIntelligenceAlert,
  CommsMessage,
  CommsNotification,
  CommsOutbox,
  ContactCorrection,
  ContactProjection,
  ConversationThread,
  DeliveryEvent,
  FollowUpTask,
  GuestSafeOccasion,
  InboundMessage,
  MessageAttempt,
  MessageContentSnapshot,
  MessageTemplate,
  MessageTemplateVersion,
  SuppressionEntry,
} from "./communications-schemas.js";

export interface IdempotencyRecord {
  key: string;
  action: string;
  hash: string;
  resultRef: string;
  createdAt: string;
}

export interface PlatformSnapshot {
  organisations: Organisation[];
  clients: Client[];
  programmes: EventProgramme[];
  events: EventRecord[];
  phaseHistory: EventPhaseHistory[];
  persons: Person[];
  memberships: Membership[];
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  assignments: Assignment[];
  masterEventFiles: MasterEventFile[];
  consents: ConsentRecord[];
  guestReferences: GuestReference[];
  operationalGuests: OperationalGuest[];
  guestHouseholds: GuestHousehold[];
  guestDuplicateCandidates: GuestDuplicateCandidate[];
  guestIntakeBatches: GuestIntakeBatch[];
  guestIntakeRows: GuestIntakeRow[];
  guestParties: GuestParty[];
  guestPartyMembers: GuestPartyMember[];
  guestRelationships: GuestRelationship[];
  companionEntitlements: CompanionEntitlement[];
  companionNominations: CompanionNomination[];
  responsibleAdultLinks: ResponsibleAdultLink[];
  eventSeries: EventSeries[];
  eventSeriesMembers: EventSeriesMember[];
  addressingReconciliationItems: AddressingReconciliationItem[];
  s04aMigrationReceipts: S04AMigrationReceipt[];
  programmeDays: ProgrammeDay[];
  programmePhases: ProgrammePhase[];
  phaseEntitlements: PhaseEntitlement[];
  arrivalRoutes: ArrivalRoute[];
  perimeterCheckpoints: PerimeterCheckpoint[];
  accessZones: AccessZone[];
  credentialProjections: CredentialProjection[];
  operationalVehicles: OperationalVehicle[];
  vehicleAssociations: VehicleAssociation[];
  offlineAccessPackages: OfflineAccessPackage[];
  accessExceptions: AccessException[];
  s04bMigrationReceipts: S04BMigrationReceipt[];
  rsvpPolicies: RsvpPolicy[];
  rsvpQuestionnaires: RsvpQuestionnaire[];
  rsvpInvitations: RsvpInvitation[];
  rsvpGuestSessions: RsvpGuestSession[];
  staffSessions: StaffSession[];
  rsvpResponses: RsvpResponse[];
  rsvpReceipts: RsvpReceipt[];
  rsvpEntitlements: RsvpEntitlement[];
  rsvpExceptions: RsvpException[];
  rsvpAssistanceRequests: RsvpAssistanceRequest[];
  rsvpKeyRings: RsvpKeyRing[];
  rsvpEventProjections: RsvpEventProjection[];
  channelPolicies: ChannelPolicy[];
  guestSafeOccasions: GuestSafeOccasion[];
  contactProjections: ContactProjection[];
  suppressionEntries: SuppressionEntry[];
  messageTemplates: MessageTemplate[];
  messageTemplateVersions: MessageTemplateVersion[];
  audienceDefinitions: AudienceDefinition[];
  audienceSnapshots: AudienceSnapshot[];
  campaigns: Campaign[];
  campaignApprovals: CampaignApproval[];
  commsMessages: CommsMessage[];
  messageContentSnapshots: MessageContentSnapshot[];
  messageAttempts: MessageAttempt[];
  deliveryEvents: DeliveryEvent[];
  commsOutbox: CommsOutbox[];
  conversationThreads: ConversationThread[];
  inboundMessages: InboundMessage[];
  followUpTasks: FollowUpTask[];
  contactCorrections: ContactCorrection[];
  commsNotifications: CommsNotification[];
  commsIntelligenceAlerts: CommsIntelligenceAlert[];
  policyVersions: PolicyVersionRef[];
  audit: AuditEvent[];
  idempotency: IdempotencyRecord[];
}

export interface PlatformStore {
  readonly productionStatus: StoreProductionStatus;
  snapshot(): PlatformSnapshot;
  replace(next: PlatformSnapshot): void;
}

export function emptySnapshot(): PlatformSnapshot {
  return {
    organisations: [],
    clients: [],
    programmes: [],
    events: [],
    phaseHistory: [],
    persons: [],
    memberships: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    assignments: [],
    masterEventFiles: [],
    consents: [],
    guestReferences: [],
    operationalGuests: [],
    guestHouseholds: [],
    guestDuplicateCandidates: [],
    guestIntakeBatches: [],
    guestIntakeRows: [],
    guestParties: [],
    guestPartyMembers: [],
    guestRelationships: [],
    companionEntitlements: [],
    companionNominations: [],
    responsibleAdultLinks: [],
    eventSeries: [],
    eventSeriesMembers: [],
    addressingReconciliationItems: [],
    s04aMigrationReceipts: [],
    programmeDays: [],
    programmePhases: [],
    phaseEntitlements: [],
    arrivalRoutes: [],
    perimeterCheckpoints: [],
    accessZones: [],
    credentialProjections: [],
    operationalVehicles: [],
    vehicleAssociations: [],
    offlineAccessPackages: [],
    accessExceptions: [],
    s04bMigrationReceipts: [],
    rsvpPolicies: [],
    rsvpQuestionnaires: [],
    rsvpInvitations: [],
    rsvpGuestSessions: [],
    staffSessions: [],
    rsvpResponses: [],
    rsvpReceipts: [],
    rsvpEntitlements: [],
    rsvpExceptions: [],
    rsvpAssistanceRequests: [],
    rsvpKeyRings: [],
    rsvpEventProjections: [],
    channelPolicies: [],
    guestSafeOccasions: [],
    contactProjections: [],
    suppressionEntries: [],
    messageTemplates: [],
    messageTemplateVersions: [],
    audienceDefinitions: [],
    audienceSnapshots: [],
    campaigns: [],
    campaignApprovals: [],
    commsMessages: [],
    messageContentSnapshots: [],
    messageAttempts: [],
    deliveryEvents: [],
    commsOutbox: [],
    conversationThreads: [],
    inboundMessages: [],
    followUpTasks: [],
    contactCorrections: [],
    commsNotifications: [],
    commsIntelligenceAlerts: [],
    policyVersions: [],
    audit: [],
    idempotency: [],
  };
}

export function normalizeSnapshot(input: PlatformSnapshot): PlatformSnapshot {
  const empty = emptySnapshot();
  return {
    ...empty,
    ...input,
    operationalGuests: input.operationalGuests ?? [],
    guestHouseholds: input.guestHouseholds ?? [],
    guestDuplicateCandidates: input.guestDuplicateCandidates ?? [],
    guestIntakeBatches: input.guestIntakeBatches ?? [],
    guestIntakeRows: input.guestIntakeRows ?? [],
    guestParties: input.guestParties ?? [],
    guestPartyMembers: input.guestPartyMembers ?? [],
    guestRelationships: input.guestRelationships ?? [],
    companionEntitlements: input.companionEntitlements ?? [],
    companionNominations: input.companionNominations ?? [],
    responsibleAdultLinks: input.responsibleAdultLinks ?? [],
    eventSeries: input.eventSeries ?? [],
    eventSeriesMembers: input.eventSeriesMembers ?? [],
    addressingReconciliationItems: input.addressingReconciliationItems ?? [],
    s04aMigrationReceipts: input.s04aMigrationReceipts ?? [],
    programmeDays: input.programmeDays ?? [],
    programmePhases: input.programmePhases ?? [],
    phaseEntitlements: input.phaseEntitlements ?? [],
    arrivalRoutes: input.arrivalRoutes ?? [],
    perimeterCheckpoints: input.perimeterCheckpoints ?? [],
    accessZones: input.accessZones ?? [],
    credentialProjections: input.credentialProjections ?? [],
    operationalVehicles: input.operationalVehicles ?? [],
    vehicleAssociations: input.vehicleAssociations ?? [],
    offlineAccessPackages: input.offlineAccessPackages ?? [],
    accessExceptions: input.accessExceptions ?? [],
    s04bMigrationReceipts: input.s04bMigrationReceipts ?? [],
    rsvpPolicies: input.rsvpPolicies ?? [],
    rsvpQuestionnaires: input.rsvpQuestionnaires ?? [],
    rsvpInvitations: input.rsvpInvitations ?? [],
    rsvpGuestSessions: input.rsvpGuestSessions ?? [],
    staffSessions: input.staffSessions ?? [],
    rsvpResponses: input.rsvpResponses ?? [],
    rsvpReceipts: input.rsvpReceipts ?? [],
    rsvpEntitlements: input.rsvpEntitlements ?? [],
    rsvpExceptions: input.rsvpExceptions ?? [],
    rsvpAssistanceRequests: input.rsvpAssistanceRequests ?? [],
    rsvpKeyRings: input.rsvpKeyRings ?? [],
    rsvpEventProjections: input.rsvpEventProjections ?? [],
    channelPolicies: input.channelPolicies ?? [],
    guestSafeOccasions: input.guestSafeOccasions ?? [],
    contactProjections: input.contactProjections ?? [],
    suppressionEntries: input.suppressionEntries ?? [],
    messageTemplates: input.messageTemplates ?? [],
    messageTemplateVersions: input.messageTemplateVersions ?? [],
    audienceDefinitions: input.audienceDefinitions ?? [],
    audienceSnapshots: input.audienceSnapshots ?? [],
    campaigns: input.campaigns ?? [],
    campaignApprovals: input.campaignApprovals ?? [],
    commsMessages: input.commsMessages ?? [],
    messageContentSnapshots: input.messageContentSnapshots ?? [],
    messageAttempts: input.messageAttempts ?? [],
    deliveryEvents: input.deliveryEvents ?? [],
    commsOutbox: input.commsOutbox ?? [],
    conversationThreads: input.conversationThreads ?? [],
    inboundMessages: input.inboundMessages ?? [],
    followUpTasks: input.followUpTasks ?? [],
    contactCorrections: input.contactCorrections ?? [],
    commsNotifications: input.commsNotifications ?? [],
    commsIntelligenceAlerts: input.commsIntelligenceAlerts ?? [],
  };
}
