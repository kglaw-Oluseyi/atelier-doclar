import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOutstandingWork, calculatePercentage } from "../src/index.js";
import { VALID_TIME } from "./helpers.js";
import { accept, commit, evidence, impl, review, testEngine } from "./event-helpers.js";

describe("outstanding work and percentage", () => {
  it("returns percentage unavailable when controlled weights are absent", () => {
    const result = calculatePercentage(new Map([["MD-AA", "ACCEPTED"]]), undefined);
    assert.equal(result.available, false);
  });

  it("uses only explicitly supplied weights", () => {
    const result = calculatePercentage(new Map([["MD-AA", "ACCEPTED"], ["MD-BB", "NOT_STARTED"]]), {
      "MD-AA": 1,
      "MD-BB": 1,
    });
    assert.equal(result.available, true);
    if (result.available) {
      assert.equal(result.value, 0.5);
      assert.equal(result.acceptedWeight, 1);
      assert.equal(result.totalWeight, 2);
    }
  });

  it("does not equate a commit with completion", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    const projection = engine.projectionAt();
    const outstanding = calculateOutstandingWork(
      projection,
      new Map([
        ["MD-AA", "IN_PROGRESS"],
        ["MD-BB", "NOT_STARTED"],
      ]),
    );
    assert.ok(outstanding.unacceptedMandatorySlices.includes("MD-AA"));
  });

  it("lists blocking items and incomplete gates", () => {
    const { engine } = testEngine();
    const view = engine.currentView({ generatedAt: VALID_TIME });
    assert.ok(view.outstanding.incompleteGates.includes("GATE-INDEPENDENT"));
    assert.equal(view.outstanding.percentage.available, false);
  });

  it("exposes machine-readable outstanding work", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    engine.append(evidence("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    const view = engine.currentView({ generatedAt: VALID_TIME });
    assert.deepEqual(Object.keys(view.outstanding).sort(), [
      "blockedSlices",
      "blockingDecisions",
      "blockingOpenItems",
      "incompleteGates",
      "missingRequiredEvidence",
      "percentage",
      "unacceptedMandatorySlices",
      "unlockedUnacceptedSlices",
    ]);
  });
});
