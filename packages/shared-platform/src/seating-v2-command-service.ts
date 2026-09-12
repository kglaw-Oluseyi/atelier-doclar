import { randomUUID } from "node:crypto";
import { exactHash } from "./eec-hash.js";
import { appliedMutationEffect, replayedMutationEffect, type DurableMutationEffect } from "./durable-mutation-effect.js";
import { PlatformError } from "./errors.js";
import { authorize, canSeeEvent, type ActorSnapshot } from "./policy.js";
import { roleKeyForId } from "./catalog.js";
import { seatingDisclosureForRole } from "./seating-workspace.js";
import { buildSeatingV2Workspace } from "./seating-v2-workspace.js";
import { emptySeatingV2State, SEATING_V2_COLLECTIONS, type SeatingV2State } from "./seating-v2-state.js";
import type { SeatingWorkspaceView } from "./seating-workspace.js";
import { compileSeatingV2Request } from "./seating-v2-compiler.js";
import {
  seatingV2AssignmentsHash,
  seatingV2ManualDecisionLogHash,
  seatingV2PlanContentHash,
  seatingV2ReservationContentHash,
  seatingV2RuleContentHash,
} from "./seating-v2-hash.js";
import {
  buildSeatingV2Package,
  packageIsFresh,
  seatingV2GuestToken,
  SEATING_V2_CONFIG_HASH,
  type SeatingV2BuiltPackage,
} from "./seating-v2-package.js";
import type { SeatingV2Repository, SeatingV2Scope, SeatingV2Transaction } from "./seating-v2-repository.js";
import {
  SEATING_V2_SCHEMA_VERSION,
  SEATING_V2_SOLVER_VERSION,
  SEATING_V2_VALIDATOR_VERSION,
  type SeatingV2RuleContent,
} from "./seating-v2-schemas.js";
import { solveSeatingV2Compiled } from "./seating-v2-solver-adapter.js";
import type {
  SeatingV2CompiledRequestRecord,
  SeatingV2ExportJob,
  SeatingV2InputPackage,
  SeatingV2ManualPreview,
  SeatingV2OperationalApproval,
  SeatingV2PlanAssignment,
  SeatingV2PlanEdition,
  SeatingV2Publication,
  SeatingV2Reservation,
  SeatingV2ReservationEdition,
  SeatingV2Rule,
  SeatingV2RuleEdition,
  SeatingV2Run,
  SeatingV2SpecialistReview,
} from "./seating-v2-state.js";
import { validateSeatingV2 } from "./seating-v2-validator.js";
import type { PermissionKey } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";

export type SeatingV2Actor = {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
};

export type SeatingV2CommandEnvelope = SeatingV2Scope & {
  actorAssignmentId: string;
  idempotencyKey: string;
  expectedVersion?: number;
  expectedContentHash?: string;
};

export type SeatingV2CommandResult<T> = {
  application: "APPLIED" | "REPLAYED" | "NOT_APPLIED";
  didDataChange: boolean;
  value: T;
  correlationId: string;
};

export type SeatingV2ManualCommand =
  | { type: "ASSIGN_UNSEATED"; eventGuestId: string; positionToken: string }
  | { type: "MOVE"; eventGuestId: string; positionToken: string }
  | { type: "SWAP"; leftGuestId: string; rightGuestId: string }
  | { type: "UNSEAT"; eventGuestId: string; reasonCode: string }
  | { type: "LOCK" | "UNLOCK"; eventGuestId: string }
  | { type: "BULK"; commands: SeatingV2ManualCommand[] };

export type SeatingV2ExportProjection = {
  contract: "eos-s06-seating-publication-v2";
  projectionClass: SeatingV2ExportJob["projectionClass"];
  organisationId: string;
  eventId: string;
  publicationId?: string;
  publicationNo?: number | null;
  sourceType: SeatingV2ExportJob["sourceType"];
  sourceId: string;
  sourceHash: string;
  generatedAt: string;
  assignments: Array<{
    eventGuestId?: string;
    state: "SEATED" | "UNSEATED";
    layoutTableId?: string | null;
    logicalPositionId?: string | null;
    typedReasonCodes: string[];
  }>;
  hashes: {
    packageContentHash?: string;
    planContentHash?: string;
    layoutContentHash?: string;
  };
};

type CommandDeps = {
  resolveActor: (personId: string) => ActorSnapshot;
  snapshot: () => PlatformSnapshot;
  tokenPepper: () => string;
  onEffect?: (effect: DurableMutationEffect) => void;
};

type WorkResult<T> = T | { replayed: true; value: T };

function nowOf(actor: SeatingV2Actor): string {
  return actor.now ?? new Date().toISOString();
}

function requireKey(key: string): void {
  if (key.length < 12) throw new PlatformError("VALIDATION_FAILED", "idempotencyKey must be at least 12 characters");
}

function isReplay<T extends { id: string }>(value: WorkResult<T>): value is { replayed: true; value: T } {
  return typeof value === "object" && value !== null && "replayed" in value && value.replayed === true;
}

function reviewPermission(domain: SeatingV2SpecialistReview["domain"]): PermissionKey {
  if (domain === "PROTOCOL") return "seating.plan.review.protocol";
  if (domain === "ACCESSIBILITY") return "seating.plan.review.accessibility";
  return "seating.plan.review.security";
}

export class SeatingV2CommandService {
  constructor(
    private readonly repo: SeatingV2Repository,
    private readonly deps: CommandDeps,
  ) {}

  get repository(): SeatingV2Repository {
    return this.repo;
  }

  private guard(actor: SeatingV2Actor, permission: PermissionKey, scope: SeatingV2Scope, assignmentId: string): ActorSnapshot {
    const snap = this.deps.resolveActor(actor.personId);
    const assignment = snap.assignments.find((item) => item.id === assignmentId);
    if (!assignment || assignment.personId !== actor.personId) {
      throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
    }
    const decision = authorize({
      actor: snap,
      permission,
      scope: { organisationId: scope.organisationId, eventId: scope.eventId },
      context: { now: nowOf(actor), actorKind: actor.actorKind },
    });
    if (!decision.allow) {
      throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
    }
    return snap;
  }

