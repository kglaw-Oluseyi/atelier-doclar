import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EOS_S04E_MIGRATION_CHECKSUM } from "../src/atelier-migration.js";
import { validateS04EPersistedCollections } from "../src/atelier-persistence.js";
import { S04E_FIXTURE_IDS } from "../src/atelier-fixtures.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { applySyntheticSeedIfNeeded } from "../src/synthetic-seed.js";

describe("EOS-S04E persistence", () => {
  it("migrates atelier collections on Postgres, survives reopen, and checksum-protects the receipt", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    validateS04EPersistedCollections(store.snapshot());
    assert.ok(store.snapshot().eventAteliers.some((item) => item.id === S04E_FIXTURE_IDS.atelier));
    const receipt = store.snapshot().s04eMigrationReceipts[0];
    assert.ok(receipt);
    assert.equal(receipt?.checksum, EOS_S04E_MIGRATION_CHECKSUM);
    const permissionCount = store.snapshot().permissions.length;
    const replayed = await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    assert.equal(replayed.seed.replayed, true);
    assert.equal(store.snapshot().permissions.length, permissionCount);
    const reopened = await PostgresPlatformStore.open(db);
    assert.ok(reopened.snapshot().eventAteliers.some((item) => item.id === S04E_FIXTURE_IDS.atelier));
    assert.equal(reopened.snapshot().rsvpResponses.length, store.snapshot().rsvpResponses.length);
  });
});
