/**
 * Synthetic cleanup atomicity — ephemeral PostgreSQL.
 * Proves risk purge + document deletes + EXECUTED audit share one transaction.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_OS_CLEANUP_PROJECT_ID,
  EVENT_OS_CLEANUP_PROJECT_NAME,
  PostgresPlatformStore,
  applySyntheticCleanup,
  applySyntheticSeedIfNeeded,
  executeSyntheticCleanupAtomically,
  previewSyntheticCleanup,
  purgeNormalizedRiskTables,
  recordCleanupAudit,
  type PgQueryable,
} from "../src/index.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `synth_cleanup_atomic_${Date.now().toString(36)}`;
const ADMIN_URL =
  process.env.SYNTHETIC_CLEANUP_ATOMIC_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL =
  process.env.SYNTHETIC_CLEANUP_ATOMIC_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: InstanceType<typeof pg.Pool>;

function adapt(queryable: {
  query: (text: string, values?: unknown[]) => Promise<{ rows: object[]; rowCount?: number | null }>;
}): PgQueryable {
  return {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await queryable.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
}

function transactionalClient(p: InstanceType<typeof pg.Pool>) {
  return {
    ...adapt(p),
    async transaction<T>(fn: (queryable: PgQueryable) => Promise<T>): Promise<T> {
      const connected = await p.connect();
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
}

async function countSyntheticDocs(client: PgQueryable): Promise<number> {
  const result = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM platform_documents WHERE (body->>'nonProductionFixture')::boolean IS TRUE`,
  );
  return Number(result.rows[0]?.n ?? 0);
}

async function countExecutedAudits(client: PgQueryable): Promise<number> {
  const result = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM platform_cleanup_audit WHERE mode = 'EXECUTED' AND confirmed = true`,
  );
  return Number(result.rows[0]?.n ?? 0);
}

describe("synthetic cleanup atomicity (ephemeral Postgres)", { concurrency: false }, () => {
  before(async () => {
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: TEST_URL, max: 4 });
    process.env.RAILWAY_PROJECT_ID = EVENT_OS_CLEANUP_PROJECT_ID;
    process.env.RAILWAY_PROJECT_NAME = EVENT_OS_CLEANUP_PROJECT_NAME;
  });

  after(async () => {
    await pool?.end();
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.end();
  });

  it("rolls back deletes and leaves no EXECUTED audit when afterPersist throws", async () => {
    const client = transactionalClient(pool);
    const store = await PostgresPlatformStore.open(client);
    await applySyntheticSeedIfNeeded(store, client);
    await store.flush();
    const preview = previewSyntheticCleanup(store.snapshot());
    assert.ok(preview.total > 0, "seed must produce synthetic fixtures");
    // platform_documents count can be < preview.total when S05B risk-normalized
    // collections live in dedicated tables (same purge path, separate storage).
    const docsBefore = await countSyntheticDocs(client);
    assert.ok(docsBefore > 0, "seeded fixtures must exist in platform_documents");
    const executedBefore = await countExecutedAudits(client);
    let deletedInsideTx = -1;

    const cleaned = applySyntheticCleanup(store.snapshot());
    await assert.rejects(
      () =>
        store.replaceAndPersistForSyntheticCleanup(cleaned, {
          beforePersist: (tx) => purgeNormalizedRiskTables(tx),
          afterPersist: async (tx) => {
            deletedInsideTx = await countSyntheticDocs(tx);
            throw new Error("injected failure after deletes before EXECUTED audit");
          },
        }),
      /injected failure after deletes before EXECUTED audit/,
    );

    assert.equal(deletedInsideTx, 0, "deletes must have run inside the transaction before the throw");
    const docsAfter = await countSyntheticDocs(client);
    const executedAfter = await countExecutedAudits(client);
    assert.equal(docsAfter, docsBefore, "synthetic documents must be restored by rollback");
    assert.equal(executedAfter, executedBefore, "no EXECUTED cleanup audit may persist");
    assert.equal(previewSyntheticCleanup(store.snapshot()).total, preview.total, "in-memory state rehydrated");
  });

  it("commits deletes and EXECUTED audit together on the success path", async () => {
    const client = transactionalClient(pool);
    const store = await PostgresPlatformStore.open(client);
    // Prior test left fixtures; re-seed if needed then clean atomically
    await applySyntheticSeedIfNeeded(store, client);
    await store.flush();
    const preview = previewSyntheticCleanup(store.snapshot());
    assert.ok(preview.total > 0);
    await recordCleanupAudit(client, preview, { mode: "PREVIEW", confirmed: false });

    await executeSyntheticCleanupAtomically(store, preview);

    assert.equal(await countSyntheticDocs(client), 0);
    assert.ok((await countExecutedAudits(client)) >= 1);
    assert.equal(previewSyntheticCleanup(store.snapshot()).total, 0);
    const modes = await client.query<{ mode: string; confirmed: boolean }>(
      `SELECT mode, confirmed FROM platform_cleanup_audit ORDER BY occurred_at`,
    );
    assert.ok(modes.rows.some((row) => row.mode === "EXECUTED" && row.confirmed === true));
  });
});
