import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
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
    assert.equal((await PostgresPlatformStore.open(db)).snapshot().audit.length, auditCount + 1);
  });
});
