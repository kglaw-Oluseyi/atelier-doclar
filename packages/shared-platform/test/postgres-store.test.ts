import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { people } from "./helpers.js";

describe("postgres platform adapter", () => {
  it("migrates, persists shared records and keeps audit append-only", async () => {
    const memory = new MemoryPlatformStore();
    loadNonProductionFixtures(memory);
    const db = new MemoryPlatformPg();
    const first = await PostgresPlatformStore.open(db);
    await first.replaceAsync(memory.snapshot());
    const reopened = await PostgresPlatformStore.open(db);
    const snap = reopened.snapshot();
    assert.equal(snap.organisations.some((item) => item.id === people.orgMaison), true);
    assert.equal(snap.events.find((item) => item.id === people.eventAlphaOne)?.clientId, people.clientAlpha);
    assert.equal(
      snap.events.find((item) => item.id === people.eventAlphaOne)?.organisationId,
      people.orgMaison,
    );
    assert.equal(reopened.productionStatus, "PRODUCTION");
    const auditCount = snap.audit.length;
    snap.audit.push({
      ...snap.audit[0]!,
      id: "00000000-0000-4000-8000-000000009999",
      action: "test.append",
    });
    await reopened.replaceAsync(snap);
    assert.equal(reopened.snapshot().audit.length, auditCount + 1);
  });

  it("bounded layout and guest loaders agree between memory and postgres and reject foreign scope", async () => {
    const memory = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(memory);
    applyS06SeatingLayoutIfMissing(memory, service);
    const publication = memory
      .snapshot()
      .layoutPublications.find((item) => item.eventId === people.eventAlphaOne && item.status === "CURRENT");
    assert.ok(publication);
    const scoped = memory.loadLayoutPublicationById(publication.id, people.orgMaison, people.eventAlphaOne);
    assert.equal(scoped?.id, publication.id);
    assert.equal(memory.loadLayoutPublicationById(publication.id, people.orgOther, people.eventOther), undefined);
    const revision = memory.loadLayoutRevisionById(publication.revisionId, people.orgMaison, people.eventAlphaOne);
    assert.equal(revision?.id, publication.revisionId);
    assert.equal(memory.loadLayoutRevisionById(publication.revisionId, people.orgOther, people.eventOther), undefined);
    const current = memory.loadCurrentLayoutPublication(people.orgMaison, people.eventAlphaOne, publication.layoutId);
    assert.equal(current?.id, publication.id);
    const guests = memory.listOperationalGuestsByEventId(people.orgMaison, people.eventAlphaOne);
    assert.ok(guests.every((item) => item.organisationId === people.orgMaison && item.eventId === people.eventAlphaOne));
    const db = new MemoryPlatformPg();
    const postgres = await PostgresPlatformStore.open(db);
    await postgres.replaceAsync(memory.snapshot());
    assert.equal(
      postgres.loadLayoutPublicationById(publication.id, people.orgMaison, people.eventAlphaOne)?.contentHash,
      scoped?.contentHash,
    );
    assert.equal(postgres.loadLayoutPublicationById(publication.id, people.orgOther, people.eventOther), undefined);
    assert.equal(
      postgres.listOperationalGuestsByEventId(people.orgMaison, people.eventAlphaOne).length,
      guests.length,
    );
  });
});
