import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import {
  assertSeatingScope,
  cloneSeatingState,
  seatingRowId,
  type ActorContextLike,
  type SeatingPublicationProjection,
  type SeatingRepository,
  type SeatingRunProjection,
  type SeatingScope,
  type SeatingTransaction,
  type SeatingWorkspaceProjection,
} from "./seating-repository.js";
import {
  emptySeatingState,
  SEATING_COLLECTIONS,
  type SeatingCollection,
  type SeatingIdempotencyReceipt,
  type SeatingState,
} from "./seating-schemas.js";

type Identified = { id?: string; organisationId?: string; eventId?: string; version?: number; current?: boolean; currentWorking?: boolean; status?: string };

export class MemorySeatingStore {
  private state: SeatingState = emptySeatingState();
  readonly audit: AuditEvent[] = [];

  snapshot(): SeatingState {
    return cloneSeatingState(this.state);
  }

  replaceState(state: SeatingState): void {
    this.state = cloneSeatingState(state);
  }

  collection<K extends SeatingCollection>(name: K): SeatingState[K] {
    return this.state[name];
  }
}

export class MemorySeatingTransaction implements SeatingTransaction {
  constructor(private readonly store: MemorySeatingStore) {}

  async load<T>(collection: SeatingCollection, id: string, scope: SeatingScope): Promise<T | undefined> {
    const hit = (this.store.collection(collection) as Identified[]).find((item) => item.id === id);
    if (!hit || !assertSeatingScope(hit, scope)) return undefined;
    return structuredClone(hit) as T;
  }

  async list<T>(collection: SeatingCollection, scope: Partial<SeatingScope>): Promise<T[]> {
    return (this.store.collection(collection) as Identified[])
      .filter((item) => assertSeatingScope(item, scope))
      .map((item) => structuredClone(item) as T);
  }

  async insert<T extends { id?: string; organisationId?: string }>(collection: SeatingCollection, record: T): Promise<T> {
    const rows = this.store.collection(collection) as Identified[];
    const id = seatingRowId(record);
    if (rows.some((item) => item.id === id)) {
      throw new PlatformError("VALIDATION_FAILED", `duplicate seating ${collection} insert`);
    }
    const next = structuredClone(record) as Identified;
    if (next.current === true) {
      for (const item of rows) {
        if (item.current === true && item.eventId === next.eventId && item.organisationId === next.organisationId) {
          item.current = false;
        }
      }
    }
    if (next.currentWorking === true) {
      for (const item of rows) {
        if (item.currentWorking === true && item.eventId === next.eventId && item.organisationId === next.organisationId) {
          item.currentWorking = false;
        }
      }
    }
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

  async updateVersioned<T extends { id: string; version: number }>(
    collection: SeatingCollection,
    id: string,
    expectedVersion: number,
    patch: Record<string, unknown> & { version: number },
  ): Promise<T> {
    const rows = this.store.collection(collection) as Identified[];
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0 || Number(rows[index]?.version) !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating write was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    if (patch.version !== expectedVersion + 1) {
      throw new PlatformError("VALIDATION_FAILED", "row versions increment exactly once per successful mutation");
    }
    const merged = { ...rows[index], ...patch, id } as Identified;
    rows[index] = structuredClone(merged);
    return structuredClone(merged) as T;
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    this.store.audit.push(structuredClone(record));
  }

  async getIdempotency(scope: SeatingScope, action: string, key: string): Promise<SeatingIdempotencyReceipt | undefined> {
    return this.store.collection("idempotencyReceipts").find(
      (item) =>
        item.organisationId === scope.organisationId &&
        item.eventId === scope.eventId &&
        item.action === action &&
        item.idempotencyKey === key,
    );
  }

  async insertIdempotency(receipt: SeatingIdempotencyReceipt): Promise<SeatingIdempotencyReceipt> {
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

  async purgeFixtureRecords(scope: SeatingScope, ids: Partial<Record<SeatingCollection, string[]>>): Promise<number> {
    let removed = 0;
    for (const collection of SEATING_COLLECTIONS) {
      const allow = ids[collection];
      if (!allow?.length) continue;
      const rows = this.store.collection(collection) as Identified[];
      const kept = rows.filter((item) => {
        if (!allow.includes(String(item.id))) return true;
        if (!assertSeatingScope(item, scope)) return true;
        removed += 1;
        return false;
      });
      (this.store.collection(collection) as Identified[]).splice(0, rows.length, ...kept);
    }
    return removed;
  }

  snapshot(): SeatingState {
    return this.store.snapshot();
  }
}

export class MemorySeatingRepository implements SeatingRepository {
  constructor(private readonly store = new MemorySeatingStore()) {}

  get backingStore(): MemorySeatingStore {
    return this.store;
  }

  async transaction<T>(fn: (tx: SeatingTransaction) => Promise<T>): Promise<T> {
    const before = this.store.snapshot();
    const beforeAudit = structuredClone(this.store.audit);
    try {
      return await fn(new MemorySeatingTransaction(this.store));
    } catch (error) {
      this.store.replaceState(before);
      this.store.audit.splice(0, this.store.audit.length, ...beforeAudit);
      throw error;
    }
  }

  async projectEventSeating(_actor: ActorContextLike, eventId: string): Promise<SeatingWorkspaceProjection> {
    const state = this.store.snapshot();
    const publication = state.publications.find((item) => item.eventId === eventId && item.status === "CURRENT");
    const working = state.planEditions.find((item) => item.eventId === eventId && item.currentWorking);
    const input = state.inputEditions.find((item) => item.eventId === eventId && item.current);
    const assignments = working ? state.planAssignments.filter((item) => item.editionId === working.id) : [];
    return {
      eventId,
      organisationId: publication?.organisationId ?? working?.organisationId ?? input?.organisationId ?? "",
      currentPublication: publication,
      workingEdition: working,
      inputEdition: input,
      blockers: state.findings
        .filter((item) => item.eventId === eventId && item.severity === "BLOCKER" && item.state === "OPEN")
        .map((item) => ({ code: item.code, message: item.code })),
      counts: {
        eligibleGuests: state.guestTokens.filter((item) => item.eventId === eventId && item.eligible).length,
        seated: assignments.filter((item) => item.state === "SEATED").length,
        unseated: assignments.filter((item) => item.state === "UNSEATED").length,
        hardBlockers: state.findings.filter((item) => item.eventId === eventId && item.severity === "BLOCKER").length,
      },
      state,
    };
  }

  async getRun(_actor: ActorContextLike, eventId: string, runId: string): Promise<SeatingRunProjection> {
    const run = this.store.collection("runs").find((item) => item.id === runId && item.eventId === eventId);
    if (!run) throw new PlatformError("NOT_FOUND", "seating run was not found");
    return { ...run, assignments: this.store.collection("runAssignments").filter((item) => item.runId === runId) };
  }

  async getPublication(_actor: ActorContextLike, eventId: string, publicationId: string): Promise<SeatingPublicationProjection> {
    const publication = this.store.collection("publications").find((item) => item.id === publicationId && item.eventId === eventId);
    if (!publication) throw new PlatformError("NOT_FOUND", "seating publication was not found");
    return { ...publication };
  }
}
