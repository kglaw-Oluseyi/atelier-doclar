import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CORPUS_SEED_TIME, corpusSeedEvents, createEngine, loadCorpusBaseline } from "../src/index.js";
import { MemoryPg, PostgresProgrammeStore } from "../src/postgres-store.js";
import { MemoryProgrammeStore } from "../src/store.js";
import { VALID_COMMIT, VALID_TIME } from "./helpers.js";
import { makeEvent } from "./event-helpers.js";

describe("PostgreSQL programme store", () => {
  it("migrates, appends, is idempotent and reconstructs", async () => {
    const db = new MemoryPg();
    const store = await PostgresProgrammeStore.open(db);
    const event = makeEvent({
      eventId: "EVT-PG-1",
      eventType: "COMMIT_LINKED",
      payload: { sha: VALID_COMMIT },
      occurredAt: VALID_TIME,
    });
    const first = await store.appendAsync(event);
    const second = await store.appendAsync(event);
    assert.equal(first.kind, "appended");
    assert.equal(second.kind, "duplicate");
    assert.equal(store.eventCount(), 1);
    const reopened = await PostgresProgrammeStore.open(db);
    assert.equal(reopened.eventCount(), 1);
    assert.equal(reopened.getById("EVT-PG-1")?.eventId, "EVT-PG-1");
    assert.equal(reopened.productionStatus, "PRODUCTION");
  });

  it("rejects identity conflicts and stale revisions", async () => {
    const store = await PostgresProgrammeStore.open(new MemoryPg());
    await store.appendAsync(
      makeEvent({
        eventId: "EVT-PG-2",
        eventType: "COMMIT_LINKED",
        expectedRevision: 0,
        payload: { sha: VALID_COMMIT },
      }),
    );
    await assert.rejects(() =>
      store.appendAsync(
        makeEvent({
          eventId: "EVT-PG-2",
          eventType: "COMMIT_LINKED",
          payload: { sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
        }),
      ),
    );
    await assert.rejects(() =>
      store.appendAsync(
        makeEvent({
          eventId: "EVT-PG-3",
          eventType: "COMMIT_LINKED",
          expectedRevision: 0,
          payload: { sha: VALID_COMMIT },
        }),
      ),
    );
  });

  it("keeps snapshots immutable and can replay corpus seed", async () => {
    const db = new MemoryPg();
    const pg = await PostgresProgrammeStore.open(db);
    const { baseline } = loadCorpusBaseline();
    for (const event of corpusSeedEvents()) {
      await pg.appendAsync(event);
    }
    const memory = new MemoryProgrammeStore();
    const engine = createEngine(memory, baseline, CORPUS_SEED_TIME);
    for (const event of pg.listAll()) engine.append(event);
    const view = engine.currentView({ generatedAt: CORPUS_SEED_TIME, snapshotId: "SNAP-PG" });
    assert.equal(view.statuses["MD-FC1"], "IN_REVIEW");
    assert.equal(view.statuses["MD-LV1"], "IN_REVIEW");
    assert.equal(view.statuses["MD-HV1"], "IN_REVIEW");
    assert.equal(view.statuses["MD-GR1"], "IN_REVIEW");
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S03"], "READY");
    assert.equal(Object.values(view.statuses).filter((status) => status === "ACCEPTED").length, 2);
    await pg.saveSnapshotAsync({
      snapshotId: "SNAP-PG-1",
      createdAt: CORPUS_SEED_TIME,
      sourceEventPosition: pg.eventCount(),
      projection: engine.projectionAt(),
      view,
    });
    await assert.rejects(() =>
      pg.saveSnapshotAsync({
        snapshotId: "SNAP-PG-1",
        createdAt: CORPUS_SEED_TIME,
        sourceEventPosition: pg.eventCount(),
        projection: engine.projectionAt(),
        view,
      }),
    );
  });
});
