import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EOS_S04E_MIGRATION_CHECKSUM } from "../src/atelier-migration.js";
import { validateS04EPersistedCollections } from "../src/atelier-persistence.js";
import { S04E_FIXTURE_IDS } from "../src/atelier-fixtures.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
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

  it("persists published edition lineage and host canDecide across reopen", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    const { service } = await applySyntheticSeedIfNeeded(store, db);
    const director = {
      personId: FIXTURE_IDS.personDirector,
      correlationId: "pg-s04e",
      now: "2026-09-07T19:00:00.000Z",
    };
    service.publishEventAtelier(director, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      reason: "Reveal on Postgres",
    });
    const first = service.publishAtelierNarrative(director, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      story: "Postgres first published telling.",
      atmosphere: "Held rooms.",
      pillars: ["Lineage"],
      culturalIntent: "Private hospitality.",
      designDirection: "Sparse stills.",
      provenance: "PG-S04E-A1",
      reason: "First durable edition",
    });
    const second = service.publishAtelierNarrative(director, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      story: "Postgres second published telling.",
      atmosphere: "Held rooms.",
      pillars: ["Lineage"],
      culturalIntent: "Private hospitality.",
      designDirection: "Sparse stills.",
      provenance: "PG-S04E-A2",
      reason: "Second durable edition",
    });
    const issued = service.issueAtelierAccess(director, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      personId: S04E_FIXTURE_IDS.personPrincipal,
      hostRole: "PRINCIPAL_HOST",
      chapters: ["VISION", "DECISIONS"],
      canDecide: true,
      canExport: false,
      reason: "Persist decision authority",
    });
    await store.flush();
    const reopened = await PostgresPlatformStore.open(db);
    const editions = reopened.snapshot().eventNarrativeEditions.filter((item) => item.atelierId === S04E_FIXTURE_IDS.atelier);
    assert.ok(editions.some((item) => item.id === first.id && item.publicationState === "SUPERSEDED"));
    assert.ok(editions.some((item) => item.id === second.id && item.publicationState === "PUBLISHED"));
    assert.equal(second.supersedesEditionId, first.id);
    const grant = reopened.snapshot().atelierAccessGrants.find((item) => item.id === issued.grant.id);
    assert.equal(grant?.canDecide, true);
    assert.equal(grant?.hostRole, "PRINCIPAL_HOST");
  });
});
