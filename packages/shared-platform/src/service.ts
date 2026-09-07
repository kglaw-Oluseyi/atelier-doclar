import { randomUUID } from "node:crypto";
import {
  DEFAULT_TIMEZONE,
  SCHEMA_VERSION,
  STAFF_SESSION_REVOCATION_REASONS,
  SYSTEM_ROLE_KEYS,
} from "./constants.js";
import { localFixtureAccessAuthority, type AccessAuthority } from "./access-authority.js";
import { permissionIdForKey, roleIdForKey, seededPermissions, seededRoles } from "./catalog.js";
import { PlatformError } from "./errors.js";
import { assertNamedHuman } from "./identity.js";
import { lineageFixtureMark } from "./fixtures.js";
import { emptyMasterEventFile } from "./mef.js";
import { authorize, canSeeClient, canSeeEvent, singleCoveringRoleKey, type ActorSnapshot, type PolicyDecision } from "./policy.js";
import { parseCanonicalCsv, rowToIntakeFields } from "./guest-intake.js";
import { dateOfBirthForbidden, requiresResponsibleAdult } from "./addressing.js";
import { RETAINED_SALUTATION_INVARIANT, retainedSalutationInvariant } from "./addressing-invariant.js";
import { attentionRequiredFor, operationalDisplayName } from "./guest-matching.js";
import {
  addressingAlreadyApplied,
  entitlementAlreadyApplied,
  findAlreadyAppliedPartyMember,
  findAlreadyAppliedResponsibleAdultLink,
  findAlreadyEndedResponsibleAdultLink,
  findAlreadyRemovedPartyMember,
  guestAmendmentAlreadyApplied,
  nominationAlreadyApplied,
  relationshipAlreadyApplied,
} from "./mutation-replay.js";
import {
  merchandiseGuestGrantAlreadyIssued,
  merchandiseGuestGrantAlreadyRenewed,
  merchandiseGuestGrantAlreadyRevoked,
  vendorAssignmentAlreadyIssued,
  vendorAssignmentAlreadyRenewed,
  vendorAssignmentAlreadyRevoked,
} from "./merchandise-access-replay.js";
import {
  addPartyMemberOnSnap,
  administerCompanionEntitlementOnSnap,
  administerRelationshipOnSnap,
  amendHasAddressingFields,
  applyGuestAddressing,
  createPartyOnSnap,
  createRelationshipOnSnap,
  createResponsibleAdultLinkOnSnap,
  endResponsibleAdultLinkOnSnap,
  nominateCompanionOnSnap,
  reconcileCompanionNamesOnSnap,
  removePartyMemberOnSnap,
  requireScopedGuest,
  syncChildReadiness,
} from "./addressing-operations.js";
import {
  addressingStatusRequiresConfirm,
  buildGuestAddressingWorkspace,
  projectOperationalGuest,
  type GuestAddressingCapabilities,
  type GuestAddressingWorkspace,
} from "./addressing-projections.js";
import {
  AddPartyMemberInputSchema,
  AdministerCompanionEntitlementInputSchema,
  AdministerRelationshipInputSchema,
  CreatePartyInputSchema,
  CreateRelationshipInputSchema,
  CreateResponsibleAdultLinkInputSchema,
  EndResponsibleAdultLinkInputSchema,
  NominateCompanionInputSchema,
  ReconcileCompanionNamesInputSchema,
  RemovePartyMemberInputSchema,
  UpdateGuestAddressingInputSchema,
  type AddPartyMemberInput,
  type AdministerCompanionEntitlementInput,
  type AdministerRelationshipInput,
  type CompanionEntitlement,
  type CreatePartyInput,
  type CreateRelationshipInput,
  type CreateResponsibleAdultLinkInput,
  type EndResponsibleAdultLinkInput,
  type GuestParty,
  type GuestPartyMember,
  type GuestRelationship,
  type NominateCompanionInput,
  type ReconcileCompanionNamesInput,
  type RemovePartyMemberInput,
  type ResponsibleAdultLink,
  type UpdateGuestAddressingInput,
} from "./addressing-schemas.js";
import {
  assignPhaseEntitlementOnSnap,
  consumeOfflinePackageOnSnap,
  createArrivalRouteOnSnap,
  createCheckpointOnSnap,
  createProgrammePhaseOnSnap,
  createVehicleOnSnap,
  ensureDefaultPhaseOnSnap,
  publishOfflinePackageOnSnap,
  raiseAccessExceptionOnSnap,
  resolveCheckpointOnSnap,
} from "./programme-operations.js";
import {
  buildEventProgrammeWorkspace,
  buildGuestPhaseProjection,
  programmePermissionAllowed,
  type EventProgrammeWorkspace,
} from "./programme-projections.js";
import {
  AssignPhaseEntitlementInputSchema,
  ConsumeOfflinePackageInputSchema,
  CreateArrivalRouteInputSchema,
  CreateCheckpointInputSchema,
  CreateProgrammePhaseInputSchema,
  CreateVehicleInputSchema,
  PublishOfflinePackageInputSchema,
  RaiseAccessExceptionInputSchema,
  ResolveCheckpointInputSchema,
  type ArrivalRoute,
  type ConsumeOfflinePackageInput,
  type OfflineAccessPackage,
  type PerimeterCheckpoint,
  type PhaseEntitlement,
  type ProgrammePhase,
} from "./programme-schemas.js";
import {
  assertNoProhibitedMerchandiseFields,
  assertCapCircumferenceRaw,
  captureCapMeasurementOnSnap,
  createExternalContactLinkOnSnap,
  createHostOfferRuleOnSnap,
  createMerchandiseCohortOnSnap,
  createMerchandiseCollectionOnSnap,
  createMerchandiseItemOnSnap,
  createVendorAssignmentOnSnap,
  issueHostOfferRuleOnSnap,
  issueMerchandiseGuestGrantOnSnap,
  previewOfferAudience,
  raiseMerchandiseExceptionOnSnap,
  recordGuestParticipationOnSnap,
  renewMerchandiseGuestGrantOnSnap,
  renewVendorAssignmentOnSnap,
  reviewVendorUpdateOnSnap,
  revokeMerchandiseGuestGrantOnSnap,
  revokeVendorAssignmentOnSnap,
  submitVendorUpdateOnSnap,
  updateMerchandiseCollectionOnSnap,
  updateMerchandiseItemOnSnap,
  withdrawCapMeasurementOnSnap,
  withdrawGuestOfferOnSnap,
  withdrawHostOfferRuleOnSnap,
} from "./merchandise-operations.js";
import {
  buildEventMerchandiseWorkspace,
  buildGuestDirectoryMerchandiseBadge,
  buildGuestMerchandiseProjection,
  buildVendorPortalProjection,
  merchandisePermissionAllowed,
  type EventMerchandiseWorkspace,
  type GuestMerchandiseProjection,
  type VendorPortalProjection,
} from "./merchandise-projections.js";
import {
  CaptureCapMeasurementInputSchema,
  CreateExternalContactLinkInputSchema,
  CreateHostOfferRuleInputSchema,
  CreateMerchandiseCohortInputSchema,
  CreateMerchandiseCollectionInputSchema,
  CreateMerchandiseItemInputSchema,
  CreateVendorAssignmentInputSchema,
  IssueHostOfferRuleInputSchema,
  IssueMerchandiseGuestAccessInputSchema,
  PreviewMerchandiseAudienceInputSchema,
  RaiseMerchandiseExceptionInputSchema,
  RecordGuestParticipationInputSchema,
  RenewMerchandiseGuestAccessInputSchema,
  RenewVendorAssignmentInputSchema,
  ReviewVendorUpdateInputSchema,
  RevokeMerchandiseGuestAccessInputSchema,
  RevokeVendorAssignmentInputSchema,
  SubmitVendorUpdateInputSchema,
  UpdateMerchandiseCollectionInputSchema,
  UpdateMerchandiseItemInputSchema,
  WithdrawCapMeasurementInputSchema,
  WithdrawGuestOfferInputSchema,
  WithdrawHostOfferRuleInputSchema,
  type CapMeasurement,
  type CreateVendorAssignmentInput,
  type ExternalContactLink,
  type GuestOffer,
  type GuestParticipation,
  type HostOfferRule,
  type MerchandiseCollection,
  type MerchandiseException,
  type MerchandiseGuestGrant,
  type MerchandiseItem,
  type VendorAssignment,
  type VendorUpdate,
} from "./merchandise-schemas.js";
import {
  assertNoProhibitedForecastFields,
  approveHostProjectionOnSnap,
  createEventParameterSetOnSnap,
  decideForecastOverrideOnSnap,
  decideProvisionOnSnap,
  evaluateForecastOnSnap,
  proposeForecastOverrideOnSnap,
  proposeProvisionOnSnap,
  recordCalibrationObservationOnSnap,
  runAttendanceForecastOnSnap,
} from "./forecast-operations.js";
import {
  buildEventForecastWorkspace,
  buildForecastOverviewStrip,
  buildHostForecastProjection,
  forecastPermissionAllowed,
  type EventForecastWorkspace,
  type HostForecastProjection,
} from "./forecast-projections.js";
import {
  ApproveHostProjectionInputSchema,
  CreateEventParameterSetInputSchema,
  DecideForecastOverrideInputSchema,
  DecideProvisionInputSchema,
  EvaluateForecastInputSchema,
  ProposeForecastOverrideInputSchema,
  ProposeProvisionInputSchema,
  RecordCalibrationObservationInputSchema,
  RunAttendanceForecastInputSchema,
  type AttendanceForecastRun,
  type CalibrationObservation,
  type ForecastEvaluation,
  type ForecastOverride,
  type ModelParameterSet,
  type OperationalProvisionRecommendation,
} from "./forecast-schemas.js";
import {
  DEFAULT_NON_PRODUCTION_ATELIER_ACCESS,
  assertAtelierAccessConfig,
  hashAtelierLinkToken,
  issueAtelierSession,
  readAtelierSession,
  atelierAccessUnavailable,
  type AtelierAccessConfig,
  type AtelierSessionActor,
} from "./atelier-access.js";
import {
  ensureNarrativeRevisionDraftOnSnap,
  issueAtelierAccessOnSnap,
  issueAtelierStepUpOnSnap,
  publishAtelierOnSnap,
  publishCuratedUpdateOnSnap,
  publishDecisionRequestOnSnap,
  publishNarrativeEditionOnSnap,
  renewAtelierAccessOnSnap,
  reviewHostDecisionOnSnap,
  revokeAtelierAccessOnSnap,
  submitHostDecisionOnSnap,
} from "./atelier-operations.js";
import {
  atelierPermissionAllowed,
  buildEventAtelierWorkspace,
  buildHostAtelierProjection,
  type EventAtelierWorkspace,
  type HostAtelierProjection,
} from "./atelier-projections.js";
import {
  IssueAtelierAccessInputSchema,
  PublishAtelierInputSchema,
  PublishCuratedUpdateInputSchema,
  PublishDecisionRequestInputSchema,
  PublishNarrativeEditionInputSchema,
  RenewAtelierAccessInputSchema,
  ReviewHostDecisionInputSchema,
  RevokeAtelierAccessInputSchema,
  StartNarrativeRevisionInputSchema,
  SubmitHostDecisionInputSchema,
  type AtelierAccessGrant,
  type EventAtelier,
  type EventNarrativeEdition,
  type HostDecisionReceipt,
  type HostDecisionRequest,
} from "./atelier-schemas.js";
import {
  assembleRecipientContentOnSnap,
  assertNoLanguageInference,
  createContentWorkOnSnap,
  createCulturalSourceTextOnSnap,
  createDependentEditionOnSnap,
  createTerminologyEntryOnSnap,
  decideCulturalTextOnSnap,
  decideTranslationOnSnap,
  recordLanguagePreferenceOnSnap,
  supersedeSourceEditionOnSnap,
} from "./language-operations.js";
import {
  buildEventLanguageWorkspace,
  languagePermissionAllowed,
  type EventLanguageWorkspace,
} from "./language-projections.js";
import {
  AssembleRecipientContentInputSchema,
  CreateContentWorkInputSchema,
  CreateCulturalSourceTextInputSchema,
  CreateDependentEditionInputSchema,
  CreateTerminologyEntryInputSchema,
  DecideCulturalTextInputSchema,
  DecideTranslationInputSchema,
  RecordLanguagePreferenceInputSchema,
  SupersedeSourceEditionInputSchema,
  type ContentEdition,
  type ContentWork,
  type CulturalSourceText,
  type LanguageProfile,
  type RecipientAssembly,
  type TerminologyEntry,
} from "./language-schemas.js";
import {
  DEFAULT_NON_PRODUCTION_VENDOR_ACCESS,
  assertVendorAccessConfig,
  generateVendorAssignmentToken,
  hashVendorAssignmentToken,
  issueVendorSession,
  readVendorSession,
  vendorAccessUnavailable,
  type VendorAccessConfig,
  type VendorSessionActor,
} from "./merchandise-vendor-access.js";
import {
  DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS,
  assertMerchandiseGuestAccessConfig,
  generateMerchandiseGuestGrantToken,
  hashMerchandiseGuestGrantToken,
  issueMerchandiseGuestSession,
  merchandiseGuestAccessUnavailable,
  readMerchandiseGuestSession,
  type MerchandiseGuestAccessConfig,
  type MerchandiseGuestSessionActor,
} from "./merchandise-guest-access.js";
import {
  applyGuestAmendment,
  buildOperationalGuest,
  compareGuests,
  guestMatchesQuery,
  recordDuplicateCandidates,
  upsertHousehold,
} from "./guest-operations.js";
import {
  DEFAULT_NON_PRODUCTION_RSVP_ACCESS,
  assertRsvpAccessConfig,
  generateInvitationToken,
  guestAccessUnavailable,
  hashGuestSessionToken,
  hashInvitationToken,
  invitationPrefix,
  issueGuestSession,
  readGuestSession,
  type GuestSessionActor,
  type RsvpAccessConfig,
} from "./rsvp-access.js";
import {
  activeInvitationForGuest,
  amendmentsAllowed,
  applyResponseAnswers,
  canonicalQuestionnaireSections,
  companionAllowance,
  compileVisibleQuestions,
  defaultRsvpPolicy,
  ensureResponse,
  ensureRsvpKeyRing,
  eventPolicy,
  expireInvitations,
  guestVisibleName,
  householdSubjects,
  policyIsOpen,
  publishedQuestionnaire,
  reconcileEventProjection,
  responseForGuest,
  rsvpAttention,
  withdrawResponse,
} from "./rsvp-operations.js";
import {
  AmendGuestInputSchema,
  GuestDirectoryQuerySchema,
  ImportGuestsInputSchema,
  IntakeGuestInputSchema,
  LinkGuestPersonInputSchema,
  ResolveDuplicateInputSchema,
  UnlinkGuestPersonInputSchema,
  type AmendGuestInput,
  type GuestDirectoryQuery,
  type GuestDuplicateCandidate,
  type GuestHousehold,
  type GuestIntakeBatch,
  type ImportGuestsInput,
  type IntakeGuestInput,
  type LinkGuestPersonInput,
  type OperationalGuest,
  type ResolveDuplicateInput,
  type UnlinkGuestPersonInput,
} from "./guest-schemas.js";
import {
  AcknowledgeAssistanceInputSchema,
  CloseRsvpQuestionnaireInputSchema,
  GrantRsvpEntitlementInputSchema,
  GuestAssistanceInputSchema,
  GuestRsvpSaveInputSchema,
  IssueRsvpInvitationInputSchema,
  PrepareEventRsvpInputSchema,
  PublishRsvpQuestionnaireInputSchema,
  ReviewRsvpExceptionInputSchema,
  RevokeRsvpEntitlementInputSchema,
  RevokeRsvpInvitationInputSchema,
  RotateRsvpInvitationInputSchema,
  RsvpDirectoryQuerySchema,
  StaffRsvpResponseInputSchema,
  UpsertRsvpPolicyInputSchema,
  type RsvpAssistanceRequest,
  type RsvpDirectoryQuery,
  type RsvpEntitlement,
  type RsvpEventProjection,
  type RsvpException,
  type RsvpInvitation,
  type RsvpPolicy,
  type RsvpQuestionnaire,
  type RsvpResponse,
} from "./rsvp-schemas.js";
import { redactValue, stableHash } from "./redaction.js";
import {
  DEFAULT_NON_PRODUCTION_STAFF_SESSION,
  assertSessionConfig,
  hashStaffSessionToken,
  issueSession,
  readSession,
  type SessionConfig,
} from "./session.js";
import {
  CreateClientInputSchema,
  CreateEventInputSchema,
  GrantAssignmentInputSchema,
  RecordConsentInputSchema,
  AuthenticateStaffInputSchema,
  RegisterGuestReferenceInputSchema,
  RevokeAssignmentInputSchema,
  type AuthenticateStaffInput,
  type StaffSession,
  TransitionEventInputSchema,
  UpdateClientInputSchema,
  UpdateEventInputSchema,
  UpdateMefSlotInputSchema,
  type Assignment,
  type AuditEvent,
  type Client,
  type Organisation,
  type ConsentRecord,
  type CreateClientInput,
  type CreateEventInput,
  type EventRecord,
  type GrantAssignmentInput,
  type GuestReference,
  type MasterEventFile,
  type PermissionKey,
  type Person,
  type RecordConsentInput,
  type RegisterGuestReferenceInput,
  type RevokeAssignmentInput,
  type ScopeInput,
  type TransitionEventInput,
  type UpdateClientInput,
  type UpdateEventInput,
  type UpdateMefSlotInput,
} from "./schemas.js";
import type { PlatformSnapshot, PlatformStore } from "./store.js";
import { eventStatusAfterPhase, assertPhaseTransition } from "./transitions.js";
import {
  applySyntheticCallbackOnSnap,
  communicationsOverview,
  decideCampaignOnSnap,
  dispatchOutboxOnSnap,
  expandCampaignOnSnap,
  guestEligibility,
  ingestInboundOnSnap,
  legalCampaignTransition,
  openAssistanceTask,
  prepareCommunicationsOnSnap,
  previewAudienceOnSnap,
  requestCampaignApprovalOnSnap,
  signSyntheticPayload,
  syncContactProjections,
} from "./communications-api.js";
import {
  ALLOWED_TEMPLATE_VARIABLES,
  contentHash,
  eventChannelPolicy,
  eventOccasion,
  extractVariables,
  projectGuestSafeOccasion,
  replyEligibilityPublicMessage,
} from "./communications-operations.js";
import {
  ApproveTemplateInputSchema,
  CampaignActionInputSchema,
  CampaignDecisionInputSchema,
  ConciergeReplyInputSchema,
  CreateCampaignInputSchema,
  CreateTemplateVersionInputSchema,
  DecideCorrectionInputSchema,
  IngestInboundInputSchema,
  PrepareCommunicationsInputSchema,
  PreviewAudienceInputSchema,
  ProposeCorrectionInputSchema,
  PublishChannelPolicyInputSchema,
  PublishOccasionInputSchema,
  RequestCampaignApprovalInputSchema,
  ResolveUnmatchedInputSchema,
  SuppressContactInputSchema,
  SyntheticCallbackInputSchema,
  TaskActionInputSchema,
  UpsertAudienceInputSchema,
  type Campaign,
  type ChannelPolicy,
  type ContactCorrection,
  type ContactCorrectionReview,
  type ContactCorrectionSourceEvidence,
  type FollowUpTask,
  type GuestSafeOccasion,
  type GuestSafeOccasionView,
  type InboundMessage,
  type MessageTemplate,
  type MessageTemplateVersion,
  type MsgChannel,
  type MsgPurpose,
} from "./communications-schemas.js";

export interface ActorContext {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
  allowScaffoldedTransitions?: boolean;
}

export interface PlatformServiceOptions {
  rsvpAccess?: RsvpAccessConfig;
  staffSession?: SessionConfig;
  vendorAccess?: VendorAccessConfig;
  merchandiseGuestAccess?: MerchandiseGuestAccessConfig;
  atelierAccess?: AtelierAccessConfig;
  accessAuthority?: AccessAuthority;
}

export interface IssuedRsvpInvitation {
  invitation: RsvpInvitation;
  token: string;
  guestAccessPath: string;
}

export interface GuestSelfServiceView {
  eventDisplayName: string;
  hostDisplayName: string;
  privacyNotice: string;
  guestDisplayName: string;
  attendanceIntent: RsvpResponse["attendanceIntent"];
  status: RsvpResponse["status"];
  respondedAt?: string;
  amendmentsPermitted: boolean;
  expectedVersion: number;
  companionAllowance: number;
  householdMembers: Array<{ guestId: string; displayName: string }>;
  sections: RsvpQuestionnaire["sections"];
  answers: RsvpResponse["answers"];
  assistanceOpen: boolean;
  confirmation?: { submittedAt: string; attendanceIntent: RsvpResponse["attendanceIntent"] };
  occasion?: GuestSafeOccasionView;
}

export type { GuestAddressingCapabilities, GuestAddressingWorkspace };

export interface RsvpGuestDirectoryRow {
  guest: OperationalGuest;
  attendanceIntent: RsvpResponse["attendanceIntent"];
  responseStatus: RsvpResponse["status"];
  provenance?: RsvpResponse["provenance"];
  respondedAt?: string;
  invitationStatus?: RsvpInvitation["status"];
  attentionRequired: boolean;
}

