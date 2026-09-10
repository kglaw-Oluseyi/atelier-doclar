import { PlatformError } from "./errors.js";
import {
  assertOptimisticWrite,
  emptyRiskState,
  extractRiskState,
  overlayRiskState,
  RISK_STORE_COLLECTIONS,
  type RiskIdempotencyRecord,
  type RiskProtectionState,
  type RiskProtectionStore,
  type RiskStoreCollection,
} from "./risk-store.js";
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
    for (const collection of RISK_STORE_COLLECTIONS) {
      const prevRows = ((previous[collection as keyof PlatformSnapshot] as Versioned[] | undefined) ?? []).filter(
        (item) => !organisationId || item.organisationId === organisationId,
      );
      const nextRows = ((next[collection as keyof PlatformSnapshot] as Versioned[] | undefined) ?? []).filter(
        (item) => !organisationId || item.organisationId === organisationId,
      );
      const prevById = new Map(prevRows.map((item) => [item.id, item]));
      const nextById = new Map(nextRows.map((item) => [item.id, item]));
      for (const row of nextRows) {
        const existed = prevById.get(row.id);
        if (existed) assertOptimisticWrite(existed, row);
      }
      const retained = ((this.state[collection] as Versioned[]) ?? []).filter(
        (item) => (organisationId && item.organisationId && item.organisationId !== organisationId) || nextById.has(item.id) === false && organisationId && item.organisationId !== organisationId,
      );
      const keptOtherOrgs = ((this.state[collection] as Versioned[]) ?? []).filter(
        (item) => organisationId && item.organisationId && item.organisationId !== organisationId,
      );
      (this.state[collection] as Versioned[]) = [...keptOtherOrgs, ...nextRows];
      void retained;
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

  collection<K extends RiskStoreCollection>(name: K): RiskProtectionState[K] {
    return this.state[name];
  }
}
