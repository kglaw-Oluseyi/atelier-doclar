import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryPg } from "@maison-doclar/programme-domain";
import { openLiveRuntime, snapshotFromRuntime, PostgresAuditRepository, PostgresDeliveryJournal } from "../src/live-runtime.js";

describe("live postgres runtime", () => {
  it("seeds corpus events once and projects Foundation review state", async () => {
    const db = new MemoryPg();
    const first = await openLiveRuntime(db);
    const second = await openLiveRuntime(db);
    assert.equal(first.postgres.eventCount(), second.postgres.eventCount());
    assert.equal(first.persistence, "AVAILABLE");
    assert.equal(first.productionStatus, "PRODUCTION");
    const view = snapshotFromRuntime(first, "2026-09-05T17:10:00.000Z");
    assert.equal(view.statuses["MD-FC1"], "IN_REVIEW");
    assert.equal(view.statuses["MD-LV1"], "IN_REVIEW");
    assert.equal(view.statuses["MD-HV1"], "IN_REVIEW");
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S03"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S04"], "ACCEPTED");
    assert.equal(Object.values(view.statuses).filter((status) => status === "ACCEPTED").length, 4);
    assert.equal(view.freshness.source, "postgres");
  });

  it("stores audit and delivery records durably", async () => {
    const db = new MemoryPg();
    await openLiveRuntime(db);
    const audit = new PostgresAuditRepository(db);
    await audit.appendAsync({
      id: "AUD-LV1-1",
      at: "2026-09-05T17:10:00.000Z",
      actorId: "named-reviewer",
      action: "GATE_APPROVAL_ATTEMPT",
      targetId: "GATE-CEO-PRODUCTION",
      result: "rejected",
      reason: "PROTECTED_GATE",
    });
    await audit.hydrate();
    assert.equal(audit.list()[0]?.id, "AUD-LV1-1");
    const journal = new PostgresDeliveryJournal(db);
    await journal.remember("delivery-1");
    assert.equal(await journal.has("delivery-1"), true);
    assert.deepEqual(await journal.list(), ["delivery-1"]);
  });
});
