import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import type { PgQueryable, PgTransactor } from "./postgres-schema.js";
import { EOS_S05B_PROTECTION_V2_ID, RISK_SQL_TABLES } from "./risk-postgres-schema.js";
import {
  tableForRiskKind,
  writeRiskSnapshotDelta,
  type RiskAggregateKind,
  type RiskProtectionRepository,
  type RiskSafePatch,
  type RiskScope,
  type RiskTransaction,
  type RiskVersionedRecord,
} from "./risk-repository.js";
import { emptyRiskState, type RiskIdempotencyRecord, type RiskProtectionState, type RiskProtectionStore } from "./risk-store.js";
import type { PlatformSnapshot } from "./store.js";

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

function columns(record: Record<string, unknown>) {
  const status = record.status ?? record.state ?? record.verificationState;
  const parent = record.policyId ?? record.planId ?? record.incidentId ?? record.dossierId ?? record.runId ?? record.templateId ?? record.supersedesEditionId;
  const submitted = record.submittedByPersonId ?? record.createdByPersonId ?? record.reportedByPersonId ?? record.uploadedByPersonId ?? record.recordedByPersonId;
  const approved = record.approvedByPersonId ?? record.verifiedByPersonId ?? record.authorisedByPersonId ?? record.publishedByPersonId;
  return {
    id: String(record.id),
    organisation_id: record.organisationId ? String(record.organisationId) : "",
    event_id: record.eventId ? String(record.eventId) : null,
    version: Number(record.version ?? 1),
    current: typeof record.current === "boolean" ? record.current : null,
    status: status ? String(status) : null,
    parent_id: parent ? String(parent) : null,
    content_hash: record.contentHash ? String(record.contentHash) : null,
    submitted_by_person_id: submitted ? String(submitted) : null,
    approved_by_person_id: approved ? String(approved) : null,
    body: JSON.stringify(record),
    created_at: String(record.createdAt ?? new Date().toISOString()),
    updated_at: String(record.updatedAt ?? record.createdAt ?? new Date().toISOString()),
  };
}

export class PostgresRiskProtectionStore implements RiskProtectionStore {
  constructor(private readonly client: PgQueryable) {}

  async loadAll(): Promise<RiskProtectionState> {
    const state = emptyRiskState();
    for (const mapping of RISK_SQL_TABLES) {
      const result = await this.client.query<{ body: unknown }>(`SELECT body FROM ${mapping.table}`);
      const rows = result.rows.map((row) => (typeof row.body === "string" ? JSON.parse(row.body) : row.body));
      (state as unknown as Record<string, unknown[]>)[mapping.collection] = rows;
    }
    return state;
  }

  loadOrganisation(_organisationId: string): RiskProtectionState {
    throw new PlatformError("VALIDATION_FAILED", "postgres risk store loadOrganisation is async; use loadOrganisationAsync");
  }

  async loadOrganisationAsync(organisationId: string): Promise<RiskProtectionState> {
    const state = emptyRiskState();
    for (const mapping of RISK_SQL_TABLES) {
      const result = await this.client.query<{ body: unknown }>(
        `SELECT body FROM ${mapping.table} WHERE organisation_id = $1 OR organisation_id = ''`,
        [organisationId],
      );
      const rows = result.rows
        .map((row) => (typeof row.body === "string" ? JSON.parse(row.body) : row.body) as { organisationId?: string })
        .filter((item) => !item.organisationId || item.organisationId === organisationId);
      (state as unknown as Record<string, unknown[]>)[mapping.collection] = rows;
    }
    return state;
  }

  persistFromSnapshot(_previous: PlatformSnapshot, _next: PlatformSnapshot, _organisationId?: string): void {
    throw new PlatformError("VALIDATION_FAILED", "postgres risk store persistFromSnapshot is async; use persistFromSnapshotAsync");
  }

  async persistFromSnapshotAsync(previous: PlatformSnapshot, next: PlatformSnapshot, organisationId?: string): Promise<void> {
    const tx = new PostgresRiskTransaction(this.client);
    await writeRiskSnapshotDelta(tx, previous, next, organisationId);
  }

