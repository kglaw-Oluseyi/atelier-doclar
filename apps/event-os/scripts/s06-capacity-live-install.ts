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
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  installCapacityLiveFixture,
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
    } else if (arg === "--help" || arg === "-h") {
      console.log(`s06-capacity-live-install --fixture CAP600|CAP1000 --confirm-synthetic-qualification [--dry-run|--verify-only]`);
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

const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 12_000 });
try {
  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();

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
    onProgress: (message) => process.stdout.write(`${message}\n`),
  });

  const manifestDir = args.manifestDir ?? `/tmp/s06-capacity-live-${args.fixture.toLowerCase()}`;
  mkdirSync(manifestDir, { recursive: true });
  const manifestPath = join(manifestDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ ...result, manifestPath }, null, 2));
  console.log(JSON.stringify({ ok: true, manifest: manifestPath, result }, null, 2));
} finally {
  await pool.end();
}