  private async mutate<T extends { id: string }>(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    permission: PermissionKey,
    action: string,
    work: (tx: SeatingV2Transaction, people: ActorSnapshot) => Promise<WorkResult<T>>,
  ): Promise<SeatingV2CommandResult<T>> {
    requireKey(envelope.idempotencyKey);
    const requestHash = exactHash({ action, envelope, personId: actor.personId });
    return this.repo.transaction(async (tx) => {
      const people = this.guard(actor, permission, envelope, envelope.actorAssignmentId);
      const existing = await tx.getIdempotency(envelope, action, envelope.idempotencyKey);
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        }
        this.deps.onEffect?.(replayedMutationEffect(existing.resultIdentity));
        return {
          application: "REPLAYED",
          didDataChange: false,
          value: { id: existing.resultIdentity } as T,
          correlationId: actor.correlationId,
        };
      }
      const raw = await work(tx, people);
      const replayed = isReplay(raw);
      const value = replayed ? raw.value : raw;
      await tx.insertIdempotency({
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        action,
        idempotencyKey: envelope.idempotencyKey,
        requestHash,
        resultIdentity: value.id,
        application: replayed ? "REPLAYED" : "APPLIED",
        createdAt: nowOf(actor),
      });
      await tx.appendAudit({
        id: randomUUID(),
        occurredAt: nowOf(actor),
        actorType: "USER",
        actorPersonId: actor.personId,
        service: "shared-platform",
        action,
        outcome: "SUCCESS",
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        resourceType: "seating_v2",
        resourceId: value.id,
        correlationId: actor.correlationId,
        idempotencyKey: envelope.idempotencyKey,
        metadata: { replayed },
        schemaVersion: 1,
      });
      if (replayed) {
        this.deps.onEffect?.(replayedMutationEffect(value.id));
        return { application: "REPLAYED", didDataChange: false, value, correlationId: actor.correlationId };
      }
      this.deps.onEffect?.(appliedMutationEffect(value.id));
      return { application: "APPLIED", didDataChange: true, value, correlationId: actor.correlationId };
    });
  }

  async createRule(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    content: SeatingV2RuleContent,
  ): Promise<SeatingV2CommandResult<SeatingV2RuleEdition>> {
    return this.mutate(actor, envelope, "seating.constraint.manage", "seatingV2.createRule", async (tx) => {
      const now = nowOf(actor);
      const rule: SeatingV2Rule = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        createdAt: now,
      };
      await tx.insert("rules", rule);
      const edition: SeatingV2RuleEdition = {
        id: randomUUID(),
        ruleId: rule.id,
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        editionNo: 1,
        contentHash: seatingV2RuleContentHash(content),
        kind: content.kind,
        hardness: content.hardness,
        weight: content.weight,
        scope: content.scope,
        specialistDomain: content.specialistDomain,
        sourceType: content.source.type,
        sourceRecordId: content.source.recordId ?? null,
        sourceEditionId: content.source.editionId ?? null,
        sourceContentHash: content.source.contentHash ?? null,
        lifecycle: "DRAFT",
        createdByPersonId: actor.personId,
        createdAt: now,
      };
      await tx.insert("ruleEditions", edition);
      await this.insertRuleMembership(tx, envelope, edition.id, content, now);
      return edition;
    });
  }

  async activateRule(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string },
  ): Promise<SeatingV2CommandResult<SeatingV2RuleEdition>> {
    return this.mutate(actor, envelope, "seating.view", "seatingV2.activateRule", async (tx) => {
      const draft = await tx.load<SeatingV2RuleEdition>("ruleEditions", input.editionId, envelope);
      if (!draft || draft.lifecycle !== "DRAFT") {
        throw new PlatformError("NOT_FOUND", "draft rule edition was not found");
      }
      if (draft.hardness === "HARD") {
        this.guard(actor, "seating.rule.activate", envelope, envelope.actorAssignmentId);
        if (draft.createdByPersonId === actor.personId) {
          throw new PlatformError("FORBIDDEN", "HARD activation requires a different authorised person");
        }
      } else {
        this.guard(actor, "seating.constraint.manage", envelope, envelope.actorAssignmentId);
      }
      const now = nowOf(actor);
      return tx.updateLifecycle<SeatingV2RuleEdition>("ruleEditions", draft.id, envelope, {
        lifecycle: "ACTIVE",
        activatedByPersonId: actor.personId,
        activatedAt: now,
      });
    });
  }

  async withdrawRule(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string; reason: string },
  ): Promise<SeatingV2CommandResult<SeatingV2RuleEdition>> {
    return this.mutate(actor, envelope, "seating.constraint.manage", "seatingV2.withdrawRule", async (tx) => {
      const edition = await tx.load<SeatingV2RuleEdition>("ruleEditions", input.editionId, envelope);
      if (!edition || (edition.lifecycle !== "DRAFT" && edition.lifecycle !== "ACTIVE")) {
        throw new PlatformError("TRANSITION_INVALID", "only DRAFT or ACTIVE rules may be withdrawn");
      }
      return tx.updateLifecycle<SeatingV2RuleEdition>("ruleEditions", edition.id, envelope, {
        lifecycle: "WITHDRAWN",
        withdrawnByPersonId: actor.personId,
        withdrawnAt: nowOf(actor),
        withdrawalReason: input.reason,
      });
    });
  }

  async supersedeRule(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string; content: SeatingV2RuleContent },
  ): Promise<SeatingV2CommandResult<SeatingV2RuleEdition>> {
    return this.mutate(actor, envelope, "seating.constraint.manage", "seatingV2.supersedeRule", async (tx) => {
      const current = await tx.load<SeatingV2RuleEdition>("ruleEditions", input.editionId, envelope);
      if (!current || current.lifecycle !== "ACTIVE") {
        throw new PlatformError("TRANSITION_INVALID", "only an ACTIVE rule may be superseded");
      }
      const now = nowOf(actor);
      await tx.updateLifecycle("ruleEditions", current.id, envelope, { lifecycle: "SUPERSEDED" });
      const successor: SeatingV2RuleEdition = {
        ...current,
        id: randomUUID(),
        editionNo: current.editionNo + 1,
        contentHash: seatingV2RuleContentHash(input.content),
        kind: input.content.kind,
        hardness: input.content.hardness,
        weight: input.content.weight,
        scope: input.content.scope,
        specialistDomain: input.content.specialistDomain,
        sourceType: input.content.source.type,
        lifecycle: "DRAFT",
        supersedesEditionId: current.id,
        createdByPersonId: actor.personId,
        createdAt: now,
        activatedByPersonId: null,
        activatedAt: null,
      };
      await tx.insert("ruleEditions", successor);
      await this.insertRuleMembership(tx, envelope, successor.id, input.content, now);
      return successor;
    });
  }

  async createReservation(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: {
      min?: number | null;
      max?: number | null;
      exact?: number | null;
      eligibleMemberIds: string[];
      targets: Array<{ type: "TABLE" | "ZONE" | "POSITION_CAPABILITY"; idOrCode: string }>;
    },
  ): Promise<SeatingV2CommandResult<SeatingV2ReservationEdition>> {
    return this.mutate(actor, envelope, "seating.reservation.manage", "seatingV2.createReservation", async (tx) => {
      const now = nowOf(actor);
      const reservation: SeatingV2Reservation = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        createdAt: now,
      };
      await tx.insert("reservations", reservation);
      const edition: SeatingV2ReservationEdition = {
        id: randomUUID(),
        reservationId: reservation.id,
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        editionNo: 1,
        contentHash: seatingV2ReservationContentHash({
          min: input.min ?? null,
          max: input.max ?? null,
          exact: input.exact ?? null,
          eligibleMemberIds: input.eligibleMemberIds,
          targets: input.targets,
        }),
        minCount: input.min ?? null,
        maxCount: input.max ?? null,
        exactCount: input.exact ?? null,
        lifecycle: "DRAFT",
        sourceType: "MANUAL",
        createdByPersonId: actor.personId,
        createdAt: now,
      };
      await tx.insert("reservationEditions", edition);
      for (const memberId of input.eligibleMemberIds) {
        await tx.insert("reservationMembers", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          reservationEditionId: edition.id,
          eventGuestId: memberId,
          createdAt: now,
        });
      }
      for (const target of input.targets) {
        await tx.insert("reservationTargets", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          reservationEditionId: edition.id,
          targetType: target.type,
          targetIdOrCode: target.idOrCode,
          createdAt: now,
        });
      }
      return edition;
    });
  }

  async activateReservation(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string },
  ): Promise<SeatingV2CommandResult<SeatingV2ReservationEdition>> {
    return this.mutate(actor, envelope, "seating.view", "seatingV2.activateReservation", async (tx) => {
      const draft = await tx.load<SeatingV2ReservationEdition>("reservationEditions", input.editionId, envelope);
      if (!draft) {
        throw new PlatformError("NOT_FOUND", "reservation edition was not found");
      }
      if (envelope.expectedContentHash && envelope.expectedContentHash !== draft.contentHash) {
        throw new PlatformError("VERSION_CONFLICT", "reservation content hash does not match the bound edition");
      }
      if (draft.lifecycle !== "DRAFT") {
        throw new PlatformError("TRANSITION_INVALID", "only a DRAFT reservation may be activated");
      }
      this.guard(actor, "seating.rule.activate", envelope, envelope.actorAssignmentId);
      if (draft.createdByPersonId === actor.personId) {
        throw new PlatformError("FORBIDDEN", "reservation activation requires a different authorised person");
      }
      return tx.updateLifecycle<SeatingV2ReservationEdition>("reservationEditions", draft.id, envelope, {
        lifecycle: "ACTIVE",
        activatedByPersonId: actor.personId,
        activatedAt: nowOf(actor),
      });
    });
  }

  async withdrawReservation(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string; reason: string },
  ): Promise<SeatingV2CommandResult<SeatingV2ReservationEdition>> {
    return this.mutate(actor, envelope, "seating.reservation.manage", "seatingV2.withdrawReservation", async (tx) => {
      const edition = await tx.load<SeatingV2ReservationEdition>("reservationEditions", input.editionId, envelope);
      if (!edition) {
        throw new PlatformError("NOT_FOUND", "reservation edition was not found");
      }
      if (envelope.expectedContentHash && envelope.expectedContentHash !== edition.contentHash) {
        throw new PlatformError("VERSION_CONFLICT", "reservation content hash does not match the bound edition");
      }
      if (edition.lifecycle !== "DRAFT" && edition.lifecycle !== "ACTIVE") {
        throw new PlatformError("TRANSITION_INVALID", "only DRAFT or ACTIVE reservations may be withdrawn");
      }
      return tx.updateLifecycle<SeatingV2ReservationEdition>("reservationEditions", edition.id, envelope, {
        lifecycle: "WITHDRAWN",
        withdrawnByPersonId: actor.personId,
        withdrawnAt: nowOf(actor),
        withdrawalReason: input.reason,
      });
    });
  }

  async supersedeReservation(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: {
      editionId: string;
      min?: number | null;
      max?: number | null;
      exact?: number | null;
      eligibleMemberIds: string[];
      targets: Array<{ type: "TABLE" | "ZONE" | "POSITION_CAPABILITY"; idOrCode: string }>;
    },
  ): Promise<SeatingV2CommandResult<SeatingV2ReservationEdition>> {
    return this.mutate(actor, envelope, "seating.reservation.manage", "seatingV2.supersedeReservation", async (tx) => {
      const current = await tx.load<SeatingV2ReservationEdition>("reservationEditions", input.editionId, envelope);
      if (!current || current.lifecycle !== "ACTIVE") {
        throw new PlatformError("TRANSITION_INVALID", "only an ACTIVE reservation may be superseded");
      }
      if (envelope.expectedContentHash && envelope.expectedContentHash !== current.contentHash) {
        throw new PlatformError("VERSION_CONFLICT", "reservation content hash does not match the bound edition");
      }
      const now = nowOf(actor);
      await tx.updateLifecycle("reservationEditions", current.id, envelope, { lifecycle: "SUPERSEDED" });
      const successor: SeatingV2ReservationEdition = {
        ...current,
        id: randomUUID(),
        editionNo: current.editionNo + 1,
        contentHash: seatingV2ReservationContentHash({
          min: input.min ?? null,
          max: input.max ?? null,
          exact: input.exact ?? null,
          eligibleMemberIds: input.eligibleMemberIds,
          targets: input.targets,
        }),
        minCount: input.min ?? null,
        maxCount: input.max ?? null,
        exactCount: input.exact ?? null,
        lifecycle: "DRAFT",
        supersedesEditionId: current.id,
        createdByPersonId: actor.personId,
        createdAt: now,
        activatedByPersonId: null,
        activatedAt: null,
        withdrawnByPersonId: null,
        withdrawnAt: null,
        withdrawalReason: null,
      };
      await tx.insert("reservationEditions", successor);
      for (const memberId of input.eligibleMemberIds) {
        await tx.insert("reservationMembers", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          reservationEditionId: successor.id,
          eventGuestId: memberId,
          createdAt: now,
        });
      }
      for (const target of input.targets) {
        await tx.insert("reservationTargets", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          reservationEditionId: successor.id,
          targetType: target.type,
          targetIdOrCode: target.idOrCode,
          createdAt: now,
        });
      }
      return successor;
    });
  }

  async releaseReservation(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string; decision: string },
  ): Promise<SeatingV2CommandResult<SeatingV2ReservationEdition>> {
    return this.mutate(actor, envelope, "seating.reservation.manage", "seatingV2.releaseReservation", async (tx) => {
      const edition = await tx.load<SeatingV2ReservationEdition>("reservationEditions", input.editionId, envelope);
      if (!edition || edition.lifecycle !== "ACTIVE") {
        throw new PlatformError("TRANSITION_INVALID", "only an ACTIVE reservation may be released");
      }
      return tx.updateLifecycle<SeatingV2ReservationEdition>("reservationEditions", edition.id, envelope, {
        lifecycle: "RELEASED",
        releasedByPersonId: actor.personId,
        releasedAt: nowOf(actor),
        releaseDecision: input.decision,
      });
    });
  }

  async freezePackage(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { seed?: string } = {},
  ): Promise<SeatingV2CommandResult<SeatingV2InputPackage>> {
    return this.mutate(actor, envelope, "seating.input.prepare", "seatingV2.freezePackage", async (tx) => {
      const built = await this.build(tx, envelope, input.seed);
      const existing = (await tx.list<SeatingV2InputPackage>("inputPackages", envelope)).find(
        (item) => item.contentHash === built.contentHash,
      );
      if (existing) return { replayed: true, value: existing };
      const now = nowOf(actor);
      const pkg: SeatingV2InputPackage = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        semanticHash: built.semanticHash,
        compiledRequestHash: built.compiled.compiledRequestHash,
        contentHash: built.contentHash,
        cohortHash: built.cohort.cohortHash,
        rsvpSnapshotHash: built.cohort.rsvpTruthHash,
        layoutPublicationId: built.layout.publicationId,
        layoutContentHash: built.layout.contentHash,
        eventBriefEditionId: built.brief.editionId ?? null,
        eventBriefContentHash: built.brief.contentHash ?? null,
        protectionSnapshotHash: built.protection.snapshotHash ?? null,
        lockSetHash: built.lockSetHash,
        solverVersion: SEATING_V2_SOLVER_VERSION,
        solverConfigHash: SEATING_V2_CONFIG_HASH,
        deterministicSeed: built.seed,
        frozenByPersonId: actor.personId,
        frozenAt: now,
        createdAt: now,
      };
      await tx.insert("inputPackages", pkg);
      for (const guest of built.cohort.guests) {
        await tx.insert("packageGuests", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          packageId: pkg.id,
          eventGuestId: guest.eventGuestId,
          solverToken: seatingV2GuestToken(
            this.deps.tokenPepper(),
            envelope.organisationId,
            envelope.eventId,
            built.semanticHash,
            guest.eventGuestId,
          ),
          eligibilityCode: guest.eligibilityCode,
          rsvpCode: guest.statusCode,
          createdAt: now,
        });
      }
      for (const [index, position] of built.compiled.request.positions.entries()) {
        await tx.insert("packagePositions", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          packageId: pkg.id,
          layoutTableId: position.tableToken,
          ordinal: index + 1,
          positionToken: position.token,
          zoneCodes: position.zoneCodes,
          capabilityCodes: position.capabilityCodes,
          createdAt: now,
        });
      }
      for (const rule of built.editions) {
        await tx.insert("packageRules", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          packageId: pkg.id,
          ruleEditionId: rule.id,
          ruleContentHash: rule.contentHash,
          compiledPredicateHash: exactHash(built.compiled.request.rules.find((item) => item.contentHash === rule.contentHash) ?? {}),
          createdAt: now,
        });
      }
      for (const reservation of built.reservations) {
        await tx.insert("packageReservations", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          packageId: pkg.id,
          reservationEditionId: reservation.id,
          reservationContentHash: reservation.contentHash,
          createdAt: now,
        });
      }
      await tx.insert("compiledRequests", {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        packageId: pkg.id,
        contractVersion: built.compiled.request.contract,
        compiledRequestJson: built.compiled.request,
        compiledRequestHash: built.compiled.compiledRequestHash,
        createdAt: now,
      } satisfies SeatingV2CompiledRequestRecord);
      return pkg;
    });
  }

  async launchRun(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { packageId: string },
  ): Promise<SeatingV2CommandResult<SeatingV2Run>> {
    return this.mutate(actor, envelope, "seating.run.execute", "seatingV2.launchRun", async (tx) => {
      const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", input.packageId, envelope);
      if (!pkg) throw new PlatformError("NOT_FOUND", "input package was not found");
      const existing = (await tx.list<SeatingV2Run>("runs", envelope)).find(
        (item) =>
          item.packageHash === pkg.contentHash &&
          item.solverVersion === SEATING_V2_SOLVER_VERSION &&
          item.solverConfigHash === pkg.solverConfigHash &&
          item.deterministicSeed === pkg.deterministicSeed,
      );
      if (existing) return { replayed: true, value: existing };
      const compiled = await this.requireCompiled(tx, envelope, pkg.id);
      if (
        !compiled.request ||
        typeof compiled.request !== "object" ||
        !Array.isArray(compiled.request.guests) ||
        !Array.isArray(compiled.request.positions)
      ) {
        throw new PlatformError("VALIDATION_FAILED", "compiled solver request was not readable");
      }
      let solved;
      try {
        solved = solveSeatingV2Compiled(compiled.request);
      } catch {
        throw new PlatformError("VALIDATION_FAILED", "solver failed", {
          publicMessage: "The seating solver could not complete this package.",
        });
      }
      let report;
      try {
        report = validateSeatingV2(
          { contentHash: pkg.contentHash, compiledRequest: compiled.request },
          solved.assignments,
          solved.assignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
          nowOf(actor),
        );
      } catch {
        throw new PlatformError("SEATING_VALIDATION_REJECTED", "validator failed", {
          publicMessage: "The independent validator could not complete this package.",
        });
      }
      const now = nowOf(actor);
      const run: SeatingV2Run = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        packageId: pkg.id,
        packageHash: pkg.contentHash,
        solverVersion: SEATING_V2_SOLVER_VERSION,
        solverConfigHash: pkg.solverConfigHash,
        deterministicSeed: pkg.deterministicSeed,
        status: report.verdict,
        solverClaim: solved.solverClaim,
        rawOutputHash: solved.rawOutputHash,
        assignmentsHash: seatingV2AssignmentsHash(solved.assignments),
        startedAt: now,
        completedAt: now,
        generatedAt: now,
        createdAt: now,
      };
      try {
      await tx.insert("runs", run);
      for (const assignment of solved.assignments) {
        await tx.insert("runAssignments", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          runId: run.id,
          guestToken: assignment.guestToken,
          state: assignment.state,
          positionToken: assignment.positionToken,
          typedReasonCodes: assignment.typedReasonCodes ?? [],
          createdAt: now,
        });
      }
      const reportRow = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        packageId: pkg.id,
        packageHash: pkg.contentHash,
        assignmentsHash: report.assignmentsHash,
        validatorVersion: SEATING_V2_VALIDATOR_VERSION,
        verdict: report.verdict,
        reportHash: report.reportHash,
        producedAt: report.producedAt,
        createdAt: now,
      };
      await tx.insert("validationReports", reportRow);
      const packageRuleRows = (await tx.list<{ packageId: string; ruleEditionId: string; ruleContentHash: string }>(
        "packageRules",
        envelope,
      )).filter((item) => item.packageId === pkg.id);
      const unusedPackageRules = [...packageRuleRows];
      for (const outcome of report.ruleOutcomes) {
        const matchedIndex = unusedPackageRules.findIndex((item) => item.ruleContentHash === outcome.ruleContentHash);
        const matched = matchedIndex >= 0 ? unusedPackageRules.splice(matchedIndex, 1)[0] : undefined;
        await tx.insert("validationRuleOutcomes", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          reportId: reportRow.id,
          ruleEditionId: matched?.ruleEditionId ?? randomUUID(),
          ruleContentHash: outcome.ruleContentHash,
          outcome: outcome.outcome,
          typedReasonCodes: outcome.typedReasonCodes ?? [],
          affectedGuestTokens: outcome.affectedGuestTokens ?? [],
          createdAt: now,
        });
      }
      const seenStructural = new Set<string>();
      for (const outcome of report.structuralOutcomes) {
        if (seenStructural.has(outcome.checkCode)) continue;
        seenStructural.add(outcome.checkCode);
        await tx.insert("validationStructuralOutcomes", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          reportId: reportRow.id,
          checkCode: outcome.checkCode,
          outcome: outcome.outcome,
          typedDetail: outcome.typedDetail,
          createdAt: now,
        });
      }
      } catch (error) {
        if (error instanceof PlatformError) throw error;
        throw new PlatformError("INTERNAL_ERROR", error instanceof Error ? error.message : "run persist failed", {
          publicMessage: "The seating run could not be stored.",
        });
      }
      return run;
    });
  }

  async adoptRun(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { runId: string },
  ): Promise<SeatingV2CommandResult<SeatingV2PlanEdition>> {
    return this.mutate(actor, envelope, "seating.plan.edit", "seatingV2.adoptRun", async (tx) => {
      const run = await tx.load<SeatingV2Run>("runs", input.runId, envelope);
      if (!run) throw new PlatformError("NOT_FOUND", "run was not found");
      if (run.status !== "FEASIBLE") {
        throw new PlatformError("SEATING_VALIDATION_REJECTED", "only a validator-FEASIBLE run may be adopted");
      }
      const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", run.packageId, envelope);
      if (!pkg) throw new PlatformError("ADOPTION_MISMATCH", "package missing");
      const compiled = await this.requireCompiled(tx, envelope, run.packageId);
      const assignments = (await tx.list<SeatingV2PlanAssignment & { runId?: string; guestToken?: string }>(
        "runAssignments",
        envelope,
      )).filter((item) => item.runId === run.id);
      const mapped = assignments.map((item) => ({
        guestToken: String(item.guestToken),
        state: item.state,
        positionToken: item.logicalPositionId ?? (item as { positionToken?: string | null }).positionToken ?? null,
        typedReasonCodes: item.typedReasonCodes,
      }));
      const report = this.revalidate(pkg, compiled.request, mapped, nowOf(actor));
      if (report.verdict !== "FEASIBLE" || report.assignmentsHash !== run.assignmentsHash) {
        throw new PlatformError("ADOPTION_MISMATCH", "adopt-time validation did not match the run");
      }
      return this.persistWorkingEdition(tx, actor, envelope, {
        pkg,
        runId: run.id,
        report,
        mapped,
        contribution: "ADOPT",
      });
    });
  }

  async assignUnseated(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { planEditionId: string; eventGuestId: string; positionToken: string; preview?: boolean },
  ): Promise<SeatingV2CommandResult<SeatingV2PlanEdition | SeatingV2ManualPreview>> {
    if (input.preview) {
      return this.previewManual(actor, envelope, {
        planEditionId: input.planEditionId,
        command: { type: "ASSIGN_UNSEATED", eventGuestId: input.eventGuestId, positionToken: input.positionToken },
      });
    }
    return this.applyManual(actor, envelope, {
      planEditionId: input.planEditionId,
      command: { type: "ASSIGN_UNSEATED", eventGuestId: input.eventGuestId, positionToken: input.positionToken },
    });
  }

  async previewManual(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { planEditionId: string; command: SeatingV2ManualCommand },
  ): Promise<SeatingV2CommandResult<SeatingV2ManualPreview>> {
    return this.mutate(actor, envelope, "seating.plan.edit", "seatingV2.previewManual", async (tx) => {
      const proposed = await this.proposeManual(tx, envelope, input.planEditionId, input.command, nowOf(actor));
      const now = nowOf(actor);
      const preview: SeatingV2ManualPreview = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        planEditionId: input.planEditionId,
        planEditionVersion: proposed.edition.version,
        commandHash: exactHash(input.command),
        proposedAssignmentsHash: proposed.report.assignmentsHash,
        validationReportHash: proposed.report.reportHash,
        expiresAt: new Date(Date.parse(now) + 15 * 60 * 1000).toISOString(),
        createdAt: now,
      };
      await tx.insert("manualPreviews", preview);
      return preview;
    });
  }

  async applyManual(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { planEditionId: string; command: SeatingV2ManualCommand; previewId?: string },
  ): Promise<SeatingV2CommandResult<SeatingV2PlanEdition>> {
    return this.mutate(actor, envelope, "seating.plan.edit", "seatingV2.applyManual", async (tx) => {
      const proposed = await this.proposeManual(tx, envelope, input.planEditionId, input.command, nowOf(actor));
      if (input.previewId) {
        const preview = await tx.load<SeatingV2ManualPreview>("manualPreviews", input.previewId, envelope);
        if (!preview || preview.planEditionId !== input.planEditionId) {
          throw new PlatformError("NOT_FOUND", "manual preview was not found");
        }
        if (preview.expiresAt <= nowOf(actor)) {
          throw new PlatformError("VERSION_CONFLICT", "manual preview expired");
        }
        if (preview.proposedAssignmentsHash !== proposed.report.assignmentsHash || preview.commandHash !== exactHash(input.command)) {
          throw new PlatformError("VERSION_CONFLICT", "manual preview no longer matches the plan");
        }
      }
      const successor = await this.persistWorkingEdition(tx, actor, envelope, {
        pkg: proposed.pkg,
        runId: proposed.edition.sourceRunId,
        report: proposed.report,
        mapped: proposed.mapped,
        contribution: "MANUAL_EDIT",
        successorOf: proposed.edition,
        locks: proposed.locks,
        decisions: [input.command],
      });
      await tx.insert("manualDecisions", {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        planEditionId: proposed.edition.id,
        resultingEditionId: successor.id,
        previewId: input.previewId ?? null,
        commandType: input.command.type,
        beforeHash: proposed.edition.contentHash,
        afterHash: successor.contentHash,
        reasonCode: input.command.type,
        actorPersonId: actor.personId,
        appliedAt: nowOf(actor),
        createdAt: nowOf(actor),
      });
      return successor;
    });
  }

  async submitPlan(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string },
  ): Promise<SeatingV2CommandResult<SeatingV2PlanEdition>> {
    return this.mutate(actor, envelope, "seating.plan.submit", "seatingV2.submitPlan", async (tx) => {
      const edition = await tx.load<SeatingV2PlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "WORKING") {
        throw new PlatformError("TRANSITION_INVALID", "only a WORKING edition may be submitted");
      }
      await this.assertFreshFeasible(tx, envelope, edition, nowOf(actor));
      const submitted = await tx.updateLifecycle<SeatingV2PlanEdition>("planEditions", edition.id, envelope, {
        status: "SUBMITTED",
        submittedByPersonId: actor.personId,
        submittedAt: nowOf(actor),
        version: edition.version + 1,
      });
      await this.pointCurrent(tx, envelope, nowOf(actor), { submittedEditionId: submitted.id, workingEditionId: null });
      return submitted;
    });
  }

  async recallPlan(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string },
  ): Promise<SeatingV2CommandResult<SeatingV2PlanEdition>> {
    return this.mutate(actor, envelope, "seating.view", "seatingV2.recallPlan", async (tx) => {
      const edition = await tx.load<SeatingV2PlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "SUBMITTED") {
        throw new PlatformError("TRANSITION_INVALID", "only a SUBMITTED edition may be recalled");
      }
      if (envelope.expectedVersion !== undefined && edition.version !== envelope.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "stale recall: edition version does not match");
      }
      if (envelope.expectedContentHash && envelope.expectedContentHash !== edition.contentHash) {
        throw new PlatformError("VERSION_CONFLICT", "stale recall: edition hash does not match");
      }
      const submitter = edition.submittedByPersonId === actor.personId;
      if (!submitter) this.guard(actor, "seating.plan.approve", envelope, envelope.actorAssignmentId);
      else this.guard(actor, "seating.plan.submit", envelope, envelope.actorAssignmentId);
      await tx.updateLifecycle("planEditions", edition.id, envelope, {
        status: "RECALLED",
        version: edition.version + 1,
      });
      const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", edition.packageId, envelope);
      const compiled = await this.requireCompiled(tx, envelope, edition.packageId);
      if (!pkg) throw new PlatformError("NOT_FOUND", "package missing");
      const assignments = (await tx.list<SeatingV2PlanAssignment>("planAssignments", envelope)).filter(
        (item) => item.planEditionId === edition.id,
      );
      const guests = (await tx.list<{ packageId: string; eventGuestId: string; solverToken: string }>("packageGuests", envelope)).filter(
        (item) => item.packageId === edition.packageId,
      );
      const mapped = assignments.map((item) => ({
        guestToken: guests.find((guest) => guest.eventGuestId === item.eventGuestId)?.solverToken ?? "",
        state: item.state,
        positionToken: item.logicalPositionId ?? null,
        typedReasonCodes: item.typedReasonCodes,
      }));
      const report = this.revalidate(pkg, compiled.request, mapped, nowOf(actor));
      const successor = await this.persistWorkingEdition(tx, actor, envelope, {
        pkg,
        runId: edition.sourceRunId,
        report,
        mapped,
        contribution: "CREATE",
        successorOf: edition,
      });
      return successor;
    });
  }

  async recordSpecialistReview(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: {
      editionId: string;
      editionHash: string;
      domain: SeatingV2SpecialistReview["domain"];
      decision: "APPROVED" | "REJECTED";
      reason: string;
    },
  ): Promise<SeatingV2CommandResult<SeatingV2SpecialistReview>> {
    return this.mutate(actor, envelope, reviewPermission(input.domain), "seatingV2.recordSpecialistReview", async (tx) => {
      const edition = await tx.load<SeatingV2PlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "SUBMITTED") {
        throw new PlatformError("TRANSITION_INVALID", "reviews bind a SUBMITTED edition");
      }
      if (edition.contentHash !== input.editionHash) {
        throw new PlatformError("VERSION_CONFLICT", "review hash does not match the submitted edition");
      }
      const authors = (await tx.list<{ planEditionId: string; personId: string }>("planAuthors", envelope)).filter(
        (item) => item.planEditionId === edition.id,
      );
      if (authors.some((item) => item.personId === actor.personId)) {
        throw new PlatformError("FORBIDDEN", "material authors cannot review their own edition");
      }
      const implicated = await this.implicatedDomains(tx, envelope, edition.packageId);
      if (!implicated.includes(input.domain)) {
        throw new PlatformError("FORBIDDEN", "this specialist domain is not implicated by the package");
      }
      const ruleHashes = (await tx.list<{ packageId: string; ruleContentHash: string }>("packageRules", envelope))
        .filter((item) => item.packageId === edition.packageId)
        .map((item) => item.ruleContentHash)
        .sort((left, right) => left.localeCompare(right));
      const idempotencyHash = exactHash({
        editionId: edition.id,
        editionHash: input.editionHash,
        domain: input.domain,
        decision: input.decision,
        ruleHashes,
      });
      const existing = (await tx.list<SeatingV2SpecialistReview>("specialistReviews", envelope)).find(
        (item) => item.idempotencyHash === idempotencyHash,
      );
      if (existing) return { replayed: true, value: existing };
      const review: SeatingV2SpecialistReview = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        planEditionId: edition.id,
        planContentHash: edition.contentHash,
        domain: input.domain,
        reviewedRuleEditionHashes: ruleHashes,
        decision: input.decision,
        reason: input.reason,
        reviewerPersonId: actor.personId,
        recordedAt: nowOf(actor),
        idempotencyHash,
        createdAt: nowOf(actor),
      };
      await tx.insert("specialistReviews", review);
      return review;
    });
  }

  async approvePlan(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string; editionHash: string; decision: "APPROVED" | "REJECTED"; reason: string },
  ): Promise<SeatingV2CommandResult<SeatingV2OperationalApproval>> {
    return this.mutate(actor, envelope, "seating.plan.approve", "seatingV2.approvePlan", async (tx) => {
      const edition = await tx.load<SeatingV2PlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "SUBMITTED") {
        throw new PlatformError("TRANSITION_INVALID", "only a SUBMITTED edition may be approved");
      }
      if (edition.contentHash !== input.editionHash) {
        throw new PlatformError("VERSION_CONFLICT", "approval hash does not match the submitted edition");
      }
      const authors = (await tx.list<{ planEditionId: string; personId: string }>("planAuthors", envelope)).filter(
        (item) => item.planEditionId === edition.id,
      );
      const reviews = (await tx.list<SeatingV2SpecialistReview>("specialistReviews", envelope)).filter(
        (item) => item.planEditionId === edition.id && item.planContentHash === edition.contentHash,
      );
      if (authors.some((item) => item.personId === actor.personId) || reviews.some((item) => item.reviewerPersonId === actor.personId)) {
        throw new PlatformError("FORBIDDEN", "approver must be distinct from material authors and reviewers");
      }
      await this.assertFreshFeasible(tx, envelope, edition, nowOf(actor));
      const implicated = await this.implicatedDomains(tx, envelope, edition.packageId);
      if (
        implicated.some(
          (domain) => !reviews.some((item) => item.domain === domain && item.decision === "APPROVED"),
        )
      ) {
        throw new PlatformError("TRANSITION_INVALID", "required specialist reviews are missing");
      }
      const approval: SeatingV2OperationalApproval = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        planEditionId: edition.id,
        planContentHash: edition.contentHash,
        decision: input.decision,
        reason: input.reason,
        approverPersonId: actor.personId,
        recordedAt: nowOf(actor),
        createdAt: nowOf(actor),
      };
      await tx.insert("operationalApprovals", approval);
      if (input.decision === "APPROVED") {
        await tx.updateLifecycle("planEditions", edition.id, envelope, {
          status: "APPROVED",
          version: edition.version + 1,
        });
      }
      return approval;
    });
  }

  async publishPlan(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { editionId: string; editionHash: string },
  ): Promise<SeatingV2CommandResult<SeatingV2Publication>> {
    return this.mutate(actor, envelope, "seating.plan.publish", "seatingV2.publishPlan", async (tx) => {
      const edition = await tx.load<SeatingV2PlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "APPROVED") {
        throw new PlatformError("TRANSITION_INVALID", "only an APPROVED edition may be published");
      }
      if (edition.contentHash !== input.editionHash) {
        throw new PlatformError("VERSION_CONFLICT", "publication hash does not match the approved edition");
      }
      const authors = (await tx.list<{ planEditionId: string; personId: string }>("planAuthors", envelope)).filter(
        (item) => item.planEditionId === edition.id,
      );
      const approval = (await tx.list<SeatingV2OperationalApproval>("operationalApprovals", envelope)).find(
        (item) => item.planEditionId === edition.id && item.planContentHash === edition.contentHash && item.decision === "APPROVED",
      );
      if (!approval) throw new PlatformError("TRANSITION_INVALID", "operational approval is required");
      if (authors.some((item) => item.personId === actor.personId) || approval.approverPersonId === actor.personId) {
        throw new PlatformError("FORBIDDEN", "publisher must be distinct from authors and the operational approver");
      }
      await this.assertFreshFeasible(tx, envelope, edition, nowOf(actor));
      const existing = (await tx.list<SeatingV2Publication>("publications", envelope)).find(
        (item) => item.planEditionId === edition.id && item.planContentHash === edition.contentHash && item.status === "CURRENT",
      );
      if (existing) return { replayed: true, value: existing };
      const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", edition.packageId, envelope);
      if (!pkg) throw new PlatformError("NOT_FOUND", "package missing");
      const current = (await tx.list<SeatingV2Publication>("publications", envelope)).find((item) => item.status === "CURRENT");
      const publication: SeatingV2Publication = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        publicationNo: (current?.publicationNo ?? 0) + 1,
        planEditionId: edition.id,
        planContentHash: edition.contentHash,
        packageId: pkg.id,
        packageContentHash: pkg.contentHash,
        layoutPublicationId: pkg.layoutPublicationId,
        layoutContentHash: pkg.layoutContentHash,
        solverVersion: pkg.solverVersion,
        solverConfigHash: pkg.solverConfigHash,
        approvalId: approval.id,
        publisherPersonId: actor.personId,
        status: "CURRENT",
        supersedesPublicationId: current?.id ?? null,
        publishedAt: nowOf(actor),
        createdAt: nowOf(actor),
      };
      await tx.insert("publications", publication);
      await this.pointCurrent(tx, envelope, nowOf(actor), { currentPublicationId: publication.id });
      return publication;
    });
  }

  async requestExport(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: {
      sourceType: "EDITION" | "PUBLICATION";
      sourceId: string;
      format: "PDF" | "PNG" | "JSON";
      projectionClass: SeatingV2ExportJob["projectionClass"];
    },
  ): Promise<SeatingV2CommandResult<SeatingV2ExportJob>> {
    return this.mutate(actor, envelope, "seating.export", "seatingV2.requestExport", async (tx) => {
      if (input.projectionClass === "FULL") {
        this.guard(actor, "seating.plan.approve", envelope, envelope.actorAssignmentId);
      }
      const sourceHash =
        input.sourceType === "PUBLICATION"
          ? (await tx.load<SeatingV2Publication>("publications", input.sourceId, envelope))?.planContentHash
          : (await tx.load<SeatingV2PlanEdition>("planEditions", input.sourceId, envelope))?.contentHash;
      if (!sourceHash) throw new PlatformError("NOT_FOUND", "export source was not found");
      const job: SeatingV2ExportJob = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        sourceHash,
        projectionClass: input.projectionClass,
        format: input.format,
        status: "READY",
        generatedAt: nowOf(actor),
        storageKey: `seating-v2/${envelope.eventId}/${input.sourceId}`,
        createdAt: nowOf(actor),
      };
      await tx.insert("exportJobs", job);
      return job;
    });
  }

  async projectWorkspace(actor: SeatingV2Actor, eventId: string): Promise<SeatingWorkspaceView> {
    const people = this.deps.resolveActor(actor.personId);
    const event = this.deps.snapshot().events.find((item) => item.id === eventId);
    if (!event) throw new PlatformError("NOT_FOUND", "event was not found");
    if (!canSeeEvent(people, event, nowOf(actor))) throw new PlatformError("NOT_FOUND", "event was not found");
    const assignment =
      people.assignments.find((item) => item.status === "ACTIVE" && item.organisationId === event.organisationId && item.eventId === eventId) ??
      people.assignments.find((item) => item.status === "ACTIVE" && item.organisationId === event.organisationId && !item.eventId);
    if (!assignment) throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
    this.guard(actor, "seating.view", { organisationId: event.organisationId, eventId }, assignment.id);
    const state = await this.repo.transaction(async (tx) => {
      const next = emptySeatingV2State();
      const scope = { organisationId: event.organisationId, eventId };
      for (const collection of SEATING_V2_COLLECTIONS) {
        (next[collection] as unknown[]) = await tx.list(collection, scope);
      }
      return next as SeatingV2State;
    });
    const role = roleKeyForId(assignment.roleId);
    return buildSeatingV2Workspace(this.deps.snapshot(), state, eventId, seatingDisclosureForRole(role));
  }

  async retrieveExport(
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: { jobId: string },
  ): Promise<SeatingV2ExportProjection> {
    this.guard(actor, "seating.view", envelope, envelope.actorAssignmentId);
    return this.repo.transaction(async (tx) => {
      const job = await tx.load<SeatingV2ExportJob>("exportJobs", input.jobId, envelope);
      if (!job) throw new PlatformError("NOT_FOUND", "export job was not found");
      let projectionClass = job.projectionClass;
      const canFull = authorize({
        actor: this.deps.resolveActor(actor.personId),
        permission: "seating.plan.approve",
        scope: envelope,
        context: { now: nowOf(actor), actorKind: actor.actorKind },
      }).allow;
      if (projectionClass === "FULL" && !canFull) {
        projectionClass = "PERMISSION_SAFE";
      }
      const editionId = job.sourceType === "EDITION" ? job.sourceId : (await tx.load<SeatingV2Publication>("publications", job.sourceId, envelope))?.planEditionId;
      const edition = editionId ? await tx.load<SeatingV2PlanEdition>("planEditions", editionId, envelope) : undefined;
      const publication =
        job.sourceType === "PUBLICATION" ? await tx.load<SeatingV2Publication>("publications", job.sourceId, envelope) : undefined;
      const assignments = edition
        ? (await tx.list<SeatingV2PlanAssignment>("planAssignments", envelope)).filter((item) => item.planEditionId === edition.id)
        : [];
      return {
        contract: "eos-s06-seating-publication-v2",
        projectionClass,
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        publicationId: publication?.id,
        publicationNo: publication?.publicationNo,
        sourceType: job.sourceType,
        sourceId: job.sourceId,
        sourceHash: job.sourceHash,
        generatedAt: nowOf(actor),
        assignments: assignments.map((item) => ({
          ...(projectionClass === "PERMISSION_SAFE" ? {} : { eventGuestId: item.eventGuestId }),
          state: item.state,
          layoutTableId: item.layoutTableId,
          logicalPositionId: projectionClass === "PERMISSION_SAFE" ? null : item.logicalPositionId,
          typedReasonCodes: item.typedReasonCodes,
        })),
        hashes: {
          packageContentHash: edition?.packageHash,
          planContentHash: edition?.contentHash,
          layoutContentHash: publication?.layoutContentHash,
        },
      };
    });
  }

  async runS06EvaluationV2(actor: SeatingV2Actor, envelope: SeatingV2CommandEnvelope) {
    this.guard(actor, "seating.evaluate", envelope, envelope.actorAssignmentId);
    const { executeS06EvaluationV2 } = await import("./seating-evaluation-v2-runner.js");
    const result = await executeS06EvaluationV2();
    return this.mutate(actor, envelope, "seating.evaluate", "seatingV2.runEvaluation", async (tx) => {
      const run = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        corpusEdition: result.corpusEdition,
        corpusHash: result.corpusHash,
        contractVersion: result.contractVersion,
        solverVersion: result.solverVersion,
        configHash: result.configHash,
        validatorVersion: result.validatorVersion,
        projectionVersion: result.projectionVersion,
        status: result.failedCount === 0 ? "PASSED" : "FAILED",
        caseCount: result.caseCount,
        passedCount: result.passedCount,
        failedCount: result.failedCount,
        createdBy: actor.personId,
        createdAt: nowOf(actor),
      } as const;
      await tx.insert("evaluationRuns", run);
      for (const item of result.cases) {
        await tx.insert("evaluationCaseResults", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          schemaVersion: SEATING_V2_SCHEMA_VERSION,
          runId: run.id,
          caseId: item.caseId,
          observations: item.observations,
          assertions: item.assertions,
          status: item.status,
          createdAt: nowOf(actor),
        });
      }
      return run;
    });
  }

  async currentFreshness(envelope: SeatingV2Scope, packageId: string): Promise<{ fresh: boolean; currentSemanticHash: string; packageSemanticHash: string }> {
    return this.repo.transaction(async (tx) => {
      const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", packageId, envelope);
      if (!pkg) throw new PlatformError("NOT_FOUND", "input package was not found");
      const built = await this.build(tx, envelope, pkg.deterministicSeed);
      return {
        fresh: packageIsFresh(pkg, built),
        currentSemanticHash: built.semanticHash,
        packageSemanticHash: pkg.semanticHash,
      };
    });
  }

  private async insertRuleMembership(
    tx: SeatingV2Transaction,
    envelope: SeatingV2Scope,
    editionId: string,
    content: SeatingV2RuleContent,
    now: string,
  ): Promise<void> {
    for (const subject of content.subjects) {
      await tx.insert("ruleSubjects", {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        ruleEditionId: editionId,
        subjectType: subject.type,
        subjectId: subject.id,
        createdAt: now,
      });
    }
    for (const target of content.targets) {
      await tx.insert("ruleTargets", {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        ruleEditionId: editionId,
        targetType: target.type,
        targetIdOrCode: target.idOrCode,
        createdAt: now,
      });
    }
  }

  private async build(tx: SeatingV2Transaction, envelope: SeatingV2Scope, seed?: string): Promise<SeatingV2BuiltPackage> {
    return buildSeatingV2Package({
      tx,
      scope: envelope,
      snapshot: this.deps.snapshot(),
      pepper: this.deps.tokenPepper(),
      seed,
    });
  }

  private async requireCompiled(
    tx: SeatingV2Transaction,
    envelope: SeatingV2Scope,
    packageId: string,
  ): Promise<{ request: ReturnType<typeof compileSeatingV2Request>["request"] }> {
    const compiled = (await tx.list<SeatingV2CompiledRequestRecord>("compiledRequests", envelope)).find(
      (item) => item.packageId === packageId,
    );
    if (!compiled) throw new PlatformError("NOT_FOUND", "compiled request was not found");
    const raw = compiled.compiledRequestJson;
    const request = (typeof raw === "string" ? JSON.parse(raw) : raw) as ReturnType<typeof compileSeatingV2Request>["request"];
    return { request };
  }

  private revalidate(
    pkg: SeatingV2InputPackage,
    request: ReturnType<typeof compileSeatingV2Request>["request"],
    mapped: Array<{ guestToken: string; state: "SEATED" | "UNSEATED"; positionToken: string | null; typedReasonCodes: string[] }>,
    now: string,
  ) {
    return validateSeatingV2(
      { contentHash: pkg.contentHash, compiledRequest: request },
      mapped,
      mapped.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
      now,
    );
  }

  private async assertFreshFeasible(
    tx: SeatingV2Transaction,
    envelope: SeatingV2Scope,
    edition: SeatingV2PlanEdition,
    now: string,
  ): Promise<void> {
    const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", edition.packageId, envelope);
    if (!pkg) throw new PlatformError("NOT_FOUND", "package missing");
    const built = await this.build(tx, envelope, pkg.deterministicSeed);
    if (!packageIsFresh(pkg, built)) {
      throw new PlatformError("TRANSITION_INVALID", "governing inputs changed; create a successor from current governing inputs");
    }
    const compiled = await this.requireCompiled(tx, envelope, edition.packageId);
    const assignments = (await tx.list<SeatingV2PlanAssignment>("planAssignments", envelope)).filter(
      (item) => item.planEditionId === edition.id,
    );
    const guests = (await tx.list<{ packageId: string; eventGuestId: string; solverToken: string }>("packageGuests", envelope)).filter(
      (item) => item.packageId === edition.packageId,
    );
    const mapped = assignments.map((item) => ({
      guestToken: guests.find((guest) => guest.eventGuestId === item.eventGuestId)?.solverToken ?? "",
      state: item.state,
      positionToken: item.logicalPositionId ?? null,
      typedReasonCodes: item.typedReasonCodes,
    }));
    const report = this.revalidate(pkg, compiled.request, mapped, now);
    if (report.verdict !== "FEASIBLE") {
      throw new PlatformError("SEATING_VALIDATION_REJECTED", "independent validator rejected this edition");
    }
  }

  private async implicatedDomains(
    tx: SeatingV2Transaction,
    envelope: SeatingV2Scope,
    packageId: string,
  ): Promise<Array<SeatingV2SpecialistReview["domain"]>> {
    const packageRules = (await tx.list<{ packageId: string; ruleEditionId: string }>("packageRules", envelope)).filter(
      (item) => item.packageId === packageId,
    );
    const editions = await tx.list<SeatingV2RuleEdition>("ruleEditions", envelope);
    const domains = new Set<SeatingV2SpecialistReview["domain"]>();
    for (const item of packageRules) {
      const edition = editions.find((row) => row.id === item.ruleEditionId);
      if (edition?.specialistDomain === "SECURITY" || edition?.specialistDomain === "PROTOCOL" || edition?.specialistDomain === "ACCESSIBILITY") {
        domains.add(edition.specialistDomain);
      }
    }
    return [...domains];
  }

  private async persistWorkingEdition(
    tx: SeatingV2Transaction,
    actor: SeatingV2Actor,
    envelope: SeatingV2CommandEnvelope,
    input: {
      pkg: SeatingV2InputPackage;
      runId?: string | null;
      report: ReturnType<typeof validateSeatingV2>;
      mapped: Array<{ guestToken: string; state: "SEATED" | "UNSEATED"; positionToken: string | null; typedReasonCodes: string[] }>;
      contribution: "CREATE" | "ADOPT" | "MANUAL_EDIT";
      successorOf?: SeatingV2PlanEdition;
      locks?: Map<string, "LOCKED" | "UNLOCKED">;
      decisions?: Array<{
        type: string;
        eventGuestId?: string;
        positionToken?: string | null;
        leftGuestId?: string;
        rightGuestId?: string;
        reasonCode?: string;
      }>;
    },
  ): Promise<SeatingV2PlanEdition> {
    const now = nowOf(actor);
    const manualDecisionLogHash =
      input.contribution === "CREATE" && input.successorOf
        ? input.successorOf.manualDecisionLogHash
        : seatingV2ManualDecisionLogHash(input.decisions ?? []);
    const plan: SeatingV2PlanEdition = {
      id: randomUUID(),
      organisationId: envelope.organisationId,
      eventId: envelope.eventId,
      schemaVersion: SEATING_V2_SCHEMA_VERSION,
      editionNo: input.successorOf ? input.successorOf.editionNo + 1 : (await tx.list("planEditions", envelope)).length + 1,
      packageId: input.pkg.id,
      packageHash: input.pkg.contentHash,
      sourceRunId: input.runId ?? null,
      validationReportHash: input.report.reportHash,
      assignmentsHash: input.report.assignmentsHash,
      manualDecisionLogHash,
      contentHash: seatingV2PlanContentHash({
        packageContentHash: input.pkg.contentHash,
        assignmentsHash: input.report.assignmentsHash,
        validatorVersion: SEATING_V2_VALIDATOR_VERSION,
        validationReportHash: input.report.reportHash,
        manualDecisionLogHash,
      }),
      status: "WORKING",
      successorOfEditionId: input.successorOf?.id ?? null,
      version: 1,
      createdByPersonId: actor.personId,
      createdAt: now,
    };
    await tx.insert("planEditions", plan);
    await tx.insert("planAuthors", {
      id: randomUUID(),
      organisationId: envelope.organisationId,
      eventId: envelope.eventId,
      schemaVersion: SEATING_V2_SCHEMA_VERSION,
      planEditionId: plan.id,
      personId: actor.personId,
      contributionType: input.contribution,
      createdAt: now,
    });
    const guests = (await tx.list<{ packageId: string; eventGuestId: string; solverToken: string }>("packageGuests", envelope)).filter(
      (item) => item.packageId === input.pkg.id,
    );
    const positions = (await tx.list<{ packageId: string; positionToken: string; layoutTableId: string }>("packagePositions", envelope)).filter(
      (item) => item.packageId === input.pkg.id,
    );
    for (const assignment of input.mapped) {
      const guest = guests.find((item) => item.solverToken === assignment.guestToken);
      if (!guest) continue;
      await tx.insert("planAssignments", {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        schemaVersion: SEATING_V2_SCHEMA_VERSION,
        planEditionId: plan.id,
        eventGuestId: guest.eventGuestId,
        state: assignment.state,
        layoutTableId: positions.find((item) => item.positionToken === assignment.positionToken)?.layoutTableId ?? null,
        logicalPositionId: assignment.positionToken,
        lockState: input.locks?.get(guest.eventGuestId) ?? "UNLOCKED",
        typedReasonCodes: assignment.typedReasonCodes,
        createdAt: now,
      });
    }
    await this.pointCurrent(tx, envelope, now, { workingEditionId: plan.id, submittedEditionId: null });
    return plan;
  }

  private async pointCurrent(
    tx: SeatingV2Transaction,
    envelope: SeatingV2Scope,
    now: string,
    patch: { workingEditionId?: string | null; submittedEditionId?: string | null; currentPublicationId?: string | null },
  ): Promise<void> {
    const current = await tx.lockEventCurrent(envelope);
    if (current) {
      await tx.updateCurrent(envelope, current.version, { version: current.version + 1, ...patch });
      return;
    }
    await tx.insert("eventCurrent", {
      id: randomUUID(),
      organisationId: envelope.organisationId,
      eventId: envelope.eventId,
      schemaVersion: SEATING_V2_SCHEMA_VERSION,
      workingEditionId: patch.workingEditionId ?? null,
      submittedEditionId: patch.submittedEditionId ?? null,
      currentPublicationId: patch.currentPublicationId ?? null,
      version: 1,
      createdAt: now,
    });
  }

  private async proposeManual(
    tx: SeatingV2Transaction,
    envelope: SeatingV2Scope,
    planEditionId: string,
    command: SeatingV2ManualCommand,
    now: string,
  ): Promise<{
    edition: SeatingV2PlanEdition;
    pkg: SeatingV2InputPackage;
    mapped: Array<{ guestToken: string; state: "SEATED" | "UNSEATED"; positionToken: string | null; typedReasonCodes: string[] }>;
    report: ReturnType<typeof validateSeatingV2>;
    locks: Map<string, "LOCKED" | "UNLOCKED">;
  }> {
    if (command.type === "BULK" && command.commands.length > 50) {
      throw new PlatformError("VALIDATION_FAILED", "bulk apply is limited to 50 commands");
    }
    const edition = await tx.load<SeatingV2PlanEdition>("planEditions", planEditionId, envelope);
    if (!edition || edition.status !== "WORKING") {
      throw new PlatformError("TRANSITION_INVALID", "manual seating requires a WORKING edition");
    }
    const current = (await tx.list<SeatingV2PlanAssignment>("planAssignments", envelope)).filter(
      (item) => item.planEditionId === edition.id,
    );
    const pkg = await tx.load<SeatingV2InputPackage>("inputPackages", edition.packageId, envelope);
    const compiled = await this.requireCompiled(tx, envelope, edition.packageId);
    const guests = (await tx.list<{ packageId: string; eventGuestId: string; solverToken: string }>("packageGuests", envelope)).filter(
      (item) => item.packageId === edition.packageId,
    );
    if (!pkg) throw new PlatformError("NOT_FOUND", "package missing");
    const next = current.map((item) => ({ ...item }));
    const applyOne = (item: SeatingV2ManualCommand) => {
      if (item.type === "BULK") {
        item.commands.forEach(applyOne);
        return;
      }
      if (item.type === "SWAP") {
        const left = next.find((row) => row.eventGuestId === item.leftGuestId);
        const right = next.find((row) => row.eventGuestId === item.rightGuestId);
        if (!left || !right) throw new PlatformError("NOT_FOUND", "swap guests were not found");
        const leftPos = left.logicalPositionId;
        const rightPos = right.logicalPositionId;
        left.logicalPositionId = rightPos;
        right.logicalPositionId = leftPos;
        left.state = rightPos ? "SEATED" : "UNSEATED";
        right.state = leftPos ? "SEATED" : "UNSEATED";
        return;
      }
      const target = next.find((row) => row.eventGuestId === item.eventGuestId);
      if (!target) throw new PlatformError("NOT_FOUND", "guest assignment was not found");
      if (item.type === "ASSIGN_UNSEATED") {
        if (target.state === "SEATED") throw new PlatformError("VALIDATION_FAILED", "assign unseated cannot move a seated guest");
        if (next.some((row) => row.logicalPositionId === item.positionToken && row.state === "SEATED")) {
          throw new PlatformError("VERSION_CONFLICT", "target position is occupied");
        }
        target.state = "SEATED";
        target.logicalPositionId = item.positionToken;
        target.typedReasonCodes = ["MANUAL_ASSIGN"];
      } else if (item.type === "MOVE") {
        if (target.state !== "SEATED") throw new PlatformError("VALIDATION_FAILED", "move requires a seated guest");
        if (next.some((row) => row.logicalPositionId === item.positionToken && row.state === "SEATED" && row.eventGuestId !== target.eventGuestId)) {
          throw new PlatformError("VERSION_CONFLICT", "target position is occupied");
        }
        target.logicalPositionId = item.positionToken;
        target.typedReasonCodes = ["MANUAL_MOVE"];
      } else if (item.type === "UNSEAT") {
        target.state = "UNSEATED";
        target.logicalPositionId = null;
        target.typedReasonCodes = [item.reasonCode];
      } else if (item.type === "LOCK") {
        target.lockState = "LOCKED";
      } else if (item.type === "UNLOCK") {
        target.lockState = "UNLOCKED";
      }
    };
    applyOne(command);
    const mapped = next.map((item) => ({
      guestToken: guests.find((guest) => guest.eventGuestId === item.eventGuestId)?.solverToken ?? "",
      state: item.state,
      positionToken: item.logicalPositionId ?? null,
      typedReasonCodes: item.typedReasonCodes,
    }));
    const report = this.revalidate(pkg, compiled.request, mapped, now);
    if (report.verdict !== "FEASIBLE") {
      throw new PlatformError("SEATING_VALIDATION_REJECTED", "manual assignment violated a hard or structural rule");
    }
    return {
      edition,
      pkg,
      mapped,
      report,
      locks: new Map(next.map((item) => [item.eventGuestId, item.lockState])),
    };
  }
}
