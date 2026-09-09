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
  CapMeasurement,
  ExternalContactLink,
  Fulfilment,
  GuestOffer,
  GuestParticipation,
  HostOfferRule,
  ItemVariant,
  MerchandiseCohort,
  MerchandiseCohortMember,
  MerchandiseCollection,
  MerchandiseException,
  MerchandiseItem,
  S04CMigrationReceipt,
  VendorAssignment,
  VendorSession,
  VendorUpdate,
  MerchandiseGuestGrant,
  MerchandiseGuestSession,
} from "./merchandise-schemas.js";
import type {
  AttendanceForecastRun,
  CalibrationObservation,
  ConfidenceAssessment,
  ForecastEstimate,
  ForecastEvaluation,
  ForecastOverride,
  ForecastPolicy,
  ForecastPopulationMember,
  ModelParameterSet,
  OperationalProvisionRecommendation,
  S04DMigrationReceipt,
  UncertaintyDriver,
} from "./forecast-schemas.js";
import type {
  ApprovedAssetEdition,
  AtelierAccessGrant,
  AtelierChapter,
  AtelierSession,
  BlueprintGenesis,
  BudgetAssuranceProjection,
  ContingencyAssuranceProjection,
  CuratedMediaSet,
  CuratedUpdate,
  EventAtelier,
  EventNarrativeEdition,
  GuestJourneyProjection,
  HostDecisionReceipt,
  HostDecisionRequest,
  HostMilestoneProjection,
  MagicLinkChallenge,
  S04EMigrationReceipt,
  VendorEnsembleProjection,
} from "./atelier-schemas.js";
import type {
  ContentBlock,
  ContentEdition,
  ContentWork,
  CulturalSourceText,
  LanguageCoverageSnapshot,
  LanguagePreferenceHistory,
  LanguageProfile,
  RecipientAssembly,
  RecipientEditionRule,
  ReviewAssignment,
  S04FMigrationReceipt,
  TerminologyEntry,
  TranslationLink,
} from "./language-schemas.js";
import type {
  EventVenue,
  EventVenueFact,
  Layout,
  LayoutEditorLease,
  LayoutRevision,
  S05MigrationReceipt,
  Venue,
  VenueEvidenceAsset,
  VenueFact,
} from "./venue-schemas.js";
import type { LayoutCommand, LayoutDraftCursor } from "./spatial-schemas.js";
import type {
  LayoutApproval,
  LayoutAssetCalibration,
  LayoutCapacityStatement,
  LayoutExportJob,
  LayoutFloorPlanAsset,
  LayoutPublication,
  LayoutSnapshot,
  LayoutValidationFinding,
  LayoutValidationOverride,
  LayoutValidationRun,
} from "./layout-assurance-schemas.js";
import type {
  AssertionConflict,
  CandidateAssertion,
  CoverageAssessment,
  CoverageCatalogueEdition,
  CoverageRequirement,
  DiscoveryConsentRecord,
  DiscoveryEngagement,
  DiscoveryParticipant,
  EngagementOpportunity,
  InterviewSession,
  S05AMigrationReceipt,
  SourceArtefact,
  SourceSegment,
} from "./eec-schemas.js";
import type {
  AiEvaluationRun,
  AiJob,
  BudgetAssumption,
  BudgetBomSnapshot,
  BudgetLine,
  BudgetRecommendationEdition,
  BudgetScenarioEdition,
  BudgetTaxonomyEdition,
  BudgetTemplateEdition,
  ChangeProposal,
  ClientBriefDecision,
  CalendarDefinition,
  ClientInvestmentAction,
  ClientOverviewEdition,
  ClientReviewAction,
  ClientReviewEdition,
  ContingencyRuleEdition,
  ConversationTurn,
  ConversionReceipt,
  CostItemDefinition,
  CostRuleEdition,
  DiscoveryClientAccess,
  EventBriefDraft,
  EventBriefEdition,
  EventCalendarOverlay,
  FinancialStateDeclaration,
  FxObservation,
  ImpactAssessment,
  LocationCostZone,
  LocationFactorEdition,
  LookupTableEdition,
  MarketIndexDefinition,
  MarketIndexObservation,
  PriceEvidence,
  RoadmapDependency,
  RoadmapEdition,
  RoadmapMilestone,
  RoadmapScheduleResult,
  RoadmapTemplateEdition,
  S05AIntelligenceReceipt,
  ScenarioComparison,
  SeasonWindowEdition,
  SensitivityRun,
  VendorPriceCard,
  VendorPriceCardEdition,
} from "./eec-intelligence-schemas.js";
import type {
  AiEvaluationCaseResult,
  AiEvaluationRunLease,
  S05AEvaluationMigrationReceipt,
} from "./eec-evaluation-schemas.js";
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
  merchandiseCollections: MerchandiseCollection[];
  merchandiseItems: MerchandiseItem[];
  merchandiseItemVariants: ItemVariant[];
  merchandiseCohorts: MerchandiseCohort[];
  merchandiseCohortMembers: MerchandiseCohortMember[];
  hostOfferRules: HostOfferRule[];
  guestOffers: GuestOffer[];
  guestParticipations: GuestParticipation[];
  capMeasurements: CapMeasurement[];
  merchandiseFulfilments: Fulfilment[];
  vendorAssignments: VendorAssignment[];
  vendorUpdates: VendorUpdate[];
  vendorSessions: VendorSession[];
  merchandiseGuestGrants: MerchandiseGuestGrant[];
  merchandiseGuestSessions: MerchandiseGuestSession[];
  externalContactLinks: ExternalContactLink[];
  merchandiseExceptions: MerchandiseException[];
  s04cMigrationReceipts: S04CMigrationReceipt[];
  forecastPolicies: ForecastPolicy[];
  modelParameterSets: ModelParameterSet[];
  attendanceForecastRuns: AttendanceForecastRun[];
  forecastPopulationMembers: ForecastPopulationMember[];
  forecastEstimates: ForecastEstimate[];
  uncertaintyDrivers: UncertaintyDriver[];
  confidenceAssessments: ConfidenceAssessment[];
  forecastOverrides: ForecastOverride[];
  operationalProvisionRecommendations: OperationalProvisionRecommendation[];
  calibrationObservations: CalibrationObservation[];
  forecastEvaluations: ForecastEvaluation[];
  s04dMigrationReceipts: S04DMigrationReceipt[];
  eventAteliers: EventAtelier[];
  blueprintGenesises: BlueprintGenesis[];
  atelierChapters: AtelierChapter[];
  eventNarrativeEditions: EventNarrativeEdition[];
  curatedMediaSets: CuratedMediaSet[];
  approvedAssetEditions: ApprovedAssetEdition[];
  guestJourneyProjections: GuestJourneyProjection[];
  hostMilestoneProjections: HostMilestoneProjection[];
  budgetAssuranceProjections: BudgetAssuranceProjection[];
  vendorEnsembleProjections: VendorEnsembleProjection[];
  contingencyAssuranceProjections: ContingencyAssuranceProjection[];
  hostDecisionRequests: HostDecisionRequest[];
  hostDecisionReceipts: HostDecisionReceipt[];
  curatedUpdates: CuratedUpdate[];
  atelierAccessGrants: AtelierAccessGrant[];
  magicLinkChallenges: MagicLinkChallenge[];
  atelierSessions: AtelierSession[];
  s04eMigrationReceipts: S04EMigrationReceipt[];
  languageProfiles: LanguageProfile[];
  languagePreferenceHistories: LanguagePreferenceHistory[];
  culturalSourceTexts: CulturalSourceText[];
  contentWorks: ContentWork[];
  contentEditions: ContentEdition[];
  contentBlocks: ContentBlock[];
  translationLinks: TranslationLink[];
  terminologyEntries: TerminologyEntry[];
  reviewAssignments: ReviewAssignment[];
  recipientEditionRules: RecipientEditionRule[];
  recipientAssemblies: RecipientAssembly[];
  languageCoverageSnapshots: LanguageCoverageSnapshot[];
  s04fMigrationReceipts: S04FMigrationReceipt[];
  venues: Venue[];
  venueFacts: VenueFact[];
  eventVenues: EventVenue[];
  eventVenueFacts: EventVenueFact[];
  layouts: Layout[];
  layoutRevisions: LayoutRevision[];
  layoutEditorLeases: LayoutEditorLease[];
  layoutCommands: LayoutCommand[];
  layoutDraftCursors: LayoutDraftCursor[];
  venueEvidenceAssets: VenueEvidenceAsset[];
  layoutFloorPlanAssets: LayoutFloorPlanAsset[];
  layoutAssetCalibrations: LayoutAssetCalibration[];
  layoutCapacityStatements: LayoutCapacityStatement[];
  layoutValidationRuns: LayoutValidationRun[];
  layoutValidationFindings: LayoutValidationFinding[];
  layoutValidationOverrides: LayoutValidationOverride[];
  layoutSnapshots: LayoutSnapshot[];
  layoutApprovals: LayoutApproval[];
  layoutPublications: LayoutPublication[];
  layoutExportJobs: LayoutExportJob[];
  s05MigrationReceipts: S05MigrationReceipt[];
  engagementOpportunities: EngagementOpportunity[];
  discoveryEngagements: DiscoveryEngagement[];
  discoveryParticipants: DiscoveryParticipant[];
  discoveryConsentRecords: DiscoveryConsentRecord[];
  interviewSessions: InterviewSession[];
  sourceArtefacts: SourceArtefact[];
  sourceSegments: SourceSegment[];
  candidateAssertions: CandidateAssertion[];
  assertionConflicts: AssertionConflict[];
  coverageCatalogueEditions: CoverageCatalogueEdition[];
  coverageRequirements: CoverageRequirement[];
  coverageAssessments: CoverageAssessment[];
  s05aMigrationReceipts: S05AMigrationReceipt[];
  eventBriefDrafts: EventBriefDraft[];
  eventBriefEditions: EventBriefEdition[];
  clientBriefDecisions: ClientBriefDecision[];
  discoveryClientAccess: DiscoveryClientAccess[];
  conversionReceipts: ConversionReceipt[];
  budgetTaxonomyEditions: BudgetTaxonomyEdition[];
  costItemDefinitions: CostItemDefinition[];
  costRuleEditions: CostRuleEdition[];
  priceEvidenceRecords: PriceEvidence[];
  budgetTemplateEditions: BudgetTemplateEdition[];
  budgetAssumptions: BudgetAssumption[];
  budgetScenarioEditions: BudgetScenarioEdition[];
  budgetRecommendationEditions: BudgetRecommendationEdition[];
  financialStateDeclarations: FinancialStateDeclaration[];
  roadmapMilestones: RoadmapMilestone[];
  roadmapEditions: RoadmapEdition[];
  roadmapDependencies: RoadmapDependency[];
  changeProposals: ChangeProposal[];
  impactAssessments: ImpactAssessment[];
  aiJobs: AiJob[];
  aiEvaluationRuns: AiEvaluationRun[];
  aiEvaluationCaseResults: AiEvaluationCaseResult[];
  aiEvaluationRunLeases: AiEvaluationRunLease[];
  s05aEvaluationMigrationReceipts: S05AEvaluationMigrationReceipt[];
  s05aIntelligenceReceipts: S05AIntelligenceReceipt[];
  vendorPriceCards: VendorPriceCard[];
  vendorPriceCardEditions: VendorPriceCardEdition[];
  marketIndexDefinitions: MarketIndexDefinition[];
  marketIndexObservations: MarketIndexObservation[];
  fxObservations: FxObservation[];
  locationCostZones: LocationCostZone[];
  locationFactorEditions: LocationFactorEdition[];
  seasonWindowEditions: SeasonWindowEdition[];
  lookupTableEditions: LookupTableEdition[];
  budgetLines: BudgetLine[];
  budgetBomSnapshots: BudgetBomSnapshot[];
  contingencyRuleEditions: ContingencyRuleEdition[];
  sensitivityRuns: SensitivityRun[];
  scenarioComparisons: ScenarioComparison[];
  roadmapTemplateEditions: RoadmapTemplateEdition[];
  roadmapScheduleResults: RoadmapScheduleResult[];
  conversationTurns: ConversationTurn[];
  clientOverviewEditions: ClientOverviewEdition[];
  clientReviewEditions: ClientReviewEdition[];
  clientReviewActions: ClientReviewAction[];
  clientInvestmentActions: ClientInvestmentAction[];
  calendarDefinitions: CalendarDefinition[];
  eventCalendarOverlays: EventCalendarOverlay[];
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
    merchandiseCollections: [],
    merchandiseItems: [],
    merchandiseItemVariants: [],
    merchandiseCohorts: [],
    merchandiseCohortMembers: [],
    hostOfferRules: [],
    guestOffers: [],
    guestParticipations: [],
    capMeasurements: [],
    merchandiseFulfilments: [],
    vendorAssignments: [],
    vendorUpdates: [],
    vendorSessions: [],
    merchandiseGuestGrants: [],
    merchandiseGuestSessions: [],
    externalContactLinks: [],
    merchandiseExceptions: [],
    s04cMigrationReceipts: [],
    forecastPolicies: [],
    modelParameterSets: [],
    attendanceForecastRuns: [],
    forecastPopulationMembers: [],
    forecastEstimates: [],
    uncertaintyDrivers: [],
    confidenceAssessments: [],
    forecastOverrides: [],
    operationalProvisionRecommendations: [],
    calibrationObservations: [],
    forecastEvaluations: [],
    s04dMigrationReceipts: [],
    eventAteliers: [],
    blueprintGenesises: [],
    atelierChapters: [],
    eventNarrativeEditions: [],
    curatedMediaSets: [],
    approvedAssetEditions: [],
    guestJourneyProjections: [],
    hostMilestoneProjections: [],
    budgetAssuranceProjections: [],
    vendorEnsembleProjections: [],
    contingencyAssuranceProjections: [],
    hostDecisionRequests: [],
    hostDecisionReceipts: [],
    curatedUpdates: [],
    atelierAccessGrants: [],
    magicLinkChallenges: [],
    atelierSessions: [],
    s04eMigrationReceipts: [],
    languageProfiles: [],
    languagePreferenceHistories: [],
    culturalSourceTexts: [],
    contentWorks: [],
    contentEditions: [],
    contentBlocks: [],
    translationLinks: [],
    terminologyEntries: [],
    reviewAssignments: [],
    recipientEditionRules: [],
    recipientAssemblies: [],
    languageCoverageSnapshots: [],
    s04fMigrationReceipts: [],
    venues: [],
    venueFacts: [],
    eventVenues: [],
    eventVenueFacts: [],
    layouts: [],
    layoutRevisions: [],
    layoutEditorLeases: [],
    layoutCommands: [],
    layoutDraftCursors: [],
    venueEvidenceAssets: [],
    layoutFloorPlanAssets: [],
    layoutAssetCalibrations: [],
    layoutCapacityStatements: [],
    layoutValidationRuns: [],
    layoutValidationFindings: [],
    layoutValidationOverrides: [],
    layoutSnapshots: [],
    layoutApprovals: [],
    layoutPublications: [],
    layoutExportJobs: [],
    s05MigrationReceipts: [],
    engagementOpportunities: [],
    discoveryEngagements: [],
    discoveryParticipants: [],
    discoveryConsentRecords: [],
    interviewSessions: [],
    sourceArtefacts: [],
    sourceSegments: [],
    candidateAssertions: [],
    assertionConflicts: [],
    coverageCatalogueEditions: [],
    coverageRequirements: [],
    coverageAssessments: [],
    s05aMigrationReceipts: [],
    eventBriefDrafts: [],
    eventBriefEditions: [],
    clientBriefDecisions: [],
    discoveryClientAccess: [],
    conversionReceipts: [],
    budgetTaxonomyEditions: [],
    costItemDefinitions: [],
    costRuleEditions: [],
    priceEvidenceRecords: [],
    budgetTemplateEditions: [],
    budgetAssumptions: [],
    budgetScenarioEditions: [],
    budgetRecommendationEditions: [],
    financialStateDeclarations: [],
    roadmapMilestones: [],
    roadmapEditions: [],
    roadmapDependencies: [],
    changeProposals: [],
    impactAssessments: [],
    aiJobs: [],
    aiEvaluationRuns: [],
    aiEvaluationCaseResults: [],
    aiEvaluationRunLeases: [],
    s05aEvaluationMigrationReceipts: [],
    s05aIntelligenceReceipts: [],
    vendorPriceCards: [],
    vendorPriceCardEditions: [],
    marketIndexDefinitions: [],
    marketIndexObservations: [],
    fxObservations: [],
    locationCostZones: [],
    locationFactorEditions: [],
    seasonWindowEditions: [],
    lookupTableEditions: [],
    budgetLines: [],
    budgetBomSnapshots: [],
    contingencyRuleEditions: [],
    sensitivityRuns: [],
    scenarioComparisons: [],
    roadmapTemplateEditions: [],
    roadmapScheduleResults: [],
    conversationTurns: [],
    clientOverviewEditions: [],
    clientReviewEditions: [],
    clientReviewActions: [],
    clientInvestmentActions: [],
    calendarDefinitions: [],
    eventCalendarOverlays: [],
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
    merchandiseCollections: input.merchandiseCollections ?? [],
    merchandiseItems: input.merchandiseItems ?? [],
    merchandiseItemVariants: input.merchandiseItemVariants ?? [],
    merchandiseCohorts: input.merchandiseCohorts ?? [],
    merchandiseCohortMembers: input.merchandiseCohortMembers ?? [],
    hostOfferRules: input.hostOfferRules ?? [],
    guestOffers: input.guestOffers ?? [],
    guestParticipations: input.guestParticipations ?? [],
    capMeasurements: input.capMeasurements ?? [],
    merchandiseFulfilments: input.merchandiseFulfilments ?? [],
    vendorAssignments: input.vendorAssignments ?? [],
    vendorUpdates: input.vendorUpdates ?? [],
    vendorSessions: input.vendorSessions ?? [],
    merchandiseGuestGrants: input.merchandiseGuestGrants ?? [],
    merchandiseGuestSessions: input.merchandiseGuestSessions ?? [],
    externalContactLinks: input.externalContactLinks ?? [],
    merchandiseExceptions: input.merchandiseExceptions ?? [],
    s04cMigrationReceipts: input.s04cMigrationReceipts ?? [],
    forecastPolicies: input.forecastPolicies ?? [],
    modelParameterSets: input.modelParameterSets ?? [],
    attendanceForecastRuns: input.attendanceForecastRuns ?? [],
    forecastPopulationMembers: input.forecastPopulationMembers ?? [],
    forecastEstimates: input.forecastEstimates ?? [],
    uncertaintyDrivers: input.uncertaintyDrivers ?? [],
    confidenceAssessments: input.confidenceAssessments ?? [],
    forecastOverrides: input.forecastOverrides ?? [],
    operationalProvisionRecommendations: input.operationalProvisionRecommendations ?? [],
    calibrationObservations: input.calibrationObservations ?? [],
    forecastEvaluations: input.forecastEvaluations ?? [],
    s04dMigrationReceipts: input.s04dMigrationReceipts ?? [],
    eventAteliers: input.eventAteliers ?? [],
    blueprintGenesises: input.blueprintGenesises ?? [],
    atelierChapters: input.atelierChapters ?? [],
    eventNarrativeEditions: input.eventNarrativeEditions ?? [],
    curatedMediaSets: input.curatedMediaSets ?? [],
    approvedAssetEditions: input.approvedAssetEditions ?? [],
    guestJourneyProjections: input.guestJourneyProjections ?? [],
    hostMilestoneProjections: input.hostMilestoneProjections ?? [],
    budgetAssuranceProjections: input.budgetAssuranceProjections ?? [],
    vendorEnsembleProjections: input.vendorEnsembleProjections ?? [],
    contingencyAssuranceProjections: input.contingencyAssuranceProjections ?? [],
    hostDecisionRequests: input.hostDecisionRequests ?? [],
    hostDecisionReceipts: input.hostDecisionReceipts ?? [],
    curatedUpdates: input.curatedUpdates ?? [],
    atelierAccessGrants: input.atelierAccessGrants ?? [],
    magicLinkChallenges: input.magicLinkChallenges ?? [],
    atelierSessions: input.atelierSessions ?? [],
    s04eMigrationReceipts: input.s04eMigrationReceipts ?? [],
    languageProfiles: input.languageProfiles ?? [],
    languagePreferenceHistories: input.languagePreferenceHistories ?? [],
    culturalSourceTexts: input.culturalSourceTexts ?? [],
    contentWorks: input.contentWorks ?? [],
    contentEditions: input.contentEditions ?? [],
    contentBlocks: input.contentBlocks ?? [],
    translationLinks: input.translationLinks ?? [],
    terminologyEntries: input.terminologyEntries ?? [],
    reviewAssignments: input.reviewAssignments ?? [],
    recipientEditionRules: input.recipientEditionRules ?? [],
    recipientAssemblies: input.recipientAssemblies ?? [],
    languageCoverageSnapshots: input.languageCoverageSnapshots ?? [],
    s04fMigrationReceipts: input.s04fMigrationReceipts ?? [],
    venues: input.venues ?? [],
    venueFacts: input.venueFacts ?? [],
    eventVenues: input.eventVenues ?? [],
    eventVenueFacts: input.eventVenueFacts ?? [],
    layouts: input.layouts ?? [],
    layoutRevisions: input.layoutRevisions ?? [],
    layoutEditorLeases: input.layoutEditorLeases ?? [],
    layoutCommands: input.layoutCommands ?? [],
    layoutDraftCursors: input.layoutDraftCursors ?? [],
    venueEvidenceAssets: input.venueEvidenceAssets ?? [],
    layoutFloorPlanAssets: input.layoutFloorPlanAssets ?? [],
    layoutAssetCalibrations: input.layoutAssetCalibrations ?? [],
    layoutCapacityStatements: input.layoutCapacityStatements ?? [],
    layoutValidationRuns: input.layoutValidationRuns ?? [],
    layoutValidationFindings: input.layoutValidationFindings ?? [],
    layoutValidationOverrides: input.layoutValidationOverrides ?? [],
    layoutSnapshots: input.layoutSnapshots ?? [],
    layoutApprovals: input.layoutApprovals ?? [],
    layoutPublications: input.layoutPublications ?? [],
    layoutExportJobs: input.layoutExportJobs ?? [],
    s05MigrationReceipts: input.s05MigrationReceipts ?? [],
    engagementOpportunities: input.engagementOpportunities ?? [],
    discoveryEngagements: input.discoveryEngagements ?? [],
    discoveryParticipants: input.discoveryParticipants ?? [],
    discoveryConsentRecords: input.discoveryConsentRecords ?? [],
    interviewSessions: input.interviewSessions ?? [],
    sourceArtefacts: input.sourceArtefacts ?? [],
    sourceSegments: input.sourceSegments ?? [],
    candidateAssertions: input.candidateAssertions ?? [],
    assertionConflicts: input.assertionConflicts ?? [],
    coverageCatalogueEditions: input.coverageCatalogueEditions ?? [],
    coverageRequirements: input.coverageRequirements ?? [],
    coverageAssessments: input.coverageAssessments ?? [],
    s05aMigrationReceipts: input.s05aMigrationReceipts ?? [],
    eventBriefDrafts: input.eventBriefDrafts ?? [],
    eventBriefEditions: input.eventBriefEditions ?? [],
    clientBriefDecisions: input.clientBriefDecisions ?? [],
    discoveryClientAccess: input.discoveryClientAccess ?? [],
    conversionReceipts: input.conversionReceipts ?? [],
    budgetTaxonomyEditions: input.budgetTaxonomyEditions ?? [],
    costItemDefinitions: input.costItemDefinitions ?? [],
    costRuleEditions: input.costRuleEditions ?? [],
    priceEvidenceRecords: input.priceEvidenceRecords ?? [],
    budgetTemplateEditions: input.budgetTemplateEditions ?? [],
    budgetAssumptions: input.budgetAssumptions ?? [],
    budgetScenarioEditions: input.budgetScenarioEditions ?? [],
    budgetRecommendationEditions: input.budgetRecommendationEditions ?? [],
    financialStateDeclarations: input.financialStateDeclarations ?? [],
    roadmapMilestones: input.roadmapMilestones ?? [],
    roadmapEditions: input.roadmapEditions ?? [],
    roadmapDependencies: input.roadmapDependencies ?? [],
    changeProposals: input.changeProposals ?? [],
    impactAssessments: input.impactAssessments ?? [],
    aiJobs: input.aiJobs ?? [],
    aiEvaluationRuns: input.aiEvaluationRuns ?? [],
    aiEvaluationCaseResults: input.aiEvaluationCaseResults ?? [],
    aiEvaluationRunLeases: input.aiEvaluationRunLeases ?? [],
    s05aEvaluationMigrationReceipts: input.s05aEvaluationMigrationReceipts ?? [],
    s05aIntelligenceReceipts: input.s05aIntelligenceReceipts ?? [],
    vendorPriceCards: input.vendorPriceCards ?? [],
    vendorPriceCardEditions: input.vendorPriceCardEditions ?? [],
    marketIndexDefinitions: input.marketIndexDefinitions ?? [],
    marketIndexObservations: input.marketIndexObservations ?? [],
    fxObservations: input.fxObservations ?? [],
    locationCostZones: input.locationCostZones ?? [],
    locationFactorEditions: input.locationFactorEditions ?? [],
    seasonWindowEditions: input.seasonWindowEditions ?? [],
    lookupTableEditions: input.lookupTableEditions ?? [],
    budgetLines: input.budgetLines ?? [],
    budgetBomSnapshots: input.budgetBomSnapshots ?? [],
    contingencyRuleEditions: input.contingencyRuleEditions ?? [],
    sensitivityRuns: input.sensitivityRuns ?? [],
    scenarioComparisons: input.scenarioComparisons ?? [],
    roadmapTemplateEditions: input.roadmapTemplateEditions ?? [],
    roadmapScheduleResults: input.roadmapScheduleResults ?? [],
    conversationTurns: input.conversationTurns ?? [],
    clientOverviewEditions: input.clientOverviewEditions ?? [],
    clientReviewEditions: input.clientReviewEditions ?? [],
    clientReviewActions: input.clientReviewActions ?? [],
    clientInvestmentActions: input.clientInvestmentActions ?? [],
    calendarDefinitions: input.calendarDefinitions ?? [],
    eventCalendarOverlays: input.eventCalendarOverlays ?? [],
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
