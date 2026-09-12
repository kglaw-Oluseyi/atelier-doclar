import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import {
  assertSeatingV2Scope,
  cloneSeatingV2State,
  seatingV2RowId,
  type SeatingV2ActorContext,
  type SeatingV2CurrentPatch,
  type SeatingV2EventProjection,
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
    if (!hit || !assertSeatingV2Scope(hit, scope)) return undefined;
    return structuredClone(hit) as T;
  }

  async list<T>(collection: SeatingV2Collection, scope: Partial<SeatingV2Scope>): Promise<T[]> {
    return (this.store.collection(collection) as Identified[])
      .filter((item) => assertSeatingV2Scope(item, scope))
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

  async appendAudit(record: AuditEvent): Promise<void> {
    this.store.audit.push(structuredClone(record));
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
        assertSeatingV2Scope(item, scope),
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
        assertSeatingV2Scope(item, scope),
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
        if (!assertSeatingV2Scope(item, scope)) return true;
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
  }
}

export class MemorySeatingV2Repository implements SeatingV2Repository {
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly store = new MemorySeatingV2Store()) {}

  get backingStore(): MemorySeatingV2Store {
    return this.store;
  }

  async transaction<T>(fn: (tx: SeatingV2Transaction) => Promise<T>): Promise<T> {
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
