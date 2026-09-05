import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyEvent, createInitialProjection, replay } from "../src/index.js";
import { VALID_TIME } from "./helpers.js";
import { commit, impl, makeEvent, testBaseline } from "./event-helpers.js";

describe("event projector", () => {
  it("replays the same events to the same projection", () => {
    const baseline = testBaseline();
    const events = [impl("MD-AA"), commit("MD-AA")];
    const left = replay(events, baseline, VALID_TIME);
    const right = replay(events, baseline, VALID_TIME);
    assert.deepEqual(left, right);
    assert.equal(left.slices["MD-AA"]?.commits[0], events[1] && "sha" in events[1].payload ? events[1].payload.sha : "");
  });

  it("does not mutate the previous projection when applying an event", () => {
    const initial = createInitialProjection(testBaseline(), VALID_TIME);
    const next = applyEvent(initial, impl("MD-AA"));
    assert.equal(initial.slices["MD-AA"]?.implementationObserved, false);
    assert.equal(next.slices["MD-AA"]?.implementationObserved, true);
    assert.equal(initial.eventPosition, 0);
    assert.equal(next.eventPosition, 1);
  });

  it("does not rewrite history when a correction is appended", () => {
    const baseline = testBaseline();
    const first = impl("MD-AA");
    const correction = makeEvent({
      eventType: "CORRECTION_APPENDED",
      aggregateId: "MD-AA",
      sliceId: "MD-AA",
      payload: { correctsEventId: first.eventId, reason: "note only" },
    });
    const atFirst = replay([first], baseline, VALID_TIME);
    const after = replay([first, correction], baseline, VALID_TIME);
    assert.equal(atFirst.slices["MD-AA"]?.implementationObserved, true);
    assert.equal(after.slices["MD-AA"]?.implementationObserved, true);
    assert.equal(after.eventPosition, 2);
    assert.notEqual(after.eventPosition, atFirst.eventPosition);
  });
});
