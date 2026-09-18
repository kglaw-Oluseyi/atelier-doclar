/**
 * Controlled live CAP600 / CAP1000 qualification installer.
 *
 * Does NOT weaken apps/event-os/scripts/s06-capacity-600-seed.ts Railway refusal.
 * This pathway requires explicit fixture flag + synthetic confirmation + Railway scope.
 *
 * Usage examples:
 *   pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts --fixture CAP600 --confirm-synthetic-qualification --dry-run
 *   pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts --fixture CAP600 --confirm-synthetic-qualification
 *   pnpm exec tsx apps/event-os/scripts/s06-capacity-live-install.ts --fixture CAP1000 --confirm-synthetic-qualification --verify-only
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import {
  ACCEPTED_CAP600_CORPUS_HASHES,
  CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  createCapacityInstallMemoryRecorder,
  installCapacityLiveFixture,
  measurePlatformCollectionCosts,
  openCapacityInstallPostgresStore,
  writePlatformCollectionCostsArtifact,
  type CapacityLiveFixtureCode,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

function parseArgs(argv: string[]) {
  const out: {
    fixture?: CapacityLiveFixtureCode;
    confirm: boolean;
    dryRun: boolean;
    verifyOnly: boolean;
    manifestDir?: string;
    guestFlushEvery?: number;
  } = { confirm: false, dryRun: false, verifyOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--fixture") {
      const value = argv[++index];
      if (value === "CAP600" || value === "CAP1000") out.fixture = value;
      else throw new Error(`--fixture must be CAP600 or CAP1000 (got ${value})`);
    } else if (arg === "--confirm-synthetic-qualification") {
      out.confirm = true;
    } else if (arg === "--dry-run") {
      out.dryRun = true;
    } else if (arg === "--verify-only") {
      out.verifyOnly = true;
    } else if (arg === "--manifest-dir") {
      out.manifestDir = argv[++index];
    } else if (arg === "--guest-flush-every") {
      const value = Number(argv[++index]);
      if (!Number.isInteger(value) || value < 1) throw new Error("--guest-flush-every must be a positive integer");
      out.guestFlushEvery = value;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        `s06-capacity-live-install --fixture CAP600|CAP1000 --confirm-synthetic-qualification [--dry-run|--verify-only] [--guest-flush-every N]`,
      );
      process.exit(0);
    }
  }
  return out;
}

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

const args = parseArgs(process.argv.slice(2));
if (!args.fixture) throw new Error("Missing --fixture CAP600|CAP1000");
if (!args.confirm) throw new Error("Missing --confirm-synthetic-qualification");

const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString: url,
  max: 2,
  connectionTimeoutMillis: 12_000,
  keepAlive: true,
  idleTimeoutMillis: 0,
});
pool.on("error", (error) => {
  console.error(`pg pool error (non-fatal for idle clients): ${error.message}`);
});
try {
  const telemetryPath =
    process.env.CAP1000_INSTALL_TELEMETRY ??
    `/tmp/s06-capacity-live-${args.fixture.toLowerCase()}-memory.jsonl`;
  const memory = createCapacityInstallMemoryRecorder(telemetryPath);
  memory.mark("process.start");
  memory.mark("before.storeOpen");
  const client = adapt(pool);
  // CAP1000 only: installer-scoped hydrate (omit historical audit; prefix-filter idempotency).
  // CAP600 keeps default PostgresPlatformStore.open() — scoped mode is opt-in.
  const store =
    args.fixture === "CAP1000"
      ? await openCapacityInstallPostgresStore(client, {
          idempotencyKeyLike: CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
          omitHistoricalAudit: true,
        })
      : await PostgresPlatformStore.open(client);
  memory.mark("after.storeOpen");
  if (args.fixture === "CAP1000") {
    const costs = await measurePlatformCollectionCosts(client);
    const mem = process.memoryUsage();
    const costsPath =
      process.env.CAP1000_COLLECTION_COSTS_PATH ??
      join(
        process.cwd(),
        "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS_AT_HYDRATE.jsonl",
      );
    writePlatformCollectionCostsArtifact(costsPath, {
      at: costs.at,
      stage: "after.storeOpen",
      rows: costs.rows,
      rss: mem.rss,
      heapUsed: mem.heapUsed,
    });
    memory.mark("after.collectionCosts", {
      collectionCounts: Object.fromEntries(
        costs.rows.slice(0, 8).map((row) => [`${row.source}:${row.key}`, row.rowCount]),
      ),
    });
  }
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  memory.mark("after.seed");

  const result = await installCapacityLiveFixture(seeded.service, store, {
    fixture: args.fixture,
    confirmSyntheticQualification: true,
    dryRun: args.dryRun,
    verifyOnly: args.verifyOnly,
    env: process.env,
    productionAuthorised: false,
    providersInactive: true,
    communicationsInactive: true,
    realDataMode: false,
    expectedCorpusHash: args.fixture === "CAP600" ? ACCEPTED_CAP600_CORPUS_HASHES.B_TYPICAL : undefined,
    guestFlushEvery: args.guestFlushEvery,
    memory,
    onProgress: (message) => process.stdout.write(`${message}\n`),
  });
  memory.mark("process.complete");
  if (args.fixture === "CAP1000") {
    const costs = await measurePlatformCollectionCosts(client);
    const mem = process.memoryUsage();
    const costsPath =
      process.env.CAP1000_COLLECTION_COSTS_PEAK_PATH ??
      join(
        process.cwd(),
        "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS_AT_COMPLETE.jsonl",
      );
    writePlatformCollectionCostsArtifact(costsPath, {
      at: costs.at,
      stage: "process.complete",
      rows: costs.rows,
      rss: mem.rss,
      heapUsed: mem.heapUsed,
    });
  }

  const manifestDir = args.manifestDir ?? `/tmp/s06-capacity-live-${args.fixture.toLowerCase()}`;
  mkdirSync(manifestDir, { recursive: true });
  const manifestPath = join(manifestDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ ...result, manifestPath, telemetryPath }, null, 2));
  console.log(JSON.stringify({ ok: true, manifest: manifestPath, telemetryPath, result }, null, 2));
} finally {
  await pool.end();
}
