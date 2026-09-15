#!/usr/bin/env node
/**
 * Idempotent EOS-S06 successor layout fixture provisioner for live Postgres.
 *
 * Usage:
 *   pnpm exec tsx scripts/provision-eos-s06-successor-fixture.ts --dry-run --event-id <uuid>
 *   pnpm exec tsx scripts/provision-eos-s06-successor-fixture.ts --execute --event-id <uuid>
 *
 * Default event: EOS_S06_S073_SUCCESSOR_EVENT_ID (Claude-inspected S073 seating event).
 * Creates CURRENT publications for Layout A + Layout B without forcing an ACTIVE binding.
 */
import { Pool } from "pg";
import {
  EOS_S06_S073_SUCCESSOR_EVENT_ID,
  EOS_S06_SUCCESSOR_LAYOUT_A_NAME,
  EOS_S06_SUCCESSOR_LAYOUT_B_NAME,
  FIXTURE_IDS,
  PostgresPlatformStore,
  PlatformService,
  ensureEosS06SuccessorLayoutFixtureForEvent,
  systemClock,
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
const eventIdFlag = process.argv.indexOf("--event-id");
const eventId = (eventIdFlag >= 0 ? process.argv[eventIdFlag + 1] : EOS_S06_S073_SUCCESSOR_EVENT_ID)?.trim();
if (!eventId) {
  console.error("event-id is required");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 12_000 });
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

function listCandidates(store: Awaited<ReturnType<typeof PostgresPlatformStore.open>>, targetEventId: string) {
  const snap = store.snapshot();
  return snap.layoutPublications
    .filter((item) => item.eventId === targetEventId && item.status === "CURRENT")
    .map((publication) => {
      const layout = snap.layouts.find((item) => item.id === publication.layoutId);
      const revision = snap.layoutRevisions.find(
        (item) => item.layoutId === publication.layoutId && item.revisionNumber === layout?.currentRevisionNumber,
      );
      const tableCount = (revision?.objects ?? []).filter((item) => item.objectType === "TABLE").length;
      return {
        layoutLabel: layout?.name ?? "Published layout",
        publicationId: publication.id,
        layoutId: publication.layoutId,
        publicationNumber: publication.publicationNumber,
        contentHashPrefix: publication.contentHash.slice(0, 12),
        tableCount,
        optionLabel: `${layout?.name ?? "Published layout"} · CURRENT publication ${publication.publicationNumber} · hash ${publication.contentHash.slice(0, 12)} · ${tableCount} tables`,
      };
    })
    .sort((left, right) => left.layoutLabel.localeCompare(right.layoutLabel));
}

try {
  const store = await PostgresPlatformStore.open(client);
  const before = listCandidates(store, eventId);
  const event = store.snapshot().events.find((item) => item.id === eventId);
  if (!event) {
    console.error(JSON.stringify({ ok: false, error: "EVENT_NOT_FOUND", eventId }));
    process.exit(1);
  }

  const dryRunPreview = {
    dryRun: !execute,
    eventId,
    eventName: event.name,
    organisationId: event.organisationId,
    before,
    wouldEnsure: [EOS_S06_SUCCESSOR_LAYOUT_A_NAME, EOS_S06_SUCCESSOR_LAYOUT_B_NAME],
  };

  if (!execute) {
    console.log(JSON.stringify(dryRunPreview, null, 2));
    process.exit(0);
  }

  const service = new PlatformService(store, { clock: systemClock });
  const ensured = ensureEosS06SuccessorLayoutFixtureForEvent(store, service, {
    organisationId: event.organisationId || FIXTURE_IDS.orgMaison,
    eventId,
    idempotencyNamespace: `s06-successor-${eventId.slice(0, 8)}`,
    seedMemoryBindingToA: false,
  });
  await store.flush();

  const afterStore = await PostgresPlatformStore.open(client);
  const after = listCandidates(afterStore, eventId);
  console.log(
    JSON.stringify(
      {
        dryRun: false,
        eventId,
        eventName: event.name,
        ensured,
        before,
        after,
        hasLayoutA: after.some((item) => item.layoutLabel === EOS_S06_SUCCESSOR_LAYOUT_A_NAME),
        hasLayoutB: after.some((item) => item.layoutLabel === EOS_S06_SUCCESSOR_LAYOUT_B_NAME),
        ok:
          after.some((item) => item.layoutLabel === EOS_S06_SUCCESSOR_LAYOUT_A_NAME) &&
          after.some((item) => item.layoutLabel === EOS_S06_SUCCESSOR_LAYOUT_B_NAME),
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
