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
  VENDOR_SESSION_COOKIE,
  MERCHANDISE_GUEST_SESSION_COOKIE,
  ATELIER_SESSION_COOKIE,
  ATELIER_CHAPTER_TYPES,
  ATELIER_HOST_ROLES,
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
  HONORIFICS,
  ADDRESSING_STATUSES,
  ADDRESSING_SOURCES,
  AGE_BANDS,
  CHILD_AGE_BANDS,
  PARTY_TYPES,
  PARTY_MEMBER_ROLES,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_DIRECTIONS,
  RELATIONSHIP_VISIBILITIES,
  RELATIONSHIP_STATUSES,
  COMPANION_ENTITLEMENT_STATUSES,
  RESPONSIBLE_ADULT_SCOPES,
  MSG_CHANNELS,
  MSG_PURPOSES,
  MSG_CAMPAIGN_STATUSES,
  MSG_MESSAGE_STATUSES,
  PROGRAMME_PHASE_TYPES,
  CHECKPOINT_TYPES,
  ARRIVAL_ROUTE_KINDS,
  VEHICLE_CLASSES,
  MERCHANDISE_ITEM_TYPES,
  PARTICIPATION_CHOICES,
  FULFILMENT_STATES,
  FORECAST_MODEL_VERSION,
  DEFAULT_PARAMETER_SET_VERSION,
  PROVISION_DOMAINS,
  FORECAST_CONFIDENCE_LEVELS,
  LANGUAGE_TAGS,
  LANGUAGE_REGISTER,
  DEFAULT_FALLBACK_LANGUAGE_TAG,
  UNICODE_NORMALISATION_FORM,
  LAYOUT_ASSET_PROVIDER_CONFIGURED,
  LAYOUT_PDF_EXPORT_AVAILABLE,
  LAYOUT_ASSET_REQUIRED_VARIABLES,
  LAYOUT_ASSET_MAX_BYTES,
  LAYOUT_DOWNSTREAM_CONTRACT_ID,
  LAYOUT_VALIDATION_ENGINE_ID,
  LAYOUT_VALIDATION_ENGINE_VERSION,
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
export {
  GuestAddressingSchema,
  GuestPartySchema,
  GuestPartyMemberSchema,
  GuestRelationshipSchema,
  CompanionEntitlementSchema,
  CompanionNominationSchema,
  ResponsibleAdultLinkSchema,
  EventSeriesSchema,
  EventSeriesMemberSchema,
  AddressingReconciliationItemSchema,
  S04AMigrationReceiptSchema,
  UpdateGuestAddressingInputSchema,
  CreatePartyInputSchema,
  AddPartyMemberInputSchema,
  RemovePartyMemberInputSchema,
  CreateRelationshipInputSchema,
  AdministerRelationshipInputSchema,
  AdministerCompanionEntitlementInputSchema,
  NominateCompanionInputSchema,
  CreateResponsibleAdultLinkInputSchema,
  EndResponsibleAdultLinkInputSchema,
  ReconcileCompanionNamesInputSchema,
  HonorificSchema,
  AgeBandSchema,
  type GuestAddressing,
  type GuestParty,
  type GuestPartyMember,
  type GuestRelationship,
  type CompanionEntitlement,
  type CompanionNomination,
  type ResponsibleAdultLink,
  type CompanionAuthority,
  type CompanionEntitlementStatus,
  type EndResponsibleAdultLinkInput,
  type EventSeries,
  type EventSeriesMember,
  type AgeBand,
  type Honorific,
  type S04AMigrationReceipt,
} from "./addressing-schemas.js";
export {
  communicationsSalutation,
  addressingStatusRequiresConfirm,
  projectGuestAddressing,
  buildGuestAddressingWorkspace,
  type GuestAddressingCapabilities,
  type GuestAddressingProjection,
  type GuestAddressingWorkspace,
  type GuestChildProjection,
  type GuestPartyProjection,
  type GuestPartyMemberProjection,
  type CompanionEntitlementProjection,
} from "./addressing-projections.js";
export {
  validateS04APersistedCollections,
  S04A_UNKNOWN_FIELDS_POLICY,
  S04A_STORE_COLLECTIONS,
} from "./addressing-persistence.js";
export {
  renderGuestSalutation,
  renderFamiliarName,
  composeStoredName,
  childReadinessFor,
  requiresResponsibleAdult,
  unnamedAllowanceHasNoGuest,
  partyIsNotIdentity,
  allowedEntitlementTransitions,
  entitlementTransitionAllowed,
  allowanceExceedsAuthority,
  dateOfBirthForbidden,
  type RenderedSalutation,
} from "./addressing.js";
export {
  operationalDisplayName,
  normalizeEmail,
  normalizePhone,
  findDuplicateMatches,
  fieldValue,
  attentionRequiredFor,
  attentionFieldKeysFor,
  projectGuestAttention,
  ATTENTION_FIELD_KEYS,
} from "./guest-matching.js";
export {
  detectSalutationTitleMismatch,
  titleAppearsInSalutation,
  addressingTitles,
  proposedAddressingTitles,
} from "./addressing-salutation.js";
export {
  assertRetainedSalutationInvariant,
  retainedSalutationInvariant,
  RETAINED_SALUTATION_INVARIANT,
} from "./addressing-invariant.js";
export {
  guestAmendmentAlreadyApplied,
  addressingAlreadyApplied,
} from "./mutation-replay.js";
export { parseCanonicalCsv, CANONICAL_CSV_COLUMNS } from "./guest-intake.js";
export { seededPermissions, seededRoles, permissionsForRole, roleIdForKey, roleKeyForId } from "./catalog.js";
export { authorize, assignmentIsActive, assignmentCoversScope, canSeeClient, canSeeEvent, singleCoveringRoleKey, type ActorSnapshot, type PolicyDecision } from "./policy.js";
export { allowedNextPhases, assertPhaseTransition, isScaffoldedPhase, SCAFFOLDED_PHASES } from "./transitions.js";
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
export { FIXTURE_IDS, fixturePersons, isFixtureId, lineageFixtureMark } from "./fixtures.js";
export { emptyMasterEventFile } from "./mef.js";
export { emptySnapshot, normalizeSnapshot, type PlatformStore, type PlatformSnapshot } from "./store.js";
export {
  migrateEosS04A,
  rollbackEosS04A,
  compatibleLegacySnapshot,
  EOS_S04A_MIGRATION_ID,
  type S04AMigrationResult,
  type S04ARollbackResult,
} from "./addressing-migration.js";
export {
  migrateEosS04B,
  rollbackEosS04B,
  applyEosS04BToSnapshot,
  EOS_S04B_MIGRATION_ID,
  EOS_S04B_MIGRATION_CHECKSUM,
  type S04BMigrationResult,
} from "./programme-migration.js";
export {
  applyS04BFixturesIfMissing,
  S04B_FIXTURE_IDS,
} from "./programme-fixtures.js";
export {
  validateS04BPersistedCollections,
  S04B_STORE_COLLECTIONS,
} from "./programme-persistence.js";
export {
  wholeEventAttendanceUnion,
  phaseGuestCount,
  verifyOfflinePackage,
  signOfflinePackageBody,
} from "./programme-operations.js";
export {
  buildEventProgrammeWorkspace,
  buildGuestPhaseProjection,
  programmePermissionAllowed,
  type EventProgrammeWorkspace,
  type ProgrammeCapabilities,
} from "./programme-projections.js";
export {
  migrateEosS04C,
  rollbackEosS04C,
  applyEosS04CToSnapshot,
  migrateEosS04CGuestGrants,
  EOS_S04C_MIGRATION_ID,
  EOS_S04C_MIGRATION_CHECKSUM,
  EOS_S04C_GUEST_GRANT_MIGRATION_ID,
  EOS_S04C_GUEST_GRANT_MIGRATION_CHECKSUM,
  type S04CMigrationResult,
} from "./merchandise-migration.js";
export {
  applyS04CFixturesIfMissing,
  S04C_FIXTURE_IDS,
  S04C_VENDOR_TOKEN,
  S04C_OTHER_VENDOR_TOKEN,
} from "./merchandise-fixtures.js";
export {
  validateS04CPersistedCollections,
  S04C_STORE_COLLECTIONS,
} from "./merchandise-persistence.js";
export {
  migrateEosS04D,
  rollbackEosS04D,
  applyEosS04DToSnapshot,
  EOS_S04D_MIGRATION_ID,
  EOS_S04D_MIGRATION_CHECKSUM,
  type S04DMigrationResult,
} from "./forecast-migration.js";
export {
  applyS04DFixturesIfMissing,
  S04D_FIXTURE_IDS,
  S04D_KNOWN_COUNTS,
} from "./forecast-fixtures.js";
export {
  validateS04DPersistedCollections,
  S04D_STORE_COLLECTIONS,
} from "./forecast-persistence.js";
export {
  assertNoProhibitedForecastFields,
  prohibitedForecastPayload,
  DEFAULT_FORECAST_POLICY_ID,
  DEFAULT_PARAMETER_SET_ID,
  buildForecastPopulation,
  coreTruthFingerprint,
  phaseEligibleGuestIds,
} from "./forecast-operations.js";
export {
  computeForecast,
  classifyAttendanceIntent,
  displayRange,
  currentInputChecksum,
} from "./forecast-model.js";
export {
  buildEventForecastWorkspace,
  buildHostForecastProjection,
  buildForecastOverviewStrip,
  forecastPermissionAllowed,
  type EventForecastWorkspace,
  type ForecastCapabilities,
  type HostForecastProjection,
} from "./forecast-projections.js";
export {
  ForecastPolicySchema,
  ModelParameterSetSchema,
  AttendanceForecastRunSchema,
  ForecastEstimateSchema,
  RunAttendanceForecastInputSchema,
  ProposeForecastOverrideInputSchema,
  DecideForecastOverrideInputSchema,
  ProposeProvisionInputSchema,
  DecideProvisionInputSchema,
  ApproveHostProjectionInputSchema,
  RecordCalibrationObservationInputSchema,
  EvaluateForecastInputSchema,
  CreateEventParameterSetInputSchema,
  type ForecastPolicy,
  type ModelParameterSet,
  type AttendanceForecastRun,
  type ForecastPopulationMember,
  type ForecastEstimate,
  type UncertaintyDriver,
  type ConfidenceAssessment,
  type ForecastOverride,
  type OperationalProvisionRecommendation,
  type CalibrationObservation,
  type ForecastEvaluation,
} from "./forecast-schemas.js";
export {
  assertNoProhibitedMerchandiseFields,
  prohibitedMerchandisePayload,
  assertCapCircumferenceRaw,
  vendorReference,
} from "./merchandise-operations.js";
export {
  describeMerchandiseAccessState,
  MERCHANDISE_ACCESS_DISPLAY_STATES,
  type MerchandiseAccessDisplayState,
} from "./merchandise-access-state.js";
export {
  buildEventMerchandiseWorkspace,
  buildGuestMerchandiseProjection,
  buildVendorPortalProjection,
  merchandisePermissionAllowed,
  type EventMerchandiseWorkspace,
  type MerchandiseCapabilities,
  type GuestMerchandiseProjection,
  type VendorPortalProjection,
} from "./merchandise-projections.js";
export {
  MerchandiseCollectionSchema,
  MerchandiseItemSchema,
  GuestOfferSchema,
  GuestParticipationSchema,
  CapMeasurementSchema,
  FulfilmentSchema,
  VendorAssignmentSchema,
  CreateMerchandiseCollectionInputSchema,
  CreateHostOfferRuleInputSchema,
  RecordGuestParticipationInputSchema,
  CaptureCapMeasurementInputSchema,
  SubmitVendorUpdateInputSchema,
  type MerchandiseCollection,
  type MerchandiseItem,
  type GuestOffer,
  type GuestParticipation,
  type CapMeasurement,
  type Fulfilment,
  type VendorAssignment,
} from "./merchandise-schemas.js";
export {
  SYNTHETIC_RAILWAY_PROJECT_NAME,
  hostedRuntimeFromEnv,
  resolveAccessAuthority,
  localFixtureAccessAuthority,
  coerceAccessAuthority,
  type AccessAuthority,
  type HostedRuntime,
  type IdentityAdapterKind,
} from "./access-authority.js";
export {
  DEFAULT_NON_PRODUCTION_VENDOR_ACCESS,
  assertVendorAccessConfig,
  readVendorSession,
  resolveVendorAccessFromEnv,
  usesKnownFixtureVendorSecrets,
  vendorSecretFingerprint,
  type VendorAccessConfig,
  type VendorSessionActor,
} from "./merchandise-vendor-access.js";
export {
  DEFAULT_NON_PRODUCTION_ATELIER_ACCESS,
  assertAtelierAccessConfig,
  readAtelierSession,
  resolveAtelierAccessFromEnv,
  usesKnownFixtureAtelierSecrets,
  atelierSecretFingerprint,
  type AtelierAccessConfig,
  type AtelierSessionActor,
} from "./atelier-access.js";
export {
  migrateEosS04E,
  applyEosS04EToSnapshot,
  rollbackEosS04E,
  EOS_S04E_MIGRATION_ID,
  EOS_S04E_MIGRATION_CHECKSUM,
} from "./atelier-migration.js";
export { applyS04EFixturesIfMissing, S04E_FIXTURE_IDS } from "./atelier-fixtures.js";
export { validateS04EPersistedCollections } from "./atelier-persistence.js";
export {
  migrateEosS04F,
  applyEosS04FToSnapshot,
  rollbackEosS04F,
  EOS_S04F_MIGRATION_ID,
  EOS_S04F_MIGRATION_CHECKSUM,
} from "./language-migration.js";
export { applyS04FFixturesIfMissing, S04F_FIXTURE_IDS } from "./language-fixtures.js";
export { validateS04FPersistedCollections } from "./language-persistence.js";
export {
  buildEventLanguageWorkspace,
  buildHostMultilingualEdition,
  languagePermissionAllowed,
  type EventLanguageWorkspace,
  type HostMultilingualEditionView,
  type LanguageCapabilities,
} from "./language-projections.js";
export {
  AssembleRecipientContentInputSchema,
  CreateContentWorkInputSchema,
  CreateCulturalSourceTextInputSchema,
  CreateDependentEditionInputSchema,
  CreateSourceRevisionInputSchema,
  CreateTerminologyEntryInputSchema,
  DecideCulturalTextInputSchema,
  DecideSourceEditionInputSchema,
  DecideTranslationInputSchema,
  RecordLanguagePreferenceInputSchema,
  SubmitSourceRevisionInputSchema,
  SupersedeSourceEditionInputSchema,
  type ContentEdition,
  type ContentWork,
  type CulturalSourceText,
  type LanguageProfile,
  type RecipientAssembly,
} from "./language-schemas.js";
export {
  PLACEHOLDER_POLICY,
  assertPlaceholderSetsMatch,
  comparePlaceholderSets,
  extractPlaceholderNames,
  extractPlaceholderOccurrences,
  renderPlaceholders,
} from "./language-placeholders.js";
export {
  migrateEosS05,
  applyEosS05ToSnapshot,
  rollbackEosS05,
  EOS_S05_MIGRATION_ID,
  EOS_S05_MIGRATION_CHECKSUM,
} from "./venue-migration.js";
export { migrateEosS05Objects, applyEosS05ObjectsToSnapshot, EOS_S05_OBJECTS_MIGRATION_ID } from "./spatial-migration.js";
export {
  ApplyLayoutCommandInputSchema,
  SpatialObjectSchema,
  type ApplyLayoutCommandInput,
  type SpatialCommandBody,
  type SpatialObject,
} from "./spatial-schemas.js";
export { applyLayoutCommandOnSnap, currentLayoutObjects, replaceLayoutObjectsOnSnap, type ApplyLayoutCommandResult } from "./spatial-operations.js";
export { applyS05FixturesIfMissing, S05_FIXTURE_IDS } from "./venue-fixtures.js";
export { validateS05PersistedCollections } from "./venue-persistence.js";
export { migrateEosS05Assurance, applyEosS05AssuranceToSnapshot, EOS_S05_ASSURANCE_MIGRATION_ID, EOS_S05_OVERRIDE_LINEAGE_MIGRATION_ID, migrateEosS05OverrideLineage } from "./layout-assurance-migration.js";
export { inspectFloorPlanPayload, sanitiseFloorPlanFileName } from "./layout-assurance-assets.js";
export {
  renderLayoutExport,
  layoutExportProvenanceLines,
  inspectLayoutExportPdfText,
  inspectLayoutExportPngText,
  type LayoutExportMarking,
  type LayoutExportRenderInput,
} from "./layout-export-render.js";
export {
  MemoryLayoutBinaryStore,
  layoutSourceObjectKey,
  layoutDerivativeObjectKey,
  layoutExportObjectKey,
  discoverySourceObjectKey,
  assertSafeObjectKey,
  type LayoutBinaryObject,
  type LayoutBinaryStore,
} from "./layout-asset-store.js";
export { buildCapacityReport, geometricCapacityFromObjects, type CapacityReport } from "./layout-assurance-capacity.js";
export { diffLayoutObjects } from "./layout-assurance-diff.js";
export {
  MASKED_LAYER_LABEL,
  CURRENT_LAYOUT_DRAFT,
  COUNT_FACT_GUIDANCE,
  actorRevealsSensitiveSpatial,
  actorMayRetrieveExportJob,
  classifiedSpatialDisclosure,
  projectSpatialObjects,
  overrideApplicabilityKey,
  effectiveOverrideState,
  type ProjectedSpatialObject,
  type OverrideDecisionRecord,
  type LayoutFindingView,
  type ProjectedLayoutExportJob,
} from "./layout-spatial-disclosure.js";
export {
  LAYOUT_VALIDATION_RULES,
  RecordFloorPlanIntentInputSchema,
  RecordStoredFloorPlanInputSchema,
  CalibrateFloorPlanInputSchema,
  RecordOperationalCapacityInputSchema,
  RunLayoutValidationInputSchema,
  AcknowledgeFindingInputSchema,
  OverrideFindingInputSchema,
  RevokeLayoutOverrideInputSchema,
  CreateLayoutSnapshotInputSchema,
  RestoreLayoutSnapshotInputSchema,
  SubmitLayoutApprovalInputSchema,
  DecideLayoutApprovalInputSchema,
  PublishLayoutInputSchema,
  WithdrawLayoutPublicationInputSchema,
  RequestLayoutExportInputSchema,
  CompleteLayoutExportInputSchema,
  FailLayoutExportInputSchema,
  WithdrawLayoutAssetInputSchema,
  type LayoutApproval,
  type LayoutDownstreamContractId,
  type LayoutExportJob,
  type LayoutFloorPlanAsset,
  type LayoutPublication,
  type LayoutSnapshot,
  type LayoutValidationFinding,
  type LayoutValidationOverride,
  type LayoutValidationRun,
} from "./layout-assurance-schemas.js";
export {
  buildLayoutAssuranceWorkspace,
  buildLayoutDownstreamProjection,
  buildPublishedLayoutViewer,
  assertNoProhibitedDownstreamKeys,
  type LayoutAssuranceWorkspace,
  type LayoutDownstreamProjection,
  type PublishedLayoutViewer,
} from "./layout-assurance-projections.js";
export {
  buildEventVenueWorkspace,
  buildLayoutSetupWorkspace,
  buildVenueDetailWorkspace,
  buildVenueRegistry,
  venuePermissionAllowed,
  type EventVenueWorkspace,
  type LayoutSetupWorkspace,
  type VenueCapabilities,
  type VenueDetailWorkspace,
} from "./venue-projections.js";
export { readAttendanceProjection, type AttendanceProjectionRead } from "./venue-attendance.js";
export {
  FROZEN_COORDINATE_SYSTEM,
  canonicalContentHash,
  canonicalSerialize,
  layoutContentHash,
} from "./venue-geometry.js";
export {
  AcquireLayoutLeaseInputSchema,
  AdoptVenueInputSchema,
  CreateBlankLayoutInputSchema,
  CreateVenueInputSchema,
  RecordEventVenueOverrideInputSchema,
  RecordVenueFactInputSchema,
  UpdateLayoutSetupInputSchema,
  VerifyVenueFactInputSchema,
  type EventVenue,
  type Layout,
  type Venue,
  type VenueFact,
} from "./venue-schemas.js";
export { assertNoVenueGuestIdentity } from "./venue-operations.js";
export {
  accentInsensitiveSearchKey,
  authoredTextsEqual,
  canonicalDisplayText,
  graphemeCount,
  graphemeSafeTruncate,
  UNICODE_POLICY,
} from "./language-unicode.js";
export {
  assertNoLanguageInference,
  findTerminologyDisplayForm,
  isSupportedLanguageTag,
  languageRegisterEntry,
} from "./language-operations.js";
export {
  buildEventAtelierWorkspace,
  buildHostAtelierProjection,
  atelierPermissionAllowed,
  type EventAtelierWorkspace,
  type HostAtelierProjection,
} from "./atelier-projections.js";
export {
  IssueAtelierAccessInputSchema,
  PublishAtelierInputSchema,
  PublishDecisionRequestInputSchema,
  PublishNarrativeEditionInputSchema,
  RenewAtelierAccessInputSchema,
  ReviewHostDecisionInputSchema,
  RevokeAtelierAccessInputSchema,
  StartNarrativeRevisionInputSchema,
  SubmitHostDecisionInputSchema,
  type AtelierAccessGrant,
  type EventAtelier,
  type HostDecisionReceipt,
  type HostDecisionRequest,
} from "./atelier-schemas.js";
export {
  DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS,
  assertMerchandiseGuestAccessConfig,
  readMerchandiseGuestSession,
  type MerchandiseGuestAccessConfig,
  type MerchandiseGuestSessionActor,
} from "./merchandise-guest-access.js";
export {
  ProgrammePhaseSchema,
  PhaseEntitlementSchema,
  ArrivalRouteSchema,
  PerimeterCheckpointSchema,
  CredentialProjectionSchema,
  OperationalVehicleSchema,
  OfflineAccessPackageSchema,
  CreateProgrammePhaseInputSchema,
  AssignPhaseEntitlementInputSchema,
  CreateCheckpointInputSchema,
  CreateArrivalRouteInputSchema,
  CreateVehicleInputSchema,
  PublishOfflinePackageInputSchema,
  ConsumeOfflinePackageInputSchema,
  ResolveCheckpointInputSchema,
  type ProgrammePhase,
  type PhaseEntitlement,
  type ArrivalRoute,
  type PerimeterCheckpoint,
  type CredentialProjection,
  type OperationalVehicle,
  type OfflineAccessPackage,
} from "./programme-schemas.js";
export {
  applyS04AFixtures,
  applyS04AFixturesIfMissing,
  fixtureS04AGuests,
  fixtureS04AHousehold,
  fixtureS03CompanionEntitlement,
  S04A_FIXTURE_IDS,
} from "./addressing-fixtures.js";
export { MemoryPlatformStore } from "./memory-store.js";
export { PLATFORM_POSTGRES_SCHEMA, type PgQueryable, type PgTransactor } from "./postgres-schema.js";
export { PostgresPlatformStore, MemoryPlatformPg } from "./postgres-store.js";
export {
  PLATFORM_MIGRATIONS,
  runPlatformMigrations,
  type MigrationReport,
} from "./migrations.js";
export {
  SYNTHETIC_SEED_ID,
  SYNTHETIC_SEED_VERSION,
  applySyntheticSeedIfNeeded,
  applySyntheticSnapshot,
  ensureEosS05ACollections,
  ensureEosS05BCollections,
  readSeedLedger,
} from "./synthetic-seed.js";
export {
  SYNTHETIC_CLEANUP_CONFIRMATION,
  ACCESS_LIFECYCLE_PROBE_VENDOR_ID,
  EVENT_OS_CLEANUP_PROJECT_ID,
  EVENT_OS_CLEANUP_PROJECT_NAME,
  applySyntheticCleanup,
  purgeNormalizedRiskTables,
  assertCleanupConfirmation,
  assertCleanupProjectScope,
  classifySyntheticCleanupAttribution,
  previewSyntheticCleanup,
  recordCleanupAudit,
  cleanupAccessLifecycleProbe,
} from "./synthetic-cleanup.js";
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
export {
  ASSERTION_KINDS,
  CONFIRMATION_STATES,
  SENSITIVITY_CLASSES,
  COVERAGE_STATES,
  S05A_SENSITIVE_PERMISSIONS,
  S05B_SENSITIVE_PERMISSIONS,
} from "./constants.js";
export {
  EOS_S05A_MIGRATION_ID,
  EOS_S05A_INTELLIGENCE_MIGRATION_ID,
  EOS_S05A_INTELLIGENCE_V2_MIGRATION_ID,
  EOS_S05A_INTELLIGENCE_V3_MIGRATION_ID,
  EOS_S05A_DISCLOSURE_V5_MIGRATION_ID,
  applyEosS05AToSnapshot,
  migrateEosS05A,
  migrateEosS05AIntelligence,
  migrateEosS05AIntelligenceV2,
  migrateEosS05AIntelligenceV3,
  migrateEosS05ADisclosureV5,
} from "./eec-migration.js";
export {
  evaluateBudgetExpr,
  parseBudgetExpr,
  BudgetExprSchema,
  BUDGET_EXPR_MAX_DEPTH,
} from "./eec-budget-engine.js";
export {
  calculateCriticalPath,
  nextInterviewQuestion,
  buildExecutiveCommand,
  buildExecutiveCommandFromSnap,
} from "./eec-intelligence.js";
export { formatMoneyMinor } from "./eec-money.js";
export {
  selectPriceSource,
  compareBudgetScenariosOnSnap,
  calculateSchedule,
  nextGovernedInterviewTurn,
} from "./eec-s05a-depth.js";
export {
  INTERVIEW_CORPUS,
  INTERVIEW_CORPUS_EDITION,
  addWorkingDays,
  interviewCorpusHash,
} from "./eec-s05a-completion.js";
export {
  EVALUATION_CONTRACT_VERSION,
  EVALUATION_CORPUS_EDITION,
  EVALUATION_ORCHESTRATOR_VERSION,
  EVALUATION_PROVIDER_VERSION,
  EVALUATION_PROJECTION_POLICY_VERSION,
} from "./eec-evaluation-schemas.js";
export { S05A_EVALUATION_CASES, evaluationCorpusHash, validateEvaluationCorpus } from "./eec-evaluation-corpus.js";
export { executeS05AEvaluationOnSnap, requestS05AEvaluationOnSnap, currentEvaluationVersions } from "./eec-evaluation-runner.js";
export { s05aEvaluationReadinessFromSnap, s05aReadinessFromSnap } from "./eec-evaluation-projections.js";
export { migrateEosS05AEvaluationV4, EOS_S05A_EVALUATION_MIGRATION_ID } from "./eec-evaluation-migration.js";
export { validateS05APersistedCollections } from "./eec-persistence.js";
export {
  CreateOpportunityInputSchema,
  StartDiscoveryEngagementInputSchema,
  MoneyDtoSchema,
  type EngagementOpportunity,
  type DiscoveryEngagement,
  type CandidateAssertion,
  type AssertionConflict,
  type CoverageAssessment,
  type ExtractionInvocationResult,
} from "./eec-schemas.js";
export { addMoney, exactHash, moneyFromDto, moneyToDto, nfc } from "./eec-hash.js";
export { buildDiscoveryWorkspace, eecPermissionAllowed, type DiscoveryWorkspace, type EecCapabilities } from "./eec-projections.js";
export { extractFixtureProposals, extractGuestCountCandidates, sanitiseInertText } from "./eec-extraction.js";
export {
  decideDiscoveryDisclosure,
  resolveArtefactDisclosureClass,
  RESTRICTED_EVIDENCE_LABEL,
} from "./eec-discovery-disclosure.js";
export {
  formatExtractionInvocationReceipt,
  governingGuestCountFromBrief,
  toExtractionInvocation,
} from "./eec-operations.js";
export {
  MAX_GUEST_COUNT,
  GUEST_TARGET_COUNT,
  CalculateBudgetScenarioCommandSchema,
  parseBudgetCalculateFormData,
  parseCalculateBudgetScenarioCommand,
  prepareBudgetScenarioCalculation,
  resolveEffectiveBudgetDrivers,
  assertBudgetFormDataMatchesVisible,
  describeEffectiveGuestDriver,
  findReusableBudgetScenario,
} from "./eec-budget-override.js";
export {
  ACTION_APPLICATIONS,
  ACTION_RESULT_FOCUS_TARGETS,
  appliedMutationEffect,
  budgetGeneratedTimeLabel,
  isActionApplication,
  isAllowedActionResultTarget,
  notAppliedMutationEffect,
  parseUuidList,
  replayedMutationEffect,
  retryLockApplies,
  safeActionResultTargetId,
  type ActionApplication,
  type ActionResultFocusTarget,
  type ActionResultTarget,
  type DurableMutationEffect,
  type RetryLock,
} from "./durable-mutation-effect.js";
export { clientSafeHeading } from "./eec-projections.js";
export * as engagementIntake from "./engagement-intake/index.js";
export * as discoveryIntelligence from "./discovery-intelligence/index.js";
export * as eventBrief from "./event-brief/index.js";
export * as investmentIntelligence from "./investment-intelligence/index.js";
export * as budgetIntelligence from "./budget-intelligence/index.js";
export * as roadmapIntelligence from "./roadmap-intelligence/index.js";
export * as changeIntelligence from "./change-intelligence/index.js";
export * as executiveEventCommand from "./executive-event-command/index.js";
export * as aiAssistance from "./ai-assistance/index.js";
export {
  RecordScopeSchema,
  RiskCommandEnvelopeSchema,
  RiskDateRangeSchema,
  RISK_POLICY_TYPES,
  RISK_DOCUMENT_STATES,
  S05B_CANONICAL_COLLECTIONS,
} from "./risk-schemas.js";
export * from "./risk-form-contract.js";
export * from "./risk-protection-parties.js";
export * from "./risk-disclosure.js";
export * from "./risk-applicability.js";
export * from "./risk-authority.js";
export * from "./risk-authority-queue.js";
export * from "./risk-fixture-provenance.js";
export * from "./risk-authority-withdrawal.js";
export * from "./risk-gap-engine.js";
export * from "./risk-policy-operations.js";
export * from "./risk-clause-operations.js";
export * from "./risk-vendor-assessment.js";
export * from "./risk-continuity.js";
export * from "./risk-incidents.js";
export * from "./risk-budget-projection.js";
export * from "./risk-projections.js";
export * from "./risk-dossier-access.js";
export * from "./risk-command.js";
export * from "./risk-ports.js";
export * from "./risk-migration.js";
export * from "./risk-persistence.js";
export * from "./risk-evaluation-schemas.js";
export * from "./risk-evaluation-corpus.js";
export * from "./risk-evaluation-runner.js";
export * from "./risk-evaluation-projections.js";
export { executeS05BCase, detectUnsafeAdapter, detectUnsafeFromObservations } from "./risk-evaluation-fixtures.js";
export { MemoryRiskProtectionStore, MemoryRiskProtectionRepository } from "./memory-risk-store.js";
export { PostgresRiskProtectionStore, PostgresRiskProtectionRepository } from "./postgres-risk-store.js";
export { MemoryRiskDossierRepository } from "./memory-risk-dossier-store.js";
export { PostgresRiskDossierRepository } from "./postgres-risk-dossier-store.js";
export { RiskDossierCommandService } from "./risk-dossier-command-service.js";
export { RiskAuthorityCommandService } from "./risk-authority-command-service.js";
export {
  buildDossierEdition,
  decideDossierPublication,
  decideDossierTransition,
} from "./risk-dossier-decisions.js";
export { writeRiskSnapshotDelta, governingEditionFingerprint } from "./risk-repository.js";
export { assertBoundedDossierQueries } from "./risk-dossier-repository.js";
export { backfillNormalizedRiskTables, EOS_S05B_V2_MIGRATION_CHECKSUM } from "./risk-normalized-migration.js";
export {
  EOS_S05B_PROTECTION_V2_ID,
  EOS_S05B_NORMALIZED_MIGRATION_ID,
  EOS_S05B_NORMALIZED_MIGRATION_V3_ID,
  EOS_S05B_NORMALIZED_MIGRATION_V4_ID,
  RISK_SQL_TABLES,
} from "./risk-postgres-schema.js";
export {
  POLICY_EVIDENCE_TRANSITIONS,
  APPLICABILITY_TRANSITIONS,
  GAP_TRANSITIONS,
  CLAUSE_TRANSITIONS,
  VENDOR_ASSESSMENT_TRANSITIONS,
  CHECKIN_TRANSITIONS,
  FALLBACK_TRANSITIONS,
  INCIDENT_TRANSITIONS,
  DOSSIER_TRANSITIONS,
  assertLegalTransition,
} from "./risk-transitions.js";
export {
  SEATING_SOLVER_ID,
  SEATING_SOLVER_VERSION,
  SEATING_PREDICATE_TYPES,
  SEATING_OBJECTIVE_ORDER,
  DEFAULT_SOLVER_CONFIG,
  SolverRequestSchema,
  type SolverRequest,
  type SolverResult,
  type LexicographicScore,
} from "./seating-solver-types.js";
export { solveSeatingV1, compareLexicographic, assertSolverRequest, defaultSolverConfig } from "./seating-solver-v1.js";
export {
  seatingCorpus50,
  seatingCorpus200,
  seatingCorpus600,
  seatingImpossibleCapacity,
  seatingImpossibleLocks,
  seatingImpossibleCapability,
} from "./seating-solver-fixtures.js";
export { EOS_S06_SEATING_MIGRATION_ID, EOS_S06_SEATING_RECEIPT_ID, SEATING_SQL_TABLES } from "./seating-postgres-schema.js";
export { emptySeatingState, SEATING_COLLECTIONS } from "./seating-schemas.js";
export {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  SEATING_V2_VALIDATOR_VERSION,
  EOS_S06_SEATING_V2_MIGRATION_ID,
  EOS_S06_SEATING_V2_RECEIPT_ID,
  SeatingV2CompiledRequestSchema,
  SeatingV2ValidationReportSchema,
} from "./seating-v2-schemas.js";
export { SEATING_V2_SQL_TABLES, SEATING_V2_POSTGRES_SCHEMA } from "./seating-v2-postgres-schema.js";
export { emptySeatingV2State, SEATING_V2_COLLECTIONS, SEATING_V2_PURGE_CONFIRMATION } from "./seating-v2-state.js";
export type { SeatingV2Repository, SeatingV2Transaction } from "./seating-v2-repository.js";
export { MemorySeatingV2Repository, MemorySeatingV2Store } from "./memory-seating-v2-store.js";
export {
  seatingV2RuleContentHash,
  seatingV2SemanticHash,
  seatingV2SolverToken,
  seatingV2PackageContentHash,
  seatingV2PlanContentHash,
} from "./seating-v2-hash.js";
export { compileSeatingV2Request, assertSeatingV2CompiledRequest } from "./seating-v2-compiler.js";
export { validateSeatingV2 } from "./seating-v2-validator.js";
export { MemorySeatingRepository, MemorySeatingStore } from "./memory-seating-store.js";
export { PostgresSeatingRepository } from "./postgres-seating-store.js";
export { PostgresSeatingV2Repository } from "./postgres-seating-v2-store.js";
export type { SeatingRepository, SeatingTransaction } from "./seating-repository.js";
export { SeatingCommandService } from "./seating-command-service.js";
export { SeatingV2CommandService } from "./seating-v2-command-service.js";
export { snapshotGuestCohortAdapter, snapshotLayoutAdapter, seatingToken } from "./seating-adapters.js";
export { buildSeatingWorkspace, implicatedSeatingReviewDomains, seatingDisclosureForRole } from "./seating-workspace.js";
export { executeS06Evaluation } from "./seating-evaluation-runner.js";
export {
  S06_CASE_IDS,
  S06_EVALUATION_CORPUS_EDITION,
  S06_EVALUATION_CONTRACT_VERSION,
  s06CorpusHash,
} from "./seating-evaluation-schemas.js";
export { seatingVerifyAsAllowed, S06_VERIFY_AS_ALLOWLIST, S06_VERIFY_AS_ROLES, resolveVerifyAsRole } from "./seating-verify-as.js";
export { applyS06SeatingLayoutIfMissing } from "./seating-fixtures.js";
export { S06_SENSITIVE_PERMISSIONS } from "./constants.js";
