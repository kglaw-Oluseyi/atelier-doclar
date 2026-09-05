import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAllStatuses } from "../src/index.js";
import { accept, blocker, commit, evidence, impl, makeEvent, review, testEngine } from "./event-helpers.js";
import { validOpenItem } from "./helpers.js";

describe("status calculator", () => {
  it("moves NOT_STARTED to READY when dependencies are accepted", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    engine.append(evidence("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "ACCEPTED");
    assert.equal(statuses.get("MD-BB"), "READY");
  });

  it("moves READY to IN_PROGRESS when implementation is observed", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    engine.append(evidence("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    engine.append(impl("MD-BB"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-BB"), "IN_PROGRESS");
  });

  it("moves IN_PROGRESS to IN_REVIEW when review is requested", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
  });

  it("accepts IN_REVIEW only when CT1 evidence invariants are satisfied", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    engine.append(evidence("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "ACCEPTED");
  });

  it("does not accept IN_REVIEW without evidence", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
    assert.notEqual(statuses.get("MD-AA"), "ACCEPTED");
  });

  it("forces BLOCKED when a blocking open item exists", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(blocker("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "BLOCKED");
  });

  it("restores evidence-derived status after blocker resolution", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(blocker("MD-AA", "OI-BLOCK"));
    engine.append(
      makeEvent({
        eventType: "OPEN_ITEM_STATUS_CHANGED",
        aggregateType: "open_item",
        aggregateId: "OI-BLOCK",
        sliceId: "MD-AA",
        payload: { openItemId: "OI-BLOCK", status: "RESOLVED", blocker: false },
      }),
    );
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
  });

  it("does not keep READY when a predecessor is not accepted", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-BB"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-BB"), "IN_PROGRESS");
    assert.notEqual(statuses.get("MD-BB"), "READY");
  });

  it("supersedes only from an explicit supersession event", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(
      makeEvent({
        eventType: "DECISION_RECORDED",
        aggregateType: "decision",
        aggregateId: "DEC-1",
        sliceId: "MD-AA",
        payload: {
          decision: {
            id: "DEC-1",
            title: "Supersede AA",
            severity: "HIGH",
            owner: "AI CTO",
            authority: "AI CTO",
            disposition: "CONTROLLING",
            affectedIds: ["MD-AA"],
            blocker: false,
          },
        },
      }),
    );
    engine.append(
      makeEvent({
        eventType: "SLICE_SUPERSEDED",
        aggregateId: "MD-AA",
        sliceId: "MD-AA",
        payload: { decisionId: "DEC-1", reason: "replaced" },
      }),
    );
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "SUPERSEDED");
  });

  it("does not treat a version number as supersession", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    const projection = engine.projectionAt();
    const facts = projection.slices["MD-AA"];
    assert.ok(facts);
    facts.version = "99";
    const statuses = calculateAllStatuses(projection);
    assert.equal(statuses.get("MD-AA"), "IN_PROGRESS");
    assert.notEqual(statuses.get("MD-AA"), "SUPERSEDED");
  });

  it("does not treat accepted risk as resolved for outstanding blockers", () => {
    const item = validOpenItem({ id: "OI-RISK", blocker: true, status: "ACCEPTED_RISK" });
    assert.equal(item.status === "RESOLVED", false);
    assert.equal(item.status === "ACCEPTED_RISK", true);
  });
});
