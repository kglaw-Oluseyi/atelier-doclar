import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEventsThroughS02Implementation,
  createEngine,
  loadCorpusBaseline,
  CORPUS_SEED_TIME,
} from "../src/index.js";
import { MemoryProgrammeStore } from "../src/store.js";

describe("EOS-S02 implementation recording", () => {
  it("moves EOS-S02 to IN_REVIEW without manufacturing acceptance", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
    for (const event of corpusSeedEventsThroughS02Implementation()) engine.append(event);
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S03"), "NOT_STARTED");
    const accepted = [...statuses.entries()].filter(([, status]) => status === "ACCEPTED");
    assert.deepEqual(accepted.map(([id]) => id), ["EOS-S01"]);
    assert.equal(
      corpusSeedEventsThroughS02Implementation().some(
        (event) => event.eventType === "ACCEPTANCE_RECORDED" && event.sliceId === "EOS-S02",
      ),
      false,
    );
    assert.equal(
      corpusSeedEventsThroughS02Implementation().some(
        (event) => event.eventType === "COMMIT_LINKED" && event.sliceId === "EOS-S02",
      ),
      true,
    );
  });
});
