import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import {
  emptyRiskState,
  extractRiskState,
  overlayRiskState,
  RISK_STORE_COLLECTIONS,
  type RiskIdempotencyRecord,
  type RiskProtectionState,
  type RiskProtectionStore,
  type RiskStoreCollection,
} from "./risk-store.js";
import { writeRiskSnapshotDelta, type RiskAggregateKind, type RiskProtectionRepository, type RiskSafePatch, type RiskScope, type RiskTransaction, type RiskVersionedRecord } from "./risk-repository.js";
import { EOS_S05B_PROTECTION_V2_ID } from "./risk-postgres-schema.js";
import type { PlatformSnapshot } from "./store.js";

type Versioned = { id: string; version: number; organisationId?: string };

export class MemoryRiskProtectionStore implements RiskProtectionStore {
  private state: RiskProtectionState = emptyRiskState();
  private idempotency: RiskIdempotencyRecord[] = [];

  static fromSnapshot(snap: PlatformSnapshot): MemoryRiskProtectionStore {
    const store = new MemoryRiskProtectionStore();
    store.state = extractRiskState(snap);
    return store;
  }

  loadOrganisation(organisationId: string): RiskProtectionState {
    return extractRiskState(this.asSnapshot(), organisationId);
  }

  overlayOnto(snap: PlatformSnapshot, organisationId?: string): void {
    overlayRiskState(snap, organisationId ? this.loadOrganisation(organisationId) : this.state, organisationId);
  }

  persistFromSnapshot(previous: PlatformSnapshot, next: PlatformSnapshot, organisationId?: string): void {
    void previous;
    for (const collection of RISK_STORE_COLLECTIONS) {
      const existing = ((this.state[collection] as Versioned[]) ?? []).slice();
      const nextRows = ((next[collection as keyof PlatformSnapshot] as Versioned[] | undefined) ?? []).filter(
        (item) => !organisationId || item.organisationId === organisationId,
      );
      const byId = new Map(existing.map((item) => [item.id, item]));
      for (const row of nextRows) byId.set(row.id, row);
      (this.state[collection] as Versioned[]) = [...byId.values()];
    }
  }

  getIdempotency(organisationId: string, action: string, key: string): RiskIdempotencyRecord | undefined {
    return this.idempotency.find(
      (item) => item.organisationId === organisationId && item.action === action && item.idempotencyKey === key,
    );
  }

  putIdempotency(record: RiskIdempotencyRecord): void {
    if (this.getIdempotency(record.organisationId, record.action, record.idempotencyKey)) {
      throw new PlatformError("IDEMPOTENCY_CONFLICT", "duplicate risk idempotency receipt");
    }
    this.idempotency.push(record);
  }

  normalizedAuthority(): boolean {
    return this.state.s05bMigrationReceipts.some((item) => item.migrationId === EOS_S05B_PROTECTION_V2_ID && item.status === "APPLIED");
  }

  asSnapshot(): PlatformSnapshot {
    return { ...(emptyRiskState() as unknown as PlatformSnapshot), ...this.state } as PlatformSnapshot;
  }

  replaceState(state: RiskProtectionState): void {
    this.state = structuredClone(state);
  }

  snapshotIdempotency(): RiskIdempotencyRecord[] {
    return structuredClone(this.idempotency);
  }

  replaceIdempotency(records: RiskIdempotencyRecord[]): void {
    this.idempotency = structuredClone(records);
  }

  collection<K extends RiskStoreCollection>(name: K): RiskProtectionState[K] {
    return this.state[name];
  }
}

export class MemoryRiskTransaction implements RiskTransaction {
  constructor(
    private readonly store: MemoryRiskProtectionStore,
    private readonly audit: AuditEvent[] = [],
  ) {}

  async loadAggregate<T>(kind: RiskAggregateKind, id: string, scope: RiskScope): Promise<T | undefined> {
    const rows = this.store.collection(kind as RiskStoreCollection) as Array<{ id: string; organisationId?: string; eventId?: string }>;
    const hit = rows.find((item) => item.id === id);
    if (!hit) return undefined;
    if (hit.organisationId && hit.organisationId !== scope.organisationId) return undefined;
    if (scope.eventId && hit.eventId && hit.eventId !== scope.eventId) return undefined;
    return hit as T;
  }

  async insertImmutable(kind: RiskAggregateKind, record: RiskVersionedRecord): Promise<void> {
    const rows = this.store.collection(kind as RiskStoreCollection) as RiskVersionedRecord[];
    if (rows.some((item) => item.id === record.id)) {
      throw new PlatformError("VALIDATION_FAILED", "duplicate immutable risk insert");
    }
    if (record.current === true) {
      for (const item of rows) {
        if (item.current === true && item.id !== record.id) item.current = false;
      }
    }
    rows.push(structuredClone(record));
  }

  async updateVersioned(kind: RiskAggregateKind, id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void> {
    const rows = this.store.collection(kind as RiskStoreCollection) as RiskVersionedRecord[];
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0 || Number(rows[index]?.version) !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
        publicMessage: "This record changed while you were editing. Reload before saving.",
      });
    }
    rows[index] = structuredClone({ ...rows[index], ...patch, id }) as RiskVersionedRecord;
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    this.audit.push(structuredClone(record));
  }

  async getIdempotency(scope: RiskScope, action: string, key: string): Promise<RiskIdempotencyRecord | undefined> {
    return this.store.getIdempotency(scope.organisationId, action, key);
  }

  async insertIdempotency(receipt: RiskIdempotencyRecord): Promise<RiskIdempotencyRecord> {
    const existing = this.store.getIdempotency(receipt.organisationId, receipt.action, receipt.idempotencyKey);
    if (existing) {
      if (existing.hash !== receipt.hash || existing.resultRef !== receipt.resultRef) {
        throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
      }
      return existing;
    }
    this.store.putIdempotency(receipt);
    return receipt;
  }
}

export class MemoryRiskProtectionRepository implements RiskProtectionRepository {
  constructor(
    private readonly store: MemoryRiskProtectionStore,
    readonly audit: AuditEvent[] = [],
  ) {}

  async transaction<T>(work: (tx: RiskTransaction) => Promise<T>): Promise<T> {
    const before = structuredClone(this.store.asSnapshot());
    const beforeIdem = this.store.snapshotIdempotency();
    const beforeAudit = structuredClone(this.audit);
    try {
      return await work(new MemoryRiskTransaction(this.store, this.audit));
    } catch (error) {
      this.store.replaceState(extractRiskState(before));
      this.store.replaceIdempotency(beforeIdem);
      this.audit.splice(0, this.audit.length, ...beforeAudit);
      throw error;
    }
  }
}

export async function applyMemoryRiskSnapshot(store: MemoryRiskProtectionStore, previous: PlatformSnapshot, next: PlatformSnapshot): Promise<void> {
  await writeRiskSnapshotDelta(new MemoryRiskTransaction(store), previous, next);
}
