import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEvents,
  corpusSeedEventsThroughS03Implementation,
  createEngine,
  loadCorpusBaseline,
  CORPUS_SEED_TIME,
} from "../src/index.js";
import { MemoryProgrammeStore } from "../src/store.js";

const PROTECTED_GATES = [
  "GATE-INDEPENDENT",
  "GATE-CEO-PRODUCTION",
  "GATE-SPECIALIST-BIOMETRIC",
  "GATE-VENUE-REHEARSAL",
] as const;

describe("EOS-S03 implementation recording", () => {
  it("moves EOS-S03 to IN_REVIEW without manufacturing acceptance", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
    for (const event of corpusSeedEventsThroughS03Implementation()) engine.append(event);
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S04"), "NOT_STARTED");
    const accepted = [...statuses.entries()].filter(([, status]) => status === "ACCEPTED");
    assert.deepEqual(accepted.map(([id]) => id), ["EOS-S01", "EOS-S02"]);
    assert.equal(accepted.length, 2);
    assert.equal(
      corpusSeedEventsThroughS03Implementation().some(
        (event) => event.eventType === "ACCEPTANCE_RECORDED" && event.sliceId === "EOS-S03",
      ),
      false,
    );
    assert.equal(
      corpusSeedEvents().some((event) => event.eventType === "ACCEPTANCE_RECORDED" && event.sliceId === "EOS-S03"),
      false,
    );
    assert.equal(
      corpusSeedEventsThroughS03Implementation().some(
        (event) => event.eventType === "COMMIT_LINKED" && event.sliceId === "EOS-S03",
      ),
      true,
    );
  });

  it("does not authorise production or change protected gates", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
    for (const event of corpusSeedEvents()) engine.append(event);
    const view = engine.currentView({ generatedAt: CORPUS_SEED_TIME, snapshotId: "SNAP-EOS-S03-IMPL" });
    assert.equal(view.statuses["EOS-S03"], "IN_REVIEW");
    assert.equal(view.gates.every((gate) => gate.status !== "APPROVED"), true);
    for (const id of PROTECTED_GATES) {
      const gate = view.gates.find((item) => item.id === id);
      assert.ok(gate, id);
      assert.equal(gate.status, "NOT_READY");
    }
  });
});
