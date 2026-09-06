#!/usr/bin/env node
/**
 * Controlled synthetic-data cleanup for Event OS Postgres.
 * Default mode is preview / dry-run. Destructive execution requires
 * --execute --confirm SYNTHETIC_CLEANUP_CONFIRMED
 */
import { Pool } from "pg";
import {
  PostgresPlatformStore,
  applySyntheticCleanup,
  assertCleanupConfirmation,
  previewSyntheticCleanup,
  recordCleanupAudit,
  SYNTHETIC_CLEANUP_CONFIRMATION,
} from "@maison-doclar/shared-platform";

const execute = process.argv.includes("--execute");
const confirmIndex = process.argv.indexOf("--confirm");
const confirmation = confirmIndex >= 0 ? process.argv[confirmIndex + 1] : "";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Secrets are not printed.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 8_000 });
const client = {
  query: (text, values) => pool.query(text, values),
  async transaction(fn) {
    const connected = await pool.connect();
    try {
      await connected.query("BEGIN");
      const result = await fn({ query: (text, values) => connected.query(text, values) });
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
  const preview = previewSyntheticCleanup(store.snapshot());
  console.log(JSON.stringify({
    mode: execute ? "EXECUTE_REQUESTED" : "PREVIEW",
    destructive: false,
    total: preview.total,
    collections: preview.collections,
    confirmationRequired: SYNTHETIC_CLEANUP_CONFIRMATION,
  }, null, 2));
  await recordCleanupAudit(client, preview, { mode: "PREVIEW", confirmed: false });
  if (!execute) {
    console.log("Dry-run only. No synthetic records were deleted.");
    process.exit(0);
  }
  assertCleanupConfirmation(confirmation);
  store.replace(applySyntheticCleanup(store.snapshot()));
  await store.flush();
  await recordCleanupAudit(client, { ...preview, mode: "EXECUTED" }, { mode: "EXECUTED", confirmed: true });
  console.log(JSON.stringify({ mode: "EXECUTED", destructive: true, removed: preview.total }, null, 2));
} finally {
  await pool.end();
}
