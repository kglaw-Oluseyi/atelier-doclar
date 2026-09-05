import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOCAL_STORE_PRODUCTION_STATUS, type StoreProductionStatus } from "./constants.js";
import { ProgrammeEventError } from "./event-errors.js";
import { eventsEquivalent, parseProgrammeEvent, type ProgrammeEvent } from "./events.js";
import type { ControlSnapshot, ProgrammeProjection } from "./projection-types.js";

/**
 * Domain persistence contract ≠ production database decision.
 * CT0 proposed PostgreSQL later. This interface is the programme contract.
 * Local adapters are explicitly non-production.
 */
export const PERSISTENCE_CONTRACT = {
  kind: "domain-repository",
  productionDatabaseDecision: "POSTGRESQL",
  localAdapterStatus: LOCAL_STORE_PRODUCTION_STATUS,
} as const;

export interface StoredSnapshot {
  snapshotId: string;
  createdAt: string;
  sourceEventPosition: number;
  projection: ProgrammeProjection;
  view: ControlSnapshot;
}

export type AppendResult =
  | { kind: "appended"; position: number; revision: number; event: ProgrammeEvent }
  | { kind: "duplicate"; position: number; revision: number; event: ProgrammeEvent };

export interface ProgrammeStore {
  readonly productionStatus: StoreProductionStatus;
  append(event: ProgrammeEvent): AppendResult;
  getById(eventId: string): ProgrammeEvent | undefined;
  getByIdempotencyKey(key: string): ProgrammeEvent | undefined;
  listAll(): ProgrammeEvent[];
  listUpTo(position: number): ProgrammeEvent[];
  listByAggregate(aggregateType: string, aggregateId: string): ProgrammeEvent[];
  getAggregateRevision(aggregateType: string, aggregateId: string): number;
  eventCount(): number;
  saveSnapshot(snapshot: StoredSnapshot): void;
  getSnapshot(snapshotId: string): StoredSnapshot | undefined;
  listSnapshots(): StoredSnapshot[];
}

function aggregateKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      freezeDeep(nested);
    }
  }
  return value;
}

abstract class BaseStore implements ProgrammeStore {
  readonly productionStatus = LOCAL_STORE_PRODUCTION_STATUS;
  protected events: ProgrammeEvent[] = [];
  protected byId = new Map<string, number>();
  protected byIdempotency = new Map<string, number>();
  protected revisions = new Map<string, number>();
  protected snapshots = new Map<string, StoredSnapshot>();

  append(event: ProgrammeEvent): AppendResult {
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
      if (!existing) {
        throw new ProgrammeEventError("SCHEMA_INVALID", "idempotency index is corrupt");
      }
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
    this.persistAppend(stored);
    this.events.push(stored);
    const position = this.events.length;
    this.byId.set(stored.eventId, position - 1);
    this.byIdempotency.set(stored.idempotencyKey, position - 1);
    this.revisions.set(key, currentRevision + 1);
    return {
      kind: "appended",
      position,
      revision: currentRevision + 1,
      event: clone(stored),
    };
  }

  getById(eventId: string): ProgrammeEvent | undefined {
    const index = this.byId.get(eventId);
    if (index === undefined) return undefined;
    const event = this.events[index];
    return event ? clone(event) : undefined;
  }

  getByIdempotencyKey(key: string): ProgrammeEvent | undefined {
    const index = this.byIdempotency.get(key);
    if (index === undefined) return undefined;
    const event = this.events[index];
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

  saveSnapshot(snapshot: StoredSnapshot): void {
    if (this.snapshots.has(snapshot.snapshotId)) {
      throw new ProgrammeEventError(
        "SNAPSHOT_EXISTS",
        `snapshot ${snapshot.snapshotId} is immutable and already exists`,
        "snapshotId",
        snapshot.snapshotId,
      );
    }
    const stored = freezeDeep(clone(snapshot));
    this.persistSnapshot(stored);
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

  protected persistAppend(_event: ProgrammeEvent): void {}
  protected persistSnapshot(_snapshot: StoredSnapshot): void {}
}

/** In-memory transactional adapter for tests. Not a production database. */
export class MemoryProgrammeStore extends BaseStore {}

/**
 * Filesystem-backed local adapter.
 * NON_PRODUCTION. Do not treat this as the production architecture.
 */
export class FilesystemProgrammeStore extends BaseStore {
  constructor(private readonly directory: string) {
    super();
    mkdirSync(join(directory, "snapshots"), { recursive: true });
    this.load();
  }

  private eventsPath(): string {
    return join(this.directory, "events.jsonl");
  }

  private snapshotPath(id: string): string {
    return join(this.directory, "snapshots", `${id}.json`);
  }

  private load(): void {
    if (existsSync(this.eventsPath())) {
      const lines = readFileSync(this.eventsPath(), "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      for (const line of lines) {
        const event = parseProgrammeEvent(JSON.parse(line) as unknown);
        const stored = freezeDeep(clone(event));
        this.events.push(stored);
        const index = this.events.length - 1;
        this.byId.set(stored.eventId, index);
        this.byIdempotency.set(stored.idempotencyKey, index);
        const key = aggregateKey(stored.aggregateType, stored.aggregateId);
        this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
      }
    }
    const snapshotDir = join(this.directory, "snapshots");
    if (existsSync(snapshotDir)) {
      for (const file of readdirSync(snapshotDir).sort()) {
        if (!file.endsWith(".json")) continue;
        const raw = JSON.parse(readFileSync(join(snapshotDir, file), "utf8")) as StoredSnapshot;
        this.snapshots.set(raw.snapshotId, freezeDeep(clone(raw)));
      }
    }
  }

  protected override persistAppend(event: ProgrammeEvent): void {
    appendFileSync(this.eventsPath(), `${JSON.stringify(event)}\n`, "utf8");
  }

  protected override persistSnapshot(snapshot: StoredSnapshot): void {
    const path = this.snapshotPath(snapshot.snapshotId);
    if (existsSync(path)) {
      throw new ProgrammeEventError(
        "SNAPSHOT_EXISTS",
        `snapshot file ${snapshot.snapshotId} already exists`,
        "snapshotId",
        snapshot.snapshotId,
      );
    }
    writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  }
}
