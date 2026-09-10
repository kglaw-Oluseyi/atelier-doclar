import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actor, fixtureService, people } from "./helpers.js";
import { PlatformError } from "../src/errors.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import { SCHEMA_VERSION } from "../src/constants.js";
import {
  EVENT_OS_CLEANUP_PROJECT_ID,
  EVENT_OS_CLEANUP_PROJECT_NAME,
  SYNTHETIC_CLEANUP_CONFIRMATION,
  applySyntheticCleanup,
  purgeNormalizedRiskTables,
  assertCleanupConfirmation,
  assertCleanupProjectScope,
  classifySyntheticCleanupAttribution,
  previewSyntheticCleanup,
  recordCleanupAudit,
} from "../src/synthetic-cleanup.js";
import { applyS04AFixturesIfMissing } from "../src/addressing-fixtures.js";
import { SYNTHETIC_SEED_VERSION, applySyntheticSeedIfNeeded } from "../src/synthetic-seed.js";
import type { Client } from "../src/schemas.js";

const ISOLATED = {
  stale: "00000000-0000-4000-8000-ffff00000001",
  partial: "00000000-0000-4000-8000-ffff00000002",
  ordinary: "00000000-0000-4000-8000-ffff00000003",
  concurrent: "00000000-0000-4000-8000-ffff00000004",
} as const;

function isolatedClient(id: string, displayName: string, version = 1): Client {
  return {
    id,
    organisationId: people.orgMaison,
    code: `ISO${id.slice(-4)}`,
    displayName,
    status: "ACTIVE",
    schemaVersion: SCHEMA_VERSION,
    version,
    createdAt: "2026-09-06T18:00:00.000Z",
    updatedAt: "2026-09-06T18:00:00.000Z",
    nonProductionFixture: true,
  };
}

