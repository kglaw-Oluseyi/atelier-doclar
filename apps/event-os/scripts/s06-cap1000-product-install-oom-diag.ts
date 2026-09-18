/**
 * CAP1000 product-install memory diagnosis / proof runner (PostgresPlatformStore).
 *
 * Modes:
 *   --mode before  skip layout batch flush; guestFlushEvery=25 (pre-fix retention)
 *   --mode after   layout batch flush + guestFlushEvery=10 (surgical fix)
 *
 * Does not launch a solver. Synthetic qualification only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import {
  CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  createCapacityInstallMemoryRecorder,
  installCapacityLiveFixture,
  measurePlatformCollectionCosts,
  openCapacityInstallPostgresStore,
  writePlatformCollectionCostsArtifact,
  EVENT_OS_CLEANUP_PROJECT_ID,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const mode = process.argv.includes("--mode")
  ? process.argv[process.argv.indexOf("--mode") + 1]
  : "after";
if (mode !== "before" && mode !== "after") throw new Error("--mode before|after");
if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}

const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL required");

const evidenceDir =
  process.env.CAP1000_OOM_EVIDENCE_DIR ??
  join(process.cwd(), "docs/control/evidence/eos-s06-cpsat-production/milestone-6de");
mkdirSync(evidenceDir, { recursive: true });
const telemetryPath = join(
  evidenceDir,
  mode === "before" ? "CAP1000_PRODUCT_INSTALL_BEFORE.jsonl" : "CAP1000_PRODUCT_INSTALL_AFTER.jsonl",
);

function adapt(pool: Pool): PgQueryable & { transaction<T>(fn: (q: PgQueryable) => Promise<T>): Promise<T> } {
  return {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: PgQueryable) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      try {
        await connected.query("BEGIN");
        const result = await fn({
          async query<R extends object>(text: string, values?: unknown[]) {
            const inner = await connected.query(text, values);
            return { rows: inner.rows as R[], rowCount: inner.rowCount ?? 0 };
          },
        });
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
}

const memory = createCapacityInstallMemoryRecorder(telemetryPath);
let pendingReplaces = 0;
const peak = { rss: 0, heapUsed: 0, stage: "start" };

const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 15_000 });
try {
  memory.mark("process.start");
  memory.mark("before.storeOpen");
  const client = adapt(pool);
  // AFTER mode uses installer-scoped hydrate; BEFORE keeps full open for retention comparison
  // only when CAP1000_OOM_FULL_HYDRATE=1 is set (default AFTER = scoped).
  const useScoped = mode === "after" && process.env.CAP1000_OOM_FULL_HYDRATE !== "1";
  const store = useScoped
    ? await openCapacityInstallPostgresStore(client, {
        idempotencyKeyLike: CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
        omitHistoricalAudit: true,
      })
    : await PostgresPlatformStore.open(client);
  // Count queued replace() closures until flush settles (hypothesis instrumentation).
  const originalReplace = store.replace.bind(store);
  store.replace = (next) => {
    pendingReplaces += 1;
    originalReplace(next);
  };
  const originalFlush = store.flush.bind(store);
  store.flush = async () => {
    await originalFlush();
    pendingReplaces = 0;
  };
  memory.mark("after.storeOpen", { pendingReplaces });
  {
    const costs = await measurePlatformCollectionCosts(client);
    const mem = process.memoryUsage();
    writePlatformCollectionCostsArtifact(join(evidenceDir, `CAP1000_PRODUCT_INSTALL_${mode.toUpperCase()}_COLLECTION_COSTS.jsonl`), {
      at: costs.at,
      stage: "after.storeOpen",
      rows: costs.rows,
      rss: mem.rss,
      heapUsed: mem.heapUsed,
    });
  }

  memory.mark("before.seed");
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  memory.mark("after.seed", { pendingReplaces });

  const wrapMark = memory.mark;
  memory.mark = (stage, extra = {}) => {
    const mem = process.memoryUsage();
    if (mem.rss > peak.rss) {
      peak.rss = mem.rss;
      peak.heapUsed = mem.heapUsed;
      peak.stage = stage;
    }
    wrapMark(stage, { ...extra, pendingReplaces });
  };

  const result = await installCapacityLiveFixture(seeded.service, store, {
    fixture: "CAP1000",
    confirmSyntheticQualification: true,
    env: {
      ...process.env,
      RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ?? EVENT_OS_CLEANUP_PROJECT_ID,
      RAILWAY_PROJECT_NAME: process.env.RAILWAY_PROJECT_NAME ?? "atelier-doclar",
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME ?? "production",
      RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME ?? "event-os",
    },
    productionAuthorised: false,
    providersInactive: true,
    communicationsInactive: true,
    realDataMode: false,
    skipLayoutBatchFlush: mode === "before",
    guestFlushEvery: mode === "before" ? 25 : 10,
    memory,
    onProgress: (message) => process.stdout.write(`${message}\n`),
  });

  memory.mark("process.complete");
  const summary = {
    mode,
    ok: true,
    result,
    peakRss: peak.rss,
    peakHeapUsed: peak.heapUsed,
    peakStage: peak.stage,
    telemetryPath,
  };
  writeFileSync(join(evidenceDir, `CAP1000_PRODUCT_INSTALL_${mode.toUpperCase()}_SUMMARY.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  memory.mark("process.fault", {
    pendingReplaces,
  });
  console.error(JSON.stringify({ mode, ok: false, error: String(error), peak }, null, 2));
  process.exitCode = 1;
} finally {
  await pool.end();
}
