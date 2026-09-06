#!/usr/bin/env node
/**
 * Isolated Postgres concurrency probe. Requires EVENT_OS_PERSISTENCE_IT=1.
 * Uses synthetic IDs in the ffff namespace and always removes them.
 */
import { Pool } from "pg";
import {
  PlatformError,
  PostgresPlatformStore,
  SCHEMA_VERSION,
  type Client,
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

const STALE_ID = "00000000-0000-4000-8000-ffff00000011";
const PARTIAL_ID = "00000000-0000-4000-8000-ffff00000012";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

function isolatedClient(id: string, displayName: string, version = 1): Client {
  return {
    id,
    organisationId: ORG_ID,
    code: `IT${id.slice(-4)}`,
    displayName,
    status: "ACTIVE",
    schemaVersion: SCHEMA_VERSION,
    version,
    createdAt: "2026-09-06T19:00:00.000Z",
    updatedAt: "2026-09-06T19:00:00.000Z",
    nonProductionFixture: true,
  };
}

if (process.env.EVENT_OS_PERSISTENCE_IT !== "1") {
  console.error("Set EVENT_OS_PERSISTENCE_IT=1 to run the isolated concurrency probe.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Secrets are not printed.");
  process.exit(1);
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

async function removeIsolated(store: PostgresPlatformStore): Promise<void> {
  const snap = store.snapshot();
  const next = {
    ...snap,
    clients: snap.clients.filter((item) => item.id !== STALE_ID && item.id !== PARTIAL_ID),
  };
  if (next.clients.length !== snap.clients.length) {
    store.replace(next);
    await store.flush();
  }
}

try {
  const writerA = await PostgresPlatformStore.open(client);
  await removeIsolated(writerA);
  const seeded = writerA.snapshot();
  seeded.clients.push(isolatedClient(STALE_ID, "Shared Isolated"));
  await writerA.replaceAsync(seeded);

  const writerB = await PostgresPlatformStore.open(client);
  const updated = writerA.snapshot();
  const target = updated.clients.find((item) => item.id === STALE_ID);
  if (!target) throw new Error("isolated record missing after insert");
  target.displayName = "Writer A Durable";
  target.version += 1;
  await writerA.replaceAsync(updated);

  const stale = writerB.snapshot();
  stale.clients = stale.clients.filter((item) => item.id !== STALE_ID);
  stale.clients.push(isolatedClient(PARTIAL_ID, "Partial Write Must Not Survive"));
  let conflicted = false;
  try {
    await writerB.replaceAsync(stale);
  } catch (error) {
    conflicted = error instanceof PlatformError && error.code === "VERSION_CONFLICT";
    if (!conflicted) throw error;
  }
  const durable = await PostgresPlatformStore.open(client);
  const remaining = durable.snapshot().clients.find((item) => item.id === STALE_ID);
  const leaked = durable.snapshot().clients.some((item) => item.id === PARTIAL_ID);
  await removeIsolated(durable);
  console.log(
    JSON.stringify(
      {
        conflicted,
        durableName: remaining?.displayName ?? null,
        partialSurvived: leaked,
        cleaned: true,
      },
      null,
      2,
    ),
  );
  if (!conflicted || remaining?.displayName !== "Writer A Durable" || leaked) {
    process.exit(1);
  }
} finally {
  await pool.end();
}
