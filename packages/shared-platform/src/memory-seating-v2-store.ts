import { PlatformError } from "./errors.js";
import { withSettlementTransaction } from "./seating-settlement-trace.js";
import type { AuditEvent } from "./schemas.js";
import {
  assertSeatingV2Scope,
  cloneSeatingV2State,
  seatingV2RowId,
  type SeatingV2ActorContext,
  type SeatingV2CurrentPatch,
  type SeatingV2EventProjection,
  type SeatingV2LifecycleCollection,
  type SeatingV2LifecyclePatch,
  type SeatingV2Lock,
  type SeatingV2Repository,
  type SeatingV2Scope,
  type SeatingV2Transaction,
} from "./seating-v2-repository.js";
import {
  emptySeatingV2State,
  SEATING_V2_COLLECTIONS,
  SEATING_V2_PURGE_CONFIRMATION,
  type SeatingV2Collection,
  type SeatingV2EventCurrent,
  type SeatingV2IdempotencyReceipt,
  type SeatingV2LayoutBinding,
  type SeatingV2PlanAssignment,
  type SeatingV2RunAssignment,
  type SeatingV2State,
} from "./seating-v2-state.js";

type Identified = {
  id?: string;
  migrationId?: string;
  organisationId?: string;
  eventId?: string;
  packageId?: string;
  eventGuestId?: string;
  solverToken?: string;
  runId?: string;
  planEditionId?: string;
  positionToken?: string | null;
  logicalPositionId?: string | null;
  state?: string;
  status?: string;
  version?: number;
};

export class MemorySeatingV2Store {
  private state: SeatingV2State = emptySeatingV2State();
  readonly audit: AuditEvent[] = [];

  snapshot(): SeatingV2State {
    return cloneSeatingV2State(this.state);
  }

  replaceState(state: SeatingV2State): void {
    this.state = cloneSeatingV2State(state);
  }

  replaceAudit(audit: AuditEvent[]): void {
    this.audit.splice(0, this.audit.length, ...structuredClone(audit));
  }

  collection<K extends SeatingV2Collection>(name: K): SeatingV2State[K] {
    return this.state[name];
  }
}

function rowIdentity(item: Identified): string | undefined {
  return item.id ?? item.migrationId;
}

export class MemorySeatingV2Transaction implements SeatingV2Transaction {
  constructor(private readonly store: MemorySeatingV2Store) {}

  async load<T>(collection: SeatingV2Collection, id: string, scope: Partial<SeatingV2Scope>): Promise<T | undefined> {
    const hit = (this.store.collection(collection) as Identified[]).find((item) => rowIdentity(item) === id);
    if (!hit || !assertSeatingV2Scope(hit, scope, collection)) return undefined;
    return structuredClone(hit) as T;
  }

  async list<T>(collection: SeatingV2Collection, scope: Partial<SeatingV2Scope>): Promise<T[]> {
    return (this.store.collection(collection) as Identified[])
      .filter((item) => assertSeatingV2Scope(item, scope, collection))
      .map((item) => structuredClone(item) as T);
  }

  async insert<T extends { id?: string; organisationId?: string }>(collection: SeatingV2Collection, record: T): Promise<T> {
    const rows = this.store.collection(collection) as Identified[];
    const next = structuredClone(record) as Identified;
    if (collection !== "idempotencyReceipts") {
      const id = seatingV2RowId(next);
      if (rows.some((item) => rowIdentity(item) === id)) {
        throw new PlatformError("VALIDATION_FAILED", `duplicate seating v2 ${collection} insert`);
      }
    }
    this.assertInsertInvariants(collection, next, rows);
    if (next.status === "CURRENT" && collection === "publications") {
      for (const item of rows) {
        if (item.status === "CURRENT" && item.eventId === next.eventId && item.organisationId === next.organisationId) {
          item.status = "SUPERSEDED";
        }
      }
    }
    rows.push(next);
    return structuredClone(record);
  }

