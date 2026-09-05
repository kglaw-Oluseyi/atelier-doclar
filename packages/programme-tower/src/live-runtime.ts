import {
  CORPUS_SEED_TIME,
  corpusSeedEvents,
  createEngine,
  loadCorpusBaseline,
  MemoryProgrammeStore,
  PostgresProgrammeStore,
  type ControlSnapshot,
  type PgQueryable,
  type ProgrammeEngine,
} from "@maison-doclar/programme-domain";
import type { AuditEntry } from "./authority.js";

export interface LiveRuntime {
  engine: ProgrammeEngine;
  postgres: PostgresProgrammeStore;
  memory: MemoryProgrammeStore;
  persistence: "AVAILABLE";
  productionStatus: "PRODUCTION";
}

export async function openLiveRuntime(client: PgQueryable): Promise<LiveRuntime> {
  const { baseline } = loadCorpusBaseline();
  const postgres = await PostgresProgrammeStore.open(client);
  for (const event of corpusSeedEvents()) {
    if (!postgres.getById(event.eventId)) {
      await postgres.appendAsync(event);
    }
  }
  const memory = new MemoryProgrammeStore();
  const engine = createEngine(memory, baseline, CORPUS_SEED_TIME);
  for (const event of postgres.listAll()) engine.append(event);
  return {
    engine,
    postgres,
    memory,
    persistence: "AVAILABLE",
    productionStatus: "PRODUCTION",
  };
}

export function snapshotFromRuntime(runtime: LiveRuntime, now = new Date().toISOString()): ControlSnapshot {
  return runtime.engine.currentView({
    snapshotId: "SNAP-TOWER-LIVE",
    generatedAt: now,
    source: "postgres",
  });
}

export class PostgresAuditRepository {
  constructor(private readonly client: PgQueryable) {}

  async appendAsync(entry: AuditEntry): Promise<{ kind: "appended" | "duplicate"; entry: AuditEntry }> {
    const existing = this.list().find((item) => item.id === entry.id);
    if (existing) return { kind: "duplicate", entry: existing };
    await this.client.query(
      "INSERT INTO programme_audit (id, at, actor_id, action, target_id, result, reason, body) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
      [entry.id, entry.at, entry.actorId, entry.action, entry.targetId, entry.result, entry.reason, JSON.stringify(entry)],
    );
    this.cached.push(entry);
    return { kind: "appended", entry };
  }

  private cached: AuditEntry[] = [];

  async hydrate(): Promise<void> {
    const rows = await this.client.query<{ body: AuditEntry }>("SELECT body FROM programme_audit ORDER BY at ASC");
    this.cached = rows.rows.map((row) => row.body);
  }

  list(): AuditEntry[] {
    return [...this.cached];
  }
}

export class PostgresDeliveryJournal {
  constructor(private readonly client: PgQueryable) {}

  async has(deliveryId: string): Promise<boolean> {
    const rows = await this.client.query("SELECT 1 FROM programme_deliveries WHERE delivery_id = $1", [deliveryId]);
    return rows.rows.length > 0;
  }

  async remember(deliveryId: string): Promise<void> {
    await this.client.query("INSERT INTO programme_deliveries (delivery_id, seen_at) VALUES ($1, $2) ON CONFLICT (delivery_id) DO NOTHING", [
      deliveryId,
      new Date().toISOString(),
    ]);
  }

  async list(): Promise<string[]> {
    const rows = await this.client.query<{ delivery_id: string }>("SELECT delivery_id FROM programme_deliveries");
    return rows.rows.map((row) => row.delivery_id);
  }
}
