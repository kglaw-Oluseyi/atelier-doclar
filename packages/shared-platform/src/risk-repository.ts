import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import { RISK_SQL_TABLES, type RiskSqlCollection } from "./risk-postgres-schema.js";
import type { RiskIdempotencyRecord } from "./risk-store.js";
import type { PlatformSnapshot } from "./store.js";

export type RiskAggregateKind = RiskSqlCollection;

export type RiskScope = {
  organisationId: string;
  eventId?: string;
};

export type RiskVersionedRecord = {
  id: string;
  version: number;
  organisationId?: string;
  eventId?: string;
  current?: boolean;
  status?: string;
  [key: string]: unknown;
};

export type RiskSafePatch = Record<string, unknown>;

export type RiskLock = "FOR_UPDATE";

export type PlatformIdempotencyRecord = {
  key: string;
  action: string;
  hash: string;
  resultRef: string;
  createdAt: string;
};

export interface RiskTransaction {
  loadAggregate<T>(kind: RiskAggregateKind, id: string, scope: RiskScope, lock?: RiskLock): Promise<T | undefined>;
  listAggregates<T>(kind: RiskAggregateKind, scope: RiskScope): Promise<T[]>;
  insertImmutable(kind: RiskAggregateKind, record: RiskVersionedRecord): Promise<void>;
  updateVersioned(kind: RiskAggregateKind, id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void>;
  appendAudit(record: AuditEvent): Promise<void>;
  getIdempotency(scope: RiskScope, action: string, key: string): Promise<RiskIdempotencyRecord | undefined>;
  insertIdempotency(receipt: RiskIdempotencyRecord): Promise<RiskIdempotencyRecord>;
  getPlatformIdempotency(key: string): Promise<PlatformIdempotencyRecord | undefined>;
}

export interface RiskProtectionRepository {
  transaction<T>(work: (tx: RiskTransaction) => Promise<T>): Promise<T>;
}

export function tableForRiskKind(kind: RiskAggregateKind): string {
  const mapping = RISK_SQL_TABLES.find((item) => item.collection === kind);
  if (!mapping) throw new PlatformError("VALIDATION_FAILED", `unknown risk aggregate ${kind}`);
  return mapping.table;
}

export function riskWriteSet(
  previous: PlatformSnapshot,
  next: PlatformSnapshot,
  organisationId?: string,
): { inserts: Array<{ kind: RiskAggregateKind; record: RiskVersionedRecord }>; updates: Array<{ kind: RiskAggregateKind; expectedVersion: number; record: RiskVersionedRecord }> } {
  const inserts: Array<{ kind: RiskAggregateKind; record: RiskVersionedRecord }> = [];
  const updates: Array<{ kind: RiskAggregateKind; expectedVersion: number; record: RiskVersionedRecord }> = [];
  for (const mapping of RISK_SQL_TABLES) {
    const prevRows = (((previous as unknown as Record<string, RiskVersionedRecord[]>)[mapping.collection] ?? []) as RiskVersionedRecord[]).filter(
      (item) => !organisationId || item.organisationId === organisationId,
    );
    const nextRows = (((next as unknown as Record<string, RiskVersionedRecord[]>)[mapping.collection] ?? []) as RiskVersionedRecord[]).filter(
      (item) => !organisationId || item.organisationId === organisationId,
    );
    const prevById = new Map(prevRows.map((item) => [item.id, item]));
    for (const row of nextRows) {
      const existed = prevById.get(row.id);
      if (!existed) {
        inserts.push({ kind: mapping.collection, record: row });
        continue;
      }
      if (JSON.stringify(existed) === JSON.stringify(row)) continue;
      updates.push({ kind: mapping.collection, expectedVersion: existed.version, record: row });
    }
  }
  return { inserts, updates };
}

export async function writeRiskSnapshotDelta(
  tx: RiskTransaction,
  previous: PlatformSnapshot,
  next: PlatformSnapshot,
  organisationId?: string,
): Promise<void> {
  const { inserts, updates } = riskWriteSet(previous, next, organisationId);
  for (const item of inserts) await tx.insertImmutable(item.kind, item.record);
  for (const item of updates) await tx.updateVersioned(item.kind, item.record.id, item.expectedVersion, item.record);
}

export function governingEditionFingerprint(edition: {
  id: string;
  status: string;
  current: boolean;
  version: number;
  resultHash?: string;
  inputHash?: string;
  updatedAt: string;
  decidedByPersonId?: string;
  submittedByPersonId?: string;
  calculationResultId?: string;
  effectiveDrivers?: unknown;
}): Record<string, unknown> {
  return {
    id: edition.id,
    status: edition.status,
    current: edition.current,
    version: edition.version,
    resultHash: edition.resultHash,
    inputHash: edition.inputHash,
    updatedAt: edition.updatedAt,
    decidedByPersonId: edition.decidedByPersonId,
    submittedByPersonId: edition.submittedByPersonId,
    calculationResultId: edition.calculationResultId,
    effectiveDrivers: edition.effectiveDrivers,
  };
}
