import { PRODUCTION_STORE_STATUS, type StoreProductionStatus } from "./constants.js";
import { ProgrammeEventError } from "./event-errors.js";
import { eventsEquivalent, parseProgrammeEvent, type ProgrammeEvent } from "./events.js";
import { PROGRAMME_POSTGRES_SCHEMA, type PgQueryable } from "./postgres-schema.js";
import type { AppendResult, ProgrammeStore, StoredSnapshot } from "./store.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value)) freezeDeep(nested);
  }
  return value;
}

function aggregateKey(type: string, id: string): string {
  return `${type}:${id}`;
}

/**
 * PostgreSQL ProgrammeStore. Source of truth is the database.
 * Memory indexes are hydrated on open and kept aligned after successful writes.
 */
export class PostgresProgrammeStore implements ProgrammeStore {
  readonly productionStatus: StoreProductionStatus = PRODUCTION_STORE_STATUS;
  private events: ProgrammeEvent[] = [];
  private byId = new Map<string, number>();
  private byIdempotency = new Map<string, number>();
  private revisions = new Map<string, number>();
  private snapshots = new Map<string, StoredSnapshot>();

  constructor(private readonly client: PgQueryable) {}

  static async migrate(client: PgQueryable): Promise<void> {
    await client.query(PROGRAMME_POSTGRES_SCHEMA);
  }

  static async open(client: PgQueryable): Promise<PostgresProgrammeStore> {
    await PostgresProgrammeStore.migrate(client);
    const store = new PostgresProgrammeStore(client);
    await store.hydrate();
    return store;
  }

  private indexEvent(event: ProgrammeEvent, index: number): void {
    this.byId.set(event.eventId, index);
    this.byIdempotency.set(event.idempotencyKey, index);
    const key = aggregateKey(event.aggregateType, event.aggregateId);
    this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
  }

  private async hydrate(): Promise<void> {
    const eventRows = await this.client.query<{ body: ProgrammeEvent }>(
      "SELECT body FROM programme_events ORDER BY position ASC",
    );
    this.events = [];
    this.byId.clear();
    this.byIdempotency.clear();
    this.revisions.clear();
    for (const row of eventRows.rows) {
      const stored = freezeDeep(clone(parseProgrammeEvent(row.body)));
      this.events.push(stored);
      this.indexEvent(stored, this.events.length - 1);
    }
    const snapRows = await this.client.query<{ body: StoredSnapshot }>(
      "SELECT body FROM programme_snapshots ORDER BY snapshot_id ASC",
    );
    this.snapshots.clear();
    for (const row of snapRows.rows) {
      this.snapshots.set(row.body.snapshotId, freezeDeep(clone(row.body)));
    }
  }

  append(_event: ProgrammeEvent): AppendResult {
    throw new ProgrammeEventError(
      "SCHEMA_INVALID",
      "PostgresProgrammeStore.append is async; use appendAsync",
    );
  }

  async appendAsync(event: ProgrammeEvent): Promise<AppendResult> {
    const parsed = parseProgrammeEvent(event);
    const existingIdIndex = this.byId.get(parsed.eventId);
    if (existingIdIndex !== undefined) {
      const existing = this.events[existingIdIndex];
      if (!existing || !eventsEquivalent(existing, parsed)) {
        throw new ProgrammeEventError(
          "EVENT_IDENTITY_CONFLICT",
          `event ${parsed.eventId} already exists with a different body`,
          "eventId",
          parsed.eventId,
        );
      }
      return {
        kind: "duplicate",
        position: existingIdIndex + 1,
        revision: this.getAggregateRevision(existing.aggregateType, existing.aggregateId),
        event: clone(existing),
      };
    }
    const existingKeyIndex = this.byIdempotency.get(parsed.idempotencyKey);
    if (existingKeyIndex !== undefined) {
      const existing = this.events[existingKeyIndex];
      if (!existing) throw new ProgrammeEventError("SCHEMA_INVALID", "idempotency index is corrupt");
      if (!eventsEquivalent(existing, parsed)) {
        throw new ProgrammeEventError(
          "EVENT_IDENTITY_CONFLICT",
          `idempotency key ${parsed.idempotencyKey} is bound to a different event`,
          "idempotencyKey",
          parsed.idempotencyKey,
        );
      }
      return {
        kind: "duplicate",
        position: existingKeyIndex + 1,
        revision: this.getAggregateRevision(existing.aggregateType, existing.aggregateId),
        event: clone(existing),
      };
    }
    const key = aggregateKey(parsed.aggregateType, parsed.aggregateId);
    const currentRevision = this.revisions.get(key) ?? 0;
    if (parsed.expectedRevision !== undefined && parsed.expectedRevision !== currentRevision) {
      throw new ProgrammeEventError(
        "STALE_REVISION",
        `stale expectedRevision ${parsed.expectedRevision}; actual ${currentRevision}`,
        "expectedRevision",
        String(parsed.expectedRevision),
      );
    }
    const stored = freezeDeep(clone(parsed));
    await this.client.query(
      "INSERT INTO programme_events (event_id, idempotency_key, aggregate_type, aggregate_id, body) VALUES ($1, $2, $3, $4, $5::jsonb)",
      [stored.eventId, stored.idempotencyKey, stored.aggregateType, stored.aggregateId, JSON.stringify(stored)],
    );
    this.events.push(stored);
    const position = this.events.length;
    this.indexEvent(stored, position - 1);
    return { kind: "appended", position, revision: currentRevision + 1, event: clone(stored) };
  }