function parseStrict<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new PlatformError("VALIDATION_FAILED", "payload failed schema validation", {
      details: parsed.error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`),
    });
  }
  return parsed.data;
}

export class PlatformService {
  constructor(
    private readonly store: PlatformStore,
    private readonly options: PlatformServiceOptions = {},
  ) {}

  private accessAuthority(): AccessAuthority {
    return this.options.accessAuthority ?? localFixtureAccessAuthority();
  }

  rsvpAccessConfig(): RsvpAccessConfig {
    const config = this.options.rsvpAccess ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS;
    assertRsvpAccessConfig(config, this.accessAuthority().productionAuthorised);
    return config;
  }

  vendorAccessConfig(): VendorAccessConfig {
    const config = this.options.vendorAccess ?? DEFAULT_NON_PRODUCTION_VENDOR_ACCESS;
    assertVendorAccessConfig(config, this.accessAuthority());
    return config;
  }

  atelierAccessConfig(): AtelierAccessConfig {
    const config = this.options.atelierAccess ?? DEFAULT_NON_PRODUCTION_ATELIER_ACCESS;
    assertAtelierAccessConfig(config, this.accessAuthority());
    return config;
  }

  merchandiseGuestAccessConfig(): MerchandiseGuestAccessConfig {
    const rsvp = this.options.rsvpAccess ?? this.rsvpAccessConfig();
    const config =
      this.options.merchandiseGuestAccess ??
      ({
        grantPepper: rsvp.invitationPepper,
        sessionSecret: rsvp.sessionSecret,
        currentKeyId: rsvp.currentKeyId,
        grantTtlSeconds: DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS.grantTtlSeconds,
        sessionTtlSeconds: rsvp.sessionTtlSeconds ?? DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS.sessionTtlSeconds,
        maxExchangeFailures: rsvp.maxExchangeFailures ?? DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS.maxExchangeFailures,
      } satisfies MerchandiseGuestAccessConfig);
    assertMerchandiseGuestAccessConfig(config, this.accessAuthority());
    return config;
  }

  staffSessionConfig(): SessionConfig {
    const config = this.options.staffSession ?? DEFAULT_NON_PRODUCTION_STAFF_SESSION;
    assertSessionConfig(config, this.accessAuthority().productionAuthorised);
    return config;
  }

  seedCatalogue(at = "2026-09-05T14:00:00.000Z"): void {
    const snap = this.store.snapshot();
    snap.permissions = seededPermissions();
    snap.roles = seededRoles();
    snap.rolePermissions = seededRoles().flatMap((role) =>
      (role.key === "CEO"
        ? seededPermissions().filter((item) => item.key !== "support.impersonate")
        : []
      ).map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
        effect: "ALLOW" as const,
        createdAt: at,
      })),
    );
    this.store.replace(snap);
  }

  loadSnapshot(snapshot: PlatformSnapshot): void {
    this.store.replace(snapshot);
  }

  currentSnapshot(): PlatformSnapshot {
    return this.store.snapshot();
  }

  resolveActor(personId: string): ActorSnapshot {
    const snap = this.store.snapshot();
    const person = snap.persons.find((item) => item.id === personId);
    if (!person) throw new PlatformError("AUTH_REQUIRED", "person is not provisioned");
    return {
      person,
      assignments: snap.assignments.filter((item) => item.personId === personId),
      roles: snap.roles,
    };
  }

  findPersonByIdentity(input: { externalSubject?: string; email?: string }): Person | undefined {
    const snap = this.store.snapshot();
    if (input.externalSubject) {
      const bySubject = snap.persons.find((item) => item.externalSubject === input.externalSubject);
      if (bySubject) return bySubject;
    }
    if (input.email) {
      return snap.persons.find((item) => item.email === input.email);
    }
    return undefined;
  }

  recordAuthentication(personId: string, now: string, correlationId: string, outcome: "SUCCESS" | "DENIED"): void {
    const snap = this.store.snapshot();
    const person = snap.persons.find((item) => item.id === personId);
    if (person && outcome === "SUCCESS") {
      person.lastAuthenticatedAt = now;
      person.updatedAt = now;
      person.version += 1;
    }
    this.writeAudit(snap, {
      action: "auth.session",
      outcome,
      actorPersonId: personId,
      resourceType: "person",
      resourceId: personId,
      correlationId,
      occurredAt: now,
    });
    this.store.replace(snap);
  }

  authenticateNamedStaff(
    raw: unknown,
    now = new Date().toISOString(),
    correlationId = randomUUID(),
  ): { person: Person; token: string; session: StaffSession } {
    const input = parseStrict<AuthenticateStaffInput>(AuthenticateStaffInputSchema, raw);
    const config = this.staffSessionConfig();
    const snap = this.store.snapshot();
    const email = input.email.trim().toLowerCase();
    const matches = snap.persons.filter((item) => item.email.trim().toLowerCase() === email);
    if (matches.length > 1) {
      this.writeAudit(snap, {
        action: "auth.session.denied",
        outcome: "DENIED",
        resourceType: "staff_session",
        correlationId,
        occurredAt: now,
        reason: "ambiguous identity",
      });
      this.store.replace(snap);
      throw new PlatformError("VALIDATION_FAILED", "identity is ambiguous", {
        publicMessage: "Sign in failed. Check the named identity and access token.",
      });
    }
    const person = matches[0];
    if (!person || person.status !== "ACTIVE") {
      this.writeAudit(snap, {
        action: "auth.session.denied",
        outcome: "DENIED",
        resourceType: "staff_session",
        correlationId,
        occurredAt: now,
        reason: "unrecognised or inactive identity",
      });
      this.store.replace(snap);
      throw new PlatformError("AUTH_REQUIRED", "unrecognised identity", {
        publicMessage: "Sign in failed. Check the named identity and access token.",
      });
    }
    const sessionId = randomUUID();
    let issued: ReturnType<typeof issueSession>;
    try {
      issued = issueSession(
        { personId: person.id, accessToken: input.accessToken, sessionId, now },
        config,
      );
    } catch (error) {
      this.writeAudit(snap, {
        action: "auth.session.denied",
        outcome: "DENIED",
        resourceType: "staff_session",
        correlationId,
        occurredAt: now,
        reason: "authentication failed",
      });
      this.store.replace(snap);
      throw error;
    }
    const record: StaffSession = {
      id: sessionId,
      personId: person.id,
      issuedAt: issued.actor.issuedAt,
      expiresAt: issued.actor.expiresAt,
      tokenBindingHash: hashStaffSessionToken(issued.token, config),
      lastSeenAt: now,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...lineageFixtureMark(person),
    };
    snap.staffSessions.push(record);
    person.lastAuthenticatedAt = now;
    person.updatedAt = now;
    person.version += 1;
    this.writeAudit(snap, {
      action: "auth.session.issued",
      outcome: "SUCCESS",
      actorPersonId: person.id,
      resourceType: "staff_session",
      resourceId: sessionId,
      correlationId,
      occurredAt: now,
    });
    this.store.replace(snap);
    return { person, token: issued.token, session: record };
  }

  requireStaffSession(token: string | undefined, now = new Date().toISOString()) {
    const config = this.staffSessionConfig();
    const actor = readSession(token, config, now);
    const snap = this.store.snapshot();
    const record = snap.staffSessions.find((item) => item.id === actor.sessionId);
    if (!record) {
      throw new PlatformError("AUTH_REQUIRED", "session is no longer valid", {
        publicMessage: "Sign in is required.",
        details: ["legacy"],
      });
    }
    if (record.revokedAt) {
      throw new PlatformError("AUTH_REQUIRED", "session is no longer valid", {
        publicMessage: "Sign in is required.",
        details: ["revoked"],
      });
    }
    if (record.personId !== actor.personId || !token || record.tokenBindingHash !== hashStaffSessionToken(token, config)) {
      throw new PlatformError("AUTH_REQUIRED", "session is no longer valid", {
        publicMessage: "Sign in is required.",
        details: ["revoked"],
      });
    }
    if (Date.parse(record.expiresAt) <= Date.parse(now)) {
      throw new PlatformError("AUTH_REQUIRED", "session has expired", {
        publicMessage: "Sign in is required.",
        details: ["expired"],
      });
    }
    const person = snap.persons.find((item) => item.id === record.personId);
    if (!person || person.status !== "ACTIVE") {
      throw new PlatformError("AUTH_REQUIRED", "identity is inactive", {
        publicMessage: "Sign in is required.",
        details: ["inactive"],
      });
    }
    return { actor, session: record, person };
  }

  revokeStaffSession(
    sessionId: string,
    reason: (typeof STAFF_SESSION_REVOCATION_REASONS)[number],
    now = new Date().toISOString(),
    correlationId = randomUUID(),
  ): { revoked: boolean } {
    const snap = this.store.snapshot();
    const record = snap.staffSessions.find((item) => item.id === sessionId);
    if (!record || record.revokedAt) return { revoked: false };
    record.revokedAt = now;
    record.revocationReason = reason;
    record.version += 1;
    record.updatedAt = now;
    this.writeAudit(snap, {
      action: "auth.session.revoked",
      outcome: "SUCCESS",
      actorPersonId: record.personId,
      resourceType: "staff_session",
      resourceId: record.id,
      correlationId,
      reason,
      occurredAt: now,
    });
    this.store.replace(snap);
    return { revoked: true };
  }

  logoutStaffSession(
    token: string | undefined,
    now = new Date().toISOString(),
    correlationId = randomUUID(),
  ): { revoked: boolean } {
    if (!token) return { revoked: false };
    let actor;
    try {
      actor = readSession(token, this.staffSessionConfig(), now);
    } catch {
      return { revoked: false };
    }
    const snap = this.store.snapshot();
    const record = snap.staffSessions.find((item) => item.id === actor.sessionId);
    if (!record || record.revokedAt) return { revoked: false };
    if (record.personId !== actor.personId) return { revoked: false };
    record.revokedAt = now;
    record.revocationReason = "LOGOUT";
    record.version += 1;
    record.updatedAt = now;
    this.writeAudit(snap, {
      action: "auth.session.revoked",
      outcome: "SUCCESS",
      actorPersonId: record.personId,
      resourceType: "staff_session",
      resourceId: record.id,
      correlationId,
      reason: "LOGOUT",
      occurredAt: now,
    });
    this.store.replace(snap);
    return { revoked: true };
  }

  createClient(actor: ActorContext, raw: unknown): Client {
    const input = parseStrict<CreateClientInput>(CreateClientInputSchema, raw);
    return this.mutate(actor, {
      permission: "client.create",
      scope: { organisationId: input.organisationId },
      action: "client.created",
      resourceType: "client",
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireOrganisation(snap, input.organisationId);
        if (snap.clients.some((item) => item.organisationId === input.organisationId && item.code === input.code)) {
          throw new PlatformError("VALIDATION_FAILED", "client code must be unique within the organisation", {
            field: "code",
          });
        }
        const record: Client = {
          id: randomUUID(),
          organisationId: input.organisationId,
          code: input.code,
          displayName: input.displayName,
          ...(input.legalName ? { legalName: input.legalName } : {}),
          status: input.status,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.clients.push(record);
        return record;
      },
    });
  }

  updateClient(actor: ActorContext, raw: unknown): Client {
    const input = parseStrict<UpdateClientInput>(UpdateClientInputSchema, raw);
    return this.mutate(actor, {
      permission: "client.update",
      scope: { organisationId: input.organisationId, clientId: input.clientId },
      action: "client.updated",
      resourceType: "client",
      resourceId: input.clientId,
      reason: input.reason,
      run: (snap, ctx) => {
        const record = this.requireClient(snap, input.organisationId, input.clientId);
        this.assertVersion(record.version, input.expectedVersion);
        if (input.displayName) record.displayName = input.displayName;
        if (input.legalName) record.legalName = input.legalName;
        if (input.status) record.status = input.status;
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  archiveClient(actor: ActorContext, input: { organisationId: string; clientId: string; expectedVersion: number; reason: string }): Client {
    return this.mutate(actor, {
      permission: "client.archive",
      scope: { organisationId: input.organisationId, clientId: input.clientId },
      action: "client.archived",
      resourceType: "client",
      resourceId: input.clientId,
      reason: input.reason,
      run: (snap, ctx) => {
        const record = this.requireClient(snap, input.organisationId, input.clientId);
        this.assertVersion(record.version, input.expectedVersion);
        record.status = "ARCHIVED";
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  createEvent(actor: ActorContext, raw: unknown): EventRecord {
    const input = parseStrict<CreateEventInput>(CreateEventInputSchema, raw);
    return this.mutate(actor, {
      permission: "event.create",
      scope: { organisationId: input.organisationId, clientId: input.clientId },
      action: "event.created",
      resourceType: "event",
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const client = this.requireClient(snap, input.organisationId, input.clientId);
        if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
          throw new PlatformError("VALIDATION_FAILED", "event end must be after start", { field: "endsAt" });
        }
        if (snap.events.some((item) => item.clientId === client.id && item.code === input.code)) {
          throw new PlatformError("VALIDATION_FAILED", "event code must be unique within the client", { field: "code" });
        }
        const eventId = randomUUID();
        const mefId = randomUUID();
        const record: EventRecord = {
          id: eventId,
          organisationId: client.organisationId,
          clientId: client.id,
          ...(input.programmeId ? { programmeId: input.programmeId } : {}),
          code: input.code,
          name: input.name,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          timezone: input.timezone || DEFAULT_TIMEZONE,
          ...(input.venueSummary ? { venueSummary: input.venueSummary } : {}),
          phase: "DISCOVER",
          status: "DRAFT",
          masterEventFileId: mefId,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.events.push(record);
        snap.masterEventFiles.push(
          emptyMasterEventFile({
            id: mefId,
            organisationId: record.organisationId,
            clientId: record.clientId,
            eventId: record.id,
            at: ctx.now,
          }),
        );
        ensureDefaultPhaseOnSnap(snap, record, ctx.now, randomUUID());
        snap.phaseHistory.push({
          id: randomUUID(),
          organisationId: record.organisationId,
          clientId: record.clientId,
          eventId: record.id,
          toPhase: "DISCOVER",
          reason: "event created",
          changedByPersonId: actor.personId,
          changedAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
        });
        return record;
      },
    });
  }

  updateEvent(actor: ActorContext, raw: unknown): EventRecord {
    const input = parseStrict<UpdateEventInput>(UpdateEventInputSchema, raw);
    return this.mutate(actor, {
      permission: "event.update",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "event.updated",
      resourceType: "event",
      resourceId: input.eventId,
      reason: input.reason,
      run: (snap, ctx) => {
        const record = this.requireEvent(snap, input.organisationId, input.eventId);
        this.assertVersion(record.version, input.expectedVersion);
        if (input.name) record.name = input.name;
        if (input.startsAt) record.startsAt = input.startsAt;
        if (input.endsAt) record.endsAt = input.endsAt;
        if (input.timezone) record.timezone = input.timezone;
        if (input.venueSummary) record.venueSummary = input.venueSummary;
        if (Date.parse(record.endsAt) <= Date.parse(record.startsAt)) {
          throw new PlatformError("VALIDATION_FAILED", "event end must be after start");
        }
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  transitionEvent(actor: ActorContext, raw: unknown): EventRecord {
    const input = parseStrict<TransitionEventInput>(TransitionEventInputSchema, raw);
    return this.mutate(actor, {
      permission: "event.phase.transition",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "event.phase.transitioned",
      resourceType: "event",
      resourceId: input.eventId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = this.requireEvent(snap, input.organisationId, input.eventId);
        this.assertVersion(record.version, input.expectedVersion);
        assertPhaseTransition(record, input.toPhase, { allowScaffoldedTransitions: actor.allowScaffoldedTransitions });
        const fromPhase = record.phase;
        record.phase = input.toPhase;
        record.status = eventStatusAfterPhase(input.toPhase, record.status);
        record.version += 1;
        record.updatedAt = ctx.now;
        snap.phaseHistory.push({
          id: randomUUID(),
          organisationId: record.organisationId,
          clientId: record.clientId,
          eventId: record.id,
          fromPhase,
          toPhase: input.toPhase,
          reason: input.reason,
          changedByPersonId: actor.personId,
          changedAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
        });
        return record;
      },
    });
  }

  archiveEvent(actor: ActorContext, input: { organisationId: string; eventId: string; expectedVersion: number; reason: string }): EventRecord {
    return this.mutate(actor, {
      permission: "event.archive",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "event.archived",
      resourceType: "event",
      resourceId: input.eventId,
      reason: input.reason,
      run: (snap, ctx) => {
        const record = this.requireEvent(snap, input.organisationId, input.eventId);
        this.assertVersion(record.version, input.expectedVersion);
        record.status = "ARCHIVED";
        record.archivedAt = ctx.now;
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  grantAssignment(actor: ActorContext, raw: unknown): Assignment {
    const input = parseStrict<GrantAssignmentInput>(GrantAssignmentInputSchema, raw);
    return this.mutate(actor, {
      permission: "assignment.manage",
      scope: { organisationId: input.organisationId, clientId: input.clientId, eventId: input.eventId },
      action: "assignment.granted",
      resourceType: "assignment",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireOrganisation(snap, input.organisationId);
        if (input.eventId) this.requireEvent(snap, input.organisationId, input.eventId);
        else if (input.clientId) this.requireClient(snap, input.organisationId, input.clientId);
        const person = snap.persons.find((item) => item.id === input.personId);
        if (!person) throw new PlatformError("NOT_FOUND", "person is not provisioned");
        if (!(SYSTEM_ROLE_KEYS as readonly string[]).includes(input.roleKey)) {
          throw new PlatformError("VALIDATION_FAILED", "unknown role");
        }
        const record: Assignment = {
          id: randomUUID(),
          organisationId: input.organisationId,
          ...(input.clientId ? { clientId: input.clientId } : {}),
          ...(input.eventId ? { eventId: input.eventId } : {}),
          personId: input.personId,
          roleId: roleIdForKey(input.roleKey),
          ...(input.startsAt ? { startsAt: input.startsAt } : {}),
          ...(input.endsAt ? { endsAt: input.endsAt } : {}),
          status: "ACTIVE",
          grantedByPersonId: actor.personId,
          reason: input.reason,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.assignments.push(record);
        return record;
      },
    });
  }

  revokeAssignment(actor: ActorContext, raw: unknown): Assignment {
    const input = parseStrict<RevokeAssignmentInput>(RevokeAssignmentInputSchema, raw);
    return this.mutate(actor, {
      permission: "assignment.manage",
      scope: { organisationId: input.organisationId },
      action: "assignment.revoked",
      resourceType: "assignment",
      resourceId: input.assignmentId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.assignments.find((item) => item.id === input.assignmentId);
        if (!record || record.organisationId !== input.organisationId) {
          throw new PlatformError("NOT_FOUND", "assignment was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        record.status = "REVOKED";
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  updateMasterEventFileSlot(actor: ActorContext, raw: unknown): MasterEventFile {
    const input = parseStrict<UpdateMefSlotInput>(UpdateMefSlotInputSchema, raw);
    return this.mutate(actor, {
      permission: "mef.update",
      scope: { organisationId: input.organisationId },
      action: "mef.slot.updated",
      resourceType: "master_event_file",
      resourceId: input.masterEventFileId,
      reason: input.reason,
      run: (snap, ctx) => {
        if (actor.actorKind === "AI") {
          throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "AI cannot update Master Event File truth");
        }
        const record = snap.masterEventFiles.find((item) => item.id === input.masterEventFileId);
        if (!record || record.organisationId !== input.organisationId) {
          throw new PlatformError("NOT_FOUND", "master event file was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        const slot = record.slots.find((item) => item.key === input.slot);
        if (!slot) throw new PlatformError("VALIDATION_FAILED", "unknown MEF slot");
        if (slot.status === "VERIFIED") {
          throw new PlatformError("VERSION_CONFLICT", "verified MEF truth cannot be silently overwritten");
        }
        slot.status = input.status;
        slot.verificationState = "UNVERIFIED";
        slot.authorityPersonId = actor.personId;
        slot.provenance = {
          source: "event-os-foundation",
          recordedByPersonId: actor.personId,
          recordedAt: ctx.now,
        };
        if (input.note) slot.note = input.note;
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  recordConsent(actor: ActorContext, raw: unknown): ConsentRecord {
    const input = parseStrict<RecordConsentInput>(RecordConsentInputSchema, raw);
    return this.mutate(actor, {
      permission: "consent.record",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "consent.recorded",
      resourceType: "consent",
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireOrganisation(snap, input.organisationId);
        if (!snap.persons.some((item) => item.id === input.personId)) {
          throw new PlatformError("NOT_FOUND", "person is not provisioned");
        }
        if (input.eventId) this.requireEvent(snap, input.organisationId, input.eventId);
        const record: ConsentRecord = {
          id: randomUUID(),
          organisationId: input.organisationId,
          personId: input.personId,
          ...(input.eventId ? { eventId: input.eventId } : {}),
          purpose: input.purpose,
          status: "RECORDED",
          ...(input.policyVersionId ? { policyVersionId: input.policyVersionId } : {}),
          recordedByPersonId: actor.personId,
          recordedAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.consents.push(record);
        return record;
      },
    });
  }

  registerGuestReference(actor: ActorContext, raw: unknown): GuestReference {
    const input = parseStrict<RegisterGuestReferenceInput>(RegisterGuestReferenceInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.reference.register",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.reference.registered",
      resourceType: "guest_reference",
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireOrganisation(snap, input.organisationId);
        if (!snap.persons.some((item) => item.id === input.personId)) {
          throw new PlatformError("NOT_FOUND", "person is not provisioned");
        }
        if (input.eventId) this.requireEvent(snap, input.organisationId, input.eventId);
        const record: GuestReference = {
          id: randomUUID(),
          organisationId: input.organisationId,
          personId: input.personId,
          ...(input.eventId ? { eventId: input.eventId } : {}),
          ...(input.householdId ? { householdId: input.householdId } : {}),
          ...(input.invitationContext ? { invitationContext: input.invitationContext } : {}),
          status: "REFERENCE_ONLY",
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.guestReferences.push(record);
        return record;
      },
    });
  }

  intakeGuest(actor: ActorContext, raw: unknown): OperationalGuest {
    const input = parseStrict<IntakeGuestInput>(IntakeGuestInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.intake.create",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.intake.created",
      resourceType: "operational_guest",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        if (input.personId && !snap.persons.some((item) => item.id === input.personId)) {
          throw new PlatformError("NOT_FOUND", "person is not provisioned");
        }
        const household = input.householdKey
          ? upsertHousehold(snap, {
              organisationId: event.organisationId,
              clientId: event.clientId,
              eventId: event.id,
              key: input.householdKey,
              now: ctx.now,
            })
          : undefined;
        const record = buildOperationalGuest({
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          fields: input,
          source: "MANUAL_STAFF",
          actorPersonId: actor.personId,
          correlationId: actor.correlationId,
          now: ctx.now,
          ...(household ? { householdId: household.id } : {}),
        });
        snap.operationalGuests.push(record);
        if (record.ageBand) syncChildReadiness(snap, record);
        const resolved = recordDuplicateCandidates(snap, record, snap.persons, ctx.now);
        if (input.personId) {
          this.linkGuestInSnapshot(snap, resolved, input.personId, actor, ctx.now);
        }
        if (eventChannelPolicy(snap, event.id)) {
          syncContactProjections(snap, event.id, ctx.now);
        }
        return resolved;
      },
    });
  }

  amendGuest(actor: ActorContext, raw: unknown): OperationalGuest {
    const input = parseStrict<AmendGuestInput>(AmendGuestInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.record.amend",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.record.amended",
      resourceType: "operational_guest",
      resourceId: input.guestId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => {
        const record = fresh.operationalGuests.find((item) => item.id === input.guestId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          return undefined;
        }
        return guestAmendmentAlreadyApplied(record, input) ? record : undefined;
      },
      run: (snap, ctx) => {
        if (amendHasAddressingFields(input)) {
          throw new PlatformError(
            "VALIDATION_FAILED",
            "addressing must be updated through the addressing service",
          );
        }
        const record = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        this.assertVersion(record.version, input.expectedVersion);
        applyGuestAmendment(record, input, ctx.now);
        if (eventChannelPolicy(snap, record.eventId)) {
          syncContactProjections(snap, record.eventId, ctx.now);
        }
        return recordDuplicateCandidates(snap, record, snap.persons, ctx.now);
      },
    });
  }

  resolveGuestDuplicate(actor: ActorContext, raw: unknown): GuestDuplicateCandidate {
    const input = parseStrict<ResolveDuplicateInput>(ResolveDuplicateInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.duplicate.resolve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.duplicate.resolved",
      resourceType: "guest_duplicate_candidate",
      resourceId: input.candidateId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.guestDuplicateCandidates.find((item) => item.id === input.candidateId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "duplicate candidate was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        if (record.status === "RESOLVED") {
          throw new PlatformError("VERSION_CONFLICT", "duplicate candidate is already resolved");
        }
        if (input.decision === "LINK_PERSON") {
          if (!input.personId) {
            throw new PlatformError("VALIDATION_FAILED", "personId is required to link", { field: "personId" });
          }
          const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, record.subjectGuestId);
          this.linkGuestInSnapshot(snap, guest, input.personId, actor, ctx.now);
        }
        if (input.decision === "KEEP_SEPARATE") {
          const subject = this.requireOperationalGuest(snap, input.organisationId, input.eventId, record.subjectGuestId);
          subject.identityResolution = "KEEP_SEPARATE";
          subject.version += 1;
          subject.updatedAt = ctx.now;
          if (record.otherGuestId) {
            const other = snap.operationalGuests.find((item) => item.id === record.otherGuestId);
            if (other && other.identityResolution === "DUPLICATE_RISK") {
              other.identityResolution = "KEEP_SEPARATE";
              other.version += 1;
              other.updatedAt = ctx.now;
            }
          }
        }
        record.status = "RESOLVED";
        record.decision = input.decision;
        record.decidedByPersonId = actor.personId;
        record.decidedAt = ctx.now;
        record.reason = input.reason;
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  linkGuestPerson(actor: ActorContext, raw: unknown): OperationalGuest {
    const input = parseStrict<LinkGuestPersonInput>(LinkGuestPersonInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.person.link",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.person.linked",
      resourceType: "operational_guest",
      resourceId: input.guestId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        this.assertVersion(record.version, input.expectedVersion);
        this.linkGuestInSnapshot(snap, record, input.personId, actor, ctx.now);
        return record;
      },
    });
  }

  unlinkGuestPerson(actor: ActorContext, raw: unknown): OperationalGuest {
    const input = parseStrict<UnlinkGuestPersonInput>(UnlinkGuestPersonInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.person.link",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.person.unlinked",
      resourceType: "operational_guest",
      resourceId: input.guestId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        this.assertVersion(record.version, input.expectedVersion);
        delete record.personId;
        delete record.guestReferenceId;
        record.identityResolution = "UNRESOLVED";
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  importGuests(actor: ActorContext, raw: unknown): GuestIntakeBatch {
    const input = parseStrict<ImportGuestsInput>(ImportGuestsInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.intake.create",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.intake.imported",
      resourceType: "guest_intake_batch",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash({ organisationId: input.organisationId, eventId: input.eventId, filename: input.filename, csv: input.csv }),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const parsed = parseCanonicalCsv(input.csv);
        const batch: GuestIntakeBatch = {
          id: randomUUID(),
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          filename: input.filename,
          mappingVersion: parsed.mappingVersion,
          status: parsed.rows.length === 0 ? "FAILED" : "RECEIVED",
          rowCount: parsed.rows.length,
          promotedCount: 0,
          invalidCount: 0,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.guestIntakeBatches.push(batch);
        for (const row of parsed.rows) {
          const rowId = randomUUID();
          const invalid = row.issues.some((issue) => issue.severity === "ERROR");
          let promotedGuestId: string | undefined;
          if (!invalid) {
            const household = row.raw.householdKey
              ? upsertHousehold(snap, {
                  organisationId: event.organisationId,
                  clientId: event.clientId,
                  eventId: event.id,
                  key: row.raw.householdKey,
                  now: ctx.now,
                })
              : undefined;
            const guest = buildOperationalGuest({
              organisationId: event.organisationId,
              clientId: event.clientId,
              eventId: event.id,
              fields: {
                organisationId: event.organisationId,
                eventId: event.id,
                ...rowToIntakeFields(row.raw),
                reason: input.reason,
              },
              source: "CSV_IMPORT",
              actorPersonId: actor.personId,
              correlationId: actor.correlationId,
              now: ctx.now,
              ...(household ? { householdId: household.id } : {}),
            });
            snap.operationalGuests.push(guest);
            recordDuplicateCandidates(snap, guest, snap.persons, ctx.now);
            promotedGuestId = guest.id;
            batch.promotedCount += 1;
          } else {
            batch.invalidCount += 1;
          }
          snap.guestIntakeRows.push({
            id: rowId,
            batchId: batch.id,
            organisationId: event.organisationId,
            eventId: event.id,
            rowNumber: row.rowNumber,
            raw: row.raw,
            issues: row.issues,
            status: invalid ? "INVALID" : "PROMOTED",
            ...(promotedGuestId ? { promotedGuestId } : {}),
            schemaVersion: SCHEMA_VERSION,
            createdAt: ctx.now,
          });
        }
        batch.status = batch.rowCount === 0 ? "FAILED" : batch.invalidCount === batch.rowCount ? "FAILED" : "PROMOTED";
        batch.updatedAt = ctx.now;
        return batch;
      },
    });
  }

  listGuests(actor: ActorContext, raw: unknown): OperationalGuest[] {
    const input = parseStrict<GuestDirectoryQuery>(GuestDirectoryQuerySchema, raw);
    const { snap, ctx } = this.authorizeQuery(actor, "guest.directory.view", {
      organisationId: input.organisationId,
      eventId: input.eventId,
    });
    const event = this.requireEvent(snap, input.organisationId, input.eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    const capabilities = this.s04aCapabilities(ctx.actor, { organisationId: input.organisationId, eventId: input.eventId });
    return snap.operationalGuests
      .filter((item) => item.organisationId === input.organisationId && item.eventId === input.eventId)
      .filter((item) => (input.lifecycle ? item.lifecycle === input.lifecycle : true))
      .filter((item) => (input.identityResolution ? item.identityResolution === input.identityResolution : true))
      .filter((item) =>
        input.attentionRequired === undefined ? true : attentionRequiredFor(item) === input.attentionRequired,
      )
      .filter((item) => (input.householdId ? item.householdId === input.householdId : true))
      .filter((item) => guestMatchesQuery(item, input.query))
      .filter((item) => {
        if (!input.attendanceIntent && !input.rsvpStatus) return true;
        const response = responseForGuest(snap, item.id);
        if (input.attendanceIntent && (response?.attendanceIntent ?? "NOT_SUPPLIED") !== input.attendanceIntent) {
          return false;
        }
        if (input.rsvpStatus && (response?.status ?? "NOT_STARTED") !== input.rsvpStatus) return false;
        return true;
      })
      .sort((left, right) => compareGuests(left, right, input.sort))
      .map((item) => projectOperationalGuest(item, capabilities));
  }

  getGuest(actor: ActorContext, organisationId: string, eventId: string, guestId: string): OperationalGuest {
    const { snap, ctx } = this.authorizeQuery(actor, "guest.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    const guest = this.requireOperationalGuest(snap, organisationId, eventId, guestId);
    return projectOperationalGuest(guest, this.s04aCapabilities(ctx.actor, { organisationId, eventId }));
  }

  getGuestAddressingWorkspace(
    actor: ActorContext,
    organisationId: string,
    eventId: string,
    guestId: string,
  ): GuestAddressingWorkspace {
    const { snap, ctx } = this.authorizeQuery(actor, "guest.addressing.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    const guest = requireScopedGuest(snap, organisationId, eventId, guestId);
    return buildGuestAddressingWorkspace(snap, guest, this.s04aCapabilities(ctx.actor, { organisationId, eventId }));
  }

  getEventProgrammeWorkspace(
    actor: ActorContext,
    organisationId: string,
    eventId: string,
  ): EventProgrammeWorkspace {
    const { snap, ctx } = this.authorizeQuery(actor, "programme.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    const workspace = buildEventProgrammeWorkspace(
      snap,
      organisationId,
      eventId,
      this.s04bCapabilities(ctx.actor, { organisationId, eventId }),
    );
    if (!workspace) throw new PlatformError("NOT_FOUND", "programme was not found");
    return workspace;
  }

  getGuestPhaseProjection(actor: ActorContext, organisationId: string, eventId: string, guestId: string) {
    const { snap, ctx } = this.authorizeQuery(actor, "programme.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    requireScopedGuest(snap, organisationId, eventId, guestId);
    void ctx;
    return buildGuestPhaseProjection(snap, eventId, guestId);
  }

  createProgrammePhase(actor: ActorContext, raw: unknown): ProgrammePhase {
    const input = parseStrict(CreateProgrammePhaseInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.phase.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.phase.created",
      resourceType: "programme_phase",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createProgrammePhaseOnSnap(snap, input, ctx.now),
    });
  }

  assignPhaseEntitlement(actor: ActorContext, raw: unknown): PhaseEntitlement {
    const input = parseStrict(AssignPhaseEntitlementInputSchema, raw);
    const protectedGrant = Boolean(input.protectedAccess);
    return this.mutate(actor, {
      permission: protectedGrant ? "programme.protectedAccess.grant" : "programme.entitlement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.entitlement.assigned",
      resourceType: "phase_entitlement",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) =>
        assignPhaseEntitlementOnSnap(snap, input, ctx.now, {
          allowProtected: this.permissionAllowed(ctx.actor, "programme.protectedAccess.grant", {
            organisationId: input.organisationId,
            eventId: input.eventId,
          }),
        }),
    });
  }

  createPerimeterCheckpoint(actor: ActorContext, raw: unknown): PerimeterCheckpoint {
    const input = parseStrict(CreateCheckpointInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.checkpoint.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.checkpoint.created",
      resourceType: "perimeter_checkpoint",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createCheckpointOnSnap(snap, input, ctx.now),
    });
  }

  createArrivalRoute(actor: ActorContext, raw: unknown): ArrivalRoute {
    const input = parseStrict(CreateArrivalRouteInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.route.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.route.created",
      resourceType: "arrival_route",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createArrivalRouteOnSnap(snap, input, ctx.now),
    });
  }

  createOperationalVehicle(actor: ActorContext, raw: unknown) {
    const input = parseStrict(CreateVehicleInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.vehicle.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.vehicle.created",
      resourceType: "operational_vehicle",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createVehicleOnSnap(snap, input, ctx.now).vehicle,
    });
  }

  publishOfflineAccessPackage(actor: ActorContext, raw: unknown): OfflineAccessPackage {
    const input = parseStrict(PublishOfflinePackageInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.accessPlan.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.accessPlan.published",
      resourceType: "offline_access_package",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => publishOfflinePackageOnSnap(snap, input, ctx.now),
    });
  }

  consumeOfflineAccessPackage(actor: ActorContext, raw: unknown): OfflineAccessPackage {
    const input = parseStrict<ConsumeOfflinePackageInput>(ConsumeOfflinePackageInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.view",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.accessPlan.consumed",
      resourceType: "offline_access_package",
      resourceId: input.packageId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => consumeOfflinePackageOnSnap(snap, input, ctx.now),
    });
  }

  resolveCheckpointAccess(actor: ActorContext, raw: unknown) {
    const input = parseStrict(ResolveCheckpointInputSchema, raw);
    const { snap, ctx } = this.authorizeQuery(actor, "programme.view", {
      organisationId: input.organisationId,
      eventId: input.eventId,
    });
    this.requireEvent(snap, input.organisationId, input.eventId);
    void ctx;
    return resolveCheckpointOnSnap(snap, input);
  }

  raiseAccessException(actor: ActorContext, raw: unknown) {
    const input = parseStrict(RaiseAccessExceptionInputSchema, raw);
    return this.mutate(actor, {
      permission: "programme.exception.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "programme.exception.raised",
      resourceType: "access_exception",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => raiseAccessExceptionOnSnap(snap, input, ctx.now),
    });
  }

  getEventMerchandiseWorkspace(actor: ActorContext, organisationId: string, eventId: string): EventMerchandiseWorkspace {
    const { snap, ctx } = this.authorizeQuery(actor, "merch.collection.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    const workspace = buildEventMerchandiseWorkspace(
      snap,
      organisationId,
      eventId,
      this.s04cCapabilities(ctx.actor, { organisationId, eventId }),
      ctx.now,
    );
    if (!workspace) throw new PlatformError("NOT_FOUND", "merchandise workspace was not found");
    return workspace;
  }

  getGuestMerchandiseProjection(actor: ActorContext, organisationId: string, eventId: string, guestId: string) {
    const { snap } = this.authorizeQuery(actor, "merch.offer.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    this.requireOperationalGuest(snap, organisationId, eventId, guestId);
    return buildGuestMerchandiseProjection(snap, eventId, guestId);
  }

  listGuestMerchandiseBadges(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "merch.collection.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    return snap.operationalGuests
      .filter((item) => item.organisationId === organisationId && item.eventId === eventId)
      .map((item) => buildGuestDirectoryMerchandiseBadge(snap, eventId, item.id));
  }

  createMerchandiseCollection(actor: ActorContext, raw: unknown): MerchandiseCollection {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(CreateMerchandiseCollectionInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.collection.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.collection.created",
      resourceType: "merchandise_collection",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createMerchandiseCollectionOnSnap(snap, input, ctx.now),
    });
  }

  createMerchandiseItem(actor: ActorContext, raw: unknown) {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(CreateMerchandiseItemInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.collection.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.item.created",
      resourceType: "merchandise_item",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createMerchandiseItemOnSnap(snap, input, ctx.now).item,
    });
  }

  updateMerchandiseCollection(actor: ActorContext, raw: unknown): MerchandiseCollection {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(UpdateMerchandiseCollectionInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.collection.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.collection.updated",
      resourceType: "merchandise_collection",
      resourceId: input.collectionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => updateMerchandiseCollectionOnSnap(snap, input, ctx.now),
    });
  }

  updateMerchandiseItem(actor: ActorContext, raw: unknown): MerchandiseItem {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(UpdateMerchandiseItemInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.collection.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.item.updated",
      resourceType: "merchandise_item",
      resourceId: input.itemId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => updateMerchandiseItemOnSnap(snap, input, ctx.now),
    });
  }

  previewMerchandiseAudience(actor: ActorContext, raw: unknown) {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(PreviewMerchandiseAudienceInputSchema, raw);
    const { snap } = this.authorizeQuery(actor, "merch.offer.view", {
      organisationId: input.organisationId,
      eventId: input.eventId,
    });
    this.requireEvent(snap, input.organisationId, input.eventId);
    return previewOfferAudience(snap, input.organisationId, input.eventId, input);
  }

  createMerchandiseCohort(actor: ActorContext, raw: unknown) {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(CreateMerchandiseCohortInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.cohort.created",
      resourceType: "merchandise_cohort",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createMerchandiseCohortOnSnap(snap, input, ctx.now).cohort,
    });
  }

  createHostOfferRule(actor: ActorContext, raw: unknown): HostOfferRule {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(CreateHostOfferRuleInputSchema, raw);
    return this.mutate(actor, {
      permission: input.hostSponsored ? "merch.offer.sponsor" : "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.offer.rule.created",
      resourceType: "host_offer_rule",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) =>
        createHostOfferRuleOnSnap(snap, input, ctx.now, {
          allowSponsor: this.permissionAllowed(ctx.actor, "merch.offer.sponsor", {
            organisationId: input.organisationId,
            eventId: input.eventId,
          }),
        }),
    });
  }

  issueHostOfferRule(actor: ActorContext, raw: unknown): HostOfferRule {
    const input = parseStrict(IssueHostOfferRuleInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.offer.rule.issued",
      resourceType: "host_offer_rule",
      resourceId: input.ruleId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => issueHostOfferRuleOnSnap(snap, input, ctx.now),
    });
  }

  withdrawHostOfferRule(actor: ActorContext, raw: unknown): HostOfferRule {
    const input = parseStrict(WithdrawHostOfferRuleInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.offer.rule.withdrawn",
      resourceType: "host_offer_rule",
      resourceId: input.ruleId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => withdrawHostOfferRuleOnSnap(snap, input, ctx.now),
    });
  }

  withdrawGuestOffer(actor: ActorContext, raw: unknown): GuestOffer {
    const input = parseStrict(WithdrawGuestOfferInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.offer.withdrawn",
      resourceType: "guest_offer",
      resourceId: input.offerId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => withdrawGuestOfferOnSnap(snap, input, ctx.now),
    });
  }

  recordGuestParticipation(actor: ActorContext, raw: unknown): GuestParticipation {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(RecordGuestParticipationInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.participation.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.participation.recorded",
      resourceType: "guest_participation",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => recordGuestParticipationOnSnap(snap, input, ctx.now),
    });
  }

  captureCapMeasurement(actor: ActorContext, raw: unknown): CapMeasurement {
    assertNoProhibitedMerchandiseFields(raw);
    assertCapCircumferenceRaw(raw);
    const input = parseStrict(CaptureCapMeasurementInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.capMeasurement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.capMeasurement.captured",
      resourceType: "cap_measurement",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => captureCapMeasurementOnSnap(snap, input, ctx.now),
    });
  }

  withdrawCapMeasurement(actor: ActorContext, raw: unknown): CapMeasurement {
    const input = parseStrict(WithdrawCapMeasurementInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.capMeasurement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.capMeasurement.withdrawn",
      resourceType: "cap_measurement",
      resourceId: input.measurementId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => withdrawCapMeasurementOnSnap(snap, input, ctx.now),
    });
  }

  createVendorAssignment(actor: ActorContext, raw: unknown): { assignment: VendorAssignment; token: string } {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict<CreateVendorAssignmentInput>(CreateVendorAssignmentInputSchema, raw);
    let token = "";
    const assignment = this.mutate(actor, {
      permission: "merch.vendorAssignment.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.vendorAssignment.created",
      resourceType: "vendor_assignment",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash({ ...input, token: undefined }),
      alreadyApplied: (fresh) => vendorAssignmentAlreadyIssued(fresh, input),
      replayIfAlreadyApplied: true,
      run: (snap, ctx) => {
        token = generateVendorAssignmentToken();
        return createVendorAssignmentOnSnap(snap, input, ctx.now, token, this.vendorAccessConfig());
      },
    });
    return { assignment, token };
  }

  renewVendorAssignment(actor: ActorContext, raw: unknown): { assignment: VendorAssignment; token: string } {
    const input = parseStrict(RenewVendorAssignmentInputSchema, raw);
    let token = "";
    const assignment = this.mutate(actor, {
      permission: "merch.vendorAssignment.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.vendorAssignment.renewed",
      resourceType: "vendor_assignment",
      resourceId: input.assignmentId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => vendorAssignmentAlreadyRenewed(fresh, input),
      replayIfAlreadyApplied: true,
      run: (snap, ctx) => {
        token = generateVendorAssignmentToken();
        return renewVendorAssignmentOnSnap(snap, input, ctx.now, token, this.vendorAccessConfig());
      },
    });
    return { assignment, token };
  }

  revokeVendorAssignment(actor: ActorContext, raw: unknown): VendorAssignment {
    const input = parseStrict(RevokeVendorAssignmentInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.vendorAssignment.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.vendorAssignment.revoked",
      resourceType: "vendor_assignment",
      resourceId: input.assignmentId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => vendorAssignmentAlreadyRevoked(fresh, input),
      replayIfAlreadyApplied: true,
      run: (snap, ctx) => revokeVendorAssignmentOnSnap(snap, input, ctx.now),
    });
  }

  issueMerchandiseGuestAccess(
    actor: ActorContext,
    raw: unknown,
  ): { grant: MerchandiseGuestGrant; token: string; replayed: boolean } {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(IssueMerchandiseGuestAccessInputSchema, raw);
    let token = "";
    let replayed = false;
    const grant = this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.guestAccess.issued",
      resourceType: "merchandise_guest_grant",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => {
        const existing = merchandiseGuestGrantAlreadyIssued(fresh, input);
        if (existing) replayed = true;
        return existing;
      },
      replayIfAlreadyApplied: true,
      run: (snap, ctx) => {
        token = generateMerchandiseGuestGrantToken();
        const issued = issueMerchandiseGuestGrantOnSnap(snap, input, ctx.now, token, this.merchandiseGuestAccessConfig());
        replayed = issued.replayed;
        if (issued.replayed) token = "";
        return issued.grant;
      },
    });
    return { grant, token, replayed };
  }

  renewMerchandiseGuestAccess(actor: ActorContext, raw: unknown): { grant: MerchandiseGuestGrant; token: string } {
    const input = parseStrict(RenewMerchandiseGuestAccessInputSchema, raw);
    let token = "";
    const grant = this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.guestAccess.renewed",
      resourceType: "merchandise_guest_grant",
      resourceId: input.grantId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => merchandiseGuestGrantAlreadyRenewed(fresh, input),
      replayIfAlreadyApplied: true,
      run: (snap, ctx) => {
        token = generateMerchandiseGuestGrantToken();
        return renewMerchandiseGuestGrantOnSnap(snap, input, ctx.now, token, this.merchandiseGuestAccessConfig());
      },
    });
    return { grant, token };
  }

  revokeMerchandiseGuestAccess(actor: ActorContext, raw: unknown): MerchandiseGuestGrant {
    const input = parseStrict(RevokeMerchandiseGuestAccessInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.offer.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.guestAccess.revoked",
      resourceType: "merchandise_guest_grant",
      resourceId: input.grantId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => merchandiseGuestGrantAlreadyRevoked(fresh, input),
      replayIfAlreadyApplied: true,
      run: (snap, ctx) => revokeMerchandiseGuestGrantOnSnap(snap, input, ctx.now),
    });
  }

  reviewVendorUpdate(actor: ActorContext, raw: unknown): VendorUpdate {
    const input = parseStrict(ReviewVendorUpdateInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.exception.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: input.accept ? "merch.vendorUpdate.accepted" : "merch.vendorUpdate.rejected",
      resourceType: "vendor_update",
      resourceId: input.updateId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => reviewVendorUpdateOnSnap(snap, input, ctx.now),
    });
  }

  raiseMerchandiseException(actor: ActorContext, raw: unknown): MerchandiseException {
    assertNoProhibitedMerchandiseFields(raw);
    const input = parseStrict(RaiseMerchandiseExceptionInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.exception.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.exception.raised",
      resourceType: "merchandise_exception",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => raiseMerchandiseExceptionOnSnap(snap, input, ctx.now),
    });
  }

  createExternalContactLink(actor: ActorContext, raw: unknown): ExternalContactLink {
    const input = parseStrict(CreateExternalContactLinkInputSchema, raw);
    return this.mutate(actor, {
      permission: "merch.collection.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "merch.contactLink.created",
      resourceType: "external_contact_link",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createExternalContactLinkOnSnap(snap, input, ctx.now),
    });
  }

  guestMerchandiseView(sessionToken: string, now?: string): GuestMerchandiseProjection {
    const capability = this.resolveGuestMerchandiseCapability(sessionToken, now ?? new Date().toISOString());
    const snap = this.store.snapshot();
    return buildGuestMerchandiseProjection(snap, capability.eventId, capability.guestId);
  }

  guestRecordParticipation(sessionToken: string, raw: unknown, now?: string): GuestParticipation {
    assertNoProhibitedMerchandiseFields(raw);
    const capability = this.resolveGuestMerchandiseCapability(sessionToken, now ?? new Date().toISOString());
    const input = parseStrict(RecordGuestParticipationInputSchema, {
      ...(typeof raw === "object" && raw ? raw : {}),
      organisationId: capability.organisationId,
      eventId: capability.eventId,
      guestId: capability.guestId,
    });
    if (input.guestId !== capability.guestId || input.eventId !== capability.eventId) {
      throw new PlatformError("FORBIDDEN", "a guest may only record their own merchandise choice");
    }
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    const result = recordGuestParticipationOnSnap(snap, input, occurredAt);
    this.writeAudit(snap, {
      action: "merch.participation.guest.recorded",
      outcome: "SUCCESS",
      organisationId: capability.organisationId,
      eventId: capability.eventId,
      resourceType: "guest_participation",
      resourceId: result.id,
      correlationId: capability.sessionId,
      occurredAt,
      actorType: "GUEST_CAPABILITY",
    });
    this.store.replace(snap);
    return result;
  }

  guestCaptureCapMeasurement(sessionToken: string, raw: unknown, now?: string): CapMeasurement {
    assertNoProhibitedMerchandiseFields(raw);
    assertCapCircumferenceRaw(raw);
    const capability = this.resolveGuestMerchandiseCapability(sessionToken, now ?? new Date().toISOString());
    const input = parseStrict(CaptureCapMeasurementInputSchema, {
      ...(typeof raw === "object" && raw ? raw : {}),
      organisationId: capability.organisationId,
      eventId: capability.eventId,
      guestId: capability.guestId,
      source: "GUEST_ENTERED",
    });
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    const result = captureCapMeasurementOnSnap(snap, input, occurredAt);
    this.writeAudit(snap, {
      action: "merch.capMeasurement.guest.captured",
      outcome: "SUCCESS",
      organisationId: capability.organisationId,
      eventId: capability.eventId,
      resourceType: "cap_measurement",
      resourceId: result.id,
      correlationId: capability.sessionId,
      occurredAt,
      actorType: "GUEST_CAPABILITY",
    });
    this.store.replace(snap);
    return result;
  }

  guestWithdrawCapMeasurement(sessionToken: string, raw: unknown, now?: string): CapMeasurement {
    const capability = this.resolveGuestMerchandiseCapability(sessionToken, now ?? new Date().toISOString());
    const input = parseStrict(WithdrawCapMeasurementInputSchema, {
      ...(typeof raw === "object" && raw ? raw : {}),
      organisationId: capability.organisationId,
      eventId: capability.eventId,
    });
    const snap = this.store.snapshot();
    const measurement = snap.capMeasurements.find((item) => item.id === input.measurementId);
    if (!measurement || measurement.guestId !== capability.guestId) {
      throw new PlatformError("FORBIDDEN", "a guest may only withdraw their own cap measurement");
    }
    const occurredAt = now ?? new Date().toISOString();
    const result = withdrawCapMeasurementOnSnap(snap, input, occurredAt);
    this.writeAudit(snap, {
      action: "merch.capMeasurement.guest.withdrawn",
      outcome: "SUCCESS",
      organisationId: capability.organisationId,
      eventId: capability.eventId,
      resourceType: "cap_measurement",
      resourceId: result.id,
      correlationId: capability.sessionId,
      occurredAt,
      actorType: "GUEST_CAPABILITY",
    });
    this.store.replace(snap);
    return result;
  }

  exchangeMerchandiseGuestAccess(
    token: string,
    now?: string,
    correlationId = "merch-guest-access",
  ): { sessionToken: string; view: GuestMerchandiseProjection } {
    const config = this.merchandiseGuestAccessConfig();
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    const tokenHash = hashMerchandiseGuestGrantToken(token, config);
    const grant = snap.merchandiseGuestGrants.find((item) => item.tokenHash === tokenHash);
    if (!grant || grant.status !== "ACTIVE" || Date.parse(grant.expiresAt) <= Date.parse(occurredAt)) {
      this.writeAudit(snap, {
        action: "merch.guestAccess.denied",
        outcome: "DENIED",
        resourceType: "merchandise_guest_grant",
        correlationId,
        reason: "merchandise_guest_access_unavailable",
        occurredAt,
        actorType: "GUEST_CAPABILITY",
      });
      this.store.replace(snap);
      throw merchandiseGuestAccessUnavailable();
    }
    if (grant.failedExchangeCount >= (config.maxExchangeFailures ?? 8)) {
      grant.status = "REVOKED";
      grant.revokedAt = occurredAt;
      grant.version += 1;
      grant.updatedAt = occurredAt;
      this.writeAudit(snap, {
        action: "merch.guestAccess.denied",
        outcome: "DENIED",
        organisationId: grant.organisationId,
        eventId: grant.eventId,
        resourceType: "merchandise_guest_grant",
        resourceId: grant.id,
        correlationId,
        reason: "merchandise_guest_access_unavailable",
        occurredAt,
        actorType: "GUEST_CAPABILITY",
      });
      this.store.replace(snap);
      throw merchandiseGuestAccessUnavailable();
    }
    const sessionId = randomUUID();
    const issued = issueMerchandiseGuestSession(
      {
        sessionId,
        grantId: grant.id,
        guestId: grant.guestId,
        eventId: grant.eventId,
        organisationId: grant.organisationId,
        now: occurredAt,
      },
      config,
    );
    snap.merchandiseGuestSessions.push({
      id: sessionId,
      grantId: grant.id,
      organisationId: grant.organisationId,
      eventId: grant.eventId,
      guestId: grant.guestId,
      issuedAt: issued.actor.issuedAt,
      expiresAt: issued.actor.expiresAt,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    this.writeAudit(snap, {
      action: "merch.guestAccess.exchanged",
      outcome: "SUCCESS",
      organisationId: grant.organisationId,
      eventId: grant.eventId,
      resourceType: "merchandise_guest_grant",
      resourceId: grant.id,
      correlationId,
      occurredAt,
      actorType: "GUEST_CAPABILITY",
    });
    this.store.replace(snap);
    return {
      sessionToken: issued.token,
      view: buildGuestMerchandiseProjection(snap, grant.eventId, grant.guestId),
    };
  }

  guestAttemptCoreMutation(): never {
    throw new PlatformError(
      "FORBIDDEN",
      "merchandise guest sessions cannot create invitation, RSVP, companion, attendance, credential or payment records",
    );
  }

  exchangeVendorAccess(token: string, now?: string, correlationId = "vendor-access"): { sessionToken: string; view: VendorPortalProjection } {
    const config = this.vendorAccessConfig();
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    const tokenHash = hashVendorAssignmentToken(token, config);
    const assignment = snap.vendorAssignments.find((item) => item.tokenHash === tokenHash);
    if (!assignment || assignment.status !== "ACTIVE" || Date.parse(assignment.expiresAt) <= Date.parse(occurredAt)) {
      this.writeAudit(snap, {
        action: "merch.vendor.access.denied",
        outcome: "DENIED",
        resourceType: "vendor_assignment",
        correlationId,
        reason: "vendor_access_unavailable",
        occurredAt,
        actorType: "VENDOR_CAPABILITY",
      });
      this.store.replace(snap);
      throw vendorAccessUnavailable();
    }
    if (assignment.failedExchangeCount >= (config.maxExchangeFailures ?? 8)) {
      assignment.status = "REVOKED";
      assignment.revokedAt = occurredAt;
      assignment.version += 1;
      assignment.updatedAt = occurredAt;
      this.writeAudit(snap, {
        action: "merch.vendor.access.denied",
        outcome: "DENIED",
        organisationId: assignment.organisationId,
        eventId: assignment.eventId,
        resourceType: "vendor_assignment",
        resourceId: assignment.id,
        correlationId,
        reason: "vendor_access_unavailable",
        occurredAt,
        actorType: "VENDOR_CAPABILITY",
      });
      this.store.replace(snap);
      throw vendorAccessUnavailable();
    }
    const sessionId = randomUUID();
    const issued = issueVendorSession(
      {
        sessionId,
        assignmentId: assignment.id,
        vendorId: assignment.vendorId,
        eventId: assignment.eventId,
        organisationId: assignment.organisationId,
        now: occurredAt,
      },
      config,
    );
    snap.vendorSessions.push({
      id: sessionId,
      assignmentId: assignment.id,
      organisationId: assignment.organisationId,
      eventId: assignment.eventId,
      vendorId: assignment.vendorId,
      issuedAt: issued.actor.issuedAt,
      expiresAt: issued.actor.expiresAt,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    this.writeAudit(snap, {
      action: "merch.vendor.access.exchanged",
      outcome: "SUCCESS",
      organisationId: assignment.organisationId,
      eventId: assignment.eventId,
      resourceType: "vendor_assignment",
      resourceId: assignment.id,
      correlationId,
      occurredAt,
      actorType: "VENDOR_CAPABILITY",
    });
    this.store.replace(snap);
    const view = buildVendorPortalProjection(snap, assignment.id, assignment.eventId);
    if (!view) throw vendorAccessUnavailable();
    return { sessionToken: issued.token, view };
  }

  vendorPortalView(sessionToken: string, now?: string): VendorPortalProjection {
    const actor = this.requireVendorCapability(sessionToken, now ?? new Date().toISOString());
    const snap = this.store.snapshot();
    const view = buildVendorPortalProjection(snap, actor.assignmentId, actor.eventId);
    if (!view) throw vendorAccessUnavailable();
    return view;
  }

  vendorSubmitUpdate(sessionToken: string, raw: unknown, now?: string): VendorUpdate {
    assertNoProhibitedMerchandiseFields(raw);
    const actor = this.requireVendorCapability(sessionToken, now ?? new Date().toISOString());
    const input = parseStrict(SubmitVendorUpdateInputSchema, raw);
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    try {
      const result = submitVendorUpdateOnSnap(snap, input, occurredAt, actor);
      this.writeAudit(snap, {
        action: "merch.vendorUpdate.submitted",
        outcome: "SUCCESS",
        organisationId: actor.organisationId,
        eventId: actor.eventId,
        resourceType: "vendor_update",
        resourceId: result.id,
        correlationId: actor.sessionId,
        occurredAt,
        actorType: "VENDOR_CAPABILITY",
      });
      this.store.replace(snap);
      return result;
    } catch (error) {
      if (error instanceof PlatformError && (error.code === "VERSION_CONFLICT" || error.code === "FORBIDDEN")) {
        const failed = this.store.snapshot();
        this.writeAudit(failed, {
          action: "merch.vendorUpdate.submitted",
          outcome: "FAILED",
          organisationId: actor.organisationId,
          eventId: actor.eventId,
          resourceType: "vendor_update",
          correlationId: actor.sessionId,
          reason: error.code,
          occurredAt,
          actorType: "VENDOR_CAPABILITY",
        });
        this.store.replace(failed);
      }
      throw error;
    }
  }

  vendorAttemptCoreMutation(): never {
    throw new PlatformError("FORBIDDEN", "vendor sessions cannot mutate Guest, Invitation, RSVP, Party, Credential or Attendance records");
  }

  getEventAtelierWorkspace(actor: ActorContext, organisationId: string, eventId: string): EventAtelierWorkspace {
    const { snap, ctx } = this.authorizeQuery(actor, "atelier.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    const capabilities = atelierPermissionAllowed(
      (["atelier.view", "atelier.manage", "atelier.publish", "atelier.access.manage", "atelier.decision.publish", "atelier.decision.review", "atelier.audit.view"] as const).filter((key) =>
        this.permissionAllowed(ctx.actor, key, { organisationId, eventId }),
      ),
    );
    const workspace = buildEventAtelierWorkspace(
      snap,
      eventId,
      Object.entries(capabilities)
        .filter(([, allowed]) => allowed)
        .map(([key]) =>
          key === "canView"
            ? "atelier.view"
            : key === "canManage"
              ? "atelier.manage"
              : key === "canPublish"
                ? "atelier.publish"
                : key === "canManageAccess"
                  ? "atelier.access.manage"
                  : key === "canPublishDecision"
                    ? "atelier.decision.publish"
                    : key === "canReviewDecision"
                      ? "atelier.decision.review"
                      : "atelier.audit.view",
        ),
    );
    if (!workspace) throw new PlatformError("NOT_FOUND", "atelier was not found");
    return workspace;
  }

  publishEventAtelier(actor: ActorContext, raw: unknown): EventAtelier {
    const input = parseStrict(PublishAtelierInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.published",
      resourceType: "event_atelier",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => publishAtelierOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  publishAtelierNarrative(actor: ActorContext, raw: unknown): EventNarrativeEdition {
    const input = parseStrict(PublishNarrativeEditionInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.narrative.published",
      resourceType: "event_narrative_edition",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => publishNarrativeEditionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  ensureAtelierNarrativeRevision(actor: ActorContext, raw: unknown): EventNarrativeEdition {
    const input = parseStrict(StartNarrativeRevisionInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.narrative.revision_started",
      resourceType: "event_narrative_edition",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => ensureNarrativeRevisionDraftOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  publishAtelierDecision(actor: ActorContext, raw: unknown): HostDecisionRequest {
    const input = parseStrict(PublishDecisionRequestInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.decision.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.decision.published",
      resourceType: "host_decision_request",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => publishDecisionRequestOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  publishAtelierUpdate(actor: ActorContext, raw: unknown): { id: string } {
    const input = parseStrict(PublishCuratedUpdateInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.update.published",
      resourceType: "curated_update",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        publishCuratedUpdateOnSnap(snap, input, ctx.now, ctx.actor.person.id);
        return snap.curatedUpdates[snap.curatedUpdates.length - 1]!;
      },
    });
  }

  issueAtelierAccess(actor: ActorContext, raw: unknown): { grant: AtelierAccessGrant; token: string } {
    const input = parseStrict(IssueAtelierAccessInputSchema, raw);
    let token = "";
    const grant = this.mutate(actor, {
      permission: "atelier.access.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.access.issued",
      resourceType: "atelier_access_grant",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash({ ...input, token: undefined }),
      run: (snap, ctx) => {
        const issued = issueAtelierAccessOnSnap(snap, input, ctx.now, ctx.actor.person.id, this.atelierAccessConfig());
        token = issued.token;
        return issued.grant;
      },
    });
    return { grant, token };
  }

  revokeAtelierAccess(actor: ActorContext, raw: unknown): AtelierAccessGrant {
    const input = parseStrict(RevokeAtelierAccessInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.access.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.access.revoked",
      resourceType: "atelier_access_grant",
      resourceId: input.grantId,
      reason: input.reason,
      run: (snap, ctx) => revokeAtelierAccessOnSnap(snap, input, ctx.now),
    });
  }

  issueAtelierStepUp(actor: ActorContext, raw: unknown): { grant: AtelierAccessGrant; token: string } {
    const input = parseStrict(RevokeAtelierAccessInputSchema, raw);
    let token = "";
    const grant = this.mutate(actor, {
      permission: "atelier.access.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.access.step_up_issued",
      resourceType: "magic_link_challenge",
      resourceId: input.grantId,
      reason: input.reason,
      run: (snap, ctx) => {
        const issued = issueAtelierStepUpOnSnap(
          snap,
          {
            organisationId: input.organisationId,
            eventId: input.eventId,
            grantId: input.grantId,
            reason: input.reason,
          },
          ctx.now,
          ctx.actor.person.id,
          this.atelierAccessConfig(),
        );
        token = issued.token;
        return issued.grant;
      },
    });
    return { grant, token };
  }

  renewAtelierAccess(actor: ActorContext, raw: unknown): { grant: AtelierAccessGrant; token: string; priorGrant: AtelierAccessGrant } {
    const input = parseStrict(RenewAtelierAccessInputSchema, raw);
    let token = "";
    let priorGrant: AtelierAccessGrant | undefined;
    const grant = this.mutate(actor, {
      permission: "atelier.access.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.access.renewed",
      resourceType: "atelier_access_grant",
      resourceId: input.grantId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash({ ...input, token: undefined }),
      run: (snap, ctx) => {
        const renewed = renewAtelierAccessOnSnap(snap, input, ctx.now, ctx.actor.person.id, this.atelierAccessConfig());
        token = renewed.token;
        priorGrant = renewed.priorGrant;
        return renewed.grant;
      },
    });
    if (!priorGrant) throw new PlatformError("NOT_FOUND", "atelier grant was not found");
    return { grant, token, priorGrant };
  }

  reviewAtelierDecision(actor: ActorContext, raw: unknown): HostDecisionReceipt {
    const input = parseStrict(ReviewHostDecisionInputSchema, raw);
    return this.mutate(actor, {
      permission: "atelier.decision.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "atelier.decision.reviewed",
      resourceType: "host_decision_receipt",
      resourceId: input.receiptId,
      reason: input.reason,
      run: (snap, ctx) => reviewHostDecisionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  getEventLanguageWorkspace(actor: ActorContext, organisationId: string, eventId: string): EventLanguageWorkspace {
    const { snap, ctx } = this.authorizeQuery(actor, "language.preference.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    const capabilities = languagePermissionAllowed(
      (
        [
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
        ] as const
      ).filter((key) => this.permissionAllowed(ctx.actor, key, { organisationId, eventId })),
    );
    const workspace = buildEventLanguageWorkspace(
      snap,
      eventId,
      Object.entries(capabilities)
        .filter(([, allowed]) => allowed)
        .map(([key]) =>
          key === "canViewPreference"
            ? "language.preference.view"
            : key === "canManagePreference"
              ? "language.preference.manage"
              : key === "canCreateCultural"
                ? "language.cultural.create"
                : key === "canReviewCultural"
                  ? "language.cultural.review"
                  : key === "canApproveCultural"
                    ? "language.cultural.approve"
                    : key === "canCreateTranslation"
                      ? "language.translation.create"
                      : key === "canReviewTranslation"
                        ? "language.translation.review"
                        : key === "canApproveTranslation"
                          ? "language.translation.approve"
                          : key === "canManageEdition"
                            ? "language.edition.manage"
                            : key === "canPublishEdition"
                              ? "language.edition.publish"
                              : key === "canPreviewAssembly"
                                ? "language.assembly.preview"
                                : key === "canManageGlossary"
                                  ? "language.glossary.manage"
                                  : "language.audit.view",
        ),
    );
    if (!workspace) throw new PlatformError("NOT_FOUND", "language workspace was not found");
    return workspace;
  }

  recordLanguagePreference(actor: ActorContext, raw: unknown): LanguageProfile {
    assertNoLanguageInference(raw);
    const input = parseStrict(RecordLanguagePreferenceInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.preference.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.preference.recorded",
      resourceType: "language_profile",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => recordLanguagePreferenceOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  createCulturalSourceText(actor: ActorContext, raw: unknown): CulturalSourceText {
    const input = parseStrict(CreateCulturalSourceTextInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.cultural.create",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.cultural.created",
      resourceType: "cultural_source_text",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createCulturalSourceTextOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  decideCulturalText(actor: ActorContext, raw: unknown): CulturalSourceText {
    const input = parseStrict(DecideCulturalTextInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.cultural.approve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.cultural.decided",
      resourceType: "cultural_source_text",
      resourceId: input.culturalSourceTextId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => decideCulturalTextOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  createContentWork(actor: ActorContext, raw: unknown): ContentWork {
    const input = parseStrict(CreateContentWorkInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.edition.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.work.created",
      resourceType: "content_work",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createContentWorkOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  createDependentEdition(actor: ActorContext, raw: unknown): ContentEdition {
    const input = parseStrict(CreateDependentEditionInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.translation.create",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.translation.created",
      resourceType: "content_edition",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createDependentEditionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  decideTranslation(actor: ActorContext, raw: unknown): ContentEdition {
    const input = parseStrict(DecideTranslationInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.translation.approve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.translation.decided",
      resourceType: "content_edition",
      resourceId: input.editionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => decideTranslationOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  supersedeSourceEdition(actor: ActorContext, raw: unknown): ContentEdition {
    const input = parseStrict(SupersedeSourceEditionInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.edition.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.source.superseded",
      resourceType: "content_edition",
      resourceId: input.sourceEditionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => supersedeSourceEditionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  createTerminologyEntry(actor: ActorContext, raw: unknown): TerminologyEntry {
    const input = parseStrict(CreateTerminologyEntryInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.glossary.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.glossary.created",
      resourceType: "terminology_entry",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createTerminologyEntryOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  assembleRecipientContent(actor: ActorContext, raw: unknown): RecipientAssembly {
    assertNoLanguageInference(raw);
    const input = parseStrict(AssembleRecipientContentInputSchema, raw);
    return this.mutate(actor, {
      permission: "language.assembly.preview",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "language.assembly.previewed",
      resourceType: "recipient_assembly",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (snap) =>
        snap.recipientAssemblies.find(
          (item) =>
            item.guestId === input.guestId &&
            item.workId === input.workId &&
            item.eventId === input.eventId &&
            item.status === "READY_FOR_COMMS_REVIEW",
        ),
      replayIfAlreadyApplied: Boolean(input.idempotencyKey),
      run: (snap, ctx) => assembleRecipientContentOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  exchangeAtelierAccess(token: string, now?: string, correlationId = "atelier-access"): { sessionToken: string; view: HostAtelierProjection } {
    const config = this.atelierAccessConfig();
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    const tokenHash = hashAtelierLinkToken(token, config);
    const challenge = snap.magicLinkChallenges.find((item) => item.tokenHash === tokenHash);
    const deny = (grantId?: string): never => {
      const grantRef = grantId ? snap.atelierAccessGrants.find((item) => item.id === grantId) : undefined;
      if (grantRef) {
        grantRef.failedExchangeCount += 1;
        grantRef.updatedAt = occurredAt;
        if (grantRef.failedExchangeCount >= (config.maxExchangeFailures ?? 8)) {
          grantRef.status = "REVOKED";
          grantRef.revokedAt = occurredAt;
          grantRef.version += 1;
        }
      }
      this.writeAudit(snap, {
        action: "atelier.access.denied",
        outcome: "DENIED",
        resourceType: "magic_link_challenge",
        correlationId,
        reason: "atelier_access_unavailable",
        occurredAt,
        actorType: "HOST_CAPABILITY",
      });
      this.store.replace(snap);
      throw atelierAccessUnavailable();
    };
    if (!challenge || challenge.status !== "ISSUED" || Date.parse(challenge.expiresAt) <= Date.parse(occurredAt)) {
      if (challenge && challenge.status === "ISSUED" && Date.parse(challenge.expiresAt) <= Date.parse(occurredAt)) {
        challenge.status = "EXPIRED";
        challenge.version += 1;
        challenge.updatedAt = occurredAt;
      }
      return deny(challenge?.grantId);
    }
    const grant = snap.atelierAccessGrants.find((item) => item.id === challenge.grantId);
    if (!grant || grant.status !== "ACTIVE" || Date.parse(grant.expiresAt) <= Date.parse(occurredAt)) {
      return deny(challenge.grantId);
    }
    if (grant.failedExchangeCount >= (config.maxExchangeFailures ?? 8)) {
      grant.status = "REVOKED";
      grant.revokedAt = occurredAt;
      grant.version += 1;
      grant.updatedAt = occurredAt;
      return deny(grant.id);
    }
    challenge.status = "REDEEMED";
    challenge.redeemedAt = occurredAt;
    challenge.version += 1;
    challenge.updatedAt = occurredAt;
    const sessionId = randomUUID();
    const idle = config.idleTtlSeconds ?? 1800;
    const issued = issueAtelierSession(
      {
        sessionId,
        grantId: grant.id,
        personId: grant.personId,
        eventId: grant.eventId,
        organisationId: grant.organisationId,
        atelierId: grant.atelierId,
        hostRole: grant.hostRole,
        now: occurredAt,
      },
      config,
    );
    const elevatedUntil =
      challenge.purpose === "STEP_UP" || challenge.purpose === "ATELIER_ENTRY"
        ? new Date(Date.parse(occurredAt) + (config.stepUpTtlSeconds ?? 900) * 1000).toISOString()
        : undefined;
    snap.atelierSessions.push({
      id: sessionId,
      organisationId: grant.organisationId,
      clientId: grant.clientId,
      eventId: grant.eventId,
      atelierId: grant.atelierId,
      grantId: grant.id,
      personId: grant.personId,
      hostRole: grant.hostRole,
      status: "ACTIVE",
      issuedAt: issued.actor.issuedAt,
      lastSeenAt: occurredAt,
      idleExpiresAt: new Date(Date.parse(occurredAt) + idle * 1000).toISOString(),
      absoluteExpiresAt: issued.actor.expiresAt,
      elevatedUntil,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
    this.writeAudit(snap, {
      action: "atelier.access.exchanged",
      outcome: "SUCCESS",
      organisationId: grant.organisationId,
      eventId: grant.eventId,
      resourceType: "atelier_access_grant",
      resourceId: grant.id,
      correlationId,
      occurredAt,
      actorType: "HOST_CAPABILITY",
    });
    this.store.replace(snap);
    const view = buildHostAtelierProjection(snap, grant.id, occurredAt);
    if (!view) throw atelierAccessUnavailable();
    return { sessionToken: issued.token, view };
  }

  hostAtelierView(sessionToken: string, now?: string): HostAtelierProjection {
    const occurredAt = now ?? new Date().toISOString();
    const actor = this.requireHostCapability(sessionToken, occurredAt);
    const snap = this.store.snapshot();
    const view = buildHostAtelierProjection(snap, actor.grantId, occurredAt);
    if (!view) throw atelierAccessUnavailable();
    return view;
  }

  submitHostAtelierDecision(sessionToken: string, raw: unknown, now?: string): HostDecisionReceipt {
    const occurredAt = now ?? new Date().toISOString();
    const actor = this.requireHostCapability(sessionToken, occurredAt);
    const input = parseStrict(SubmitHostDecisionInputSchema, raw);
    const snap = this.store.snapshot();
    const grant = snap.atelierAccessGrants.find((item) => item.id === actor.grantId);
    const session = snap.atelierSessions.find((item) => item.id === actor.sessionId);
    if (!grant || !session) throw atelierAccessUnavailable();
    try {
      const receipt = submitHostDecisionOnSnap(snap, input, occurredAt, grant, session);
      this.writeAudit(snap, {
        action: "atelier.decision.submitted",
        outcome: "SUCCESS",
        organisationId: grant.organisationId,
        eventId: grant.eventId,
        resourceType: "host_decision_receipt",
        resourceId: receipt.id,
        correlationId: receipt.correlationId ?? receipt.id,
        occurredAt,
        actorType: "HOST_CAPABILITY",
        actorPersonId: grant.personId,
      });
      this.store.replace(snap);
      return receipt;
    } catch (error) {
      this.writeAudit(snap, {
        action: "atelier.decision.submitted",
        outcome: "DENIED",
        organisationId: grant.organisationId,
        eventId: grant.eventId,
        resourceType: "host_decision_request",
        resourceId: input.requestId,
        correlationId: "atelier-decision",
        occurredAt,
        actorType: "HOST_CAPABILITY",
        actorPersonId: grant.personId,
        reason: error instanceof PlatformError ? error.code : "FAILED",
      });
      this.store.replace(snap);
      throw error;
    }
  }

  hostAttemptCoreMutation(): never {
    throw new PlatformError(
      "FORBIDDEN",
      "host atelier sessions cannot assign staff, edit RSVP, change forecast parameters, send campaigns or sign protected gates",
    );
  }

  getEventForecastWorkspace(actor: ActorContext, organisationId: string, eventId: string): EventForecastWorkspace {
    const { snap, ctx } = this.authorizeQuery(actor, "forecast.detail.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    const workspace = buildEventForecastWorkspace(
      snap,
      organisationId,
      eventId,
      forecastPermissionAllowed((permission) => this.permissionAllowed(ctx.actor, permission, { organisationId, eventId })),
      ctx.now,
    );
    if (!workspace) throw new PlatformError("NOT_FOUND", "event was not found");
    return workspace;
  }

  getForecastOverviewStrip(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap, ctx } = this.authorizeQuery(actor, "forecast.detail.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    return buildForecastOverviewStrip(snap, organisationId, eventId, ctx.now);
  }

  getHostForecastProjection(actor: ActorContext, organisationId: string, eventId: string): HostForecastProjection {
    const { snap, ctx } = this.authorizeQuery(actor, "forecast.hostProjection.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    const projection = buildHostForecastProjection(snap, organisationId, eventId, ctx.now);
    if (!projection) throw new PlatformError("NOT_FOUND", "event was not found");
    return projection;
  }

  runAttendanceForecast(actor: ActorContext, raw: unknown): AttendanceForecastRun {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(RunAttendanceForecastInputSchema, raw);
    return this.mutate(actor, {
      permission: "forecast.run",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "forecast.run.created",
      resourceType: "attendance_forecast_run",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => runAttendanceForecastOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  proposeForecastOverride(actor: ActorContext, raw: unknown): ForecastOverride {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(ProposeForecastOverrideInputSchema, raw);
    return this.mutate(actor, {
      permission: "forecast.override.propose",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "forecast.override.proposed",
      resourceType: "forecast_override",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => proposeForecastOverrideOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  decideForecastOverride(actor: ActorContext, raw: unknown): ForecastOverride {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(DecideForecastOverrideInputSchema, raw);
    return this.mutate(actor, {
      permission: "forecast.override.approve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: input.decision === "APPROVE" ? "forecast.override.approved" : "forecast.override.rejected",
      resourceType: "forecast_override",
      resourceId: input.overrideId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => decideForecastOverrideOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  proposeProvisionRecommendation(actor: ActorContext, raw: unknown): OperationalProvisionRecommendation {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(ProposeProvisionInputSchema, raw);
    return this.mutate(actor, {
      permission: "provision.propose",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "provision.proposed",
      resourceType: "operational_provision_recommendation",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => proposeProvisionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  decideProvisionRecommendation(actor: ActorContext, raw: unknown): OperationalProvisionRecommendation {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(DecideProvisionInputSchema, raw);
    return this.mutate(actor, {
      permission: "provision.approve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: input.decision === "APPROVE" ? "provision.approved" : "provision.rejected",
      resourceType: "operational_provision_recommendation",
      resourceId: input.provisionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => decideProvisionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  approveHostForecastProjection(actor: ActorContext, raw: unknown): AttendanceForecastRun {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(ApproveHostProjectionInputSchema, raw);
    return this.mutate(actor, {
      permission: "forecast.override.approve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "forecast.hostProjection.approved",
      resourceType: "attendance_forecast_run",
      resourceId: input.forecastRunId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => approveHostProjectionOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  createEventForecastParameterSet(actor: ActorContext, raw: unknown): ModelParameterSet {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(CreateEventParameterSetInputSchema, raw);
    return this.mutate(actor, {
      permission: "model.parameters.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "forecast.parameters.created",
      resourceType: "model_parameter_set",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => createEventParameterSetOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  recordForecastCalibration(actor: ActorContext, raw: unknown): CalibrationObservation {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(RecordCalibrationObservationInputSchema, raw);
    return this.mutate(actor, {
      permission: "model.evaluate",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "forecast.calibration.recorded",
      resourceType: "calibration_observation",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => recordCalibrationObservationOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  evaluateForecast(actor: ActorContext, raw: unknown): ForecastEvaluation {
    assertNoProhibitedForecastFields(raw);
    const input = parseStrict(EvaluateForecastInputSchema, raw);
    return this.mutate(actor, {
      permission: "model.evaluate",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "forecast.evaluation.recorded",
      resourceType: "forecast_evaluation",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => evaluateForecastOnSnap(snap, input, ctx.now, ctx.actor.person.id),
    });
  }

  updateGuestAddressing(actor: ActorContext, raw: unknown): GuestAddressingWorkspace {
    if (raw && typeof raw === "object" && dateOfBirthForbidden(raw as Record<string, unknown>)) {
      throw new PlatformError("VALIDATION_FAILED", "date of birth is not permitted");
    }
    const input = parseStrict<UpdateGuestAddressingInput>(UpdateGuestAddressingInputSchema, raw);
    const confirmRequired = addressingStatusRequiresConfirm(input.addressingStatus);
    return this.mutate(actor, {
      permission: confirmRequired ? "guest.addressing.confirm" : "guest.addressing.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: confirmRequired ? "guest.addressing.confirmed" : "guest.addressing.updated",
      resourceType: "operational_guest",
      resourceId: input.guestId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => {
        const guest = fresh.operationalGuests.find((item) => item.id === input.guestId);
        if (!guest || guest.organisationId !== input.organisationId || guest.eventId !== input.eventId) {
          return undefined;
        }
        return addressingAlreadyApplied(guest, input)
          ? buildGuestAddressingWorkspace(fresh, guest, this.s04aCapabilities(this.actorSnapshot(actor), {
              organisationId: input.organisationId,
              eventId: input.eventId,
            }))
          : undefined;
      },
      run: (snap, ctx) => {
        const guest = requireScopedGuest(snap, input.organisationId, input.eventId, input.guestId);
        this.assertVersion(guest.version, input.expectedVersion);
        if (input.ageBand && requiresResponsibleAdult(input.ageBand)) {
          const allowed = this.permissionAllowed(ctx.actor, "guest.child.manage", {
            organisationId: input.organisationId,
            eventId: input.eventId,
          });
          if (!allowed) {
            throw new PlatformError("FORBIDDEN", "child age band requires child management authority");
          }
        }
        const previousSalutation = guest.addressing?.preferredFormalSalutation;
        applyGuestAddressing(guest, input, ctx.now);
        retainedSalutationInvariant.assert({
          decision: input.salutationDecision,
          persisted: guest.addressing?.preferredFormalSalutation,
          previous: previousSalutation,
        });
        syncChildReadiness(snap, guest);
        return buildGuestAddressingWorkspace(
          snap,
          guest,
          this.s04aCapabilities(ctx.actor, { organisationId: input.organisationId, eventId: input.eventId }),
        );
      },
    });
  }

  createGuestParty(actor: ActorContext, raw: unknown): GuestParty {
    const input = parseStrict<CreatePartyInput>(CreatePartyInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.relationship.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.party.created",
      resourceType: "guest_party",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return createPartyOnSnap(snap, input, ctx.now);
      },
    });
  }

  addGuestPartyMember(actor: ActorContext, raw: unknown): GuestPartyMember {
    const input = parseStrict<AddPartyMemberInput>(AddPartyMemberInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.relationship.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.party.member.added",
      resourceType: "guest_party_member",
      resourceId: input.partyId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => findAlreadyAppliedPartyMember(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return addPartyMemberOnSnap(snap, input, ctx.now);
      },
    });
  }

  removeGuestPartyMember(actor: ActorContext, raw: unknown): GuestPartyMember {
    const input = parseStrict<RemovePartyMemberInput>(RemovePartyMemberInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.relationship.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.party.member.removed",
      resourceType: "guest_party_member",
      resourceId: input.partyMemberId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => findAlreadyRemovedPartyMember(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return removePartyMemberOnSnap(snap, input, ctx.now);
      },
    });
  }

  createGuestRelationship(actor: ActorContext, raw: unknown): GuestRelationship {
    const input = parseStrict<CreateRelationshipInput>(CreateRelationshipInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.relationship.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.relationship.created",
      resourceType: "guest_relationship",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return createRelationshipOnSnap(snap, input, ctx.now);
      },
    });
  }

  administerGuestRelationship(actor: ActorContext, raw: unknown): GuestRelationship {
    const input = parseStrict<AdministerRelationshipInput>(AdministerRelationshipInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.relationship.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.relationship.amended",
      resourceType: "guest_relationship",
      resourceId: input.relationshipId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => relationshipAlreadyApplied(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return administerRelationshipOnSnap(snap, input, ctx.now);
      },
    });
  }

  administerCompanionEntitlement(actor: ActorContext, raw: unknown): CompanionEntitlement {
    const input = parseStrict<AdministerCompanionEntitlementInput>(AdministerCompanionEntitlementInputSchema, raw);
    const exception = input.status === "EXCEPTION_REVIEW";
    return this.mutate(actor, {
      permission: exception ? "guest.entitlement.exception.review" : "guest.entitlement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: exception ? "guest.entitlement.exception.reviewed" : "guest.entitlement.administered",
      resourceType: "companion_entitlement",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => entitlementAlreadyApplied(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return administerCompanionEntitlementOnSnap(snap, input, ctx.now);
      },
    });
  }

  nominateCompanion(actor: ActorContext, raw: unknown): CompanionEntitlement {
    const input = parseStrict<NominateCompanionInput>(NominateCompanionInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.entitlement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.entitlement.nominated",
      resourceType: "companion_entitlement",
      resourceId: input.entitlementId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => nominationAlreadyApplied(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return nominateCompanionOnSnap(snap, input, actor.personId, actor.correlationId, ctx.now).entitlement;
      },
    });
  }

  createResponsibleAdultLink(actor: ActorContext, raw: unknown): ResponsibleAdultLink {
    const input = parseStrict<CreateResponsibleAdultLinkInput>(CreateResponsibleAdultLinkInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.child.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.child.responsibleAdult.linked",
      resourceType: "responsible_adult_link",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => findAlreadyAppliedResponsibleAdultLink(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return createResponsibleAdultLinkOnSnap(snap, input, ctx.now);
      },
    });
  }

  endResponsibleAdultLink(actor: ActorContext, raw: unknown): ResponsibleAdultLink {
    const input = parseStrict<EndResponsibleAdultLinkInput>(EndResponsibleAdultLinkInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.child.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.child.responsibleAdult.ended",
      resourceType: "responsible_adult_link",
      resourceId: input.linkId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      alreadyApplied: (fresh) => findAlreadyEndedResponsibleAdultLink(fresh, input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        return endResponsibleAdultLinkOnSnap(snap, input, ctx.now);
      },
    });
  }

  reconcileCompanionNames(actor: ActorContext, raw: unknown) {
    const input = parseStrict<ReconcileCompanionNamesInput>(ReconcileCompanionNamesInputSchema, raw);
    return this.mutate(actor, {
      permission: "guest.entitlement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "guest.entitlement.companionNames.reconciled",
      resourceType: "addressing_reconciliation",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        const created = reconcileCompanionNamesOnSnap(snap, input, ctx.now);
        return { id: created[0]?.id ?? input.guestId, items: created };
      },
    });
  }

  listGuestHouseholds(actor: ActorContext, organisationId: string, eventId: string): GuestHousehold[] {
    const { snap, ctx } = this.authorizeQuery(actor, "guest.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    return snap.guestHouseholds.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  listGuestDuplicates(actor: ActorContext, organisationId: string, eventId: string, guestId?: string): GuestDuplicateCandidate[] {
    const { snap, ctx } = this.authorizeQuery(actor, "guest.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    return snap.guestDuplicateCandidates.filter((item) => {
      if (item.organisationId !== organisationId || item.eventId !== eventId) return false;
      return guestId ? item.subjectGuestId === guestId || item.otherGuestId === guestId : true;
    });
  }

  guestDisplayName(guest: OperationalGuest): string {
    return operationalDisplayName(guest);
  }

  prepareEventRsvp(actor: ActorContext, raw: unknown): { policy: RsvpPolicy; questionnaire: RsvpQuestionnaire } {
    const input = parseStrict(PrepareEventRsvpInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.policy.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.surface.prepared",
      resourceType: "rsvp_policy",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        ensureRsvpKeyRing(snap, event.organisationId, this.rsvpAccessConfig().currentKeyId, ctx.now);
        let policy = eventPolicy(snap, event.id);
        if (!policy) {
          policy = defaultRsvpPolicy({
            organisationId: event.organisationId,
            clientId: event.clientId,
            eventId: event.id,
            hostDisplayName: input.hostDisplayName ?? "Maison Doclar",
            eventDisplayName: input.eventDisplayName ?? event.name,
            now: ctx.now,
          });
          snap.rsvpPolicies.push(policy);
        }
        let questionnaire = publishedQuestionnaire(snap, event.id);
        if (!questionnaire) {
          questionnaire = {
            id: randomUUID(),
            organisationId: event.organisationId,
            clientId: event.clientId,
            eventId: event.id,
            status: "PUBLISHED",
            versionNumber: 1,
            sections: canonicalQuestionnaireSections(),
            publishedAt: ctx.now,
            schemaVersion: SCHEMA_VERSION,
            version: 1,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          };
          snap.rsvpQuestionnaires.push(questionnaire);
        }
        reconcileEventProjection(snap, event, ctx.now);
        return { id: policy.id, policy, questionnaire };
      },
    });
  }

  upsertRsvpPolicy(actor: ActorContext, raw: unknown): RsvpPolicy {
    const input = parseStrict(UpsertRsvpPolicyInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.policy.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.policy.upserted",
      resourceType: "rsvp_policy",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const existing = eventPolicy(snap, event.id);
        if (existing) {
          if (input.expectedVersion) this.assertVersion(existing.version, input.expectedVersion);
          existing.hostDisplayName = input.hostDisplayName;
          existing.eventDisplayName = input.eventDisplayName;
          existing.privacyNotice = input.privacyNotice;
          existing.amendmentsPermitted = input.amendmentsPermitted;
          existing.companionsPermitted = input.companionsPermitted;
          existing.defaultCompanionAllowance = input.defaultCompanionAllowance;
          if (input.amendmentUntil) existing.amendmentUntil = input.amendmentUntil;
          else delete existing.amendmentUntil;
          existing.version += 1;
          existing.updatedAt = ctx.now;
          return existing;
        }
        const created = defaultRsvpPolicy({
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          hostDisplayName: input.hostDisplayName,
          eventDisplayName: input.eventDisplayName,
          now: ctx.now,
        });
        created.privacyNotice = input.privacyNotice;
        created.amendmentsPermitted = input.amendmentsPermitted;
        created.companionsPermitted = input.companionsPermitted;
        created.defaultCompanionAllowance = input.defaultCompanionAllowance;
        if (input.amendmentUntil) created.amendmentUntil = input.amendmentUntil;
        snap.rsvpPolicies.push(created);
        return created;
      },
    });
  }

  publishRsvpQuestionnaire(actor: ActorContext, raw: unknown): RsvpQuestionnaire {
    const input = parseStrict(PublishRsvpQuestionnaireInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.form.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.questionnaire.published",
      resourceType: "rsvp_questionnaire",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const current = publishedQuestionnaire(snap, event.id);
        if (current) {
          current.status = "CLOSED";
          current.closedAt = ctx.now;
          current.version += 1;
          current.updatedAt = ctx.now;
        }
        const next: RsvpQuestionnaire = {
          id: randomUUID(),
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          status: "PUBLISHED",
          versionNumber: (current?.versionNumber ?? 0) + 1,
          sections: canonicalQuestionnaireSections(),
          publishedAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.rsvpQuestionnaires.push(next);
        return next;
      },
    });
  }

  closeRsvpQuestionnaire(actor: ActorContext, raw: unknown): RsvpQuestionnaire {
    const input = parseStrict(CloseRsvpQuestionnaireInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.form.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.questionnaire.closed",
      resourceType: "rsvp_questionnaire",
      resourceId: input.questionnaireId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.rsvpQuestionnaires.find((item) => item.id === input.questionnaireId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "questionnaire was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        record.status = "CLOSED";
        record.closedAt = ctx.now;
        record.version += 1;
        record.updatedAt = ctx.now;
        const policy = eventPolicy(snap, record.eventId);
        if (policy) {
          policy.closedAt = ctx.now;
          policy.version += 1;
          policy.updatedAt = ctx.now;
        }
        return record;
      },
    });
  }

  issueRsvpInvitation(actor: ActorContext, raw: unknown): IssuedRsvpInvitation {
    const input = parseStrict(IssueRsvpInvitationInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.invitation.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.invitation.issued",
      resourceType: "rsvp_invitation",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        if (guest.lifecycle !== "ACTIVE") {
          throw new PlatformError("VALIDATION_FAILED", "guest is not active");
        }
        if (!eventPolicy(snap, event.id) || !publishedQuestionnaire(snap, event.id)) {
          throw new PlatformError("CAPABILITY_NOT_ENABLED", "RSVP surface is not prepared for this event");
        }
        const existing = activeInvitationForGuest(snap, guest.id);
        if (existing) {
          existing.status = "ROTATED";
          existing.updatedAt = ctx.now;
          existing.version += 1;
        }
        const config = this.rsvpAccessConfig();
        ensureRsvpKeyRing(snap, event.organisationId, config.currentKeyId, ctx.now);
        const token = generateInvitationToken();
        const ttl = config.invitationTtlSeconds ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS.invitationTtlSeconds ?? 2_592_000;
        const invitation: RsvpInvitation = {
          id: randomUUID(),
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          guestId: guest.id,
          tokenHash: hashInvitationToken(token, config),
          tokenPrefix: invitationPrefix(token),
          keyId: config.currentKeyId,
          status: "ISSUED",
          expiresAt: input.expiresAt ?? new Date(Date.parse(ctx.now) + ttl * 1000).toISOString(),
          issuedByPersonId: actor.personId,
          ...(existing ? { rotatedFromId: existing.id } : {}),
          exchangeCount: 0,
          failedExchangeCount: 0,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.rsvpInvitations.push(invitation);
        return { id: invitation.id, invitation, token, guestAccessPath: `/rsvp/${token}` };
      },
    });
  }

  rotateRsvpInvitation(actor: ActorContext, raw: unknown): IssuedRsvpInvitation {
    const input = parseStrict(RotateRsvpInvitationInputSchema, raw);
    const current = this.currentSnapshot().rsvpInvitations.find((item) => item.id === input.invitationId);
    return this.issueRsvpInvitation(actor, {
      organisationId: input.organisationId,
      eventId: input.eventId,
      guestId: current?.guestId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });
  }

  revokeRsvpInvitation(actor: ActorContext, raw: unknown): RsvpInvitation {
    const input = parseStrict(RevokeRsvpInvitationInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.invitation.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.invitation.revoked",
      resourceType: "rsvp_invitation",
      resourceId: input.invitationId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.rsvpInvitations.find((item) => item.id === input.invitationId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "invitation was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        record.status = "REVOKED";
        record.revokedAt = ctx.now;
        record.version += 1;
        record.updatedAt = ctx.now;
        for (const session of snap.rsvpGuestSessions.filter((item) => item.invitationId === record.id && !item.revokedAt)) {
          session.revokedAt = ctx.now;
          session.version += 1;
          session.updatedAt = ctx.now;
        }
        return record;
      },
    });
  }

  grantRsvpEntitlement(actor: ActorContext, raw: unknown): RsvpEntitlement {
    const input = parseStrict(GrantRsvpEntitlementInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.entitlement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.entitlement.granted",
      resourceType: "rsvp_entitlement",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        if (input.kind === "COMPANION" && input.allowance === undefined) {
          throw new PlatformError("VALIDATION_FAILED", "companion allowance is required", { field: "allowance" });
        }
        if (input.kind === "HOUSEHOLD_RESPONDENT") {
          const subjects = input.subjectGuestIds ?? [];
          if (subjects.length === 0) {
            throw new PlatformError("VALIDATION_FAILED", "household subjects are required", { field: "subjectGuestIds" });
          }
          for (const subjectId of subjects) {
            const subject = this.requireOperationalGuest(snap, input.organisationId, input.eventId, subjectId);
            if (!guest.householdId || subject.householdId !== guest.householdId) {
              throw new PlatformError("VALIDATION_FAILED", "household respondent authority requires the same household");
            }
          }
        }
        const record: RsvpEntitlement = {
          id: randomUUID(),
          organisationId: guest.organisationId,
          clientId: guest.clientId,
          eventId: guest.eventId,
          guestId: guest.id,
          kind: input.kind,
          status: "ACTIVE",
          reason: input.reason,
          ...(input.allowance !== undefined ? { allowance: input.allowance } : {}),
          ...(input.subjectGuestIds ? { subjectGuestIds: input.subjectGuestIds } : {}),
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.rsvpEntitlements.push(record);
        return record;
      },
    });
  }

  revokeRsvpEntitlement(actor: ActorContext, raw: unknown): RsvpEntitlement {
    const input = parseStrict(RevokeRsvpEntitlementInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.entitlement.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.entitlement.revoked",
      resourceType: "rsvp_entitlement",
      resourceId: input.entitlementId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.rsvpEntitlements.find((item) => item.id === input.entitlementId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "entitlement was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        record.status = "REVOKED";
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  staffEnterRsvp(actor: ActorContext, raw: unknown): RsvpResponse {
    const input = parseStrict(StaffRsvpResponseInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.response.amend",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: input.withdraw ? "rsvp.response.withdrawn" : "rsvp.response.staff_amended",
      resourceType: "rsvp_response",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        const questionnaire = publishedQuestionnaire(snap, event.id);
        const policy = eventPolicy(snap, event.id);
        if (!questionnaire || !policy) {
          throw new PlatformError("CAPABILITY_NOT_ENABLED", "RSVP surface is not prepared for this event");
        }
        const response = ensureResponse({ snap, guest, questionnaireId: questionnaire.id, now: ctx.now });
        if (input.expectedVersion) this.assertVersion(response.version, input.expectedVersion);
        if (input.withdraw) {
          withdrawResponse(response, ctx.now);
          response.provenance = "STAFF_CORRECTED";
          response.lastActorPersonId = actor.personId;
          reconcileEventProjection(snap, event, ctx.now);
          return response;
        }
        applyResponseAnswers({
          snap,
          guest,
          response,
          answers: { ...(input.answers ?? {}), attendanceIntent: input.attendanceIntent },
          provenance: input.correction || response.status === "SUBMITTED" || response.status === "AMENDED"
            ? "STAFF_CORRECTED"
            : "STAFF_ENTERED",
          questionnaire,
          policy,
          submit: true,
          now: ctx.now,
          actorPersonId: actor.personId,
        });
        reconcileEventProjection(snap, event, ctx.now);
        return response;
      },
    });
  }

  reviewRsvpException(actor: ActorContext, raw: unknown): RsvpException {
    const input = parseStrict(ReviewRsvpExceptionInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.exception.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.exception.reviewed",
      resourceType: "rsvp_exception",
      resourceId: input.exceptionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.rsvpExceptions.find((item) => item.id === input.exceptionId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "exception was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        record.status = input.decision;
        record.resolvedByPersonId = actor.personId;
        record.resolvedAt = ctx.now;
        record.reason = input.reason;
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  acknowledgeAssistance(actor: ActorContext, raw: unknown): RsvpAssistanceRequest {
    const input = parseStrict(AcknowledgeAssistanceInputSchema, raw);
    return this.mutate(actor, {
      permission: "rsvp.exception.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "rsvp.assistance.acknowledged",
      resourceType: "rsvp_assistance",
      resourceId: input.assistanceId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const record = snap.rsvpAssistanceRequests.find((item) => item.id === input.assistanceId);
        if (!record || record.organisationId !== input.organisationId || record.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "assistance request was not found");
        }
        this.assertVersion(record.version, input.expectedVersion);
        record.status = input.status;
        record.acknowledgedByPersonId = actor.personId;
        record.acknowledgedAt = ctx.now;
        record.version += 1;
        record.updatedAt = ctx.now;
        return record;
      },
    });
  }

  getRsvpPolicy(actor: ActorContext, organisationId: string, eventId: string): RsvpPolicy | undefined {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return eventPolicy(snap, eventId);
  }

  getPublishedQuestionnaire(actor: ActorContext, organisationId: string, eventId: string): RsvpQuestionnaire | undefined {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return publishedQuestionnaire(snap, eventId);
  }

  getRsvpOverview(actor: ActorContext, organisationId: string, eventId: string): RsvpEventProjection {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return reconcileEventProjection(snap, event, ctx.now);
  }

  listRsvpDirectory(actor: ActorContext, raw: unknown): RsvpGuestDirectoryRow[] {
    const input = parseStrict<RsvpDirectoryQuery>(RsvpDirectoryQuerySchema, raw);
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", {
      organisationId: input.organisationId,
      eventId: input.eventId,
    });
    const event = this.requireEvent(snap, input.organisationId, input.eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return snap.operationalGuests
      .filter((item) => item.organisationId === input.organisationId && item.eventId === input.eventId)
      .filter((item) => guestMatchesQuery(item, input.query))
      .map((guest) => {
        const response = responseForGuest(snap, guest.id);
        const invitation = activeInvitationForGuest(snap, guest.id);
        const exceptions = snap.rsvpExceptions.filter((item) => item.guestId === guest.id);
        const assistance = snap.rsvpAssistanceRequests.filter((item) => item.guestId === guest.id);
        const row: RsvpGuestDirectoryRow = {
          guest,
          attendanceIntent: response?.attendanceIntent ?? "NOT_SUPPLIED",
          responseStatus: response?.status ?? "NOT_STARTED",
          ...(response?.provenance ? { provenance: response.provenance } : {}),
          ...(response?.respondedAt ? { respondedAt: response.respondedAt } : {}),
          ...(invitation ? { invitationStatus: invitation.status } : {}),
          attentionRequired: rsvpAttention({ response, exceptions, assistance }),
        };
        return row;
      })
      .filter((row) => (input.attendanceIntent ? row.attendanceIntent === input.attendanceIntent : true))
      .filter((row) => (input.responseStatus ? row.responseStatus === input.responseStatus : true))
      .filter((row) => (input.attentionRequired === undefined ? true : row.attentionRequired === input.attentionRequired));
  }

  listRsvpInvitations(actor: ActorContext, organisationId: string, eventId: string, guestId?: string): RsvpInvitation[] {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.invitation.manage", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return snap.rsvpInvitations.filter((item) => {
      if (item.organisationId !== organisationId || item.eventId !== eventId) return false;
      return guestId ? item.guestId === guestId : true;
    });
  }

  listRsvpExceptions(actor: ActorContext, organisationId: string, eventId: string): RsvpException[] {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return snap.rsvpExceptions.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  listRsvpAssistance(actor: ActorContext, organisationId: string, eventId: string): RsvpAssistanceRequest[] {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    return snap.rsvpAssistanceRequests.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  getGuestRsvp(actor: ActorContext, organisationId: string, eventId: string, guestId: string): {
    response?: RsvpResponse;
    invitation?: RsvpInvitation;
    exceptions: RsvpException[];
    assistance: RsvpAssistanceRequest[];
    entitlements: RsvpEntitlement[];
  } {
    const { snap, ctx } = this.authorizeQuery(actor, "rsvp.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    this.requireOperationalGuest(snap, organisationId, eventId, guestId);
    return {
      response: responseForGuest(snap, guestId),
      invitation: activeInvitationForGuest(snap, guestId),
      exceptions: snap.rsvpExceptions.filter((item) => item.guestId === guestId),
      assistance: snap.rsvpAssistanceRequests.filter((item) => item.guestId === guestId),
      entitlements: snap.rsvpEntitlements.filter((item) => item.guestId === guestId),
    };
  }

  recoverExpiredInvitations(actor: ActorContext, organisationId: string, eventId: string): number {
    return this.mutate(actor, {
      permission: "rsvp.invitation.manage",
      scope: { organisationId, eventId },
      action: "rsvp.invitation.expired",
      resourceType: "rsvp_invitation",
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, organisationId, eventId);
        if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
        return { id: event.id, count: expireInvitations(snap, ctx.now) };
      },
    }).count;
  }

  exchangeGuestAccess(
    token: string,
    now?: string,
    correlationId = "guest-access",
  ): { sessionToken: string; view: GuestSelfServiceView } {
    const config = this.rsvpAccessConfig();
    const snap = this.store.snapshot();
    const occurredAt = now ?? new Date().toISOString();
    expireInvitations(snap, occurredAt);
    const tokenHash = hashInvitationToken(token, config);
    const invitation = snap.rsvpInvitations.find((item) => item.tokenHash === tokenHash);
    if (!invitation || invitation.status !== "ISSUED" || Date.parse(invitation.expiresAt) <= Date.parse(occurredAt)) {
      this.writeAudit(snap, {
        action: "rsvp.access.denied",
        outcome: "DENIED",
        resourceType: "rsvp_invitation",
        correlationId,
        reason: "guest_access_unavailable",
        occurredAt,
        actorType: "GUEST_CAPABILITY",
      });
      this.store.replace(snap);
      throw guestAccessUnavailable();
    }
    if (invitation.failedExchangeCount >= (config.maxExchangeFailures ?? 8)) {
      invitation.status = "REVOKED";
      invitation.revokedAt = occurredAt;
      invitation.version += 1;
      invitation.updatedAt = occurredAt;
      this.writeAudit(snap, {
        action: "rsvp.access.denied",
        outcome: "DENIED",
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        resourceType: "rsvp_invitation",
        resourceId: invitation.id,
        correlationId,
        reason: "guest_access_unavailable",
        occurredAt,
        actorType: "GUEST_CAPABILITY",
      });
      this.store.replace(snap);
      throw guestAccessUnavailable();
    }
    const guest = snap.operationalGuests.find((item) => item.id === invitation.guestId);
    if (!guest || guest.eventId !== invitation.eventId || guest.lifecycle !== "ACTIVE") {
      this.writeAudit(snap, {
        action: "rsvp.access.denied",
        outcome: "DENIED",
        organisationId: invitation.organisationId,
        eventId: invitation.eventId,
        resourceType: "rsvp_invitation",
        resourceId: invitation.id,
        correlationId,
        reason: "guest_access_unavailable",
        occurredAt,
        actorType: "GUEST_CAPABILITY",
      });
      this.store.replace(snap);
      throw guestAccessUnavailable();
    }
    const sessionId = randomUUID();
    const issued = issueGuestSession(
      {
        sessionId,
        invitationId: invitation.id,
        guestId: invitation.guestId,
        eventId: invitation.eventId,
        organisationId: invitation.organisationId,
        now: occurredAt,
      },
      config,
    );
    snap.rsvpGuestSessions.push({
      id: sessionId,
      organisationId: invitation.organisationId,
      clientId: invitation.clientId,
      eventId: invitation.eventId,
      guestId: invitation.guestId,
      invitationId: invitation.id,
      sessionHash: hashGuestSessionToken(issued.token, config),
      keyId: config.currentKeyId,
      expiresAt: issued.actor.expiresAt,
      lastSeenAt: occurredAt,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: occurredAt,
      updatedAt: occurredAt,
      ...lineageFixtureMark(invitation, guest),
    });
    invitation.lastExchangedAt = occurredAt;
    invitation.exchangeCount += 1;
    invitation.version += 1;
    invitation.updatedAt = occurredAt;
    this.writeAudit(snap, {
      action: "rsvp.access.exchanged",
      outcome: "SUCCESS",
      organisationId: invitation.organisationId,
      clientId: invitation.clientId,
      eventId: invitation.eventId,
      resourceType: "rsvp_guest_session",
      resourceId: sessionId,
      correlationId,
      afterHash: stableHash({ sessionId, invitationId: invitation.id, guestId: invitation.guestId }),
      occurredAt,
      actorType: "GUEST_CAPABILITY",
    });
    this.store.replace(snap);
    return { sessionToken: issued.token, view: this.guestSelfServiceViewFromSnap(snap, issued.actor, occurredAt) };
  }

  guestSelfServiceView(sessionToken: string, now?: string): GuestSelfServiceView {
    const occurredAt = now ?? new Date().toISOString();
    const capability = this.requireGuestCapability(sessionToken, occurredAt);
    return this.guestSelfServiceViewFromSnap(this.store.snapshot(), capability, occurredAt);
  }

  saveGuestRsvp(sessionToken: string, raw: unknown, now?: string, correlationId = "guest-rsvp"): RsvpResponse {
    const input = parseStrict(GuestRsvpSaveInputSchema, raw);
    const occurredAt = now ?? new Date().toISOString();
    const capability = this.requireGuestCapability(sessionToken, occurredAt);
    return this.capabilityMutate(capability, {
      action: input.submit ? "rsvp.response.submitted" : "rsvp.response.autosaved",
      resourceType: "rsvp_response",
      reason: input.submit ? "guest self-service submission" : "guest self-service draft",
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      correlationId,
      occurredAt,
      run: (snap) => {
        const guest = this.requireOperationalGuest(snap, capability.organisationId, capability.eventId, capability.guestId);
        const policy = eventPolicy(snap, capability.eventId);
        const questionnaire = publishedQuestionnaire(snap, capability.eventId);
        if (!policy || !questionnaire || !policyIsOpen(policy, occurredAt)) {
          throw guestAccessUnavailable();
        }
        const response = ensureResponse({ snap, guest, questionnaireId: questionnaire.id, now: occurredAt });
        if (input.expectedVersion) this.assertVersion(response.version, input.expectedVersion);
        if (input.submit && !amendmentsAllowed(policy, occurredAt, response.status) && response.status !== "NOT_STARTED" && response.status !== "IN_PROGRESS") {
          throw new PlatformError("FORBIDDEN", "amendments are no longer permitted", {
            publicMessage: "This response can no longer be changed.",
          });
        }
        applyResponseAnswers({
          snap,
          guest,
          response,
          answers: input.answers,
          provenance: "GUEST_SELF_SERVICE",
          questionnaire,
          policy,
          submit: Boolean(input.submit),
          now: occurredAt,
          invitationId: capability.invitationId,
        });
        const event = this.requireEvent(snap, capability.organisationId, capability.eventId);
        reconcileEventProjection(snap, event, occurredAt);
        return response;
      },
    });
  }

  requestGuestAssistance(sessionToken: string, raw: unknown, now?: string, correlationId = "guest-assistance"): RsvpAssistanceRequest {
    const input = parseStrict(GuestAssistanceInputSchema, raw);
    const occurredAt = now ?? new Date().toISOString();
    const capability = this.requireGuestCapability(sessionToken, occurredAt);
    return this.capabilityMutate(capability, {
      action: "rsvp.assistance.requested",
      resourceType: "rsvp_assistance",
      reason: "guest requested assistance",
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      correlationId,
      occurredAt,
      run: (snap) => {
        const guest = this.requireOperationalGuest(snap, capability.organisationId, capability.eventId, capability.guestId);
        const record: RsvpAssistanceRequest = {
          id: randomUUID(),
          organisationId: guest.organisationId,
          clientId: guest.clientId,
          eventId: guest.eventId,
          guestId: guest.id,
          note: input.note,
          status: "OPEN",
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: occurredAt,
          updatedAt: occurredAt,
        };
        snap.rsvpAssistanceRequests.push(record);
        guest.attentionRequired = true;
        openAssistanceTask(snap, {
          organisationId: guest.organisationId,
          clientId: guest.clientId,
          eventId: guest.eventId,
          guestId: guest.id,
          note: input.note,
          now: occurredAt,
        });
        return record;
      },
    });
  }

  logoutGuestSession(sessionToken: string, now?: string, correlationId = "guest-logout"): void {
    const occurredAt = now ?? new Date().toISOString();
    const capability = this.requireGuestCapability(sessionToken, occurredAt);
    const snap = this.store.snapshot();
    const session = snap.rsvpGuestSessions.find((item) => item.id === capability.sessionId);
    if (session && !session.revokedAt) {
      session.revokedAt = occurredAt;
      session.version += 1;
      session.updatedAt = occurredAt;
    }
    this.writeAudit(snap, {
      action: "rsvp.access.logout",
      outcome: "SUCCESS",
      organisationId: capability.organisationId,
      eventId: capability.eventId,
      resourceType: "rsvp_guest_session",
      resourceId: capability.sessionId,
      correlationId,
      occurredAt,
      actorType: "GUEST_CAPABILITY",
    });
    this.store.replace(snap);
  }

  listClients(actor: ActorContext, organisationId: string): Client[] {
    const { snap, ctx } = this.authorizeQuery(actor, "client.list", { organisationId });
    return snap.clients.filter((item) => item.organisationId === organisationId && canSeeClient(ctx.actor, organisationId, item.id, ctx.now));
  }

  getClient(actor: ActorContext, organisationId: string, clientId: string): Client {
    const { snap, ctx } = this.authorizeQuery(actor, "client.view", { organisationId });
    const record = this.requireClient(snap, organisationId, clientId);
    if (!canSeeClient(ctx.actor, organisationId, clientId, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "client was not found");
    }
    return record;
  }

  listEvents(actor: ActorContext, organisationId: string): EventRecord[] {
    const { snap, ctx } = this.authorizeQuery(actor, "event.list", { organisationId });
    return snap.events.filter((item) => item.organisationId === organisationId && canSeeEvent(ctx.actor, item, ctx.now));
  }

  getEvent(actor: ActorContext, organisationId: string, eventId: string): EventRecord {
    const { snap, ctx } = this.authorizeQuery(actor, "event.view", { organisationId });
    const record = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, record, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    return record;
  }

  getMasterEventFile(actor: ActorContext, organisationId: string, eventId: string): MasterEventFile {
    const { snap, ctx } = this.authorizeQuery(actor, "mef.view", { organisationId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) throw new PlatformError("NOT_FOUND", "event was not found");
    const record = snap.masterEventFiles.find((item) => item.id === event.masterEventFileId);
    if (!record) throw new PlatformError("NOT_FOUND", "master event file was not found");
    return record;
  }

  listPersons(actor: ActorContext, organisationId: string): Person[] {
    const { snap } = this.authorizeQuery(actor, "assignment.view", { organisationId });
    const memberIds = new Set(
      snap.memberships.filter((item) => item.organisationId === organisationId && item.status === "ACTIVE").map((item) => item.personId),
    );
    return snap.persons.filter((item) => memberIds.has(item.id));
  }

  listAssignments(actor: ActorContext, organisationId: string): Assignment[] {
    const { snap, ctx } = this.authorizeQuery(actor, "assignment.view", { organisationId });
    const privileged = ctx.decision.allow && ctx.decision.matchedRoleKeys.some((key) => key === "CEO" || key === "SYSTEM_ADMINISTRATOR" || key === "EVENT_DIRECTOR");
    return snap.assignments.filter((item) => {
      if (item.organisationId !== organisationId) return false;
      return privileged || item.personId === actor.personId;
    });
  }

  getAccessAdministration(
    actor: ActorContext,
    organisationId: string,
  ): {
    people: Array<{ id: string; displayName: string }>;
    events: Array<{ id: string; name: string }>;
    assignments: Assignment[];
  } {
    const { snap, ctx } = this.authorizeQuery(actor, "assignment.manage", { organisationId });
    const memberIds = new Set(
      snap.memberships
        .filter((item) => item.organisationId === organisationId && item.status === "ACTIVE")
        .map((item) => item.personId),
    );
    return {
      people: snap.persons
        .filter((item) => memberIds.has(item.id))
        .map((item) => ({ id: item.id, displayName: item.displayName })),
      events: snap.events
        .filter((item) => item.organisationId === organisationId && canSeeEvent(ctx.actor, item, ctx.now))
        .map((item) => ({ id: item.id, name: item.name })),
      assignments: snap.assignments.filter((item) => item.organisationId === organisationId),
    };
  }

  searchAudit(actor: ActorContext, organisationId: string): AuditEvent[] {
    const { snap } = this.authorizeQuery(actor, "audit.view", { organisationId });
    return snap.audit.filter((item) => item.organisationId === organisationId);
  }

  exportAudit(actor: ActorContext, organisationId: string): AuditEvent[] {
    return this.mutate(actor, {
      permission: "audit.export",
      scope: { organisationId },
      action: "audit.exported",
      resourceType: "audit",
      run: (snap) => ({ id: organisationId, records: snap.audit.filter((item) => item.organisationId === organisationId) }),
    }).records;
  }

  listOrganisations(actor: ActorContext): Organisation[] {
    const snap = this.store.snapshot();
    const ctx = this.actorSnapshot(actor);
    const orgIds = new Set(ctx.assignments.filter((item) => item.status === "ACTIVE").map((item) => item.organisationId));
    return snap.organisations.filter((item) => orgIds.has(item.id));
  }

  prepareCommunications(actor: ActorContext, raw: unknown): { policy: ChannelPolicy; occasion: GuestSafeOccasion } {
    const input = parseStrict(PrepareCommunicationsInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.policy.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.surface.prepared",
      resourceType: "channel_policy",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const prepared = prepareCommunicationsOnSnap(snap, event, ctx.now);
        return { id: prepared.policy.id, ...prepared };
      },
    });
  }

  publishChannelPolicy(actor: ActorContext, raw: unknown): ChannelPolicy {
    const input = parseStrict(PublishChannelPolicyInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.policy.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.policy.published",
      resourceType: "channel_policy",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        const policy = eventChannelPolicy(snap, input.eventId);
        if (!policy) throw new PlatformError("NOT_FOUND", "communications have not been prepared for this event");
        this.assertVersion(policy.version, input.expectedVersion);
        if (input.enabledChannels) policy.enabledChannels = input.enabledChannels;
        if (input.quietHoursStart) policy.quietHoursStart = input.quietHoursStart;
        if (input.quietHoursEnd) policy.quietHoursEnd = input.quietHoursEnd;
        if (input.frequencyCapPerDay) policy.frequencyCapPerDay = input.frequencyCapPerDay;
        if (input.acknowledgementMinutes) policy.acknowledgementMinutes = input.acknowledgementMinutes;
        if (input.resolutionMinutes) policy.resolutionMinutes = input.resolutionMinutes;
        if (input.sandboxDispatchEnabled !== undefined) policy.sandboxDispatchEnabled = input.sandboxDispatchEnabled;
        policy.status = "PUBLISHED";
        policy.publishedAt = ctx.now;
        policy.version += 1;
        policy.updatedAt = ctx.now;
        syncContactProjections(snap, input.eventId, ctx.now);
        return policy;
      },
    });
  }

  publishGuestSafeOccasion(actor: ActorContext, raw: unknown): GuestSafeOccasion {
    const input = parseStrict(PublishOccasionInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.policy.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.occasion.published",
      resourceType: "guest_safe_occasion",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        const occasion = eventOccasion(snap, input.eventId);
        if (!occasion) throw new PlatformError("NOT_FOUND", "guest-safe occasion is not prepared");
        this.assertVersion(occasion.version, input.expectedVersion);
        if (input.verifyWhen && occasion.when) occasion.when = { ...occasion.when, quality: "VERIFIED" };
        if (input.verifyVenue && occasion.venue) occasion.venue = { ...occasion.venue, quality: "VERIFIED" };
        if (input.arrival) occasion.arrival = { value: input.arrival, quality: "VERIFIED" };
        if (input.dress) occasion.dress = { value: input.dress, quality: "VERIFIED" };
        if (input.context) occasion.context = { value: input.context, quality: "VERIFIED" };
        occasion.status = "PUBLISHED";
        occasion.publishedAt = ctx.now;
        occasion.publishedByPersonId = actor.personId;
        occasion.version += 1;
        occasion.updatedAt = ctx.now;
        return occasion;
      },
    });
  }

  suppressContact(actor: ActorContext, raw: unknown) {
    const input = parseStrict(SuppressContactInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.policy.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.suppression.recorded",
      resourceType: "suppression_entry",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        if (input.guestId) this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        const record = {
          id: randomUUID(),
          organisationId: input.organisationId,
          eventId: input.eventId,
          ...(input.guestId ? { guestId: input.guestId } : {}),
          ...(input.channel ? { channel: input.channel } : {}),
          ...(input.purpose ? { purpose: input.purpose } : {}),
          reason: input.reason,
          source: "STAFF" as const,
          effectiveAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.suppressionEntries.push(record);
        return record;
      },
    });
  }

  createTemplateVersion(actor: ActorContext, raw: unknown): MessageTemplateVersion {
    const input = parseStrict(CreateTemplateVersionInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.template.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.template.version.created",
      resourceType: "message_template_version",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        this.requireEvent(snap, input.organisationId, input.eventId);
        const template = snap.messageTemplates.find((item) => item.id === input.templateId && item.organisationId === input.organisationId);
        if (!template) throw new PlatformError("NOT_FOUND", "template was not found");
        const unknown = extractVariables(`${input.subject ?? ""}\n${input.body}`).filter(
          (name) => !ALLOWED_TEMPLATE_VARIABLES.includes(name as (typeof ALLOWED_TEMPLATE_VARIABLES)[number]),
        );
        if (unknown.length > 0) {
          throw new PlatformError("VALIDATION_FAILED", `unknown template variables: ${unknown.join(", ")}`);
        }
        const versionNumber = snap.messageTemplateVersions.filter((item) => item.templateId === template.id).length + 1;
        const version: MessageTemplateVersion = {
          id: randomUUID(),
          templateId: template.id,
          organisationId: template.organisationId,
          versionNumber,
          locale: "en",
          ...(input.subject ? { subject: input.subject } : {}),
          body: input.body,
          requiredVariables: input.requiredVariables ?? extractVariables(input.body),
          contentHash: contentHash(input.body),
          status: "DRAFT",
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.messageTemplateVersions.push(version);
        template.activeVersionId = version.id;
        template.status = "DRAFT";
        template.version += 1;
        template.updatedAt = ctx.now;
        return version;
      },
    });
  }

  approveTemplate(actor: ActorContext, raw: unknown): MessageTemplateVersion {
    const input = parseStrict(ApproveTemplateInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.template.publish",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.template.approved",
      resourceType: "message_template_version",
      resourceId: input.templateVersionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const version = snap.messageTemplateVersions.find((item) => item.id === input.templateVersionId);
        if (!version || version.organisationId !== input.organisationId) {
          throw new PlatformError("NOT_FOUND", "template version was not found");
        }
        this.assertVersion(version.version, input.expectedVersion);
        version.status = "APPROVED";
        version.approvedByPersonId = actor.personId;
        version.approvedAt = ctx.now;
        version.version += 1;
        version.updatedAt = ctx.now;
        const template = snap.messageTemplates.find((item) => item.id === version.templateId);
        if (template) {
          template.status = "APPROVED";
          template.activeVersionId = version.id;
          template.version += 1;
          template.updatedAt = ctx.now;
        }
        return version;
      },
    });
  }

  upsertAudience(actor: ActorContext, raw: unknown) {
    const input = parseStrict(UpsertAudienceInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.audience.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.audience.upserted",
      resourceType: "audience_definition",
      resourceId: input.audienceId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        if (input.filters.some((item) => item.predicate === "SEATING")) {
          throw new PlatformError("VALIDATION_FAILED", "seating predicates are unavailable until seating truth exists");
        }
        if (input.audienceId) {
          const existing = snap.audienceDefinitions.find((item) => item.id === input.audienceId);
          if (!existing || existing.organisationId !== input.organisationId || existing.eventId !== input.eventId) {
            throw new PlatformError("NOT_FOUND", "audience was not found");
          }
          if (input.expectedVersion) this.assertVersion(existing.version, input.expectedVersion);
          existing.name = input.name;
          existing.filters = input.filters;
          existing.status = "ACTIVE";
          existing.version += 1;
          existing.updatedAt = ctx.now;
          return existing;
        }
        const created = {
          id: randomUUID(),
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          name: input.name,
          filters: input.filters,
          status: "ACTIVE" as const,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.audienceDefinitions.push(created);
        return created;
      },
    });
  }

  createCampaign(actor: ActorContext, raw: unknown): Campaign {
    const input = parseStrict(CreateCampaignInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.campaign.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.campaign.created",
      resourceType: "campaign",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = this.requireEvent(snap, input.organisationId, input.eventId);
        const template = snap.messageTemplates.find((item) => item.id === input.templateId);
        const version = template?.activeVersionId
          ? snap.messageTemplateVersions.find((item) => item.id === template.activeVersionId)
          : undefined;
        const audience = snap.audienceDefinitions.find((item) => item.id === input.audienceDefinitionId);
        if (!template || !version || !audience || audience.eventId !== event.id) {
          throw new PlatformError("NOT_FOUND", "campaign references are missing");
        }
        if (version.status !== "APPROVED") {
          throw new PlatformError("VALIDATION_FAILED", "template version is not approved");
        }
        if (input.linkedInvitationId) {
          const invitation = snap.rsvpInvitations.find((item) => item.id === input.linkedInvitationId);
          if (!invitation || invitation.eventId !== event.id || invitation.status !== "ISSUED") {
            throw new PlatformError("VALIDATION_FAILED", "S04 may only deliver an already issued S03 invitation");
          }
        }
        const campaign: Campaign = {
          id: randomUUID(),
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          name: input.name,
          purpose: input.purpose,
          channel: input.channel,
          status: "DRAFT",
          templateId: template.id,
          templateVersionId: version.id,
          audienceDefinitionId: audience.id,
          testOnly: input.testOnly === true,
          createdByPersonId: actor.personId,
          ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
          ...(input.linkedInvitationId ? { linkedInvitationId: input.linkedInvitationId } : {}),
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.campaigns.push(campaign);
        return campaign;
      },
    });
  }

  requestCampaignApproval(actor: ActorContext, raw: unknown): Campaign {
    const input = parseStrict(RequestCampaignApprovalInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.campaign.manage",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.campaign.approval.requested",
      resourceType: "campaign",
      resourceId: input.campaignId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const campaign = this.requireCampaign(snap, input.organisationId, input.eventId, input.campaignId);
        this.assertVersion(campaign.version, input.expectedVersion);
        return requestCampaignApprovalOnSnap(snap, campaign, actor.personId, ctx.now);
      },
    });
  }

  decideCampaign(actor: ActorContext, raw: unknown) {
    const input = parseStrict(CampaignDecisionInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.campaign.approve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.campaign.decided",
      resourceType: "campaign_approval",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const campaign = this.requireCampaign(snap, input.organisationId, input.eventId, input.campaignId);
        this.assertVersion(campaign.version, input.expectedVersion);
        if (campaign.createdByPersonId && campaign.createdByPersonId === actor.personId) {
          throw new PlatformError("FORBIDDEN", "approval requires a different named human");
        }
        return decideCampaignOnSnap(snap, campaign, {
          decision: input.decision,
          ...(input.comment ? { comment: input.comment } : {}),
          personId: actor.personId,
          now: ctx.now,
        });
      },
    });
  }

  actOnCampaign(actor: ActorContext, raw: unknown): Campaign {
    const input = parseStrict(CampaignActionInputSchema, raw);
    const permission = input.action === "CANCEL" ? "msg.campaign.manage" : "msg.campaign.run";
    return this.mutate(actor, {
      permission,
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: `msg.campaign.${input.action.toLowerCase()}`,
      resourceType: "campaign",
      resourceId: input.campaignId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const campaign = this.requireCampaign(snap, input.organisationId, input.eventId, input.campaignId);
        this.assertVersion(campaign.version, input.expectedVersion);
        if (input.action === "SCHEDULE") {
          if (!legalCampaignTransition(campaign.status, "SCHEDULED")) {
            throw new PlatformError("TRANSITION_INVALID", `campaign cannot be scheduled from ${campaign.status}`);
          }
          campaign.scheduledAt = input.scheduledAt ?? campaign.scheduledAt ?? ctx.now;
          campaign.status = "SCHEDULED";
        } else if (input.action === "PAUSE") {
          if (!legalCampaignTransition(campaign.status, "PAUSED")) {
            throw new PlatformError("TRANSITION_INVALID", `campaign cannot be paused from ${campaign.status}`);
          }
          campaign.status = "PAUSED";
        } else if (input.action === "CANCEL") {
          if (!legalCampaignTransition(campaign.status, "CANCELLED")) {
            throw new PlatformError("TRANSITION_INVALID", `campaign cannot be cancelled from ${campaign.status}`);
          }
          campaign.status = "CANCELLED";
          for (const message of snap.commsMessages.filter((item) => item.campaignId === campaign.id && (item.status === "QUEUED" || item.status === "PLANNED" || item.status === "RETRYING"))) {
            message.status = "CANCELLED";
            message.updatedAt = ctx.now;
          }
        } else if (input.action === "TEST_SEND" || input.action === "RUN" || input.action === "DISPATCH") {
          if (input.action !== "DISPATCH" && campaign.status !== "DISPATCHING") {
            if (!legalCampaignTransition(campaign.status, "DISPATCHING")) {
              throw new PlatformError("TRANSITION_INVALID", `campaign cannot dispatch from ${campaign.status}`);
            }
            expandCampaignOnSnap(snap, campaign, ctx.now);
          }
          dispatchOutboxOnSnap(snap, campaign.eventId, ctx.now, input.failMode);
        }
        campaign.updatedAt = ctx.now;
        campaign.version += 1;
        return campaign;
      },
    });
  }

  applySyntheticCallback(actor: ActorContext, raw: unknown) {
    const input = parseStrict(SyntheticCallbackInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.campaign.run",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.delivery.callback",
      resourceType: "delivery_event",
      reason: "synthetic provider callback",
      idempotencyKey: input.idempotencyKey ?? input.providerEventId,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const event = applySyntheticCallbackOnSnap(snap, {
          providerRequestKey: input.providerRequestKey,
          providerEventId: input.providerEventId,
          type: input.type,
          signature: input.signature,
          now: input.occurredAt ?? ctx.now,
        });
        if (!event) throw new PlatformError("NOT_FOUND", "callback could not be applied");
        return event;
      },
    });
  }

  ingestInbound(actor: ActorContext, raw: unknown): InboundMessage {
    const input = parseStrict(IngestInboundInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.inbox.respond",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.inbound.ingested",
      resourceType: "inbound_message",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey ?? input.providerMessageId,
      payloadHash: stableHash(input),
      run: (snap, ctx) =>
        ingestInboundOnSnap(snap, {
          organisationId: input.organisationId,
          ...(input.eventId ? { eventId: input.eventId } : {}),
          channel: input.channel,
          providerMessageId: input.providerMessageId,
          sender: input.sender,
          body: input.body,
          ...(input.attachmentFileName ? { attachmentFileName: input.attachmentFileName } : {}),
          signature: input.signature,
          now: ctx.now,
        }),
    });
  }

  resolveUnmatchedInbound(actor: ActorContext, raw: unknown): InboundMessage {
    const input = parseStrict(ResolveUnmatchedInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.inbound.unmatched.resolve",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.inbound.resolved",
      resourceType: "inbound_message",
      resourceId: input.inboundId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const inbound = snap.inboundMessages.find((item) => item.id === input.inboundId);
        if (!inbound || inbound.organisationId !== input.organisationId) {
          throw new PlatformError("NOT_FOUND", "inbound message was not found");
        }
        this.assertVersion(inbound.version, input.expectedVersion);
        if (inbound.matchStatus === "MATCHED") {
          throw new PlatformError("TRANSITION_INVALID", "matched inbound cannot be reassigned silently");
        }
        if (input.action === "DISMISS") {
          inbound.matchStatus = "QUARANTINED";
        } else if (input.action === "ESCALATE") {
          const event = this.requireEvent(snap, input.organisationId, input.eventId);
          snap.followUpTasks.push({
            id: randomUUID(),
            organisationId: event.organisationId,
            clientId: event.clientId,
            eventId: event.id,
            threadId: inbound.threadId ?? randomUUID(),
            inboundMessageId: inbound.id,
            category: "UNMATCHED",
            status: "OPEN",
            escalationLevel: 1,
            schemaVersion: SCHEMA_VERSION,
            version: 1,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          });
        } else {
          if (!input.guestId) throw new PlatformError("VALIDATION_FAILED", "a guest is required to link unmatched inbound");
          const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
          inbound.guestId = guest.id;
          inbound.eventId = guest.eventId;
          inbound.clientId = guest.clientId;
          inbound.matchStatus = "MATCHED";
          inbound.matchConfidence = "HIGH";
        }
        inbound.version += 1;
        inbound.updatedAt = ctx.now;
        return inbound;
      },
    });
  }

  replyOnThread(actor: ActorContext, raw: unknown) {
    const input = parseStrict(ConciergeReplyInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.inbox.respond",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.concierge.replied",
      resourceType: "comms_message",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const thread = snap.conversationThreads.find((item) => item.id === input.threadId);
        if (!thread || thread.organisationId !== input.organisationId || thread.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "conversation was not found");
        }
        if (thread.guestId) {
          const eligibility = guestEligibility(snap, thread.guestId, thread.channel, "CONCIERGE", ctx.now);
          if (eligibility.status !== "ALLOW") {
            throw new PlatformError("FORBIDDEN", `reply is not eligible: ${eligibility.reasons.join(",")}`, {
              publicMessage: replyEligibilityPublicMessage(eligibility.reasons),
            });
          }
        }
        const message = {
          id: randomUUID(),
          organisationId: thread.organisationId,
          clientId: thread.clientId,
          eventId: thread.eventId,
          ...(thread.guestId ? { guestId: thread.guestId } : {}),
          threadId: thread.id,
          purpose: "CONCIERGE" as const,
          channel: thread.channel,
          direction: "OUTBOUND" as const,
          status: "QUEUED" as const,
          idempotencyKey: input.idempotencyKey ?? `reply:${thread.id}:${ctx.now}`,
          testWatermark: true,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.commsMessages.push(message);
        snap.messageContentSnapshots.push({
          id: randomUUID(),
          messageId: message.id,
          body: input.body,
          variablesHash: contentHash(input.body),
          contentHash: contentHash(input.body),
          createdAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
        });
        if (input.privateNote) {
          const task = snap.followUpTasks.find((item) => item.threadId === thread.id && item.status !== "CLOSED");
          if (task) task.privateNote = input.privateNote;
        }
        thread.lastMessageAt = ctx.now;
        thread.status = "WAITING_ON_GUEST";
        thread.updatedAt = ctx.now;
        snap.commsOutbox.push({
          id: randomUUID(),
          organisationId: thread.organisationId,
          clientId: thread.clientId,
          eventId: thread.eventId,
          messageId: message.id,
          status: "PENDING",
          nextAttemptAt: ctx.now,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        });
        dispatchOutboxOnSnap(snap, thread.eventId, ctx.now);
        return message;
      },
    });
  }

  actOnTask(actor: ActorContext, raw: unknown): FollowUpTask {
    const input = parseStrict(TaskActionInputSchema, raw);
    const permission = input.action === "ASSIGN" || input.action === "ESCALATE" ? "msg.inbox.assign" : "msg.task.manage";
    return this.mutate(actor, {
      permission,
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: `msg.task.${input.action.toLowerCase()}`,
      resourceType: "follow_up_task",
      resourceId: input.taskId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const task = snap.followUpTasks.find((item) => item.id === input.taskId);
        if (!task || task.organisationId !== input.organisationId || task.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "follow-up task was not found");
        }
        this.assertVersion(task.version, input.expectedVersion);
        if (input.action === "ACKNOWLEDGE") task.status = "ACKNOWLEDGED";
        if (input.action === "ASSIGN") {
          if (!input.ownerPersonId) throw new PlatformError("VALIDATION_FAILED", "an owner is required");
          task.ownerPersonId = input.ownerPersonId;
          task.status = "IN_PROGRESS";
        }
        if (input.action === "ESCALATE") {
          task.escalationLevel = Math.min(3, task.escalationLevel + 1);
          task.status = "IN_PROGRESS";
          const thread = snap.conversationThreads.find((item) => item.id === task.threadId);
          if (thread) thread.status = "ESCALATED";
        }
        if (input.action === "RESOLVE") {
          task.status = "RESOLVED";
          if (input.resolution) task.resolution = input.resolution;
          const thread = snap.conversationThreads.find((item) => item.id === task.threadId);
          if (thread) thread.status = "RESOLVED";
        }
        task.version += 1;
        task.updatedAt = ctx.now;
        return task;
      },
    });
  }

  proposeContactCorrection(actor: ActorContext, raw: unknown): ContactCorrection {
    const input = parseStrict(ProposeCorrectionInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.inbox.respond",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.correction.proposed",
      resourceType: "contact_correction",
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        const existing = snap.contactProjections.find((item) => item.guestId === guest.id && item.channel === input.channel);
        const proposedByRoleKey = singleCoveringRoleKey(
          ctx.actor,
          "msg.inbox.respond",
          { organisationId: input.organisationId, eventId: input.eventId },
          ctx.now,
        );
        const record: ContactCorrection = {
          id: randomUUID(),
          organisationId: guest.organisationId,
          clientId: guest.clientId,
          eventId: guest.eventId,
          guestId: guest.id,
          channel: input.channel,
          ...(existing ? { existingValue: existing.displayValue } : {}),
          proposedValue: input.proposedValue,
          status: "PROPOSED",
          ...(input.sourceMessageId ? { sourceMessageId: input.sourceMessageId } : {}),
          reason: input.reason,
          proposedByPersonId: actor.personId,
          proposedByRoleKey,
          guestVersionAtProposal: guest.version,
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        };
        snap.contactCorrections.push(record);
        return record;
      },
    });
  }

  decideContactCorrection(actor: ActorContext, raw: unknown): ContactCorrection {
    const input = parseStrict(DecideCorrectionInputSchema, raw);
    return this.mutate(actor, {
      permission: "msg.contactCorrection.review",
      scope: { organisationId: input.organisationId, eventId: input.eventId },
      action: "msg.correction.decided",
      resourceType: "contact_correction",
      resourceId: input.correctionId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      payloadHash: stableHash(input),
      run: (snap, ctx) => {
        const correction = snap.contactCorrections.find((item) => item.id === input.correctionId);
        if (!correction || correction.organisationId !== input.organisationId || correction.eventId !== input.eventId) {
          throw new PlatformError("NOT_FOUND", "contact correction was not found");
        }
        this.assertVersion(correction.version, input.expectedVersion);
        if (!correction.proposedByPersonId || !correction.proposedByRoleKey || correction.guestVersionAtProposal === undefined) {
          throw new PlatformError(
            "FORBIDDEN",
            "contact correction attribution is unavailable; recreate the proposal",
            {
              publicMessage:
                "This correction cannot be decided because proposer attribution is unavailable. Recreate the proposal.",
            },
          );
        }
        if (correction.proposedByPersonId === actor.personId) {
          throw new PlatformError("FORBIDDEN", "approval requires a different named human");
        }
        if (input.decision === "REJECTED") {
          correction.status = "REJECTED";
        } else {
          const guest = this.requireOperationalGuest(snap, input.organisationId, input.eventId, correction.guestId);
          this.assertVersion(guest.version, correction.guestVersionAtProposal);
          const beforeGuest = structuredClone(guest);
          applyGuestAmendment(
            guest,
            {
              organisationId: guest.organisationId,
              eventId: guest.eventId,
              guestId: guest.id,
              expectedVersion: guest.version,
              ...(correction.channel === "EMAIL"
                ? { email: correction.proposedValue }
                : { phone: correction.proposedValue }),
              replaceVerifiedField: true,
              reason: input.reason,
            },
            ctx.now,
          );
          if (eventChannelPolicy(snap, guest.eventId)) {
            syncContactProjections(snap, guest.eventId, ctx.now);
          }
          recordDuplicateCandidates(snap, guest, snap.persons, ctx.now);
          this.writeAudit(snap, {
            action: "guest.record.amended",
            outcome: "SUCCESS",
            actorPersonId: actor.personId,
            organisationId: guest.organisationId,
            clientId: guest.clientId,
            eventId: guest.eventId,
            resourceType: "operational_guest",
            resourceId: guest.id,
            correlationId: actor.correlationId,
            reason: input.reason,
            beforeHash: stableHash(beforeGuest),
            afterHash: stableHash(guest),
            occurredAt: ctx.now,
          });
          correction.status = "APPLIED";
        }
        correction.decidedByPersonId = actor.personId;
        correction.decidedAt = ctx.now;
        correction.version += 1;
        correction.updatedAt = ctx.now;
        return correction;
      },
    });
  }

  getCommunicationsOverview(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap, ctx } = this.authorizeQuery(actor, "msg.analytics.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    return communicationsOverview(snap, eventId, ctx.now);
  }

  getChannelPolicy(actor: ActorContext, organisationId: string, eventId: string): ChannelPolicy | undefined {
    const { snap } = this.authorizeQuery(actor, "event.view", { organisationId, eventId });
    return eventChannelPolicy(snap, eventId);
  }

  getGuestSafeOccasion(actor: ActorContext, organisationId: string, eventId: string): GuestSafeOccasion | undefined {
    const { snap } = this.authorizeQuery(actor, "event.view", { organisationId, eventId });
    return eventOccasion(snap, eventId);
  }

  getPublishedOccasion(actor: ActorContext, organisationId: string, eventId: string): GuestSafeOccasionView {
    const { snap } = this.authorizeQuery(actor, "event.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    return projectGuestSafeOccasion(eventOccasion(snap, eventId));
  }

  listTemplates(actor: ActorContext, organisationId: string, eventId: string): MessageTemplate[] {
    const { snap } = this.authorizeQuery(actor, "msg.template.manage", { organisationId, eventId });
    return snap.messageTemplates.filter((item) => item.organisationId === organisationId && (!item.eventId || item.eventId === eventId));
  }

  listTemplateVersions(actor: ActorContext, organisationId: string, eventId: string, templateId: string): MessageTemplateVersion[] {
    const { snap } = this.authorizeQuery(actor, "msg.template.manage", { organisationId, eventId });
    return snap.messageTemplateVersions.filter((item) => item.templateId === templateId && item.organisationId === organisationId);
  }

  previewAudience(actor: ActorContext, raw: unknown) {
    const input = parseStrict(PreviewAudienceInputSchema, raw);
    const { snap, ctx } = this.authorizeQuery(actor, "msg.audience.manage", {
      organisationId: input.organisationId,
      eventId: input.eventId,
    });
    const definition = snap.audienceDefinitions.find((item) => item.id === input.audienceId);
    if (!definition || definition.organisationId !== input.organisationId || definition.eventId !== input.eventId) {
      throw new PlatformError("NOT_FOUND", "audience was not found");
    }
    return previewAudienceOnSnap(snap, definition, input.channel, input.purpose, ctx.now);
  }

  listAudiences(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.audience.manage", { organisationId, eventId });
    return snap.audienceDefinitions.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  listCampaigns(actor: ActorContext, organisationId: string, eventId: string): Campaign[] {
    const { snap } = this.authorizeQuery(actor, "msg.campaign.manage", { organisationId, eventId });
    return snap.campaigns.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  getCampaign(actor: ActorContext, organisationId: string, eventId: string, campaignId: string): Campaign {
    const { snap } = this.authorizeQuery(actor, "msg.campaign.manage", { organisationId, eventId });
    return this.requireCampaign(snap, organisationId, eventId, campaignId);
  }

  listInbox(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.inbox.view", { organisationId, eventId });
    return snap.conversationThreads.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  getThread(actor: ActorContext, organisationId: string, eventId: string, threadId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.inbox.view", { organisationId, eventId });
    const thread = snap.conversationThreads.find((item) => item.id === threadId);
    if (!thread || thread.organisationId !== organisationId || thread.eventId !== eventId) {
      throw new PlatformError("NOT_FOUND", "conversation was not found");
    }
    return {
      thread,
      inbound: snap.inboundMessages.filter((item) => item.threadId === threadId),
      outbound: snap.commsMessages.filter((item) => item.threadId === threadId),
      tasks: snap.followUpTasks.filter((item) => item.threadId === threadId),
    };
  }

  listUnmatchedInbound(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.inbox.view", { organisationId, eventId });
    return snap.inboundMessages.filter(
      (item) =>
        item.organisationId === organisationId &&
        item.eventId === eventId &&
        (item.matchStatus === "UNMATCHED" || item.matchStatus === "AMBIGUOUS"),
    );
  }

  listFailures(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.campaign.manage", { organisationId, eventId });
    return snap.commsMessages.filter(
      (item) => item.organisationId === organisationId && item.eventId === eventId && (item.status === "FAILED" || item.status === "DEAD_LETTER"),
    );
  }

  listFollowUpTasks(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.inbox.view", { organisationId, eventId });
    return snap.followUpTasks.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  listContactCorrections(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.contactCorrection.review", { organisationId, eventId });
    return snap.contactCorrections.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  listContactCorrectionReviews(actor: ActorContext, organisationId: string, eventId: string): ContactCorrectionReview[] {
    const { snap } = this.authorizeQuery(actor, "msg.contactCorrection.review", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    return snap.contactCorrections
      .filter((item) => item.organisationId === organisationId && item.eventId === eventId)
      .map((item) => this.projectContactCorrectionReview(snap, item));
  }

  listGuestCommunications(actor: ActorContext, organisationId: string, eventId: string, guestId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.inbox.view", { organisationId, eventId });
    this.requireOperationalGuest(snap, organisationId, eventId, guestId);
    return {
      messages: snap.commsMessages.filter((item) => item.guestId === guestId && item.eventId === eventId),
      inbound: snap.inboundMessages.filter((item) => item.guestId === guestId && item.eventId === eventId),
      tasks: snap.followUpTasks.filter((item) => {
        const thread = snap.conversationThreads.find((row) => row.id === item.threadId);
        return thread?.guestId === guestId && item.eventId === eventId;
      }),
    };
  }

  listCommsNotifications(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap } = this.authorizeQuery(actor, "msg.analytics.view", { organisationId, eventId });
    return snap.commsNotifications.filter((item) => item.organisationId === organisationId && item.eventId === eventId);
  }

  listCommsIntelligence(actor: ActorContext, organisationId: string, eventId: string) {
    const { snap, ctx } = this.authorizeQuery(actor, "msg.analytics.view", { organisationId, eventId });
    this.requireEvent(snap, organisationId, eventId);
    return communicationsOverview(snap, eventId, ctx.now).alerts;
  }

  evaluateGuestEligibility(actor: ActorContext, organisationId: string, eventId: string, guestId: string, channel: MsgChannel, purpose: MsgPurpose) {
    const { snap, ctx } = this.authorizeQuery(actor, "msg.campaign.manage", { organisationId, eventId });
    this.requireOperationalGuest(snap, organisationId, eventId, guestId);
    return guestEligibility(snap, guestId, channel, purpose, ctx.now);
  }

  signSynthetic(payload: string): string {
    return signSyntheticPayload(payload);
  }

  private requireCampaign(snap: PlatformSnapshot, organisationId: string, eventId: string, campaignId: string): Campaign {
    const campaign = snap.campaigns.find((item) => item.id === campaignId);
    if (!campaign || campaign.organisationId !== organisationId || campaign.eventId !== eventId) {
      throw new PlatformError("NOT_FOUND", "campaign was not found");
    }
    return campaign;
  }

  private mutate<T extends { id?: string }>(
    actor: ActorContext,
    input: {
      permission: PermissionKey;
      scope: ScopeInput;
      action: string;
      resourceType: string;
      resourceId?: string;
      reason?: string;
      idempotencyKey?: string;
      payloadHash?: string;
      alreadyApplied?: (snap: PlatformSnapshot) => T | undefined;
      replayIfAlreadyApplied?: boolean;
      run: (snap: PlatformSnapshot, ctx: { now: string; actor: ActorSnapshot }) => T;
    },
  ): T {
    const snap = this.store.snapshot();
    const now = actor.now ?? new Date().toISOString();
    const actorSnap = this.actorSnapshot(actor);
    assertNamedHuman(actorSnap.person);
    if (input.idempotencyKey) {
      const existing = snap.idempotency.find((item) => item.key === input.idempotencyKey);
      if (existing) {
        if (input.payloadHash && existing.hash !== input.payloadHash) {
          throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        }
        const reused = this.lookupByRef(snap, input.resourceType, existing.resultRef);
        if (reused) return reused as T;
      }
    }
    const resource = input.resourceId
      ? this.lookupResource(snap, input.resourceType, input.resourceId, input.scope.organisationId)
      : { type: input.resourceType, organisationId: input.scope.organisationId, clientId: input.scope.clientId, eventId: input.scope.eventId };
    const decision = this.decide(actorSnap, input.permission, input.scope, resource, actor);
    if (!decision.allow) {
      this.writeAudit(snap, {
        action: input.action,
        outcome: "DENIED",
        actorPersonId: actor.personId,
        organisationId: input.scope.organisationId,
        clientId: input.scope.clientId,
        eventId: input.scope.eventId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        correlationId: actor.correlationId,
        reason: decision.reason,
        occurredAt: now,
      });
      this.store.replace(snap);
      throw this.denyError(decision.reason);
    }
    if (input.replayIfAlreadyApplied && input.alreadyApplied) {
      const reused = input.alreadyApplied(snap);
      if (reused) return reused;
    }
    try {
      const before = input.resourceId ? this.lookupByRef(snap, input.resourceType, input.resourceId) : undefined;
      const result = input.run(snap, { now, actor: actorSnap });
      if (input.idempotencyKey && result.id) {
        snap.idempotency.push({
          key: input.idempotencyKey,
          action: input.action,
          hash: input.payloadHash ?? stableHash(result),
          resultRef: result.id,
          createdAt: now,
        });
      }
      this.writeAudit(snap, {
        action: input.action,
        outcome: "SUCCESS",
        actorPersonId: actor.personId,
        organisationId: input.scope.organisationId,
        clientId: input.scope.clientId ?? (result as { clientId?: string }).clientId,
        eventId: input.scope.eventId ?? (result as { eventId?: string }).eventId,
        resourceType: input.resourceType,
        resourceId: result.id ?? input.resourceId,
        correlationId: actor.correlationId,
        idempotencyKey: input.idempotencyKey,
        reason: input.reason,
        beforeHash: before ? stableHash(before) : undefined,
        afterHash: stableHash(result),
        occurredAt: now,
      });
      this.store.replace(snap);
      return result;
    } catch (error) {
      if (error instanceof PlatformError && error.code === "VERSION_CONFLICT" && input.alreadyApplied) {
        const reused = input.alreadyApplied(this.store.snapshot());
        if (reused) return reused;
      }
      if (
        error instanceof PlatformError &&
        (error.code === "VERSION_CONFLICT" ||
          error.code === "TRANSITION_INVALID" ||
          error.code === "CAPABILITY_NOT_ENABLED" ||
          (error.code === "VALIDATION_FAILED" && error.details?.includes(RETAINED_SALUTATION_INVARIANT)))
      ) {
        const failed = this.store.snapshot();
        this.writeAudit(failed, {
          action: input.action,
          outcome: "FAILED",
          actorPersonId: actor.personId,
          organisationId: input.scope.organisationId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          correlationId: actor.correlationId,
          reason: error.code,
          occurredAt: now,
        });
        this.store.replace(failed);
      }
      throw error;
    }
  }

  private authorizeQuery(actor: ActorContext, permission: PermissionKey, scope: ScopeInput): {
    snap: PlatformSnapshot;
    ctx: { now: string; actor: ActorSnapshot; decision: Extract<PolicyDecision, { allow: true }> };
  } {
    const snap = this.store.snapshot();
    const now = actor.now ?? new Date().toISOString();
    const actorSnap = this.actorSnapshot(actor);
    const decision = this.decide(actorSnap, permission, scope, { type: permission, organisationId: scope.organisationId, clientId: scope.clientId, eventId: scope.eventId }, actor);
    if (!decision.allow) {
      this.writeAudit(snap, {
        action: permission,
        outcome: "DENIED",
        actorPersonId: actor.personId,
        organisationId: scope.organisationId,
        clientId: scope.clientId,
        eventId: scope.eventId,
        resourceType: permission.split(".")[0] ?? "resource",
        correlationId: actor.correlationId,
        reason: decision.reason,
        occurredAt: now,
      });
      this.store.replace(snap);
      throw this.denyError(decision.reason);
    }
    return { snap, ctx: { now, actor: actorSnap, decision } };
  }

  private decide(
    actorSnap: ActorSnapshot,
    permission: PermissionKey,
    scope: ScopeInput,
    resource: { type: string; organisationId: string; clientId?: string; eventId?: string },
    actor: ActorContext,
  ): PolicyDecision {
    return authorize({
      actor: actorSnap,
      permission,
      scope,
      resource,
      context: { now: actor.now, actorKind: actor.actorKind, allowScaffoldedTransitions: actor.allowScaffoldedTransitions },
    });
  }

  private actorSnapshot(actor: ActorContext): ActorSnapshot {
    const resolved = this.resolveActor(actor.personId);
    if (resolved.person.status !== "ACTIVE") {
      throw new PlatformError("FORBIDDEN", "person is not active");
    }
    if (resolved.assignments.filter((item) => item.status === "ACTIVE").length === 0) {
      throw new PlatformError("ACCESS_PENDING", "no active assignment");
    }
    return resolved;
  }

  private requireGuestCapability(sessionToken: string, now: string): GuestSessionActor {
    const config = this.rsvpAccessConfig();
    const actor = readGuestSession(sessionToken, config, now);
    const snap = this.store.snapshot();
    const session = snap.rsvpGuestSessions.find((item) => item.id === actor.sessionId);
    const invitation = snap.rsvpInvitations.find((item) => item.id === actor.invitationId);
    if (
      !session ||
      session.revokedAt ||
      Date.parse(session.expiresAt) <= Date.parse(now) ||
      session.guestId !== actor.guestId ||
      session.eventId !== actor.eventId ||
      session.organisationId !== actor.organisationId ||
      !invitation ||
      invitation.status !== "ISSUED" ||
      invitation.guestId !== actor.guestId ||
      invitation.eventId !== actor.eventId
    ) {
      throw guestAccessUnavailable();
    }
    return actor;
  }

  private tryMerchandiseGuestCapability(
    sessionToken: string,
    now: string,
  ): MerchandiseGuestSessionActor | undefined {
    try {
      const actor = readMerchandiseGuestSession(sessionToken, this.merchandiseGuestAccessConfig(), now);
      const snap = this.store.snapshot();
      const session = snap.merchandiseGuestSessions.find((item) => item.id === actor.sessionId);
      const grant = snap.merchandiseGuestGrants.find((item) => item.id === actor.grantId);
      if (
        !session ||
        session.revokedAt ||
        Date.parse(session.expiresAt) <= Date.parse(now) ||
        session.guestId !== actor.guestId ||
        session.eventId !== actor.eventId ||
        !grant ||
        grant.status !== "ACTIVE" ||
        grant.guestId !== actor.guestId ||
        grant.eventId !== actor.eventId ||
        Date.parse(grant.expiresAt) <= Date.parse(now)
      ) {
        return undefined;
      }
      return actor;
    } catch {
      return undefined;
    }
  }

  private resolveGuestMerchandiseCapability(
    sessionToken: string,
    now: string,
  ): { guestId: string; eventId: string; organisationId: string; sessionId: string } {
    const merch = this.tryMerchandiseGuestCapability(sessionToken, now);
    if (merch) {
      return {
        guestId: merch.guestId,
        eventId: merch.eventId,
        organisationId: merch.organisationId,
        sessionId: merch.sessionId,
      };
    }
    const rsvp = this.requireGuestCapability(sessionToken, now);
    return {
      guestId: rsvp.guestId,
      eventId: rsvp.eventId,
      organisationId: rsvp.organisationId,
      sessionId: rsvp.sessionId,
    };
  }

  private guestSelfServiceViewFromSnap(
    snap: PlatformSnapshot,
    capability: GuestSessionActor,
    now: string,
  ): GuestSelfServiceView {
    const guest = this.requireOperationalGuest(snap, capability.organisationId, capability.eventId, capability.guestId);
    const policy = eventPolicy(snap, capability.eventId);
    const questionnaire = publishedQuestionnaire(snap, capability.eventId);
    if (!policy || !questionnaire) throw guestAccessUnavailable();
    const response = responseForGuest(snap, guest.id);
    const attendanceIntent = response?.attendanceIntent ?? "NOT_SUPPLIED";
    const status = response?.status ?? "NOT_STARTED";
    const allowance = companionAllowance(snap, guest.id, policy);
    const subjects = householdSubjects(snap, guest.id);
    return {
      eventDisplayName: policy.eventDisplayName,
      hostDisplayName: policy.hostDisplayName,
      privacyNotice: policy.privacyNotice,
      guestDisplayName: guestVisibleName(guest),
      attendanceIntent,
      status,
      ...(response?.respondedAt ? { respondedAt: response.respondedAt } : {}),
      amendmentsPermitted: amendmentsAllowed(policy, now, status),
      expectedVersion: response?.version ?? 1,
      companionAllowance: allowance,
      householdMembers: subjects.map((guestId) => {
        const member = snap.operationalGuests.find((item) => item.id === guestId);
        return { guestId, displayName: member ? guestVisibleName(member) : "Household guest" };
      }),
      sections: compileVisibleQuestions(questionnaire, attendanceIntent, {
        household: subjects.length > 0,
        companion: allowance > 0,
      }),
      answers: response?.answers ?? { attendanceIntent: "NOT_SUPPLIED" },
      assistanceOpen: snap.rsvpAssistanceRequests.some(
        (item) => item.guestId === guest.id && item.status === "OPEN",
      ),
      ...(response?.respondedAt
        ? { confirmation: { submittedAt: response.respondedAt, attendanceIntent: response.attendanceIntent } }
        : {}),
      occasion: projectGuestSafeOccasion(eventOccasion(snap, capability.eventId)),
    };
  }

  private capabilityMutate<T extends { id?: string }>(
    capability: GuestSessionActor,
    input: {
      action: string;
      resourceType: string;
      reason?: string;
      idempotencyKey?: string;
      payloadHash?: string;
      correlationId: string;
      occurredAt: string;
      run: (snap: PlatformSnapshot) => T;
    },
  ): T {
    const snap = this.store.snapshot();
    if (input.idempotencyKey) {
      const existing = snap.idempotency.find((item) => item.key === input.idempotencyKey);
      if (existing) {
        if (input.payloadHash && existing.hash !== input.payloadHash) {
          throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        }
        const reused = this.lookupByRef(snap, input.resourceType, existing.resultRef);
        if (reused) return reused as T;
      }
    }
    try {
      const before = this.lookupByRef(snap, input.resourceType, capability.guestId);
      const result = input.run(snap);
      if (input.idempotencyKey && result.id) {
        snap.idempotency.push({
          key: input.idempotencyKey,
          action: input.action,
          hash: input.payloadHash ?? stableHash(result),
          resultRef: result.id,
          createdAt: input.occurredAt,
        });
      }
      this.writeAudit(snap, {
        action: input.action,
        outcome: "SUCCESS",
        organisationId: capability.organisationId,
        eventId: capability.eventId,
        resourceType: input.resourceType,
        resourceId: result.id,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        reason: input.reason,
        beforeHash: before ? stableHash(before) : undefined,
        afterHash: stableHash(result),
        occurredAt: input.occurredAt,
        actorType: "GUEST_CAPABILITY",
      });
      this.store.replace(snap);
      return result;
    } catch (error) {
      if (error instanceof PlatformError && (error.code === "VERSION_CONFLICT" || error.code === "FORBIDDEN")) {
        this.writeAudit(snap, {
          action: input.action,
          outcome: error.code === "FORBIDDEN" ? "DENIED" : "FAILED",
          organisationId: capability.organisationId,
          eventId: capability.eventId,
          resourceType: input.resourceType,
          correlationId: input.correlationId,
          reason: error.code,
          occurredAt: input.occurredAt,
          actorType: "GUEST_CAPABILITY",
        });
        this.store.replace(snap);
      }
      throw error;
    }
  }

  private requireOrganisation(snap: PlatformSnapshot, organisationId: string) {
    const record = snap.organisations.find((item) => item.id === organisationId);
    if (!record) throw new PlatformError("NOT_FOUND", "organisation was not found");
    return record;
  }

  private requireClient(snap: PlatformSnapshot, organisationId: string, clientId: string): Client {
    const record = snap.clients.find((item) => item.id === clientId);
    if (!record || record.organisationId !== organisationId) {
      throw new PlatformError("NOT_FOUND", "client was not found");
    }
    return record;
  }

  private requireOperationalGuest(
    snap: PlatformSnapshot,
    organisationId: string,
    eventId: string,
    guestId: string,
  ): OperationalGuest {
    const record = snap.operationalGuests.find((item) => item.id === guestId);
    if (!record || record.organisationId !== organisationId || record.eventId !== eventId) {
      throw new PlatformError("NOT_FOUND", "guest record was not found");
    }
    return record;
  }

  private linkGuestInSnapshot(
    snap: PlatformSnapshot,
    guest: OperationalGuest,
    personId: string,
    actor: ActorContext,
    now: string,
  ): void {
    const person = snap.persons.find((item) => item.id === personId);
    if (!person) throw new PlatformError("NOT_FOUND", "person is not provisioned");
    let reference = snap.guestReferences.find(
      (item) => item.personId === personId && item.eventId === guest.eventId && item.organisationId === guest.organisationId,
    );
    if (!reference) {
      reference = {
        id: randomUUID(),
        organisationId: guest.organisationId,
        personId,
        eventId: guest.eventId,
        status: "REFERENCE_ONLY",
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      snap.guestReferences.push(reference);
    }
    guest.personId = personId;
    guest.guestReferenceId = reference.id;
    guest.identityResolution = "LINKED";
    guest.version += 1;
    guest.updatedAt = now;
    void actor;
  }

  private requireEvent(snap: PlatformSnapshot, organisationId: string, eventId: string): EventRecord {
    const record = snap.events.find((item) => item.id === eventId);
    if (!record || record.organisationId !== organisationId) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    const client = snap.clients.find((item) => item.id === record.clientId);
    if (!client || client.organisationId !== record.organisationId) {
      throw new PlatformError("SCOPE_MISMATCH", "event lineage is invalid");
    }
    return record;
  }

  private permissionAllowed(actorSnap: ActorSnapshot, permission: PermissionKey, scope: ScopeInput): boolean {
    return authorize({ actor: actorSnap, permission, scope }).allow;
  }

  private s04aCapabilities(actorSnap: ActorSnapshot, scope: ScopeInput): GuestAddressingCapabilities {
    return {
      canViewAddressing: this.permissionAllowed(actorSnap, "guest.addressing.view", scope),
      canManageAddressing: this.permissionAllowed(actorSnap, "guest.addressing.manage", scope),
      canConfirmAddressing: this.permissionAllowed(actorSnap, "guest.addressing.confirm", scope),
      canViewProtocolNote: this.permissionAllowed(actorSnap, "guest.protocolNote.view", scope),
      canViewRelationship: this.permissionAllowed(actorSnap, "guest.relationship.view", scope),
      canManageRelationship: this.permissionAllowed(actorSnap, "guest.relationship.manage", scope),
      canViewEntitlement: this.permissionAllowed(actorSnap, "guest.entitlement.view", scope),
      canManageEntitlement: this.permissionAllowed(actorSnap, "guest.entitlement.manage", scope),
      canReviewEntitlementException: this.permissionAllowed(actorSnap, "guest.entitlement.exception.review", scope),
      canViewChild: this.permissionAllowed(actorSnap, "guest.child.view", scope),
      canManageChild: this.permissionAllowed(actorSnap, "guest.child.manage", scope),
    };
  }

  private s04bCapabilities(actorSnap: ActorSnapshot, scope: ScopeInput) {
    return programmePermissionAllowed((permission) => this.permissionAllowed(actorSnap, permission, scope));
  }

  private s04cCapabilities(actorSnap: ActorSnapshot, scope: ScopeInput) {
    return merchandisePermissionAllowed((permission) => this.permissionAllowed(actorSnap, permission, scope));
  }

  private requireVendorCapability(sessionToken: string, now: string): VendorSessionActor {
    const config = this.vendorAccessConfig();
    const actor = readVendorSession(sessionToken, config, now);
    const snap = this.store.snapshot();
    const assignment = snap.vendorAssignments.find((item) => item.id === actor.assignmentId);
    const session = snap.vendorSessions.find((item) => item.id === actor.sessionId);
    if (
      !assignment ||
      assignment.status !== "ACTIVE" ||
      assignment.revokedAt ||
      Date.parse(assignment.expiresAt) <= Date.parse(now) ||
      assignment.eventId !== actor.eventId ||
      !session ||
      session.revokedAt
    ) {
      this.writeAudit(snap, {
        action: "merch.vendor.access.denied",
        outcome: "DENIED",
        organisationId: actor.organisationId,
        eventId: actor.eventId,
        resourceType: "vendor_assignment",
        resourceId: actor.assignmentId,
        correlationId: actor.sessionId,
        reason: "vendor_access_unavailable",
        occurredAt: now,
        actorType: "VENDOR_CAPABILITY",
      });
      this.store.replace(snap);
      throw vendorAccessUnavailable();
    }
    return actor;
  }

  private requireHostCapability(sessionToken: string, now: string): AtelierSessionActor {
    const config = this.atelierAccessConfig();
    const actor = readAtelierSession(sessionToken, config, now);
    const snap = this.store.snapshot();
    const grant = snap.atelierAccessGrants.find((item) => item.id === actor.grantId);
    const session = snap.atelierSessions.find((item) => item.id === actor.sessionId);
    if (
      !grant ||
      grant.status !== "ACTIVE" ||
      grant.revokedAt ||
      Date.parse(grant.expiresAt) <= Date.parse(now) ||
      grant.eventId !== actor.eventId ||
      !session ||
      session.status !== "ACTIVE" ||
      Date.parse(session.idleExpiresAt) <= Date.parse(now) ||
      Date.parse(session.absoluteExpiresAt) <= Date.parse(now)
    ) {
      this.writeAudit(snap, {
        action: "atelier.access.denied",
        outcome: "DENIED",
        organisationId: actor.organisationId,
        eventId: actor.eventId,
        resourceType: "atelier_access_grant",
        resourceId: actor.grantId,
        correlationId: actor.sessionId,
        reason: "atelier_access_unavailable",
        occurredAt: now,
        actorType: "HOST_CAPABILITY",
      });
      this.store.replace(snap);
      throw atelierAccessUnavailable();
    }
    session.lastSeenAt = now;
    session.idleExpiresAt = new Date(Date.parse(now) + (config.idleTtlSeconds ?? 1800) * 1000).toISOString();
    session.updatedAt = now;
    this.store.replace(snap);
    return actor;
  }

  private assertVersion(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new PlatformError("VERSION_CONFLICT", `expected version ${expected} but found ${actual}`);
    }
  }

  private lookupResource(
    snap: PlatformSnapshot,
    type: string,
    id: string,
    organisationId: string,
  ): { type: string; organisationId: string; clientId?: string; eventId?: string } {
    if (type === "client") {
      const record = snap.clients.find((item) => item.id === id);
      return { type, organisationId: record?.organisationId ?? organisationId, clientId: id };
    }
    if (type === "event") {
      const record = snap.events.find((item) => item.id === id);
      return {
        type,
        organisationId: record?.organisationId ?? organisationId,
        clientId: record?.clientId,
        eventId: id,
      };
    }
    if (type === "assignment") {
      const record = snap.assignments.find((item) => item.id === id);
      return {
        type,
        organisationId: record?.organisationId ?? organisationId,
        clientId: record?.clientId,
        eventId: record?.eventId,
      };
    }
    if (type === "master_event_file") {
      const record = snap.masterEventFiles.find((item) => item.id === id);
      return {
        type,
        organisationId: record?.organisationId ?? organisationId,
        clientId: record?.clientId,
        eventId: record?.eventId,
      };
    }
    if (type === "operational_guest") {
      const record = snap.operationalGuests.find((item) => item.id === id);
      return {
        type,
        organisationId: record?.organisationId ?? organisationId,
        clientId: record?.clientId,
        eventId: record?.eventId,
      };
    }
    if (type === "guest_duplicate_candidate") {
      const record = snap.guestDuplicateCandidates.find((item) => item.id === id);
      return {
        type,
        organisationId: record?.organisationId ?? organisationId,
        clientId: record?.clientId,
        eventId: record?.eventId,
      };
    }
    if (type === "guest_intake_batch") {
      const record = snap.guestIntakeBatches.find((item) => item.id === id);
      return {
        type,
        organisationId: record?.organisationId ?? organisationId,
        clientId: record?.clientId,
        eventId: record?.eventId,
      };
    }
    const s04aTables = [
      snap.guestParties,
      snap.guestPartyMembers,
      snap.guestRelationships,
      snap.companionEntitlements,
      snap.companionNominations,
      snap.responsibleAdultLinks,
      snap.eventSeries,
      snap.eventSeriesMembers,
      snap.addressingReconciliationItems,
    ];
    const s04bTables = [
      snap.programmeDays,
      snap.programmePhases,
      snap.phaseEntitlements,
      snap.arrivalRoutes,
      snap.perimeterCheckpoints,
      snap.accessZones,
      snap.credentialProjections,
      snap.operationalVehicles,
      snap.vehicleAssociations,
      snap.offlineAccessPackages,
      snap.accessExceptions,
    ];
    const s04cTables = [
      snap.merchandiseCollections,
      snap.merchandiseItems,
      snap.merchandiseItemVariants,
      snap.merchandiseCohorts,
      snap.merchandiseCohortMembers,
      snap.hostOfferRules,
      snap.guestOffers,
      snap.guestParticipations,
      snap.capMeasurements,
      snap.merchandiseFulfilments,
      snap.vendorAssignments,
      snap.vendorUpdates,
      snap.vendorSessions,
      snap.merchandiseGuestGrants,
      snap.merchandiseGuestSessions,
      snap.externalContactLinks,
      snap.merchandiseExceptions,
    ];
    for (const table of [...s04aTables, ...s04bTables, ...s04cTables]) {
      const record = table.find((item) => item.id === id);
      if (record && "organisationId" in record) {
        return {
          type,
          organisationId: record.organisationId,
          clientId: "clientId" in record ? record.clientId : undefined,
          eventId: "eventId" in record ? record.eventId : undefined,
        };
      }
    }
    const rsvpTables = [
      snap.rsvpPolicies,
      snap.rsvpQuestionnaires,
      snap.rsvpInvitations,
      snap.rsvpResponses,
      snap.rsvpEntitlements,
      snap.rsvpExceptions,
      snap.rsvpAssistanceRequests,
      snap.channelPolicies,
      snap.guestSafeOccasions,
      snap.audienceDefinitions,
      snap.campaigns,
      snap.campaignApprovals,
      snap.commsMessages,
      snap.conversationThreads,
      snap.followUpTasks,
      snap.contactCorrections,
    ];
    for (const table of rsvpTables) {
      const record = table.find((item) => item.id === id);
      if (record) {
        return {
          type,
          organisationId: record.organisationId,
          clientId: record.clientId,
          eventId: record.eventId,
        };
      }
    }
    const template = snap.messageTemplates.find((item) => item.id === id);
    if (template) {
      return {
        type,
        organisationId: template.organisationId,
        clientId: template.clientId,
        eventId: template.eventId,
      };
    }
    const templateVersion = snap.messageTemplateVersions.find((item) => item.id === id);
    if (templateVersion) {
      const parent = snap.messageTemplates.find((item) => item.id === templateVersion.templateId);
      return {
        type,
        organisationId: templateVersion.organisationId,
        clientId: parent?.clientId,
        eventId: parent?.eventId,
      };
    }
    const inbound = snap.inboundMessages.find((item) => item.id === id);
    if (inbound) {
      return {
        type,
        organisationId: inbound.organisationId ?? organisationId,
        clientId: inbound.clientId,
        eventId: inbound.eventId,
      };
    }
    const suppression = snap.suppressionEntries.find((item) => item.id === id);
    if (suppression) {
      return { type, organisationId: suppression.organisationId, eventId: suppression.eventId };
    }
    return { type, organisationId };
  }

  private lookupByRef(snap: PlatformSnapshot, type: string, id: string): { id: string } | undefined {
    const tables: Array<Array<{ id: string }>> = [
      snap.clients,
      snap.events,
      snap.assignments,
      snap.masterEventFiles,
      snap.consents,
      snap.guestReferences,
      snap.operationalGuests,
      snap.guestHouseholds,
      snap.guestParties,
      snap.guestPartyMembers,
      snap.guestRelationships,
      snap.companionEntitlements,
      snap.companionNominations,
      snap.responsibleAdultLinks,
      snap.eventSeries,
      snap.eventSeriesMembers,
      snap.addressingReconciliationItems,
      snap.programmeDays,
      snap.programmePhases,
      snap.phaseEntitlements,
      snap.arrivalRoutes,
      snap.perimeterCheckpoints,
      snap.accessZones,
      snap.credentialProjections,
      snap.operationalVehicles,
      snap.vehicleAssociations,
      snap.offlineAccessPackages,
      snap.accessExceptions,
      snap.merchandiseCollections,
      snap.merchandiseItems,
      snap.merchandiseItemVariants,
      snap.merchandiseCohorts,
      snap.merchandiseCohortMembers,
      snap.hostOfferRules,
      snap.guestOffers,
      snap.guestParticipations,
      snap.capMeasurements,
      snap.merchandiseFulfilments,
      snap.vendorAssignments,
      snap.vendorUpdates,
      snap.vendorSessions,
      snap.merchandiseGuestGrants,
      snap.merchandiseGuestSessions,
      snap.externalContactLinks,
      snap.merchandiseExceptions,
      snap.forecastPolicies,
      snap.modelParameterSets,
      snap.attendanceForecastRuns,
      snap.forecastPopulationMembers,
      snap.forecastEstimates,
      snap.uncertaintyDrivers,
      snap.confidenceAssessments,
      snap.forecastOverrides,
      snap.operationalProvisionRecommendations,
      snap.calibrationObservations,
      snap.forecastEvaluations,
      snap.eventAteliers,
      snap.blueprintGenesises,
      snap.atelierChapters,
      snap.eventNarrativeEditions,
      snap.hostDecisionRequests,
      snap.hostDecisionReceipts,
      snap.atelierAccessGrants,
      snap.magicLinkChallenges,
      snap.atelierSessions,
      snap.languageProfiles,
      snap.languagePreferenceHistories,
      snap.culturalSourceTexts,
      snap.contentWorks,
      snap.contentEditions,
      snap.contentBlocks,
      snap.translationLinks,
      snap.terminologyEntries,
      snap.reviewAssignments,
      snap.recipientEditionRules,
      snap.recipientAssemblies,
      snap.languageCoverageSnapshots,
      snap.guestDuplicateCandidates,
      snap.guestIntakeBatches,
      snap.rsvpPolicies,
      snap.rsvpQuestionnaires,
      snap.rsvpInvitations,
      snap.rsvpGuestSessions,
      snap.staffSessions,
      snap.rsvpResponses,
      snap.rsvpReceipts,
      snap.rsvpEntitlements,
      snap.rsvpExceptions,
      snap.rsvpAssistanceRequests,
      snap.channelPolicies,
      snap.guestSafeOccasions,
      snap.contactProjections,
      snap.suppressionEntries,
      snap.messageTemplates,
      snap.messageTemplateVersions,
      snap.audienceDefinitions,
      snap.audienceSnapshots,
      snap.campaigns,
      snap.campaignApprovals,
      snap.commsMessages,
      snap.messageContentSnapshots,
      snap.messageAttempts,
      snap.deliveryEvents,
      snap.commsOutbox,
      snap.conversationThreads,
      snap.inboundMessages,
      snap.followUpTasks,
      snap.contactCorrections,
      snap.commsNotifications,
      snap.commsIntelligenceAlerts,
    ];
    for (const table of tables) {
      const found = table.find((item) => item.id === id);
      if (found) return found;
    }
    void type;
    return undefined;
  }

  private projectContactCorrectionReview(snap: PlatformSnapshot, item: ContactCorrection): ContactCorrectionReview {
    const guest = snap.operationalGuests.find(
      (record) =>
        record.id === item.guestId && record.organisationId === item.organisationId && record.eventId === item.eventId,
    );
    return {
      id: item.id,
      organisationId: item.organisationId,
      eventId: item.eventId,
      guestId: item.guestId,
      guestDisplayName: guest ? operationalDisplayName(guest) : "Guest unavailable",
      channel: item.channel,
      ...(item.existingValue ? { existingValue: item.existingValue } : {}),
      proposedValue: item.proposedValue,
      reason: item.reason,
      status: item.status,
      version: item.version,
      proposedAt: item.createdAt,
      maker:
        item.proposedByPersonId && item.proposedByRoleKey
          ? {
              state: "AVAILABLE",
              personId: item.proposedByPersonId,
              displayName: this.staffDisplayName(snap, item.proposedByPersonId, "Proposer unavailable"),
              roleKey: item.proposedByRoleKey,
            }
          : { state: "UNAVAILABLE" },
      decision:
        item.decidedByPersonId && item.decidedAt
          ? {
              state: "RECORDED",
              personId: item.decidedByPersonId,
              displayName: this.staffDisplayName(snap, item.decidedByPersonId, "Reviewer unavailable"),
              decidedAt: item.decidedAt,
            }
          : { state: "PENDING" },
      sourceEvidence: this.projectCorrectionSourceEvidence(snap, item),
    };
  }

  private projectCorrectionSourceEvidence(
    snap: PlatformSnapshot,
    item: ContactCorrection,
  ): ContactCorrectionSourceEvidence {
    if (!item.sourceMessageId) return { state: "NOT_LINKED" };
    const message = snap.inboundMessages.find((row) => row.id === item.sourceMessageId);
    if (!message || message.organisationId !== item.organisationId || message.eventId !== item.eventId) {
      return { state: "UNAVAILABLE" };
    }
    if (message.matchStatus === "QUARANTINED" || message.attachmentQuarantined === true) {
      return { state: "REDACTED" };
    }
    const reviewPath = message.threadId
      ? `/app/events/${item.eventId}/communications/inbox/${message.threadId}`
      : `/app/events/${item.eventId}/communications/unmatched`;
    return { state: "AVAILABLE", inboundMessageId: message.id, reviewPath };
  }

  private staffDisplayName(snap: PlatformSnapshot, personId: string, fallback: string): string {
    const person = snap.persons.find((item) => item.id === personId);
    const name = person?.displayName.trim();
    return name ? name : fallback;
  }

  private writeAudit(
    snap: PlatformSnapshot,
    input: {
      action: string;
      outcome: AuditEvent["outcome"];
      actorPersonId?: string;
      organisationId?: string;
      clientId?: string;
      eventId?: string;
      resourceType: string;
      resourceId?: string;
      correlationId: string;
      idempotencyKey?: string;
      reason?: string;
      beforeHash?: string;
      afterHash?: string;
      occurredAt: string;
      actorType?: AuditEvent["actorType"];
    },
  ): void {
    const entry: AuditEvent = {
      id: randomUUID(),
      occurredAt: input.occurredAt,
      actorType: input.actorType ?? "USER",
      ...(input.actorPersonId ? { actorPersonId: input.actorPersonId } : {}),
      service: "shared-platform",
      action: input.action,
      outcome: input.outcome,
      ...(input.organisationId ? { organisationId: input.organisationId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.eventId ? { eventId: input.eventId } : {}),
      resourceType: input.resourceType,
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      correlationId: input.correlationId,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.beforeHash ? { beforeHash: input.beforeHash } : {}),
      ...(input.afterHash ? { afterHash: input.afterHash } : {}),
      metadata: redactValue({ schemaVersion: SCHEMA_VERSION }) as Record<string, unknown>,
      schemaVersion: SCHEMA_VERSION,
    };
    snap.audit.push(entry);
  }

  private denyError(reason: string): PlatformError {
    if (reason === "NO_ASSIGNMENT" || reason === "UNAUTHENTICATED") {
      return new PlatformError(reason === "UNAUTHENTICATED" ? "AUTH_REQUIRED" : "ACCESS_PENDING", reason);
    }
    if (reason === "SCOPE_MISMATCH" || reason === "LINEAGE_UNVERIFIED") {
      return new PlatformError("NOT_FOUND", reason);
    }
    return new PlatformError("FORBIDDEN", reason);
  }
}

export function permissionCatalogueId(key: PermissionKey): string {
  return permissionIdForKey(key);
}
