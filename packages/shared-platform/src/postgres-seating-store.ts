import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import type { PgQueryable, PgTransactor } from "./postgres-schema.js";
import {
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
  SEATING_TABLE_FOR_COLLECTION,
  type SeatingCollection,
  type SeatingIdempotencyReceipt,
  type SeatingState,
} from "./seating-schemas.js";

const ORG_ONLY_COLLECTIONS = new Set<SeatingCollection>(["solverConfigs", "evaluationRuns", "evaluationCaseResults", "migrationReceipts"]);

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

function camelFromSnake(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function snakeFromCamel(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function seatingRecordFromRow(row: Record<string, unknown>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null) continue;
    record[camelFromSnake(key)] = value;
  }
  return record;
}

export function seatingRowFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    row[snakeFromCamel(key)] = value;
  }
  return row;
}

export class PostgresSeatingTransaction implements SeatingTransaction {
  constructor(
    private readonly client: PgQueryable,
    private readonly auditSink: AuditEvent[] = [],
  ) {}

  async load<T>(collection: SeatingCollection, id: string, scope: SeatingScope): Promise<T | undefined> {
    const table = SEATING_TABLE_FOR_COLLECTION[collection];
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE id = $1 AND organisation_id = $2 AND (event_id IS NULL OR event_id = $3)`,
      [id, scope.organisationId, scope.eventId],
    );
    const row = result.rows[0];
    return row ? (seatingRecordFromRow(row) as T) : undefined;
  }

  async list<T>(collection: SeatingCollection, scope: Partial<SeatingScope>): Promise<T[]> {
    const table = SEATING_TABLE_FOR_COLLECTION[collection];
    const result =
      ORG_ONLY_COLLECTIONS.has(collection) && scope.organisationId
        ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE organisation_id = $1`, [scope.organisationId])
        : ORG_ONLY_COLLECTIONS.has(collection)
          ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table}`)
          : scope.eventId && scope.organisationId
            ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE organisation_id = $1 AND event_id = $2`, [
                scope.organisationId,
                scope.eventId,
              ])
            : scope.eventId
              ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE event_id = $1`, [scope.eventId])
              : scope.organisationId
                ? await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE organisation_id = $1`, [scope.organisationId])
                : await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table}`);
    return result.rows.map((row) => seatingRecordFromRow(row) as T);
  }

  async insert<T extends { id?: string; organisationId?: string }>(collection: SeatingCollection, record: T): Promise<T> {
    const table = SEATING_TABLE_FOR_COLLECTION[collection];
    const row = seatingRowFromRecord(record as Record<string, unknown>);
    if (row.current === true && row.event_id && row.organisation_id) {
      await this.client.query(
        `UPDATE ${table} SET current = FALSE WHERE organisation_id = $1 AND event_id = $2 AND current = TRUE`,
        [row.organisation_id, row.event_id],
      );
    }
    if (row.current_working === true && row.event_id && row.organisation_id) {
      await this.client.query(
        `UPDATE ${table} SET current_working = FALSE WHERE organisation_id = $1 AND event_id = $2 AND current_working = TRUE`,
        [row.organisation_id, row.event_id],
      );
    }
    if (row.status === "CURRENT" && table === "seating_publications" && row.event_id && row.organisation_id) {
      await this.client.query(
        `UPDATE ${table} SET status = $1 WHERE organisation_id = $2 AND event_id = $3 AND status = $4`,
        ["SUPERSEDED", row.organisation_id, row.event_id, "CURRENT"],
      );
    }
    if (table === "seating_evaluation_case_results") {
      if (row.observations !== undefined) row.observations = JSON.stringify(row.observations);
      if (row.assertions !== undefined) row.assertions = JSON.stringify(row.assertions);
    }
    const columns = Object.keys(row);
    const values = columns.map((key) => row[key]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    await this.client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
      values,
    );
    return record;
  }

  async updateVersioned<T extends { id: string; version: number }>(
    collection: SeatingCollection,
    id: string,
    expectedVersion: number,
    patch: Record<string, unknown> & { version: number },
  ): Promise<T> {
    const table = SEATING_TABLE_FOR_COLLECTION[collection];
    const current = await this.client.query<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    const existing = current.rows[0];
    if (!existing || Number(existing.version) !== expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating write was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    if (patch.version !== expectedVersion + 1) {
      throw new PlatformError("VALIDATION_FAILED", "row versions increment exactly once per successful mutation");
    }
    const merged = seatingRecordFromRow({ ...existing, ...seatingRowFromRecord(patch as Record<string, unknown>) });
    const row = seatingRowFromRecord(merged);
    const assignments = Object.keys(row)
      .filter((key) => key !== "id")
      .map((key, index) => `${key} = $${index + 3}`);
    const values = Object.keys(row)
      .filter((key) => key !== "id")
      .map((key) => row[key]);
    const result = await this.client.query(
      `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $1 AND version = $2`,
      [id, expectedVersion, ...values],
    );
    if (!result.rowCount) {
      throw new PlatformError("VERSION_CONFLICT", "stale seating write was not rescued", {
        publicMessage: "The record changed elsewhere. Reload this item before retrying.",
      });
    }
    return merged as T;
  }

  async appendAudit(record: AuditEvent): Promise<void> {
    this.auditSink.push(record);
    await this.client.query(`INSERT INTO platform_audit (id, occurred_at, organisation_id, client_id, event_id, action, outcome, body) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      record.id,
      record.occurredAt,
      record.organisationId ?? null,
      record.clientId ?? null,
      record.eventId ?? null,
      record.action,
      record.outcome,
      JSON.stringify(record),
    ]);
  }

  async getIdempotency(scope: SeatingScope, action: string, key: string): Promise<SeatingIdempotencyReceipt | undefined> {
    const result = await this.client.query<Record<string, unknown>>(
      `SELECT * FROM seating_idempotency_receipts WHERE organisation_id = $1 AND event_id = $2 AND action = $3 AND idempotency_key = $4`,
      [scope.organisationId, scope.eventId, action, key],
    );
    return result.rows[0] ? (seatingRecordFromRow(result.rows[0]) as SeatingIdempotencyReceipt) : undefined;
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
    await this.insert("idempotencyReceipts", receipt);
    return receipt;
  }

  async purgeFixtureRecords(scope: SeatingScope, ids: Partial<Record<SeatingCollection, string[]>>): Promise<number> {
    let removed = 0;
    for (const [collection, list] of Object.entries(ids) as Array<[SeatingCollection, string[]]>) {
      if (!list?.length) continue;
      const table = SEATING_TABLE_FOR_COLLECTION[collection];
      for (const id of list) {
        const result = await this.client.query(
          `DELETE FROM ${table} WHERE id = $1 AND organisation_id = $2 AND event_id = $3`,
          [id, scope.organisationId, scope.eventId],
        );
        removed += result.rowCount ?? 0;
      }
    }
    return removed;
  }

  snapshot(): SeatingState {
    return emptySeatingState();
  }
}