describe("platform persistence integration", () => {
  it("migrates, survives reopen, and replays seed idempotently", async () => {
    const db = new MemoryPlatformPg();
    const first = await PostgresPlatformStore.open(db);
    const seeded = await applySyntheticSeedIfNeeded(first, db);
    await first.flush();
    assert.equal(seeded.seed.applied, true);
    assert.equal(seeded.seed.seedVersion, SYNTHETIC_SEED_VERSION);
    const organisations = first.snapshot().organisations.length;
    const guests = first.snapshot().operationalGuests.length;
    assert.ok(organisations >= 2);
    assert.ok(guests >= 1);

    const replay = await applySyntheticSeedIfNeeded(first, db);
    await first.flush();
    assert.equal(replay.seed.replayed, true);
    assert.equal(first.snapshot().organisations.length, organisations);
    assert.equal(first.snapshot().operationalGuests.length, guests);

    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(reopened.productionStatus, "PRODUCTION");
    assert.equal(reopened.snapshot().organisations.length, organisations);
    assert.equal(reopened.snapshot().operationalGuests.length, guests);
    assert.equal(db.migrations.length, PLATFORM_MIGRATIONS.length);
  });

  it("rolls back a failed transactional write", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    const before = store.snapshot().clients.length;
    db.failNextWrite();
    const next = store.snapshot();
    next.clients.push({
      ...next.clients[0]!,
      id: "00000000-0000-4000-8000-000000009901",
      displayName: "Should Roll Back",
    });
    await assert.rejects(() => store.replaceAsync(next), /synthetic write failure/);
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(reopened.snapshot().clients.length, before);
  });

  it("fails optimistic conflicts safely at the persistence boundary", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    const first = store.snapshot();
    const second = store.snapshot();
    const target = first.clients.find((item) => item.id === people.clientAlpha);
    assert.ok(target);
    target.displayName = "First Writer";
    target.version += 1;
    await store.replaceAsync(first);
    const stale = second.clients.find((item) => item.id === people.clientAlpha);
    assert.ok(stale);
    stale.displayName = "Second Writer";
    stale.version += 1;
    await assert.rejects(
      () => store.replaceAsync(second),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(reopened.snapshot().clients.find((item) => item.id === people.clientAlpha)?.displayName, "First Writer");
  });

  it("fails closed on cross-event references after durable persist", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    const { service } = await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    const planner = actor(people.personPlanner);
    assert.throws(
      () => service.getEvent(planner, people.orgMaison, people.eventAlphaTwo),
      (error: unknown) => error instanceof PlatformError,
    );
    assert.throws(
      () =>
        service.createEvent(actor(people.personCeo), {
          organisationId: people.orgMaison,
          clientId: people.clientOther,
          code: "X1",
          name: "Leak",
          startsAt: "2026-12-01T09:00:00.000Z",
          endsAt: "2026-12-01T18:00:00.000Z",
          timezone: "Africa/Lagos",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    await store.flush();
  });

  it("keeps cleanup dry-run non-destructive and requires confirmation", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    const before = store.snapshot();
    const preview = previewSyntheticCleanup(before);
    assert.equal(preview.destructive, false);
    assert.ok(preview.total > 0);
    await recordCleanupAudit(db, preview, { mode: "PREVIEW", confirmed: false });
    assert.equal(store.snapshot().organisations.length, before.organisations.length);
    assert.throws(() => assertCleanupConfirmation("no"), /explicit confirmation/);
    assertCleanupConfirmation(SYNTHETIC_CLEANUP_CONFIRMATION);
    const cleaned = applySyntheticCleanup(before);
    const afterPreview = previewSyntheticCleanup(cleaned);
    assert.equal(afterPreview.total, 0);
    await purgeNormalizedRiskTables(db);
    store.replace(cleaned);
    await store.flush();
    await recordCleanupAudit(db, { ...preview, mode: "EXECUTED" }, { mode: "EXECUTED", confirmed: true });
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(previewSyntheticCleanup(reopened.snapshot()).total, 0);
    assert.equal(db.cleanup.some((row) => row.mode === "PREVIEW" && row.confirmed === false), true);
    assert.equal(db.cleanup.some((row) => row.mode === "EXECUTED" && row.confirmed === true), true);
  });

  it("rejects a stale delete at the SQL row-count boundary and rehydrates", async () => {
    const db = new MemoryPlatformPg();
    const writerA = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(writerA, db);
    await writerA.flush();
    const seeded = writerA.snapshot();
    seeded.clients.push(isolatedClient(ISOLATED.stale, "Shared Isolated"));
    await writerA.replaceAsync(seeded);

    const writerB = await PostgresPlatformStore.open(db);
    const observedA = writerA.snapshot().clients.find((item) => item.id === ISOLATED.stale);
    const observedB = writerB.snapshot().clients.find((item) => item.id === ISOLATED.stale);
    assert.ok(observedA);
    assert.ok(observedB);
    assert.equal(observedA.version, observedB.version);
    assert.equal(observedA.displayName, observedB.displayName);

    const updated = writerA.snapshot();
    const target = updated.clients.find((item) => item.id === ISOLATED.stale);
    assert.ok(target);
    target.displayName = "Writer A Durable";
    target.version += 1;
    target.updatedAt = "2026-09-06T18:05:00.000Z";
    await writerA.replaceAsync(updated);

    const stale = writerB.snapshot();
    stale.clients = stale.clients.filter((item) => item.id !== ISOLATED.stale);
    stale.clients.push(isolatedClient(ISOLATED.partial, "Partial Write Must Not Survive"));
    await assert.rejects(
      () => writerB.replaceAsync(stale),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );

    assert.equal(writerB.snapshot().clients.find((item) => item.id === ISOLATED.stale)?.displayName, "Writer A Durable");
    assert.equal(writerB.snapshot().clients.some((item) => item.id === ISOLATED.partial), false);
    const durable = await PostgresPlatformStore.open(db);
    assert.equal(durable.snapshot().clients.find((item) => item.id === ISOLATED.stale)?.displayName, "Writer A Durable");
    assert.equal(durable.snapshot().clients.some((item) => item.id === ISOLATED.partial), false);
    assert.equal(db.documents.some((row) => row.id === ISOLATED.partial), false);
  });

  it("deletes the current persisted version and treats concurrent delete/delete as idempotent", async () => {
    const db = new MemoryPlatformPg();
    const writerA = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(writerA, db);
    await writerA.flush();
    const withOrdinary = writerA.snapshot();
    withOrdinary.clients.push(isolatedClient(ISOLATED.ordinary, "Current Version Delete"));
    withOrdinary.clients.push(isolatedClient(ISOLATED.concurrent, "Concurrent Delete"));
    await writerA.replaceAsync(withOrdinary);

    const current = writerA.snapshot();
    current.clients = current.clients.filter((item) => item.id !== ISOLATED.ordinary);
    await writerA.replaceAsync(current);
    assert.equal(writerA.snapshot().clients.some((item) => item.id === ISOLATED.ordinary), false);
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(reopened.snapshot().clients.some((item) => item.id === ISOLATED.ordinary), false);

    const writerB = await PostgresPlatformStore.open(db);
    const deleteA = writerA.snapshot();
    const deleteB = writerB.snapshot();
    assert.equal(deleteA.clients.some((item) => item.id === ISOLATED.concurrent), true);
    assert.equal(deleteB.clients.some((item) => item.id === ISOLATED.concurrent), true);
    deleteA.clients = deleteA.clients.filter((item) => item.id !== ISOLATED.concurrent);
    deleteB.clients = deleteB.clients.filter((item) => item.id !== ISOLATED.concurrent);
    await writerA.replaceAsync(deleteA);
    await writerB.replaceAsync(deleteB);
    assert.equal(writerB.snapshot().clients.some((item) => item.id === ISOLATED.concurrent), false);
    const afterBoth = await PostgresPlatformStore.open(db);
    assert.equal(afterBoth.snapshot().clients.some((item) => item.id === ISOLATED.concurrent), false);
  });

  it("forbids an unversioned document delete in the SQL emulator", async () => {
    const db = new MemoryPlatformPg();
    await assert.rejects(
      () => db.query("DELETE FROM platform_documents WHERE collection=$1 AND id=$2", ["clients", ISOLATED.stale]),
      /unversioned document delete is forbidden/,
    );
  });

  it("classifies cleanup attribution without treating seed-only cleanup as complete", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    const { service } = await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      familyName: "Browser",
      reason: "unmarked residue",
    });
    await store.flush();
    const report = classifySyntheticCleanupAttribution(store.snapshot());
    assert.ok(report.safelyIncluded.some((item) => item.collection === "organisations" && item.count >= 2));
    assert.ok(report.intentionallyPreserved.some((item) => item.collection === "audit"));
    assert.ok(report.intentionallyPreserved.some((item) => item.collection === "roles"));
    assert.ok(report.notCurrentlyAttributable.some((item) => item.collection === "operationalGuests" && item.count >= 1));
    assert.equal(report.remediationRequired[0]?.id, "TDR-S04A-011");
    assertCleanupProjectScope({ EVENT_OS_CLEANUP_SCOPE: EVENT_OS_CLEANUP_PROJECT_NAME }, { execute: false });
    assertCleanupProjectScope(
      { RAILWAY_PROJECT_ID: EVENT_OS_CLEANUP_PROJECT_ID, RAILWAY_PROJECT_NAME: EVENT_OS_CLEANUP_PROJECT_NAME },
      { execute: true },
    );
    assert.throws(
      () => assertCleanupProjectScope({ RAILWAY_PROJECT_ID: "other-project" }, { execute: false }),
      /not atelier-doclar/,
    );
    assert.throws(
      () => assertCleanupProjectScope({ EVENT_OS_CLEANUP_SCOPE: EVENT_OS_CLEANUP_PROJECT_NAME }, { execute: true }),
      /can only run on Railway project/,
    );
  });

  it("stamps RSVP guest sessions whose parent guest is a fixture", () => {
    const { service, store } = fixtureService();
    store.replace(applyS04AFixturesIfMissing(store.snapshot()));
    const guest = store.snapshot().operationalGuests.find((item) => item.nonProductionFixture);
    assert.ok(guest);
    service.prepareEventRsvp(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      reason: "lineage prepare",
    });
    const invitation = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "lineage issue",
    });
    service.exchangeGuestAccess(invitation.token);
    const session = store.snapshot().rsvpGuestSessions.find((item) => item.guestId === guest.id);
    assert.equal(session?.nonProductionFixture, true);
  });

  it("fails closed when a migration cannot apply", async () => {
    const db = new MemoryPlatformPg();
    db.failNextWrite();
    await assert.rejects(() => runPlatformMigrations(db), /failed closed/);
    const memory = new MemoryPlatformStore();
    assert.equal(memory.productionStatus, "NON_PRODUCTION");
  });
});
