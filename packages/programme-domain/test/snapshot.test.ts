import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateControlSnapshot, stableJson } from "../src/index.js";
import { VALID_TIME } from "./helpers.js";
import { accept, commit, evidence, impl, review, testEngine } from "./event-helpers.js";

describe("snapshots", () => {
  it("generates a snapshot and keeps an older snapshot unchanged", () => {
    const { engine, store } = testEngine();
    engine.append(impl("MD-AA"));
    const first = engine.snapshot({ snapshotId: "SNAP-A", generatedAt: VALID_TIME });
    engine.append(review("MD-AA"));
    const second = engine.snapshot({ snapshotId: "SNAP-B", generatedAt: VALID_TIME });
    const storedFirst = store.getSnapshot("SNAP-A");
    assert.equal(storedFirst?.sourceEventPosition, first.sourceEventPosition);
    assert.equal(storedFirst?.view.statuses["MD-AA"], "IN_PROGRESS");
    assert.equal(second.view.statuses["MD-AA"], "IN_REVIEW");
    assert.notEqual(first.snapshotId, second.snapshotId);
  });

  it("reconstructs from event zero, an intermediate revision and latest", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    const zero = engine.projectionAt(0);
    const mid = engine.projectionAt(1);
    const latest = engine.projectionAt();
    assert.equal(zero.eventPosition, 0);
    assert.equal(zero.slices["MD-AA"]?.implementationObserved, false);
    assert.equal(mid.slices["MD-AA"]?.implementationObserved, true);
    assert.equal(mid.slices["MD-AA"]?.reviewRequested, false);
    assert.equal(latest.slices["MD-AA"]?.reviewRequested, true);
  });

  it("replays a snapshot plus tail events", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.snapshot({ snapshotId: "SNAP-MID", generatedAt: VALID_TIME });
    engine.append(review("MD-AA"));
    const reconstructed = engine.reconstructFromSnapshot("SNAP-MID");
    assert.equal(reconstructed.slices["MD-AA"]?.reviewRequested, true);
    assert.equal(reconstructed.eventPosition, 2);
  });

  it("is deterministic for identical inputs", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    const projection = engine.projectionAt();
    const left = generateControlSnapshot({
      snapshotId: "SNAP-D",
      generatedAt: VALID_TIME,
      projection,
    });
    const right = generateControlSnapshot({
      snapshotId: "SNAP-D",
      generatedAt: VALID_TIME,
      projection,
    });
    assert.equal(stableJson(left), stableJson(right));
  });

  it("keeps outstanding summary aligned with projected slices", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    engine.append(evidence("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    const view = engine.currentView({ generatedAt: VALID_TIME, snapshotId: "SNAP-O" });
    assert.ok(!view.outstanding.unacceptedMandatorySlices.includes("MD-AA"));
    assert.ok(view.outstanding.unlockedUnacceptedSlices.includes("MD-BB"));
    assert.equal(view.outstanding.percentage.available, false);
  });

  it("has no manual percentage override field", () => {
    const { engine } = testEngine();
    const view = engine.currentView({ generatedAt: VALID_TIME });
    assert.equal("manualPercentage" in view, false);
    assert.equal("percentOverride" in view.outstanding, false);
    assert.equal(view.outstanding.percentage.available, false);
    if (view.outstanding.percentage.available === false) {
      assert.equal(view.outstanding.percentage.reason, "WEIGHTS_ABSENT");
    }
  });
});