export class PostgresSeatingRepository implements SeatingRepository {
  constructor(private readonly client: PgQueryable) {}

  async transaction<T>(fn: (tx: SeatingTransaction) => Promise<T>): Promise<T> {
    if (!hasTransaction(this.client)) {
      return fn(new PostgresSeatingTransaction(this.client));
    }
    return this.client.transaction((inner) => fn(new PostgresSeatingTransaction(inner)));
  }

  async projectEventSeating(actor: ActorContextLike, eventId: string): Promise<SeatingWorkspaceProjection> {
    return this.transaction(async (tx) => {
      const state = emptySeatingState();
      for (const collection of SEATING_COLLECTIONS) {
        (state[collection] as unknown[]) = await tx.list(collection, { eventId });
      }
      const current = state.publications.find((item) => item.eventId === eventId && item.status === "CURRENT");
      const working = state.planEditions.find((item) => item.eventId === eventId && item.currentWorking);
      const input = state.inputEditions.find((item) => item.eventId === eventId && item.current);
      const assignments = working ? state.planAssignments.filter((item) => item.editionId === working.id) : [];
      void actor;
      return {
        eventId,
        organisationId: current?.organisationId ?? working?.organisationId ?? input?.organisationId ?? "",
        currentPublication: current,
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
    });
  }

  async getRun(actor: ActorContextLike, eventId: string, runId: string): Promise<SeatingRunProjection> {
    void actor;
    return this.transaction(async (tx) => {
      const run = await tx.load<SeatingRunProjection>("runs", runId, { organisationId: "", eventId });
      if (!run || run.eventId !== eventId) throw new PlatformError("NOT_FOUND", "seating run was not found");
      return run;
    });
  }

  async getPublication(actor: ActorContextLike, eventId: string, publicationId: string): Promise<SeatingPublicationProjection> {
    void actor;
    return this.transaction(async (tx) => {
      const publication = await tx.load<SeatingPublicationProjection>("publications", publicationId, { organisationId: "", eventId });
      if (!publication || publication.eventId !== eventId) throw new PlatformError("NOT_FOUND", "seating publication was not found");
      return publication;
    });
  }
}