  getIdempotency(organisationId: string, action: string, key: string): RiskIdempotencyRecord | undefined {
    void organisationId;
    void action;
    void key;
    return undefined;
  }

  async getIdempotencyAsync(organisationId: string, action: string, key: string): Promise<RiskIdempotencyRecord | undefined> {
    const result = await this.client.query<RiskIdempotencyRecord>(
      "SELECT organisation_id AS \"organisationId\", action, idempotency_key AS \"idempotencyKey\", result_ref AS \"resultRef\", hash, created_at AS \"createdAt\" FROM risk_idempotency_receipts WHERE organisation_id=$1 AND action=$2 AND idempotency_key=$3",
      [organisationId, action, key],
    );
    return result.rows[0];
  }

  putIdempotency(_record: RiskIdempotencyRecord): void {
    throw new PlatformError("VALIDATION_FAILED", "risk idempotency must be inserted inside RiskProtectionRepository.transaction");
  }

  async putIdempotencyAsync(record: RiskIdempotencyRecord): Promise<void> {
    await this.client.query(
      "INSERT INTO risk_idempotency_receipts (organisation_id, action, idempotency_key, result_ref, hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
      [record.organisationId, record.action, record.idempotencyKey, record.resultRef, record.hash, record.createdAt],
    );
  }

  normalizedAuthority(): boolean {
    return true;
  }

  async normalizedAuthorityAsync(): Promise<boolean> {
    const result = await this.client.query<{ body: unknown }>(
      "SELECT body FROM risk_migration_receipts WHERE status = 'APPLIED'",
    );
    return result.rows.some((row) => {
      const body = typeof row.body === "string" ? JSON.parse(row.body) : row.body;
      return (body as { migrationId?: string }).migrationId === EOS_S05B_PROTECTION_V2_ID;
    });
  }
}

export class PostgresRiskTransaction implements RiskTransaction {
  constructor(private readonly client: PgQueryable) {}

  async loadAggregate<T>(kind: RiskAggregateKind, id: string, scope: RiskScope): Promise<T | undefined> {
    const table = tableForRiskKind(kind);
    const result = await this.client.query<{ body: unknown }>(`SELECT body FROM ${table} WHERE id = $1`, [id]);
    const row = result.rows[0];
    if (!row) return undefined;
    const body = (typeof row.body === "string" ? JSON.parse(row.body) : row.body) as T & { organisationId?: string; eventId?: string };
    if (body.organisationId && body.organisationId !== scope.organisationId) return undefined;
    if (scope.eventId && body.eventId && body.eventId !== scope.eventId) return undefined;
    return body;
  }

  async insertImmutable(kind: RiskAggregateKind, record: RiskVersionedRecord): Promise<void> {
    const table = tableForRiskKind(kind);
    const cols = columns(record);
    if (cols.current === true) {
      if (cols.parent_id) {
        await this.client.query(`UPDATE ${table} SET current = FALSE WHERE parent_id = $1 AND id <> $2 AND current IS TRUE`, [
          cols.parent_id,
          cols.id,
        ]);
      } else if (cols.event_id) {
        await this.client.query(`UPDATE ${table} SET current = FALSE WHERE event_id = $1 AND id <> $2 AND current IS TRUE`, [
          cols.event_id,
          cols.id,
        ]);
      }
    }
    await this.client.query(
      `INSERT INTO ${table} (id, organisation_id, event_id, version, current, status, parent_id, content_hash, submitted_by_person_id, approved_by_person_id, body, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)`,
      [
        cols.id,
        cols.organisation_id,
        cols.event_id,
        cols.version,
        cols.current,
        cols.status,
        cols.parent_id,
        cols.content_hash,
        cols.submitted_by_person_id,
        cols.approved_by_person_id,
        cols.body,
        cols.created_at,
        cols.updated_at,
      ],
    );
  }

