/**
 * Seeds a dedicated 600-guest capacity qualification event into ephemeral CI Postgres.
 * Refuses Railway/production hosts. Writes manifest for Playwright browser evidence.
 *
 * Flushes Postgres periodically: queued replace() chains can swallow mid-flush
 * VERSION_CONFLICT errors, leaving related documents without the events row.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import {
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  applyCapacity600SeatingLayout,
  capacityBrowserGuestNames,
  CAPACITY_SCENARIO_SEEDS,
  FIXTURE_IDS,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const MANIFEST_DIR = process.env.CAPACITY_600_MANIFEST_DIR ?? "/tmp/s06-capacity-600";
const MANIFEST_PATH = join(MANIFEST_DIR, "manifest.json");
const GUEST_FLUSH_EVERY = Number(process.env.CAPACITY_600_GUEST_FLUSH_EVERY ?? "25");

function assertEphemeralDatabaseUrl(url: string | undefined): asserts url is string {
  if (!url?.trim()) throw new Error("DATABASE_URL is required for capacity-600 seed");
  if (/railway\.app|railway\.internal|amazonaws\.com|neon\.tech|supabase\.co/i.test(url)) {
    throw new Error("capacity-600 seed refuses remote/production database hosts");
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
  await store.flush();
  const service = seeded.service;
  const people = FIXTURE_IDS;
  const NOW = "2026-09-16T08:00:00.000Z";
  const ceo = { personId: people.personCeo, correlationId: "cap600-seed-ceo", now: NOW, actorKind: "HUMAN" as const };
  const planner = { personId: people.personPlanner, correlationId: "cap600-seed-planner", now: NOW, actorKind: "HUMAN" as const };
  const director = { personId: people.personDirector, correlationId: "cap600-seed-director", now: NOW, actorKind: "HUMAN" as const };
  const admin = { personId: people.personAdmin, correlationId: "cap600-seed-admin", now: NOW, actorKind: "HUMAN" as const };

  const event = service.createEvent(ceo, {
    organisationId: people.orgMaison,
    clientId: people.clientAlpha,
    code: "CAP600",
    name: "Capacity Qualification 600",
    startsAt: "2026-12-20T09:00:00.000Z",
    endsAt: "2026-12-20T22:00:00.000Z",
    timezone: "Africa/Lagos",
  });
  await store.flush();
  if (!store.loadEventById(event.id)) {
    throw new Error(`capacity-600 seed failed to persist event ${event.id}`);
  }

  const plannerGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personPlanner,
    roleKey: "PLANNER",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: "Capacity browser planner grant",
    idempotencyKey: "cap600-browser-grant-planner",
  });
  const directorGrant = service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personDirector,
    roleKey: "EVENT_DIRECTOR",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: "Capacity browser director grant",
    idempotencyKey: "cap600-browser-grant-director",
  });
  service.grantAssignment(admin, {
    organisationId: people.orgMaison,
    personId: people.personCeo,
    roleKey: "CEO",
    clientId: people.clientAlpha,
    eventId: event.id,
    reason: "Capacity browser CEO grant",
    idempotencyKey: "cap600-browser-grant-ceo",
  });
  await store.flush();

  service.prepareEventRsvp(director, {
    organisationId: people.orgMaison,
    eventId: event.id,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Capacity Qualification 600",
    reason: "EOS-S06 capacity browser seed",
    idempotencyKey: "cap600-browser-rsvp",
  });
  await store.flush();

  await applyCapacity600SeatingLayout(service, store, event.id, planner, director, "cap600-browser", {
    plannerAssignmentId: plannerGrant.id,
    directorAssignmentId: directorGrant.id,
  });
  await store.flush();

  const guestNames = capacityBrowserGuestNames();
  for (let index = 0; index < 600; index += 1) {
    const name = guestNames[index]!;
    const guest = service.intakeGuest(director, {
      organisationId: people.orgMaison,
      eventId: event.id,
      givenName: name.givenName,
      familyName: name.familyName,
      email: `${name.givenName.toLowerCase()}.${name.familyName.toLowerCase()}@cap600.example.test`,
      reason: "Capacity browser synthetic guest",
      idempotencyKey: `cap600-browser-guest-${index}-in`,
    });
    service.staffEnterRsvp(director, {
      organisationId: people.orgMaison,
      eventId: event.id,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "Capacity browser attending",
      idempotencyKey: `cap600-browser-guest-${index}-attend`,
    });
    if ((index + 1) % GUEST_FLUSH_EVERY === 0) {
      await store.flush();
      process.stdout.write(`capacity-600 seed guests flushed ${index + 1}/600\n`);
    }
  }
  await store.flush();

  const persistedEvent = store.loadEventById(event.id);
  if (!persistedEvent || persistedEvent.code !== "CAP600") {
    throw new Error(`capacity-600 seed missing persisted CAP600 event after guest flush (${event.id})`);
  }
  const guestCount = store.listOperationalGuestsByEventId(people.orgMaison, event.id).length;
  if (guestCount !== 600) {
    throw new Error(`capacity-600 seed expected 600 operational guests, found ${guestCount}`);
  }

  mkdirSync(MANIFEST_DIR, { recursive: true });
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        eventId: event.id,
        eventName: "Capacity Qualification 600",
        seatingPath: `/app/events/${event.id}/seating`,
        searchGuest: `${guestNames[42]!.givenName} ${guestNames[42]!.familyName}`,
        searchGuestIndex: 43,
        guestCount: 600,
        seed: CAPACITY_SCENARIO_SEEDS.B_TYPICAL,
        layoutProfile: "realistic-63-table-8-10-12",
        plannerAssignmentId: plannerGrant.id,
        directorAssignmentId: directorGrant.id,
        seededAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      ok: true,
      manifest: MANIFEST_PATH,
      guestCount: 600,
      eventId: event.id,
      plannerAssignmentId: plannerGrant.id,
    }),
  );
} finally {
  await pool.end();
}
