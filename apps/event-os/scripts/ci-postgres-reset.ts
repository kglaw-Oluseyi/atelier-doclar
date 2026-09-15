/**
 * Reset the ephemeral CI Postgres database to a clean migrated + synthetically seeded state.
 * Refuses Railway/production hosts. Does not weaken production fixture-file refusal.
 */
import { Pool } from "pg";
import {
  PostgresPlatformStore,
  applyS06SeatingLayoutIfMissing,
  applySyntheticSeedIfNeeded,
  ensureEosS06SuccessorLayoutFixture,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

function assertEphemeralDatabaseUrl(url: string | undefined): asserts url is string {
  if (!url?.trim()) throw new Error("DATABASE_URL is required for CI Postgres reset");
  if (/railway\.app|railway\.internal|amazonaws\.com|neon\.tech|supabase\.co|azure|cloudsql/i.test(url)) {
    throw new Error("CI Postgres reset refuses remote/production database hosts");
  }
  if (process.env.EVENT_OS_CI_POSTGRES !== "1") {
    throw new Error("CI Postgres reset requires EVENT_OS_CI_POSTGRES=1");
  }
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

const url = process.env.DATABASE_URL;
assertEphemeralDatabaseUrl(url);

const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 8_000 });
try {
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query("GRANT ALL ON SCHEMA public TO CURRENT_USER");
  await pool.query("GRANT ALL ON SCHEMA public TO public");

  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  try {
    applyS06SeatingLayoutIfMissing(store, seeded.service);
    ensureEosS06SuccessorLayoutFixture(store, seeded.service);
  } catch (error) {
    console.warn("ci-postgres-reset: seating layout seed warning", error instanceof Error ? error.message : error);
  }
  await store.flush();
  console.log(
    JSON.stringify({
      ok: true,
      persistence: "POSTGRES",
      seed: seeded.seed,
      organisations: store.snapshot().organisations.length,
      productionAuthorised: false,
    }),
  );
} finally {
  await pool.end();
}
