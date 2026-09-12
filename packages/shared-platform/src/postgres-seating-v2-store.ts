import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import type { PgQueryable, PgTransactor } from "./postgres-schema.js";
import { seatingRecordFromRow, seatingRowFromRecord } from "./postgres-seating-store.js";
import {
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
  SEATING_V2_PURGE_CONFIRMATION,
  SEATING_V2_TABLE_FOR_COLLECTION,
  type SeatingV2Collection,
  emptySeatingV2State,
  type SeatingV2EventCurrent,
  type SeatingV2IdempotencyReceipt,
  type SeatingV2PlanAssignment,
  type SeatingV2RunAssignment,
} from "./seating-v2-state.js";

const JSON_COLUMNS = new Set([
  "compiled_request_json",
  "observations",
  "assertions",
  "counts",
]);

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

function prepareRow(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  for (const key of JSON_COLUMNS) {
    if (next[key] !== undefined && typeof next[key] !== "string") {
      next[key] = JSON.stringify(next[key]);
    }
  }
  return next;
}

export class PostgresSeatingV2Transaction implements SeatingV2Transaction {
  constructor(
    private readonly client: PgQueryable,
    private readonly auditSink: AuditEvent[] = [],
  ) {}

  async load<T>(collection: SeatingV2Collection, id: string, scope: Partial<SeatingV2Scope>): Promise<T | undefined> {
    const table = SEATING_V2_TABLE_FOR_COLLECTION[collection];
    const result =
      scope.organisationId && scope.eventId
        ? await this.client.query<Record<string, unknown>>(
            `SELECT * FROM ${table} WHERE id = $1 AND organisation_id = $2 AND event_id = $3`,
            [id, scope.organisationId, scope.eventId],
          )
        : await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? (seatingRecordFromRow(row) as T) : undefined;
  }