  async updateCurrent(scope: SeatingV2Scope, expectedVersion: number, patch: SeatingV2CurrentPatch): Promise<SeatingV2EventCurrent> {
    const rows = this.store.collection("eventCurrent");
    const index = rows.findIndex(
      (item) => item.organisationId === scope.organisationId && item.eventId === scope.eventId,
    );
    const current = index >= 0 ? rows[index] : undefined;
    if (!current || current.version !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating v2 current pointer was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    if (patch.version !== expectedVersion + 1) {
      throw new PlatformError("VALIDATION_FAILED", "row versions increment exactly once per successful mutation");
    }
    const merged: SeatingV2EventCurrent = {
      ...current,
      ...patch,
      id: current.id,
      organisationId: current.organisationId,
      eventId: current.eventId,
      version: patch.version,
    };
    rows[index] = structuredClone(merged);
    return structuredClone(merged);
  }

  async updateLifecycle<T>(
    collection: SeatingV2LifecycleCollection,
    id: string,
    scope: SeatingV2Scope,
    patch: SeatingV2LifecyclePatch,
  ): Promise<T> {
    const rows = this.store.collection(collection) as Identified[];
    const index = rows.findIndex((item) => rowIdentity(item) === id && assertSeatingV2Scope(item, scope, collection));
    if (index < 0) throw new PlatformError("NOT_FOUND", `seating v2 ${collection} row was not found`);
    const current = rows[index] as Record<string, unknown>;
    const allowed: SeatingV2LifecyclePatch = {
      ...(patch.lifecycle !== undefined ? { lifecycle: patch.lifecycle } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.activatedByPersonId !== undefined ? { activatedByPersonId: patch.activatedByPersonId } : {}),
      ...(patch.activatedAt !== undefined ? { activatedAt: patch.activatedAt } : {}),
      ...(patch.withdrawnByPersonId !== undefined ? { withdrawnByPersonId: patch.withdrawnByPersonId } : {}),
      ...(patch.withdrawnAt !== undefined ? { withdrawnAt: patch.withdrawnAt } : {}),
      ...(patch.withdrawalReason !== undefined ? { withdrawalReason: patch.withdrawalReason } : {}),
      ...(patch.releasedByPersonId !== undefined ? { releasedByPersonId: patch.releasedByPersonId } : {}),
      ...(patch.releasedAt !== undefined ? { releasedAt: patch.releasedAt } : {}),
      ...(patch.releaseDecision !== undefined ? { releaseDecision: patch.releaseDecision } : {}),
      ...(patch.submittedByPersonId !== undefined ? { submittedByPersonId: patch.submittedByPersonId } : {}),
      ...(patch.submittedAt !== undefined ? { submittedAt: patch.submittedAt } : {}),
      ...(patch.version !== undefined ? { version: patch.version } : {}),
    };
    if (collection === "planEditions" && allowed.version !== undefined) {
      const currentVersion = Number(current.version ?? 0);
      if (allowed.version !== currentVersion + 1) {
        throw new PlatformError("VALIDATION_FAILED", "row versions increment exactly once per successful mutation");
      }
    }
    const merged: Record<string, unknown> = { ...current, ...allowed };
    if (current.contentHash !== undefined && merged.contentHash !== current.contentHash) {
      throw new PlatformError("VALIDATION_FAILED", "lifecycle update cannot change content hash");
    }
    rows[index] = structuredClone(merged) as Identified;
    return structuredClone(merged) as T;
  }

  async updateLayoutBinding(
    id: string,
    scope: SeatingV2Scope,
    expectedVersion: number,
    patch: Partial<
      Pick<
        SeatingV2LayoutBinding,
        "state" | "activatedByPersonId" | "activatedAt" | "withdrawnByPersonId" | "withdrawnAt" | "updatedAt"
      >
    >,
  ): Promise<SeatingV2LayoutBinding> {
    const rows = this.store.collection("layoutBindings");
    const index = rows.findIndex((item) => item.id === id && assertSeatingV2Scope(item, scope, "layoutBindings"));
    if (index < 0) throw new PlatformError("NOT_FOUND", "seating layout binding was not found");
    const current = rows[index]!;
    if (current.version !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating layout binding was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    if (patch.state === "ACTIVE") {
      for (const item of rows) {
        if (
          item.id !== id &&
          item.organisationId === scope.organisationId &&
          item.eventId === scope.eventId &&
          item.state === "ACTIVE"
        ) {
          item.state = "SUPERSEDED";
          item.version += 1;
          item.updatedAt = patch.updatedAt ?? current.updatedAt;
        }
      }
    }
    const merged: SeatingV2LayoutBinding = {
      ...current,
      ...patch,
      id: current.id,
      organisationId: current.organisationId,
      eventId: current.eventId,
      version: expectedVersion + 1,
    };
    if (merged.state === "ACTIVE") {
      const actives = rows.filter(
        (item) =>
          item.organisationId === scope.organisationId &&
          item.eventId === scope.eventId &&
          item.state === "ACTIVE" &&
          item.id !== id,
      );
      if (actives.length > 0) {
        throw new PlatformError("MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS", "multiple active seating layout bindings", {
          publicMessage:
            "More than one seating layout binding is active for this event. Resolve the binding before freezing seating inputs.",
        });
      }
    }
    rows[index] = structuredClone(merged);
    return structuredClone(merged);
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    this.store.audit.push(structuredClone(record));
  }

  async executeSql<T extends Record<string, unknown> = Record<string, unknown>>(
    _sql: string,
    _params: unknown[] = [],
  ): Promise<{ rows: T[]; rowCount: number }> {
    throw new PlatformError("CAPABILITY_NOT_ENABLED", "durable CP-SAT evaluation requires PostgreSQL", {
      publicMessage: "Seating evaluation persistence requires PostgreSQL.",
    });
  }

  async getIdempotency(scope: SeatingV2Scope, action: string, key: string): Promise<SeatingV2IdempotencyReceipt | undefined> {
    return this.store.collection("idempotencyReceipts").find(
      (item) =>
        item.organisationId === scope.organisationId &&
        item.eventId === scope.eventId &&
        item.action === action &&
        item.idempotencyKey === key,
    );
  }

  async findIdempotencyByActionKey(
    organisationId: string,
    action: string,
    key: string,
  ): Promise<SeatingV2IdempotencyReceipt | undefined> {
    return this.store.collection("idempotencyReceipts").find(
      (item) => item.organisationId === organisationId && item.action === action && item.idempotencyKey === key,
    );
  }

  async insertIdempotency(receipt: SeatingV2IdempotencyReceipt): Promise<SeatingV2IdempotencyReceipt> {
    const existing = await this.getIdempotency(
      { organisationId: receipt.organisationId, eventId: receipt.eventId },
      receipt.action,
      receipt.idempotencyKey,
    );
    if (existing) {
      if (existing.requestHash !== receipt.requestHash || existing.resultIdentity !== receipt.resultIdentity) {
        throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
      }
      return existing;
    }
    this.store.collection("idempotencyReceipts").push(structuredClone(receipt));
    return receipt;
  }

  async lockEventCurrent(scope: SeatingV2Scope, _lock?: SeatingV2Lock): Promise<SeatingV2EventCurrent | undefined> {
    // SELECT ... FROM seating_v2_event_current WHERE organisation_id = $1 AND event_id = $2 FOR UPDATE
    const hit = this.store
      .collection("eventCurrent")
      .find((item) => item.organisationId === scope.organisationId && item.eventId === scope.eventId);
    return hit ? structuredClone(hit) : undefined;
  }

  async lockOccupiedRunPosition(
    scope: SeatingV2Scope,
    runId: string,
    positionToken: string,
    _lock?: SeatingV2Lock,
  ): Promise<SeatingV2RunAssignment | undefined> {
    // SELECT ... FROM seating_v2_run_assignments WHERE run_id = $1 AND position_token = $2 FOR UPDATE
    const hit = this.store.collection("runAssignments").find(
      (item) =>
        item.runId === runId &&
        item.positionToken === positionToken &&
        item.state === "SEATED" &&
        assertSeatingV2Scope(item, scope, "runAssignments"),
    );
    return hit ? structuredClone(hit) : undefined;
  }

  async lockOccupiedPlanPosition(
    scope: SeatingV2Scope,
    planEditionId: string,
    logicalPositionId: string,
    _lock?: SeatingV2Lock,
  ): Promise<SeatingV2PlanAssignment | undefined> {
    // SELECT ... FROM seating_v2_plan_assignments WHERE plan_edition_id = $1 AND logical_position_id = $2 FOR UPDATE
    const hit = this.store.collection("planAssignments").find(
      (item) =>
        item.planEditionId === planEditionId &&
        item.logicalPositionId === logicalPositionId &&
        item.state === "SEATED" &&
        assertSeatingV2Scope(item, scope, "planAssignments"),
    );
    return hit ? structuredClone(hit) : undefined;
  }

  async purgeFixtureRecords(
    scope: SeatingV2Scope,
    ids: Partial<Record<SeatingV2Collection, string[]>>,
    confirmation: "CONFIRM_SEATING_V2_SYNTHETIC_PURGE",
  ): Promise<number> {
    if (confirmation !== SEATING_V2_PURGE_CONFIRMATION) {
      throw new PlatformError("VALIDATION_FAILED", "seating v2 purge requires an explicit confirmed command");
    }
    let removed = 0;
    for (const collection of SEATING_V2_COLLECTIONS) {
      const allow = ids[collection];
      if (!allow?.length) continue;
      const rows = this.store.collection(collection) as Identified[];
      const kept = rows.filter((item) => {
        const id = rowIdentity(item);
        if (!id || !allow.includes(id)) return true;
        if (!assertSeatingV2Scope(item, scope, collection)) return true;
        removed += 1;
        return false;
      });
      (this.store.collection(collection) as Identified[]).splice(0, rows.length, ...kept);
    }
    return removed;
  }

  snapshot(): SeatingV2State {
    return this.store.snapshot();
  }

  private assertInsertInvariants(collection: SeatingV2Collection, next: Identified, rows: Identified[]): void {
    if (collection === "layoutBindings" && next.state === "ACTIVE") {
      if (
        rows.some(
          (item) =>
            item.organisationId === next.organisationId &&
            item.eventId === next.eventId &&
            item.state === "ACTIVE",
        )
      ) {
        throw new PlatformError("MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS", "multiple active seating layout bindings", {
          publicMessage:
            "More than one seating layout binding is active for this event. Resolve the binding before freezing seating inputs.",
        });
      }
    }
    if (collection === "eventCurrent") {
      if (
        rows.some(
          (item) => item.organisationId === next.organisationId && item.eventId === next.eventId,
        )
      ) {
        throw new PlatformError("VALIDATION_FAILED", "duplicate seating v2 event current insert");
      }
    }
    if (collection === "compiledRequests" && next.packageId) {
      if (rows.some((item) => item.packageId === next.packageId)) {
        throw new PlatformError("VALIDATION_FAILED", "duplicate seating v2 compiled request for package");
      }
    }
    if (collection === "packageGuests") {
      if (rows.some((item) => item.packageId === next.packageId && item.eventGuestId === next.eventGuestId)) {
        throw new PlatformError("VALIDATION_FAILED", "duplicate guest per seating v2 package");
      }
      if (rows.some((item) => item.packageId === next.packageId && item.solverToken === next.solverToken)) {
        throw new PlatformError("VALIDATION_FAILED", "duplicate solver token per seating v2 package");
      }
    }
    if (
      collection === "runAssignments" &&
      next.state === "SEATED" &&
      next.positionToken &&
      rows.some(
        (item) => item.runId === next.runId && item.positionToken === next.positionToken && item.state === "SEATED",
      )
    ) {
      throw new PlatformError("VALIDATION_FAILED", "occupied seating v2 run position");
    }
    if (
      collection === "planAssignments" &&
      next.state === "SEATED" &&
      next.logicalPositionId &&
      rows.some(
        (item) =>
          item.planEditionId === next.planEditionId &&
          item.logicalPositionId === next.logicalPositionId &&
          item.state === "SEATED",
      )
    ) {
      throw new PlatformError("VALIDATION_FAILED", "occupied seating v2 plan position");
    }
    if (collection === "runs" && ["FEASIBLE", "INFEASIBLE", "QUEUED", "RUNNING"].includes(String(next.status))) {
      const replayKey = (item: Identified) =>
        [
          item.organisationId,
          item.eventId,
          (item as { packageHash?: string }).packageHash,
          (item as { semanticHash?: string }).semanticHash,
          (item as { compiledRequestHash?: string }).compiledRequestHash,
          (item as { compilerVersion?: string }).compilerVersion,
          (item as { solverVersion?: string }).solverVersion,
          (item as { solverConfigHash?: string }).solverConfigHash,
          (item as { validatorVersion?: string }).validatorVersion,
          (item as { deterministicSeed?: string }).deterministicSeed,
        ].join("|");
      if (
        rows.some(
          (item) =>
            ["FEASIBLE", "INFEASIBLE", "QUEUED", "RUNNING"].includes(String(item.status)) && replayKey(item) === replayKey(next),
        )
      ) {
        throw new PlatformError("VALIDATION_FAILED", "duplicate seating v2 reusable run identity");
      }
    }
  }
}

export class MemorySeatingV2Repository implements SeatingV2Repository {
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly store = new MemorySeatingV2Store()) {}

  get backingStore(): MemorySeatingV2Store {
    return this.store;
  }

  async transaction<T>(fn: (tx: SeatingV2Transaction) => Promise<T>): Promise<T> {
    return withSettlementTransaction("seating-v2-memory", async () => {
      let release!: () => void;
      const previous = this.chain;
      this.chain = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      const working = new MemorySeatingV2Store();
      working.replaceState(this.store.snapshot());
      working.replaceAudit(this.store.audit);
      try {
        const result = await fn(new MemorySeatingV2Transaction(working));
        this.store.replaceState(working.snapshot());
        this.store.replaceAudit(working.audit);
        return result;
      } finally {
        release();
      }
    });
  }

  async projectEvent(_actor: SeatingV2ActorContext, eventId: string): Promise<SeatingV2EventProjection> {
    const current = this.store.collection("eventCurrent").find((item) => item.eventId === eventId);
    const publication = current?.currentPublicationId
      ? this.store.collection("publications").find((item) => item.id === current.currentPublicationId)
      : this.store.collection("publications").find((item) => item.eventId === eventId && item.status === "CURRENT");
    return {
      eventId,
      organisationId: current?.organisationId ?? publication?.organisationId ?? "",
      workingEditionId: current?.workingEditionId ?? undefined,
      submittedEditionId: current?.submittedEditionId ?? undefined,
      currentPublicationId: current?.currentPublicationId ?? publication?.id,
      version: current?.version,
    };
  }
}
