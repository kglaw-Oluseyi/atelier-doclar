import { randomUUID } from "node:crypto";
import { DEFAULT_TIMEZONE, PRODUCTION_STORE_STATUS, SCHEMA_VERSION, SYSTEM_ROLE_KEYS } from "./constants.js";
import { permissionIdForKey, roleIdForKey, seededPermissions, seededRoles } from "./catalog.js";
import { PlatformError } from "./errors.js";
import { assertNamedHuman } from "./identity.js";
import { emptyMasterEventFile } from "./mef.js";
import { authorize, canSeeClient, canSeeEvent, type ActorSnapshot, type PolicyDecision } from "./policy.js";
import { parseCanonicalCsv, rowToIntakeFields } from "./guest-intake.js";
import { operationalDisplayName } from "./guest-matching.js";
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
  CreateClientInputSchema,
  CreateEventInputSchema,
  GrantAssignmentInputSchema,
  RecordConsentInputSchema,
  RegisterGuestReferenceInputSchema,
  RevokeAssignmentInputSchema,
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

export interface ActorContext {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
  allowScaffoldedTransitions?: boolean;
}

export interface PlatformServiceOptions {
  rsvpAccess?: RsvpAccessConfig;
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
}

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

  rsvpAccessConfig(): RsvpAccessConfig {
    const production = this.store.productionStatus === PRODUCTION_STORE_STATUS;
    const config = this.options.rsvpAccess ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS;
    assertRsvpAccessConfig(config, production);
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
        const resolved = recordDuplicateCandidates(snap, record, snap.persons, ctx.now);
        if (input.personId) {
          this.linkGuestInSnapshot(snap, resolved, input.personId, actor, ctx.now);
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
      run: (snap, ctx) => {
        const record = this.requireOperationalGuest(snap, input.organisationId, input.eventId, input.guestId);
        this.assertVersion(record.version, input.expectedVersion);
        applyGuestAmendment(record, input, ctx.now);
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
    return snap.operationalGuests
      .filter((item) => item.organisationId === input.organisationId && item.eventId === input.eventId)
      .filter((item) => (input.lifecycle ? item.lifecycle === input.lifecycle : true))
      .filter((item) => (input.identityResolution ? item.identityResolution === input.identityResolution : true))
      .filter((item) => (input.attentionRequired === undefined ? true : item.attentionRequired === input.attentionRequired))
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
      .sort((left, right) => compareGuests(left, right, input.sort));
  }

  getGuest(actor: ActorContext, organisationId: string, eventId: string, guestId: string): OperationalGuest {
    const { snap, ctx } = this.authorizeQuery(actor, "guest.directory.view", { organisationId, eventId });
    const event = this.requireEvent(snap, organisationId, eventId);
    if (!canSeeEvent(ctx.actor, event, ctx.now)) {
      throw new PlatformError("NOT_FOUND", "event was not found");
    }
    return this.requireOperationalGuest(snap, organisationId, eventId, guestId);
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
      if (error instanceof PlatformError && (error.code === "VERSION_CONFLICT" || error.code === "TRANSITION_INVALID" || error.code === "CAPABILITY_NOT_ENABLED")) {
        this.writeAudit(snap, {
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
        this.store.replace(snap);
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
    const rsvpTables = [
      snap.rsvpPolicies,
      snap.rsvpQuestionnaires,
      snap.rsvpInvitations,
      snap.rsvpResponses,
      snap.rsvpEntitlements,
      snap.rsvpExceptions,
      snap.rsvpAssistanceRequests,
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
      snap.guestDuplicateCandidates,
      snap.guestIntakeBatches,
      snap.rsvpPolicies,
      snap.rsvpQuestionnaires,
      snap.rsvpInvitations,
      snap.rsvpGuestSessions,
      snap.rsvpResponses,
      snap.rsvpReceipts,
      snap.rsvpEntitlements,
      snap.rsvpExceptions,
      snap.rsvpAssistanceRequests,
    ];
    for (const table of tables) {
      const found = table.find((item) => item.id === id);
      if (found) return found;
    }
    void type;
    return undefined;
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
