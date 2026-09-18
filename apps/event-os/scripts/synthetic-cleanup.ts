#!/usr/bin/env node
/**
 * Controlled synthetic-data cleanup for Event OS Postgres.
 * Default mode is preview / dry-run. Destructive execution requires
 * --execute --confirm SYNTHETIC_CLEANUP_CONFIRMED and the atelier-doclar
 * Railway project identity.
 *
 * --execute runs risk purge + synthetic document deletion + EXECUTED audit
 * receipt inside one database transaction (see executeSyntheticCleanupAtomically).
 */
import { Pool } from "pg";
import {
  PostgresPlatformStore,
  SYNTHETIC_CLEANUP_CONFIRMATION,
  assertCleanupConfirmation,
  assertCleanupProjectScope,
  classifySyntheticCleanupAttribution,
  executeSyntheticCleanupAtomically,
  previewSyntheticCleanup,
  recordCleanupAudit,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

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

const execute = process.argv.includes("--execute");
const confirmIndex = process.argv.indexOf("--confirm");
const confirmation = confirmIndex >= 0 ? process.argv[confirmIndex + 1] : "";

assertCleanupProjectScope(process.env, { execute });

if (!process.env.DATABASE_URL) {
  if (process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_ENVIRONMENT) {
    console.error("DATABASE_URL is required. Secrets are not printed.");
    process.exit(1);
  }
  if (execute) {
    console.error("Destructive cleanup cannot run without DATABASE_URL. Secrets are not printed.");
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        mode: "PREVIEW",
        destructive: false,
        database: "UNAVAILABLE",
        total: 0,
        collections: [],
        confirmationRequired: SYNTHETIC_CLEANUP_CONFIRMATION,
      },
      null,
      2,
    ),
  );
  console.log("Dry-run only. No database was opened and no synthetic records were deleted.");
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
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

try {
  const store = await PostgresPlatformStore.open(client);
  const snapshot = store.snapshot();
  const preview = previewSyntheticCleanup(snapshot);
  const attribution = classifySyntheticCleanupAttribution(snapshot);
  console.log(
    JSON.stringify(
      {
        mode: execute ? "EXECUTE_REQUESTED" : "PREVIEW",
        destructive: false,
        total: preview.total,
        collections: preview.collections,
        attribution: {
          safelyIncluded: attribution.safelyIncluded.reduce((sum, item) => sum + item.count, 0),
          intentionallyPreserved: attribution.intentionallyPreserved.reduce((sum, item) => sum + item.count, 0),
          notCurrentlyAttributable: attribution.notCurrentlyAttributable.reduce((sum, item) => sum + item.count, 0),
          remediationRequired: attribution.remediationRequired.map((item) => item.id),
        },
        confirmationRequired: SYNTHETIC_CLEANUP_CONFIRMATION,
      },
      null,
      2,
    ),
  );
  await recordCleanupAudit(client, preview, { mode: "PREVIEW", confirmed: false });
  if (!execute) {
    console.log("Dry-run only. No synthetic records were deleted.");
    process.exit(0);
  }
  assertCleanupConfirmation(confirmation ?? "");
  await executeSyntheticCleanupAtomically(store, preview);
  console.log(JSON.stringify({ mode: "EXECUTED", destructive: true, removed: preview.total }, null, 2));
} finally {
  await pool.end();
}