  async list<T>(collection: SeatingV2Collection, scope: Partial<SeatingV2Scope>): Promise<T[]> {
    const table = SEATING_V2_TABLE_FOR_COLLECTION[collection];
    const result =
      scope.organisationId && scope.eventId
        ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE organisation_id = $1 AND event_id = $2`, [
            scope.organisationId,
            scope.eventId,
          ])
        : scope.organisationId
          ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE organisation_id = $1`, [scope.organisationId])
          : scope.eventId
            ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE event_id = $1`, [scope.eventId])
            : await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table}`);
    return result.rows.map((row) => seatingRecordFromRow(row) as T);
  }

  async insert<T extends { id?: string; organisationId?: string }>(collection: SeatingV2Collection, record: T): Promise<T> {
    const table = SEATING_V2_TABLE_FOR_COLLECTION[collection];
    const row = prepareRow(seatingRowFromRecord(record as Record<string, unknown>));
    if (row.status === "CURRENT" && table === "seating_v2_publications" && row.event_id && row.organisation_id) {
      await this.client.query(
        `UPDATE ${table} SET status = $1 WHERE organisation_id = $2 AND event_id = $3 AND status = $4`,
        ["SUPERSEDED", row.organisation_id, row.event_id, "CURRENT"],
      );
    }
    const columns = Object.keys(row);
    const values = columns.map((key) => row[key]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    await this.client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`, values);
    return record;
  }

  async updateCurrent(scope: SeatingV2Scope, expectedVersion: number, patch: SeatingV2CurrentPatch): Promise<SeatingV2EventCurrent> {
    const current = await this.lockEventCurrent(scope, "FOR_UPDATE");
    if (!current || current.version !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating v2 current pointer was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    if (patch.version !== expectedVersion + 1) {
      throw new PlatformError("VALIDATION_FAILED", "row versions increment exactly once per successful mutation");
    }
    const merged = {
      ...current,
      ...patch,
      id: current.id,
      organisationId: current.organisationId,
      eventId: current.eventId,
      version: patch.version,
    };
    const result = await this.client.query<Record<string, unknown>>(
      `UPDATE seating_v2_event_current
       SET version = $1, working_edition_id = $2, submitted_edition_id = $3, current_publication_id = $4
       WHERE organisation_id = $5 AND event_id = $6 AND version = $7
       RETURNING *`,
      [
        merged.version,
        merged.workingEditionId ?? null,
        merged.submittedEditionId ?? null,
        merged.currentPublicationId ?? null,
        scope.organisationId,
        scope.eventId,
        expectedVersion,
      ],
    );
    if (!result.rowCount || !result.rows[0]) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating v2 current pointer was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    return seatingRecordFromRow(result.rows[0]) as SeatingV2EventCurrent;
  }

  async updateLifecycle<T>(
    collection: SeatingV2LifecycleCollection,
    id: string,
    scope: SeatingV2Scope,
    patch: SeatingV2LifecyclePatch,
  ): Promise<T> {
    const table = SEATING_V2_TABLE_FOR_COLLECTION[collection];
    const existing = await this.load<Record<string, unknown>>(collection, id, scope);
    if (!existing) throw new PlatformError("NOT_FOUND", `seating v2 ${collection} row was not found`);
    const merged = seatingRowFromRecord({ ...existing, ...patch });
    delete merged.content_hash;
    const assignments = Object.keys(merged)
      .filter((key) => key !== "id")
      .map((key, index) => `${key} = $${index + 4}`);
    const values = Object.keys(merged)
      .filter((key) => key !== "id")
      .map((key) => merged[key]);
    const result = await this.client.query<Record<string, unknown>>(
      `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $1 AND organisation_id = $2 AND event_id = $3 RETURNING *`,
      [id, scope.organisationId, scope.eventId, ...values],
    );
    if (!result.rows[0]) throw new PlatformError("NOT_FOUND", `seating v2 ${collection} row was not found`);
    return seatingRecordFromRow(result.rows[0]) as T;
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    this.auditSink.push(record);
    await this.client.query(
      `INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
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

  async getIdempotency(scope: SeatingV2Scope, action: string, key: string): Promise<SeatingV2IdempotencyReceipt | undefined> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM seating_v2_idempotency_receipts WHERE organisation_id = $1 AND event_id = $2 AND action = $3 AND idempotency_key = $4`,
      [scope.organisationId, scope.eventId, action, key],
    );
    return result.rows[0] ? (seatingRecordFromRow(result.rows[0]) as SeatingV2IdempotencyReceipt) : undefined;
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
    await this.insert("idempotencyReceipts", receipt);
    return receipt;
  }

  async lockEventCurrent(scope: SeatingV2Scope, _lock?: SeatingV2Lock): Promise<SeatingV2EventCurrent | undefined> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM seating_v2_event_current WHERE organisation_id = $1 AND event_id = $2 FOR UPDATE`,
      [scope.organisationId, scope.eventId],
    );
    return result.rows[0] ? (seatingRecordFromRow(result.rows[0]) as SeatingV2EventCurrent) : undefined;
  }

  async lockOccupiedRunPosition(
    scope: SeatingV2Scope,
    runId: string,
    positionToken: string,
    _lock?: SeatingV2Lock,
  ): Promise<SeatingV2RunAssignment | undefined> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM seating_v2_run_assignments WHERE run_id = $1 AND position_token = $2 AND state = $3 AND organisation_id = $4 AND event_id = $5 FOR UPDATE`,
      [runId, positionToken, "SEATED", scope.organisationId, scope.eventId],
    );
    return result.rows[0] ? (seatingRecordFromRow(result.rows[0]) as SeatingV2RunAssignment) : undefined;
  }

  async lockOccupiedPlanPosition(
    scope: SeatingV2Scope,
    planEditionId: string,
    logicalPositionId: string,
    _lock?: SeatingV2Lock,
  ): Promise<SeatingV2PlanAssignment | undefined> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM seating_v2_plan_assignments WHERE plan_edition_id = $1 AND logical_position_id = $2 AND state = $3 AND organisation_id = $4 AND event_id = $5 FOR UPDATE`,
      [planEditionId, logicalPositionId, "SEATED", scope.organisationId, scope.eventId],
    );
    return result.rows[0] ? (seatingRecordFromRow(result.rows[0]) as SeatingV2PlanAssignment) : undefined;
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
    for (const [collection, list] of Object.entries(ids) as Array<[SeatingV2Collection, string[]]>) {
      if (!list?.length) continue;
      const table = SEATING_V2_TABLE_FOR_COLLECTION[collection];
      for (const id of list) {
        const result = await this.client.query(`DELETE FROM ${table} WHERE id = $1 AND organisation_id = $2 AND event_id = $3`, [
          id,
          scope.organisationId,
          scope.eventId,
        ]);
        removed += result.rowCount ?? 0;
      }
    }
    return removed;
  }

  snapshot() {
    return emptySeatingV2State();
  }
}

export class PostgresSeatingV2Repository implements SeatingV2Repository {
  constructor(private readonly client: PgQueryable) {}

  async transaction<T>(fn: (tx: SeatingV2Transaction) => Promise<T>): Promise<T> {
    if (!hasTransaction(this.client)) {
      return fn(new PostgresSeatingV2Transaction(this.client));
    }
    return this.client.transaction((inner) => fn(new PostgresSeatingV2Transaction(inner)));
  }

  async projectEvent(_actor: SeatingV2ActorContext, eventId: string): Promise<SeatingV2EventProjection> {
    return this.transaction(async (tx) => {
      const current = (await tx.list<SeatingV2EventCurrent>("eventCurrent", { eventId }))[0];
      return {
        eventId,
        organisationId: current?.organisationId ?? "",
        workingEditionId: current?.workingEditionId ?? undefined,
        submittedEditionId: current?.submittedEditionId ?? undefined,
        currentPublicationId: current?.currentPublicationId ?? undefined,
        version: current?.version,
      };
    });
  }
}
