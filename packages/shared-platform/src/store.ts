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
} from "./schemas.js";
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
  rsvpPolicies: RsvpPolicy[];
  rsvpQuestionnaires: RsvpQuestionnaire[];
  rsvpInvitations: RsvpInvitation[];
  rsvpGuestSessions: RsvpGuestSession[];
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
    rsvpPolicies: [],
    rsvpQuestionnaires: [],
    rsvpInvitations: [],
    rsvpGuestSessions: [],
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
    rsvpPolicies: input.rsvpPolicies ?? [],
    rsvpQuestionnaires: input.rsvpQuestionnaires ?? [],
    rsvpInvitations: input.rsvpInvitations ?? [],
    rsvpGuestSessions: input.rsvpGuestSessions ?? [],
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
