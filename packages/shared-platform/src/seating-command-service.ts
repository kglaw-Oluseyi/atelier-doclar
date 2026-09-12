import { randomUUID } from "node:crypto";
import { exactHash } from "./eec-hash.js";
import { appliedMutationEffect, notAppliedMutationEffect, replayedMutationEffect, type DurableMutationEffect } from "./durable-mutation-effect.js";
import { PlatformError } from "./errors.js";
import { authorize, canSeeEvent, type ActorSnapshot } from "./policy.js";
import {
  snapshotBriefAdapter,
  snapshotGuestCohortAdapter,
  snapshotLayoutAdapter,
  snapshotProtectionAdapter,
  seatingToken,
} from "./seating-adapters.js";
import type { SeatingRepository, SeatingScope, SeatingTransaction } from "./seating-repository.js";
import type {
  SeatingApprovalRecord,
  SeatingConstraintRecord,
  SeatingInputEdition,
  SeatingPlanAssignment,
  SeatingPlanEdition,
  SeatingPublicationRecord,
  SeatingReservationBlock,
  SeatingReviewRecord,
  SeatingRunRecord,
  SeatingSolverConfigRecord,
} from "./seating-schemas.js";
import { defaultSolverConfig, solveSeatingV1 } from "./seating-solver-v1.js";
import type { PlatformSnapshot } from "./store.js";
import type { PermissionKey } from "./schemas.js";
import { buildSeatingWorkspace, implicatedSeatingReviewDomains, seatingDisclosureForRole, type SeatingWorkspaceView } from "./seating-workspace.js";
import { roleKeyForId } from "./catalog.js";

export type SeatingActor = {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
};

export type SeatingCommandEnvelope = {
  organisationId: string;
  eventId: string;
  actorAssignmentId: string;
  expectedVersion?: number;
  expectedContentHash?: string;
  idempotencyKey: string;
};

export type SeatingCommandResult<T> = {
  application: "APPLIED" | "REPLAYED" | "NOT_APPLIED";
  didDataChange: boolean;
  value: T;
  correlationId: string;
};

type CommandDeps = {
  resolveActor: (personId: string) => ActorSnapshot;
  snapshot: () => PlatformSnapshot;
  tokenPepper: () => string;
  onEffect?: (effect: DurableMutationEffect) => void;
};

function nowOf(actor: SeatingActor): string {
  return actor.now ?? new Date().toISOString();
}

function requireKey(key: string): void {
  if (key.length < 12) throw new PlatformError("VALIDATION_FAILED", "idempotencyKey must be at least 12 characters");
}

export class SeatingCommandService {
  constructor(
    private readonly repo: SeatingRepository,
    private readonly deps: CommandDeps,
  ) {}

  private guard(actor: SeatingActor, permission: PermissionKey, scope: SeatingScope, assignmentId: string): ActorSnapshot {
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

  private async mutate<T>(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    permission: PermissionKey,
    action: string,
    work: (tx: SeatingTransaction, people: ActorSnapshot) => Promise<{ id: string; value: T }>,
  ): Promise<SeatingCommandResult<T>> {
    requireKey(envelope.idempotencyKey);
    const requestHash = exactHash({ action, envelope, personId: actor.personId });
    return this.repo.transaction(async (tx) => {
      const people = this.guard(actor, permission, envelope, envelope.actorAssignmentId);
      const existing = await tx.getIdempotency(envelope, action, envelope.idempotencyKey);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        const effect = replayedMutationEffect(existing.resultIdentity);
        this.deps.onEffect?.(effect);
        return {
          application: "REPLAYED",
          didDataChange: false,
          value: { id: existing.resultIdentity } as T,
          correlationId: actor.correlationId,
        };
      }
      const result = await work(tx, people);
      await tx.insertIdempotency({
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        action,
        idempotencyKey: envelope.idempotencyKey,
        requestHash,
        resultIdentity: result.id,
        application: "APPLIED",
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
        resourceType: "seating",
        resourceId: result.id,
        correlationId: actor.correlationId,
        idempotencyKey: envelope.idempotencyKey,
        metadata: {},
        schemaVersion: 1,
      });
      this.deps.onEffect?.(appliedMutationEffect(result.id));
      return { application: "APPLIED", didDataChange: true, value: result.value, correlationId: actor.correlationId };
    });
  }

