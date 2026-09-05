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
  it("projects the current corpus without manufacturing Foundation acceptance", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
    for (const event of corpusSeedEvents()) {
      engine.append(event);
    }
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(baseline.manifests.length, 84);
    assert.equal(baseline.decisions.length > 0, true);
    assert.equal(statuses.get("MD-B0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT1"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT2"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT3"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT4"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT5"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT6"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT7"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT8"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT9"), "IN_REVIEW");
    assert.equal(statuses.get("MD-FC1"), "IN_REVIEW");
    assert.equal(statuses.get("MD-LV1"), "IN_REVIEW");
    assert.equal(statuses.get("MD-HV1"), "IN_REVIEW");
    assert.equal(statuses.get("MD-GR1"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S04"), "READY");
    const accepted = [...statuses.entries()].filter(([, status]) => status === "ACCEPTED");
    assert.deepEqual(accepted.map(([id]) => id), ["EOS-S01", "EOS-S02", "EOS-S03"]);
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
