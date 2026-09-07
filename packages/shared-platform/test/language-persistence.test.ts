import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EOS_S04F_MIGRATION_CHECKSUM, EOS_S04F_MIGRATION_ID } from "../src/language-migration.js";
import { validateS04FPersistedCollections } from "../src/language-persistence.js";
import { S04F_FIXTURE_IDS } from "../src/language-fixtures.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { applySyntheticSeedIfNeeded } from "../src/synthetic-seed.js";
import { rollbackEosS04F } from "../src/language-migration.js";

describe("EOS-S04F persistence", () => {
  it("migrates language collections on Postgres, survives reopen, and checksum-protects the receipt", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    validateS04FPersistedCollections(store.snapshot());
    assert.ok(store.snapshot().contentWorks.some((item) => item.id === S04F_FIXTURE_IDS.workInvitation));
    const receipt = store.snapshot().s04fMigrationReceipts[0];
    assert.ok(receipt);
    assert.equal(receipt?.migrationId, EOS_S04F_MIGRATION_ID);
    assert.equal(receipt?.checksum, EOS_S04F_MIGRATION_CHECKSUM);
    const permissionCount = store.snapshot().permissions.length;
    const rsvpCount = store.snapshot().rsvpResponses.length;
    const replayed = await applySyntheticSeedIfNeeded(store, db);
    await store.flush();
    assert.equal(replayed.seed.replayed, true);
    assert.equal(store.snapshot().permissions.length, permissionCount);
    const reopened = await PostgresPlatformStore.open(db);
    assert.ok(reopened.snapshot().languageProfiles.some((item) => item.id === S04F_FIXTURE_IDS.profileOlufemi));
    assert.equal(reopened.snapshot().rsvpResponses.length, rsvpCount);
    assert.match(reopened.snapshot().contentBlocks.find((item) => item.id === S04F_FIXTURE_IDS.blockYoGreeting)?.exactText ?? "", /Ẹ/);
  });

  it("rolls back S04F collections without rewriting RSVP or campaigns", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    await applySyntheticSeedIfNeeded(store, db);
    const beforeRsvp = store.snapshot().rsvpResponses.length;
    const rolled = rollbackEosS04F(store.snapshot(), "2026-09-07T22:00:00.000Z");
    assert.equal(rolled.snapshot.languageProfiles.length, 0);
    assert.equal(rolled.snapshot.contentWorks.length, 0);
    assert.equal(rolled.snapshot.rsvpResponses.length, beforeRsvp);
    void FIXTURE_IDS.eventAlphaOne;
  });
});
