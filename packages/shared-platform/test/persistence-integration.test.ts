import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actor, people } from "./helpers.js";
import { PlatformError } from "../src/errors.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import {
  SYNTHETIC_CLEANUP_CONFIRMATION,
  applySyntheticCleanup,
  assertCleanupConfirmation,
  previewSyntheticCleanup,
  recordCleanupAudit,
} from "../src/synthetic-cleanup.js";
import { SYNTHETIC_SEED_VERSION, applySyntheticSeedIfNeeded } from "../src/synthetic-seed.js";

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
    store.replace(cleaned);
    await store.flush();
    await recordCleanupAudit(db, { ...preview, mode: "EXECUTED" }, { mode: "EXECUTED", confirmed: true });
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(previewSyntheticCleanup(reopened.snapshot()).total, 0);
    assert.equal(db.cleanup.some((row) => row.mode === "PREVIEW" && row.confirmed === false), true);
    assert.equal(db.cleanup.some((row) => row.mode === "EXECUTED" && row.confirmed === true), true);
  });

  it("fails closed when a migration cannot apply", async () => {
    const db = new MemoryPlatformPg();
    db.failNextWrite();
    await assert.rejects(() => runPlatformMigrations(db), /failed closed/);
    const memory = new MemoryPlatformStore();
    assert.equal(memory.productionStatus, "NON_PRODUCTION");
  });
});