  async freezeSeatingInputs(actor: SeatingActor, envelope: SeatingCommandEnvelope): Promise<SeatingCommandResult<SeatingInputEdition>> {
    return this.mutate(actor, envelope, "seating.input.prepare", "freezeSeatingInputs", async (tx) => {
      const snap = this.deps.snapshot();
      const cohort = snapshotGuestCohortAdapter(snap, envelope.eventId);
      const layout = snapshotLayoutAdapter(snap, envelope.organisationId, envelope.eventId);
      const brief = snapshotBriefAdapter(snap, envelope.eventId);
      const protection = snapshotProtectionAdapter(snap, envelope.eventId);
      const contentHash = exactHash({
        guestCohortHash: cohort.cohortHash,
        rsvpTruthHash: cohort.rsvpTruthHash,
        layoutPublicationId: layout.publicationId,
        layoutContentHash: layout.contentHash,
        eventBriefContentHash: brief.contentHash,
        protectionSnapshotHash: protection.snapshotHash,
      });
      const current = (await tx.list<SeatingInputEdition>("inputEditions", envelope)).find((item) => item.current);
      if (current?.contentHash === contentHash) {
        return { id: current.id, value: current };
      }
      if (current) {
        await tx.updateVersioned("inputEditions", current.id, current.version, {
          version: current.version + 1,
          current: false,
          status: "SUPERSEDED",
          updatedAt: nowOf(actor),
        });
      }
      const edition: SeatingInputEdition = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        version: 0,
        status: "FROZEN",
        guestCohortHash: cohort.cohortHash,
        rsvpTruthHash: cohort.rsvpTruthHash,
        layoutPublicationId: layout.publicationId,
        layoutContentHash: layout.contentHash,
        eventBriefEditionId: brief.editionId,
        eventBriefContentHash: brief.contentHash,
        protectionSnapshotHash: protection.snapshotHash,
        contentHash,
        createdBy: actor.personId,
        current: true,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
      };
      await tx.insert("inputEditions", edition);
      const pepper = this.deps.tokenPepper();
      for (const guest of cohort.guests) {
        await tx.insert("guestTokens", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          inputEditionId: edition.id,
          eventGuestId: guest.eventGuestId,
          solverToken: seatingToken(pepper, envelope.eventId, guest.eventGuestId),
          eligible: guest.eligible,
          eligibilityCode: guest.eligibilityCode,
          statusCode: guest.statusCode,
          partyToken: guest.partyToken,
          capabilityCodes: guest.capabilityCodes,
          protocolCodes: guest.protocolCodes,
          version: 0,
          createdAt: nowOf(actor),
          updatedAt: nowOf(actor),
        });
      }
      for (const table of layout.tables) {
        const count = table.seatAnchors.length || table.capacity;
        for (let ordinal = 1; ordinal <= count; ordinal += 1) {
          const anchor = table.seatAnchors.find((item) => item.ordinal === ordinal);
          await tx.insert("positions", {
            id: randomUUID(),
            organisationId: envelope.organisationId,
            eventId: envelope.eventId,
            inputEditionId: edition.id,
            layoutObjectId: table.objectId,
            ordinal,
            layoutSeatAnchorId: anchor?.id,
            positionToken: `${table.objectId}:${String(ordinal).padStart(2, "0")}`,
            tableToken: table.objectId,
            zoneCodes: table.zoneCodes,
            capabilityCodes: table.capabilityCodes,
            version: 0,
            createdAt: nowOf(actor),
            updatedAt: nowOf(actor),
          });
        }
      }
      return { id: edition.id, value: edition };
    });
  }

  async createSeatingConstraint(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: Omit<SeatingConstraintRecord, "id" | "organisationId" | "eventId" | "version" | "createdAt" | "updatedAt" | "contentHash" | "createdBy" | "status"> & { status?: SeatingConstraintRecord["status"] },
  ): Promise<SeatingCommandResult<SeatingConstraintRecord>> {
    return this.mutate(actor, envelope, "seating.constraint.manage", "createSeatingConstraint", async (tx) => {
      const record: SeatingConstraintRecord = {
        ...input,
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        status: input.status ?? "DRAFT",
        version: 0,
        contentHash: exactHash(input),
        createdBy: actor.personId,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
      };
      await tx.insert("constraints", record);
      return { id: record.id, value: record };
    });
  }

  async decideSeatingConstraint(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { constraintId: string; decision: "APPROVED" | "REJECTED"; domain: "PROTOCOL" | "ACCESSIBILITY" | "SECURITY" },
  ): Promise<SeatingCommandResult<SeatingConstraintRecord>> {
    const permission =
      input.domain === "PROTOCOL"
        ? "seating.constraint.review.protocol"
        : input.domain === "ACCESSIBILITY"
          ? "seating.constraint.review.accessibility"
          : "seating.constraint.review.security";
    return this.mutate(actor, envelope, permission, "decideSeatingConstraint", async (tx) => {
      const constraint = await tx.load<SeatingConstraintRecord>("constraints", input.constraintId, envelope);
      if (!constraint) throw new PlatformError("NOT_FOUND", "constraint was not found");
      if (constraint.createdBy === actor.personId) throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      const next = {
        ...constraint,
        status: input.decision === "APPROVED" ? "APPROVED" : "REJECTED",
        version: constraint.version + 1,
        updatedAt: nowOf(actor),
      };
      await tx.updateVersioned("constraints", constraint.id, constraint.version, next);
      return { id: constraint.id, value: next as SeatingConstraintRecord };
    });
  }

  async createReservationBlock(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: Omit<SeatingReservationBlock, "id" | "organisationId" | "eventId" | "version" | "createdAt" | "updatedAt" | "contentHash" | "createdBy" | "releaseState">,
  ): Promise<SeatingCommandResult<SeatingReservationBlock>> {
    return this.mutate(actor, envelope, "seating.reservation.manage", "createReservationBlock", async (tx) => {
      const record: SeatingReservationBlock = {
        ...input,
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        releaseState: "ACTIVE",
        version: 0,
        contentHash: exactHash(input),
        createdBy: actor.personId,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
      };
      await tx.insert("reservationBlocks", record);
      return { id: record.id, value: record };
    });
  }

  async releaseReservationBlock(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { blockId: string; expectedVersion: number },
  ): Promise<SeatingCommandResult<SeatingReservationBlock>> {
    return this.mutate(actor, envelope, "seating.reservation.manage", "releaseReservationBlock", async (tx) => {
      const block = await tx.load<SeatingReservationBlock>("reservationBlocks", input.blockId, envelope);
      if (!block) throw new PlatformError("NOT_FOUND", "reservation was not found");
      if (block.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale reservation");
      const next = { ...block, releaseState: "RELEASED" as const, version: block.version + 1, updatedAt: nowOf(actor) };
      await tx.updateVersioned("reservationBlocks", block.id, block.version, next);
      return { id: block.id, value: next };
    });
  }

  async launchSeatingRun(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { inputEditionId: string; configId?: string; seed?: string },
  ): Promise<SeatingCommandResult<SeatingRunRecord>> {
    return this.mutate(actor, envelope, "seating.run.execute", "launchSeatingRun", async (tx) => {
      const edition = await tx.load<SeatingInputEdition>("inputEditions", input.inputEditionId, envelope);
      if (!edition) throw new PlatformError("NOT_FOUND", "input edition was not found");
      const configs = await tx.list<SeatingSolverConfigRecord>("solverConfigs", { organisationId: envelope.organisationId });
      const config =
        configs.find((item) => item.id === input.configId) ??
        configs.find((item) => item.status === "ACCEPTED") ??
        (await this.ensureDefaultConfig(tx, envelope.organisationId, actor));
      const seed = input.seed ?? exactHash({ edition: edition.contentHash, at: nowOf(actor) }).slice(0, 16);
      const existing = (await tx.list<SeatingRunRecord>("runs", envelope)).find(
        (item) => item.inputHash === edition.contentHash && item.configHash === config.contentHash && item.seed === seed,
      );
      if (existing) return { id: existing.id, value: existing };
      const guests = (await tx.list<{ inputEditionId: string; solverToken: string; eligible: boolean; capabilityCodes: string[]; protocolCodes: string[]; partyToken?: string }>(
        "guestTokens",
        envelope,
      )).filter((item) => item.inputEditionId === edition.id);
      const positions = (await tx.list<{ inputEditionId: string; positionToken: string; tableToken: string; zoneCodes: string[]; capabilityCodes: string[] }>(
        "positions",
        envelope,
      )).filter((item) => item.inputEditionId === edition.id);
      const constraints = await tx.list<SeatingConstraintRecord>("constraints", envelope);
      const reservations = (await tx.list<SeatingReservationBlock>("reservationBlocks", envelope)).filter((item) => item.releaseState === "ACTIVE");
      const solverPackage = {
        guests: guests.map((guest) => ({
          token: guest.solverToken,
          eligible: guest.eligible,
          partyToken: guest.partyToken,
          capabilityCodes: guest.capabilityCodes,
          protocolCodes: guest.protocolCodes,
        })),
        positions: positions.map((position) => ({
          token: position.positionToken,
          tableToken: position.tableToken,
          zoneCodes: position.zoneCodes,
          capabilityCodes: position.capabilityCodes,
        })),
        constraints: constraints
          .filter((item) => item.status === "APPROVED" || item.kind === "WEIGHTED" || item.kind === "INFORMATION")
          .map((item) => {
            const payload = item.payload as {
              predicateType?: string;
              guestIds?: string[];
              guestTokens?: string[];
              tableRefs?: string[];
              zoneCodes?: string[];
              capabilityCodes?: string[];
              positionToken?: string;
            };
            const guestTokens =
              payload.guestTokens ??
              (payload.guestIds ?? []).map((guestId) => seatingToken(this.deps.tokenPepper(), envelope.eventId, guestId));
            const predicate = item.predicateType;
            const solverPayload =
              predicate === "LOCK_ASSIGNMENT"
                ? { predicateType: "LOCK_ASSIGNMENT" as const, guestToken: guestTokens[0] ?? "", positionToken: payload.positionToken ?? "" }
                : predicate === "REQUIRE_TABLE" || predicate === "FORBID_TABLE" || predicate === "PREFER_TABLE"
                  ? { predicateType: predicate, guestTokens, tableTokens: payload.tableRefs ?? [] }
                  : predicate === "REQUIRE_ZONE" || predicate === "FORBID_ZONE" || predicate === "PREFER_ZONE"
                    ? { predicateType: predicate, guestTokens, zoneCodes: payload.zoneCodes ?? [] }
                    : predicate === "REQUIRE_POSITION_CAPABILITY"
                      ? { predicateType: predicate, guestTokens, capabilityCodes: payload.capabilityCodes ?? [] }
                      : predicate === "RESERVE_CAPACITY"
                        ? { predicateType: "RESERVE_CAPACITY" as const, reservationId: item.id }
                        : predicate === "MINIMIZE_CHANGE"
                          ? { predicateType: "MINIMIZE_CHANGE" as const, previous: [] }
                          : { predicateType: predicate, guestTokens };
            return {
              id: item.id,
              kind: item.kind,
              predicateType: predicate,
              payload: solverPayload,
              weight: item.weight,
            };
          }),
        reservations: reservations.map((item) => ({
          id: item.id,
          eligibleGuestTokens: item.eligibleGuestIds.map((guestId) => seatingToken(this.deps.tokenPepper(), envelope.eventId, guestId)),
          tableTokens: item.tableRefs,
          zoneCodes: item.zoneRefs,
          min: item.minCount,
          max: item.maxCount,
          exact: item.exactCount,
          priority: item.priority,
        })),
        config: defaultSolverConfig({ seed, timeLimitMs: config.timeLimitMs, memoryLimitMb: config.memoryLimitMb }),
      };
      const solved = guests.length && positions.length ? solveSeatingV1(solverPackage) : undefined;
      const run: SeatingRunRecord = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        inputEditionId: edition.id,
        inputHash: edition.contentHash,
        configId: config.id,
        configHash: config.contentHash,
        solverVersion: config.version,
        seed,
        status: solved?.status === "FEASIBLE" ? "FEASIBLE" : solved?.status === "INFEASIBLE" ? "INFEASIBLE" : solved?.status === "TIMED_OUT" ? "TIMED_OUT" : "ERROR",
        attempt: 1,
        metrics: solved?.metrics,
        resultHash: solved?.resultHash,
        failureCode: solved ? undefined : "SOLVER_ERROR",
        version: 0,
        createdBy: actor.personId,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
      };
      if (!solved) run.status = "ERROR";
      await tx.insert("runs", run);
      if (solved) {
        for (const assignment of solved.assignments) {
          await tx.insert("runAssignments", {
            id: randomUUID(),
            organisationId: envelope.organisationId,
            eventId: envelope.eventId,
            runId: run.id,
            guestToken: assignment.guestToken,
            positionToken: assignment.positionToken,
            state: assignment.state,
            reasonCodes: assignment.reasonCodes,
            version: 0,
            createdAt: nowOf(actor),
          });
        }
        for (const finding of solved.findings) {
          await tx.insert("findings", {
            id: randomUUID(),
            organisationId: envelope.organisationId,
            eventId: envelope.eventId,
            runId: run.id,
            severity: finding.severity,
            ruleRef: finding.ruleRef,
            evidenceRefs: [],
            affectedTokens: finding.affectedTokens,
            code: finding.code,
            state: "OPEN",
            createdAt: nowOf(actor),
          });
        }
      }
      return { id: run.id, value: run };
    });
  }

  async cancelSeatingRun(actor: SeatingActor, envelope: SeatingCommandEnvelope, input: { runId: string; expectedVersion: number }): Promise<SeatingCommandResult<SeatingRunRecord>> {
    return this.mutate(actor, envelope, "seating.run.execute", "cancelSeatingRun", async (tx) => {
      const run = await tx.load<SeatingRunRecord>("runs", input.runId, envelope);
      if (!run) throw new PlatformError("NOT_FOUND", "run was not found");
      if (!["QUEUED", "RUNNING"].includes(run.status)) throw new PlatformError("TRANSITION_INVALID", "terminal rows are immutable");
      if (run.version !== input.expectedVersion) throw new PlatformError("VERSION_CONFLICT", "stale run");
      const next = { ...run, status: "CANCELLED" as const, version: run.version + 1, updatedAt: nowOf(actor) };
      await tx.updateVersioned("runs", run.id, run.version, next);
      return { id: run.id, value: next };
    });
  }

  async adoptSeatingRun(actor: SeatingActor, envelope: SeatingCommandEnvelope, input: { runId: string }): Promise<SeatingCommandResult<SeatingPlanEdition>> {
    return this.mutate(actor, envelope, "seating.plan.edit", "adoptSeatingRun", async (tx) => {
      const run = await tx.load<SeatingRunRecord>("runs", input.runId, envelope);
      if (!run || !run.resultHash) throw new PlatformError("NOT_FOUND", "run result was not found");
      const tokens = await tx.list<{ solverToken: string; eventGuestId: string; inputEditionId: string }>("guestTokens", envelope);
      const positions = await tx.list<{ positionToken: string; tableToken: string; id: string }>("positions", envelope);
      const assignments = (await tx.list<{ runId: string; guestToken: string; positionToken?: string; state: "SEATED" | "UNSEATED" }>("runAssignments", envelope)).filter(
        (item) => item.runId === run.id,
      );
      const contentHash = exactHash({ run: run.resultHash, assignments });
      const working = (await tx.list<SeatingPlanEdition>("planEditions", envelope)).find((item) => item.currentWorking);
      if (working) {
        await tx.updateVersioned("planEditions", working.id, working.version, {
          version: working.version + 1,
          currentWorking: false,
          status: working.status === "DRAFT" ? "SUPERSEDED" : working.status,
          updatedAt: nowOf(actor),
        });
      }
      const edition: SeatingPlanEdition = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        sourceRunId: run.id,
        version: 0,
        status: "DRAFT",
        contentHash,
        currentWorking: true,
        materialAuthorPersonId: actor.personId,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
      };
      await tx.insert("planEditions", edition);
      for (const assignment of assignments) {
        const guest = tokens.find((item) => item.solverToken === assignment.guestToken);
        const position = positions.find((item) => item.positionToken === assignment.positionToken);
        await tx.insert("planAssignments", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          eventId: envelope.eventId,
          editionId: edition.id,
          eventGuestId: guest?.eventGuestId ?? randomUUID(),
          tableId: position?.tableToken,
          positionId: position?.id,
          state: assignment.state,
          lockState: "UNLOCKED",
          provenance: "SOLVER",
          version: 0,
          createdAt: nowOf(actor),
        });
      }
      return { id: edition.id, value: edition };
    });
  }

  async previewSeatingChange(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { editionId: string; guestId: string; targetPositionId?: string; command: "MOVE" | "UNSEAT" | "LOCK" | "UNLOCK" | "SWAP"; otherGuestId?: string },
  ): Promise<SeatingCommandResult<{ allowed: boolean; message: string }>> {
    this.guard(actor, "seating.plan.edit", envelope, envelope.actorAssignmentId);
    const edition = await this.repo.transaction((tx) => tx.load<SeatingPlanEdition>("planEditions", input.editionId, envelope));
    if (!edition || edition.status !== "DRAFT") {
      return { application: "NOT_APPLIED", didDataChange: false, value: { allowed: false, message: "No safe seating plan satisfies every hard rule." }, correlationId: actor.correlationId };
    }
    this.deps.onEffect?.(notAppliedMutationEffect(true));
    return { application: "NOT_APPLIED", didDataChange: false, value: { allowed: true, message: "The solver recommends. Authorised people decide." }, correlationId: actor.correlationId };
  }

  async applySeatingChange(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { editionId: string; command: "MOVE" | "UNSEAT" | "LOCK" | "UNLOCK" | "SWAP"; guestId: string; targetPositionId?: string; otherGuestId?: string; reasonCode: string; reasonText?: string },
  ): Promise<SeatingCommandResult<SeatingPlanEdition>> {
    return this.mutate(actor, envelope, "seating.plan.edit", "applySeatingChange", async (tx) => {
      const edition = await tx.load<SeatingPlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "DRAFT") throw new PlatformError("TRANSITION_INVALID", "edit in place is forbidden");
      if (envelope.expectedVersion !== undefined && edition.version !== envelope.expectedVersion) {
        throw new PlatformError("VERSION_CONFLICT", "stale plan");
      }
      const assignments = (await tx.list<SeatingPlanAssignment>("planAssignments", envelope)).filter((item) => item.editionId === edition.id);
      const beforeHash = edition.contentHash;
      const successor: SeatingPlanEdition = {
        ...edition,
        id: randomUUID(),
        version: 0,
        status: "DRAFT",
        currentWorking: true,
        materialAuthorPersonId: actor.personId,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
        contentHash: exactHash({ beforeHash, input, at: nowOf(actor) }),
      };
      await tx.updateVersioned("planEditions", edition.id, edition.version, {
        version: edition.version + 1,
        currentWorking: false,
        status: "SUPERSEDED",
        updatedAt: nowOf(actor),
      });
      await tx.insert("planEditions", successor);
      for (const assignment of assignments) {
        const next = { ...assignment, id: randomUUID(), editionId: successor.id };
        if (assignment.eventGuestId === input.guestId) {
          if (input.command === "UNSEAT") {
            next.state = "UNSEATED";
            next.positionId = undefined;
            next.tableId = undefined;
            next.provenance = "MANUAL";
          }
          if (input.command === "MOVE" && input.targetPositionId) {
            next.state = "SEATED";
            next.positionId = input.targetPositionId;
            next.provenance = "MANUAL";
          }
          if (input.command === "LOCK") next.lockState = "LOCKED";
          if (input.command === "UNLOCK") next.lockState = "UNLOCKED";
        }
        if (input.command === "SWAP" && input.otherGuestId && (assignment.eventGuestId === input.guestId || assignment.eventGuestId === input.otherGuestId)) {
          const other = assignments.find((item) => item.eventGuestId === (assignment.eventGuestId === input.guestId ? input.otherGuestId : input.guestId));
          next.positionId = other?.positionId;
          next.tableId = other?.tableId;
          next.state = other?.state ?? next.state;
          next.provenance = "MANUAL";
        }
        await tx.insert("planAssignments", next);
      }
      await tx.insert("manualDecisions", {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        editionId: successor.id,
        command: input.command,
        beforeHash,
        afterHash: successor.contentHash,
        reasonCode: input.reasonCode,
        reasonText: input.reasonText,
        actorPersonId: actor.personId,
        validationResult: "ACCEPTED",
        createdAt: nowOf(actor),
      });
      return { id: successor.id, value: successor };
    });
  }

  async submitSeatingPlan(actor: SeatingActor, envelope: SeatingCommandEnvelope, input: { editionId: string }): Promise<SeatingCommandResult<SeatingPlanEdition>> {
    return this.mutate(actor, envelope, "seating.plan.submit", "submitSeatingPlan", async (tx) => {
      const edition = await tx.load<SeatingPlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "DRAFT") throw new PlatformError("TRANSITION_INVALID", "only DRAFT can be submitted");
      const next = { ...edition, status: "SUBMITTED" as const, version: edition.version + 1, updatedAt: nowOf(actor) };
      await tx.updateVersioned("planEditions", edition.id, edition.version, next);
      return { id: edition.id, value: next };
    });
  }

  async decideSeatingReview(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { editionId: string; editionHash: string; domain: SeatingReviewRecord["domain"]; decision: "APPROVED" | "REJECTED"; reason: string },
  ): Promise<SeatingCommandResult<SeatingReviewRecord>> {
    const permission =
      input.domain === "PROTOCOL"
        ? "seating.plan.review.protocol"
        : input.domain === "ACCESSIBILITY"
          ? "seating.plan.review.accessibility"
          : "seating.plan.review.security";
    return this.mutate(actor, envelope, permission, "decideSeatingReview", async (tx) => {
      const edition = await tx.load<SeatingPlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.eventId !== envelope.eventId || edition.organisationId !== envelope.organisationId) {
        throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      }
      if (edition.contentHash !== input.editionHash || (envelope.expectedVersion !== undefined && edition.version !== envelope.expectedVersion)) {
        throw new PlatformError("VERSION_CONFLICT", "stale plan");
      }
      if (edition.materialAuthorPersonId === actor.personId) throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      const constraints = await tx.list<SeatingConstraintRecord>("constraints", envelope);
      const implicated = implicatedSeatingReviewDomains({ constraints }, envelope.eventId);
      if (!implicated.includes(input.domain)) {
        throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      }
      const review: SeatingReviewRecord = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        editionId: edition.id,
        editionHash: input.editionHash,
        domain: input.domain,
        decision: input.decision,
        reviewerPersonId: actor.personId,
        reason: input.reason,
        createdAt: nowOf(actor),
      };
      await tx.insert("reviews", review);
      return { id: review.id, value: review };
    });
  }

  async decideSeatingApproval(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { editionId: string; editionHash: string; decision: "APPROVED" | "REJECTED" },
  ): Promise<SeatingCommandResult<SeatingApprovalRecord>> {
    return this.mutate(actor, envelope, "seating.plan.approve", "decideSeatingApproval", async (tx) => {
      const edition = await tx.load<SeatingPlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "SUBMITTED") throw new PlatformError("TRANSITION_INVALID", "only SUBMITTED can be approved");
      if (edition.eventId !== envelope.eventId || edition.organisationId !== envelope.organisationId) {
        throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      }
      if (edition.contentHash !== input.editionHash || (envelope.expectedVersion !== undefined && edition.version !== envelope.expectedVersion)) {
        throw new PlatformError("VERSION_CONFLICT", "stale plan");
      }
      if (edition.materialAuthorPersonId === actor.personId) throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      const constraints = await tx.list<SeatingConstraintRecord>("constraints", envelope);
      const implicated = implicatedSeatingReviewDomains({ constraints }, envelope.eventId);
      const reviews = (await tx.list<SeatingReviewRecord>("reviews", envelope)).filter((item) => item.editionId === edition.id);
      if (implicated.some((domain) => !reviews.some((item) => item.domain === domain && item.decision === "APPROVED" && item.editionHash === input.editionHash))) {
        throw new PlatformError("TRANSITION_INVALID", "specialist review required");
      }
      const approval: SeatingApprovalRecord = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        editionId: edition.id,
        editionHash: input.editionHash,
        approverPersonId: actor.personId,
        decision: input.decision,
        createdAt: nowOf(actor),
      };
      await tx.insert("approvals", approval);
      if (input.decision === "APPROVED") {
        await tx.updateVersioned("planEditions", edition.id, edition.version, {
          version: edition.version + 1,
          status: "APPROVED",
          updatedAt: nowOf(actor),
        });
      }
      return { id: approval.id, value: approval };
    });
  }

  async publishSeatingPlan(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { editionId: string; editionHash: string },
  ): Promise<SeatingCommandResult<SeatingPublicationRecord>> {
    return this.mutate(actor, envelope, "seating.plan.publish", "publishSeatingPlan", async (tx) => {
      const edition = await tx.load<SeatingPlanEdition>("planEditions", input.editionId, envelope);
      if (!edition || edition.status !== "APPROVED") throw new PlatformError("TRANSITION_INVALID", "only APPROVED can be published");
      if (edition.contentHash !== input.editionHash) throw new PlatformError("VALIDATION_FAILED", "exact plan hash required");
      if (edition.materialAuthorPersonId === actor.personId) throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      const approval = (await tx.list<SeatingApprovalRecord>("approvals", envelope)).find(
        (item) => item.editionId === edition.id && item.editionHash === input.editionHash && item.decision === "APPROVED",
      );
      if (!approval || approval.approverPersonId === actor.personId) {
        throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
      }
      const current = (await tx.list<SeatingPublicationRecord>("publications", envelope)).find((item) => item.status === "CURRENT");
      const identity = exactHash({
        edition: edition.id,
        hash: edition.contentHash,
        input: edition.sourceRunId,
      });
      if (current && exactHash({ edition: current.editionId, hash: current.editionHash, input: current.inputHash }) === identity) {
        return { id: current.id, value: current };
      }
      const inputEdition = (await tx.list<SeatingInputEdition>("inputEditions", envelope)).find((item) => item.current);
      const publication: SeatingPublicationRecord = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        publicationNumber: (current?.publicationNumber ?? 0) + 1,
        editionId: edition.id,
        editionHash: edition.contentHash,
        inputHash: inputEdition?.contentHash ?? edition.contentHash,
        layoutHash: inputEdition?.layoutContentHash ?? edition.contentHash,
        configHash: edition.contentHash,
        publisherPersonId: actor.personId,
        status: "CURRENT",
        publishedAt: nowOf(actor),
        supersedesId: current?.id,
        version: 0,
      };
      await tx.insert("publications", publication);
      if (current) {
        await tx.updateVersioned("publications", current.id, current.version, {
          version: current.version + 1,
          status: "SUPERSEDED",
        });
      }
      return { id: publication.id, value: publication };
    });
  }

  async requestSeatingExport(
    actor: SeatingActor,
    envelope: SeatingCommandEnvelope,
    input: { publicationId?: string; editionId?: string; format: "PDF" | "PNG" | "JSON"; projectionClass: "PLANNER" | "DIRECTOR" | "CEO" | "AUDITOR" | "DOWNSTREAM" },
  ): Promise<SeatingCommandResult<{ id: string; status: "READY" }>> {
    return this.mutate(actor, envelope, "seating.export", "requestSeatingExport", async (tx) => {
      const job = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        eventId: envelope.eventId,
        publicationId: input.publicationId,
        editionId: input.editionId,
        format: input.format,
        projectionClass: input.projectionClass,
        status: "READY" as const,
        generatedAt: nowOf(actor),
        objectKey: undefined,
        version: 0,
        createdAt: nowOf(actor),
      };
      await tx.insert("exportJobs", job);
      return { id: job.id, value: { id: job.id, status: "READY" } };
    });
  }

  async projectWorkspace(actor: SeatingActor, eventId: string): Promise<SeatingWorkspaceView> {
    const people = this.deps.resolveActor(actor.personId);
    const event = this.deps.snapshot().events.find((item) => item.id === eventId);
    if (!event) throw new PlatformError("NOT_FOUND", "event was not found");
    if (!canSeeEvent(people, event, nowOf(actor))) throw new PlatformError("NOT_FOUND", "event was not found");
    const assignment =
      people.assignments.find((item) => item.status === "ACTIVE" && item.organisationId === event.organisationId && item.eventId === eventId) ??
      people.assignments.find((item) => item.status === "ACTIVE" && item.organisationId === event.organisationId && !item.eventId);
    if (!assignment) throw new PlatformError("FORBIDDEN", "This assignment cannot perform this seating action.");
    this.guard(actor, "seating.view", { organisationId: event.organisationId, eventId }, assignment.id);
    const projection = await this.repo.projectEventSeating(actor, eventId);
    const role = roleKeyForId(assignment.roleId);
    const state = projection.state ?? (await this.repo.transaction((tx) => Promise.resolve(tx.snapshot())));
    return buildSeatingWorkspace(this.deps.snapshot(), state, eventId, seatingDisclosureForRole(role));
  }

  async runS06Evaluation(actor: SeatingActor, envelope: SeatingCommandEnvelope) {
    return this.mutate(actor, envelope, "seating.evaluate", "runS06Evaluation", async (tx) => {
      const { executeS06Evaluation } = await import("./seating-evaluation-runner.js");
      const result = await executeS06Evaluation();
      const run = {
        id: randomUUID(),
        organisationId: envelope.organisationId,
        corpusEdition: result.corpusEdition,
        corpusHash: result.corpusHash,
        contractVersion: result.contractVersion,
        solverVersion: result.solverVersion,
        configHash: result.configHash,
        projectionVersion: result.projectionVersion,
        status: result.failedCount === 0 ? "PASSED" : "FAILED",
        caseCount: result.caseCount,
        passedCount: result.passedCount,
        failedCount: result.failedCount,
        createdBy: actor.personId,
        createdAt: nowOf(actor),
        updatedAt: nowOf(actor),
      } as const;
      await tx.insert("evaluationRuns", run);
      for (const item of result.cases) {
        await tx.insert("evaluationCaseResults", {
          id: randomUUID(),
          organisationId: envelope.organisationId,
          runId: run.id,
          caseId: item.caseId,
          observations: item.observations,
          assertions: item.assertions,
          status: item.status,
          createdAt: nowOf(actor),
        });
      }
      return { id: run.id, value: run };
    });
  }

  private async ensureDefaultConfig(tx: SeatingTransaction, organisationId: string, actor: SeatingActor): Promise<SeatingSolverConfigRecord> {
    const config: SeatingSolverConfigRecord = {
      id: randomUUID(),
      organisationId,
      algorithm: "SeatingSolverV1",
      version: "s06-solver-v1",
      objectiveOrder: [...defaultSolverConfig().objectiveOrder],
      timeLimitMs: 10_000,
      memoryLimitMb: 256,
      alternativeCount: 2,
      materialityThreshold: 2,
      contentHash: exactHash(defaultSolverConfig()),
      status: "ACCEPTED",
      createdAt: nowOf(actor),
      updatedAt: nowOf(actor),
    };
    await tx.insert("solverConfigs", config);
    return config;
  }
}
