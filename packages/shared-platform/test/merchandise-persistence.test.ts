import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures } from "../src/addressing-fixtures.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { applyEosS04BToSnapshot } from "../src/programme-migration.js";
import { applyS04CFixturesIfMissing } from "../src/merchandise-fixtures.js";
import { EOS_S04C_MIGRATION_CHECKSUM, migrateEosS04C, rollbackEosS04C } from "../src/merchandise-migration.js";
import { validateS04CPersistedCollections } from "../src/merchandise-persistence.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { loadNonProductionFixtures } from "../src/bootstrap.js";

describe("EOS-S04C persistence", () => {
  it("applies, replays and checksum-protects the additive merchandise migration", () => {
    const store = new MemoryPlatformStore();
    loadNonProductionFixtures(store);
    store.replace(applyS04AFixtures(store.snapshot()));
    store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
    store.replace(applyS04BFixturesIfMissing(store.snapshot()));
    const first = migrateEosS04C(store.snapshot(), "2026-09-07T12:00:00.000Z");
    assert.equal(first.status, "APPLIED");
    assert.equal(first.receipt?.checksum, EOS_S04C_MIGRATION_CHECKSUM);
    store.replace(first.snapshot);
    validateS04CPersistedCollections(store.snapshot());
    const replayed = migrateEosS04C(store.snapshot(), "2026-09-07T12:05:00.000Z");
    assert.equal(replayed.status, "REPLAYED");
    store.replace(applyS04CFixturesIfMissing(store.snapshot()));
    const refused = rollbackEosS04C(store.snapshot(), "2026-09-07T13:00:00.000Z");
    assert.equal(refused.status, "FAILED");
  });
});