  getById(eventId: string): ProgrammeEvent | undefined {
    const index = this.byId.get(eventId);
    const event = index === undefined ? undefined : this.events[index];
    return event ? clone(event) : undefined;
  }

  getByIdempotencyKey(key: string): ProgrammeEvent | undefined {
    const index = this.byIdempotency.get(key);
    const event = index === undefined ? undefined : this.events[index];
    return event ? clone(event) : undefined;
  }

  listAll(): ProgrammeEvent[] {
    return this.events.map((event) => clone(event));
  }

  listUpTo(position: number): ProgrammeEvent[] {
    return this.events.slice(0, position).map((event) => clone(event));
  }

  listByAggregate(aggregateType: string, aggregateId: string): ProgrammeEvent[] {
    return this.events
      .filter((event) => event.aggregateType === aggregateType && event.aggregateId === aggregateId)
      .map((event) => clone(event));
  }

  getAggregateRevision(aggregateType: string, aggregateId: string): number {
    return this.revisions.get(aggregateKey(aggregateType, aggregateId)) ?? 0;
  }

  eventCount(): number {
    return this.events.length;
  }

  saveSnapshot(_snapshot: StoredSnapshot): void {
    throw new ProgrammeEventError("SCHEMA_INVALID", "use saveSnapshotAsync");
  }

  async saveSnapshotAsync(snapshot: StoredSnapshot): Promise<void> {
    if (this.snapshots.has(snapshot.snapshotId)) {
      throw new ProgrammeEventError(
        "SNAPSHOT_EXISTS",
        `snapshot ${snapshot.snapshotId} is immutable and already exists`,
        "snapshotId",
        snapshot.snapshotId,
      );
    }
    const stored = freezeDeep(clone(snapshot));
    await this.client.query(
      "INSERT INTO programme_snapshots (snapshot_id, created_at, source_event_position, body) VALUES ($1, $2, $3, $4::jsonb)",
      [stored.snapshotId, stored.createdAt, stored.sourceEventPosition, JSON.stringify(stored)],
    );
    this.snapshots.set(stored.snapshotId, stored);
  }

  getSnapshot(snapshotId: string): StoredSnapshot | undefined {
    const snapshot = this.snapshots.get(snapshotId);
    return snapshot ? clone(snapshot) : undefined;
  }

  listSnapshots(): StoredSnapshot[] {
    return [...this.snapshots.values()]
      .sort((a, b) => a.snapshotId.localeCompare(b.snapshotId))
      .map((snapshot) => clone(snapshot));
  }
}

export class MemoryPg implements PgQueryable {
  readonly events: Array<{
    position: number;
    event_id: string;
    idempotency_key: string;
    aggregate_type: string;
    aggregate_id: string;
    body: ProgrammeEvent;
  }> = [];
  readonly snapshots: StoredSnapshot[] = [];
  readonly audit: unknown[] = [];
  readonly deliveries = new Set<string>();

  async query<T extends object = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
    const sql = text.replace(/\s+/g, " ").trim();
    if (sql.startsWith("CREATE TABLE")) return { rows: [] };
    if (sql.startsWith("SELECT body FROM programme_events")) {
      return { rows: this.events.map((row) => ({ body: row.body })) as T[] };
    }
    if (sql.startsWith("SELECT body FROM programme_snapshots")) {
      return { rows: this.snapshots.map((body) => ({ body })) as T[] };
    }
    if (sql.startsWith("INSERT INTO programme_events")) {
      const [eventId, idempotencyKey, aggregateType, aggregateId, bodyJson] = values as [
        string,
        string,
        string,
        string,
        string,
      ];
      if (this.events.some((row) => row.event_id === eventId || row.idempotency_key === idempotencyKey)) {
        throw new Error("unique_violation");
      }
      this.events.push({
        position: this.events.length + 1,
        event_id: eventId,
        idempotency_key: idempotencyKey,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        body: JSON.parse(bodyJson) as ProgrammeEvent,
      });
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO programme_snapshots")) {
      const body = JSON.parse(String(values[3])) as StoredSnapshot;
      if (this.snapshots.some((item) => item.snapshotId === body.snapshotId)) throw new Error("unique_violation");
      this.snapshots.push(body);
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO programme_audit")) {
      this.audit.push(JSON.parse(String(values[7] ?? values[values.length - 1])));
      return { rows: [] };
    }
    if (sql.startsWith("SELECT body FROM programme_audit")) {
      return { rows: this.audit.map((body) => ({ body })) as T[] };
    }
    if (sql.startsWith("SELECT delivery_id FROM programme_deliveries")) {
      return { rows: [...this.deliveries].map((delivery_id) => ({ delivery_id })) as T[] };
    }
    if (sql.startsWith("SELECT 1 FROM programme_deliveries") || sql.includes("FROM programme_deliveries WHERE")) {
      const id = String(values[0] ?? "");
      return { rows: this.deliveries.has(id) ? ([{ ok: 1 }] as unknown as T[]) : [] };
    }
    if (sql.startsWith("INSERT INTO programme_deliveries")) {
      this.deliveries.add(String(values[0]));
      return { rows: [] };
    }
    throw new Error(`unsupported test SQL: ${sql}`);
  }
}
