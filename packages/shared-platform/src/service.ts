import { randomUUID } from "node:crypto";
import { DEFAULT_TIMEZONE, SCHEMA_VERSION, SYSTEM_ROLE_KEYS } from "./constants.js";
import { permissionIdForKey, roleIdForKey, seededPermissions, seededRoles } from "./catalog.js";
import { PlatformError } from "./errors.js";
import { assertNamedHuman } from "./identity.js";
import { emptyMasterEventFile } from "./mef.js";
import { authorize, canSeeClient, canSeeEvent, type ActorSnapshot, type PolicyDecision } from "./policy.js";
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
  constructor(private readonly store: PlatformStore) {}

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
    },
  ): void {
    const entry: AuditEvent = {
      id: randomUUID(),
      occurredAt: input.occurredAt,
      actorType: "USER",
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