  async updateVersioned(kind: RiskAggregateKind, id: string, expectedVersion: number, patch: RiskSafePatch): Promise<void> {
    const table = tableForRiskKind(kind);
    const cols = columns({ ...patch, id });
    if (cols.current === true) {
      if (cols.parent_id) {
        await this.client.query(`UPDATE ${table} SET current = FALSE WHERE parent_id = $1 AND id <> $2 AND current IS TRUE`, [
          cols.parent_id,
          cols.id,
        ]);
      } else if (cols.event_id) {
        await this.client.query(`UPDATE ${table} SET current = FALSE WHERE event_id = $1 AND id <> $2 AND current IS TRUE`, [
          cols.event_id,
          cols.id,
        ]);
      }
    }
    const updated = await this.client.query(
      `UPDATE ${table} SET organisation_id=$3, event_id=$4, version=$5, current=$6, status=$7, parent_id=$8, content_hash=$9, submitted_by_person_id=$10, approved_by_person_id=$11, body=$12::jsonb, updated_at=$13 WHERE id=$1 AND version=$2`,
      [
        cols.id,
        expectedVersion,
        cols.organisation_id,
        cols.event_id,
        cols.version,
        cols.current,
        cols.status,
        cols.parent_id,
        cols.content_hash,
        cols.submitted_by_person_id,
        cols.approved_by_person_id,
        cols.body,
        cols.updated_at,
      ],
    );
    if (!updated.rowCount) {
      throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
        publicMessage: "This record changed while you were editing. Reload before saving.",
      });
    }
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    await this.client.query(
      "INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
      [
        record.id,
        record.occurredAt,
        record.organisationId ?? null,
        record.clientId ?? null,
        record.eventId ?? null,
        record.action,
        record.outcome,
        JSON.stringify(record),
      ],
    );
  }

  async getIdempotency(scope: RiskScope, action: string, key: string): Promise<RiskIdempotencyRecord | undefined> {
    const result = await this.client.query<RiskIdempotencyRecord>(
      "SELECT organisation_id AS \"organisationId\", action, idempotency_key AS \"idempotencyKey\", result_ref AS \"resultRef\", hash, created_at AS \"createdAt\" FROM risk_idempotency_receipts WHERE organisation_id=$1 AND action=$2 AND idempotency_key=$3",
      [scope.organisationId, action, key],
    );
    return result.rows[0];
  }

  async insertIdempotency(receipt: RiskIdempotencyRecord): Promise<RiskIdempotencyRecord> {
    const existing = await this.getIdempotency(
      { organisationId: receipt.organisationId },
      receipt.action,
      receipt.idempotencyKey,
    );
    if (existing) {
      if (existing.hash !== receipt.hash || existing.resultRef !== receipt.resultRef) {
        throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
      }
      return existing;
    }
    try {
      await this.client.query(
        "INSERT INTO risk_idempotency_receipts (organisation_id, action, idempotency_key, result_ref, hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [receipt.organisationId, receipt.action, receipt.idempotencyKey, receipt.resultRef, receipt.hash, receipt.createdAt],
      );
      return receipt;
    } catch (error) {
      const raced = await this.getIdempotency(
        { organisationId: receipt.organisationId },
        receipt.action,
        receipt.idempotencyKey,
      );
      if (raced) {
        if (raced.hash !== receipt.hash || raced.resultRef !== receipt.resultRef) {
          throw new PlatformError("IDEMPOTENCY_CONFLICT", "idempotency key was reused with a different payload");
        }
        return raced;
      }
      throw error;
    }
  }
}

export class PostgresRiskProtectionRepository implements RiskProtectionRepository {
  constructor(private readonly client: PgQueryable) {}

  async transaction<T>(work: (tx: RiskTransaction) => Promise<T>): Promise<T> {
    const run = async (queryable: PgQueryable) => work(new PostgresRiskTransaction(queryable));
    if (hasTransaction(this.client)) return this.client.transaction(run);
    return run(this.client);
  }
}
