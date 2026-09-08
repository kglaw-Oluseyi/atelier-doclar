import "server-only";
import { join } from "node:path";
import { Pool } from "pg";
import {
  LOCAL_STORE_PRODUCTION_STATUS,
  PlatformService,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  applySyntheticSnapshot,
  ensureEosS05ACollections,
  type PgQueryable,
  type PlatformStore,
} from "@maison-doclar/shared-platform";
import { accessAuthority, atelierAccessConfig, databaseUrl, fixturesAllowed, rsvpAccessConfig, sessionConfig, vendorAccessConfig } from "./config";
import { FileBackedPlatformStore } from "./file-store";
import { fixtureExportStoreEnabled, layoutAssetEnvBound, layoutExportEnabled, resolveLayoutBinaryStore } from "./layout-s3-store";

export type PersistenceLabel = "POSTGRES" | "MEMORY_NON_PRODUCTION" | "UNAVAILABLE";
export type MigrationStatus = "APPLIED" | "FAILED" | "UNAVAILABLE";

interface Runtime {
  service: PlatformService;
  store: PlatformStore;
  fixtures: boolean;
  persistence: PersistenceLabel;
  migrationStatus: MigrationStatus;
  flush(): Promise<void>;
}

const globalStore = globalThis as typeof globalThis & {
  __eventOsRuntime?: Runtime;
  __eventOsRuntimeBoot?: Promise<Runtime>;
};

function storePath(): string {
  return join(process.cwd(), "data", "event-os-non-production.json");
}

function platformOptions() {
  return {
    rsvpAccess: rsvpAccessConfig(),
    staffSession: sessionConfig(),
    vendorAccess: vendorAccessConfig(),
    atelierAccess: atelierAccessConfig(),
    accessAuthority: accessAuthority(),
    layoutExportEnabled: (layoutExportEnabled() && layoutAssetEnvBound()) || fixtureExportStoreEnabled(),
    layoutAssetStoreConfigured: layoutAssetEnvBound(),
    layoutBinaryStore: fixtureExportStoreEnabled() ? resolveLayoutBinaryStore() : undefined,
  };
}

function fileRuntime(): Runtime {
  const store = new FileBackedPlatformStore(storePath());
  const options = platformOptions();
  const service = applySyntheticSnapshot(store, options);
  return {
    service,
    store,
    fixtures: true,
    persistence: "MEMORY_NON_PRODUCTION",
    migrationStatus: "UNAVAILABLE",
    async flush() {},
  };
}

async function postgresRuntime(): Promise<Runtime> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is required for Event OS Postgres");
  const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 8_000 });
  const adapt = (queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: object[]; rowCount?: number | null }> }): PgQueryable => ({
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await queryable.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  });
  const client = {
    ...adapt(pool),
    async transaction<T>(fn: (queryable: PgQueryable) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      try {
        await connected.query("BEGIN");
        const result = await fn(adapt(connected));
        await connected.query("COMMIT");
        return result;
      } catch (error) {
        await connected.query("ROLLBACK");
        throw error;
      } finally {
        connected.release();
      }
    },
  };
  const store = await PostgresPlatformStore.open(client);
  const options = platformOptions();
  const seeded = fixturesAllowed()
    ? await applySyntheticSeedIfNeeded(store, client, options)
    : { service: new PlatformService(store, options), seed: undefined };
  if (!fixturesAllowed()) {
    ensureEosS05ACollections(store);
  }
  await store.flush();
  return {
    service: seeded.service,
    store,
    fixtures: fixturesAllowed(),
    persistence: "POSTGRES",
    migrationStatus: "APPLIED",
    flush: () => store.flush(),
  };
}

export async function ensureRuntime(): Promise<Runtime> {
  if (globalStore.__eventOsRuntime) return globalStore.__eventOsRuntime;
  if (!globalStore.__eventOsRuntimeBoot) {
    globalStore.__eventOsRuntimeBoot = (async () => {
      if (databaseUrl()) {
        const runtime = await postgresRuntime();
        globalStore.__eventOsRuntime = runtime;
        return runtime;
      }
      if (process.env.NODE_ENV === "production") {
        throw new Error("Event OS production runtime requires DATABASE_URL");
      }
      if (!fixturesAllowed()) {
        throw new Error("Event OS local runtime requires EVENT_OS_ALLOW_FIXTURES=1 or DATABASE_URL");
      }
      const runtime = fileRuntime();
      globalStore.__eventOsRuntime = runtime;
      return runtime;
    })().catch((error) => {
      globalStore.__eventOsRuntimeBoot = undefined;
      throw error;
    });
  }
  return globalStore.__eventOsRuntimeBoot;
}

export function getRuntime(): Runtime {
  if (globalStore.__eventOsRuntime) return globalStore.__eventOsRuntime;
  if (databaseUrl()) {
    throw new Error("Event OS Postgres runtime is not ready");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Event OS production runtime requires DATABASE_URL");
  }
  if (!fixturesAllowed()) {
    throw new Error("Event OS local runtime requires EVENT_OS_ALLOW_FIXTURES=1 or DATABASE_URL");
  }
  const runtime = fileRuntime();
  globalStore.__eventOsRuntime = runtime;
  return runtime;
}

export async function flushRuntime(): Promise<void> {
  if (globalStore.__eventOsRuntime) await globalStore.__eventOsRuntime.flush();
}

export function layoutBinaryStore() {
  return resolveLayoutBinaryStore();
}

export async function withDurable<T>(fn: () => Promise<T> | T): Promise<T> {
  await ensureRuntime();
  try {
    return await fn();
  } finally {
    await flushRuntime();
  }
}

export function persistenceLabel(): PersistenceLabel {
  if (globalStore.__eventOsRuntime) return globalStore.__eventOsRuntime.persistence;
  if (databaseUrl()) return "POSTGRES";
  return "MEMORY_NON_PRODUCTION";
}

export { LOCAL_STORE_PRODUCTION_STATUS };
