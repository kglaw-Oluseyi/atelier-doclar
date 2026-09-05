import { Pool } from "pg";
import {
  IngestionLedger,
  IngestionService,
  MemoryDeliveryStore,
  createLiveGitHubProvider,
  loadLinkageCatalog,
} from "@maison-doclar/programme-ingestion";
import {
  loadCurrentSnapshot,
  openLiveRuntime,
  snapshotFromRuntime,
  PostgresAuditRepository,
  PostgresDeliveryJournal,
  type ControlSnapshot,
  type LiveRuntime,
} from "@maison-doclar/programme-tower";

let runtimePromise: Promise<LiveRuntime> | undefined;
let pool: Pool | undefined;
let audit: PostgresAuditRepository | undefined;
let deliveries: PostgresDeliveryJournal | undefined;
let reconcilePromise: Promise<void> | undefined;
let githubState: "AVAILABLE" | "UNAVAILABLE" | "UNCONFIGURED" | "SYNTHETIC" = "UNCONFIGURED";

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function usesProductionPersistence(): boolean {
  return Boolean(databaseUrl());
}

export function githubIngestionState(): typeof githubState {
  return githubState;
}

export async function getLiveRuntime(): Promise<LiveRuntime | undefined> {
  const url = databaseUrl();
  if (!url) return undefined;
  if (!runtimePromise) {
    pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 8_000 });
    runtimePromise = openLiveRuntime(pool).catch((error) => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

export async function getAudit(): Promise<PostgresAuditRepository | undefined> {
  if (!usesProductionPersistence()) return undefined;
  if (!audit) {
    await getLiveRuntime();
    if (!pool) return undefined;
    audit = new PostgresAuditRepository(pool);
    await audit.hydrate();
  }
  return audit;
}

export async function getDeliveries(): Promise<PostgresDeliveryJournal | undefined> {
  if (!usesProductionPersistence()) return undefined;
  if (!deliveries) {
    await getLiveRuntime();
    if (!pool) return undefined;
    deliveries = new PostgresDeliveryJournal(pool);
  }
  return deliveries;
}

export async function loadProgrammeSnapshot(now = new Date().toISOString()): Promise<ControlSnapshot> {
  if (!usesProductionPersistence()) return loadCurrentSnapshot(now);
  const live = await getLiveRuntime();
  if (!live) throw new Error("live persistence is configured but unavailable");
  return snapshotFromRuntime(live, now);
}

export async function persistNewEvents(beforeCount: number): Promise<void> {
  const live = await getLiveRuntime();
  if (!live) return;
  const events = live.memory.listAll().slice(beforeCount);
  for (const event of events) {
    if (!live.postgres.getById(event.eventId)) {
      await live.postgres.appendAsync(event);
    }
  }
}

export async function ensureLiveReconcile(): Promise<void> {
  if (reconcilePromise) return reconcilePromise;
  reconcilePromise = runLiveReconcile();
  return reconcilePromise;
}

async function runLiveReconcile(): Promise<void> {
  if (process.env.PROGRAMME_GITHUB_LIVE !== "1") {
    githubState = process.env.NODE_ENV === "production" ? "UNCONFIGURED" : "SYNTHETIC";
    return;
  }
  if (!process.env.PROGRAMME_GITHUB_TOKEN) {
    githubState = "UNCONFIGURED";
    return;
  }
  const live = await getLiveRuntime();
  if (!live) {
    githubState = "UNAVAILABLE";
    return;
  }
  try {
    const provider = createLiveGitHubProvider();
    const service = new IngestionService({
      engine: live.engine,
      catalog: loadLinkageCatalog(),
      ledger: new IngestionLedger(),
      deliveries: new MemoryDeliveryStore(),
      now: () => new Date().toISOString(),
    });
    const before = live.memory.eventCount();
    const result = await service.reconcile(provider);
    await persistNewEvents(before);
    githubState = result.ok ? "AVAILABLE" : "UNAVAILABLE";
  } catch {
    githubState = "UNAVAILABLE";
  }
}
