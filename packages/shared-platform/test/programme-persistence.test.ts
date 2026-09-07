import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixturesIfMissing } from "../src/addressing-fixtures.js";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { EOS_S04B_MIGRATION_CHECKSUM, migrateEosS04B, rollbackEosS04B } from "../src/programme-migration.js";
import { validateS04BPersistedCollections } from "../src/programme-persistence.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { applySyntheticSeedIfNeeded } from "../src/synthetic-seed.js";
import { people } from "./helpers.js";

describe("EOS-S04B persistence", () => {
  it("migrates default phases on Postgres, survives reopen, and checksum-protects the receipt", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    validateS04BPersistedCollections(store.snapshot());
    assert.ok(store.snapshot().programmePhases.some((item) => item.eventId === people.eventAlphaOne));
    const receipt = store.snapshot().s04bMigrationReceipts[0];
    assert.ok(receipt);
    assert.equal(receipt?.checksum, EOS_S04B_MIGRATION_CHECKSUM);
    const reopened = await PostgresPlatformStore.open(db);
    assert.ok(reopened.snapshot().programmePhases.length >= store.snapshot().programmePhases.length);
  });

  it("refuses rollback after later entitlements and never truncates accepted events", () => {
    const store = new MemoryPlatformStore();
    loadNonProductionFixtures(store);
    store.replace(applyS04AFixturesIfMissing(store.snapshot()));
    const migrated = migrateEosS04B(store.snapshot(), "2026-09-07T10:00:00.000Z");
    assert.equal(migrated.status, "APPLIED");
    store.replace(applyS04BFixturesIfMissing(migrated.snapshot));
    const eventCount = store.snapshot().events.length;
    const refused = rollbackEosS04B(store.snapshot(), "2026-09-07T12:00:00.000Z");
    assert.equal(refused.status, "FAILED");
    assert.equal(store.snapshot().events.length, eventCount);
  });
});
