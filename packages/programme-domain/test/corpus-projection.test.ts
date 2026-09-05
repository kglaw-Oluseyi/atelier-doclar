import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEvents,
  createEngine,
  loadCorpusBaseline,
  CORPUS_SEED_TIME,
} from "../src/index.js";
import { MemoryProgrammeStore } from "../src/store.js";

describe("CT0/CT1 corpus projection", () => {
  it("projects the current corpus without manufacturing acceptance", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
    for (const event of corpusSeedEvents()) {
      engine.append(event);
    }
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(baseline.manifests.length, 80);
    assert.equal(statuses.get("MD-B0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT1"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT2"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT3"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT4"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT5"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT6"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT7"), "NOT_STARTED");
    assert.equal(statuses.get("EOS-S01"), "BLOCKED");
    for (const [id, status] of statuses) {
      assert.notEqual(status, "ACCEPTED", `${id} must not be ACCEPTED`);
    }
    const view = engine.currentView({ generatedAt: CORPUS_SEED_TIME, snapshotId: "SNAP-CORPUS" });
    assert.equal(view.outstanding.percentage.available, false);
    assert.ok(view.outstanding.unacceptedMandatorySlices.includes("MD-CT2"));
    assert.ok(view.outstanding.blockingOpenItems.includes("OI-CT0-002"));
  });

  it("is idempotent when the same seed events are appended twice", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
    for (const event of corpusSeedEvents()) engine.append(event);
    const count = store.eventCount();
    for (const event of corpusSeedEvents()) {
      const result = engine.append(event);
      assert.equal(result.kind, "duplicate");
    }
    assert.equal(store.eventCount(), count);
    const left = engine.projectionAt();
    const right = engine.projectionAt();
    assert.deepEqual(left, right);
  });
});
