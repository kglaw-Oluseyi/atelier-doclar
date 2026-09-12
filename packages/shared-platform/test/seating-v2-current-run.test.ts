import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentSeatingV2RunId } from "../src/seating-v2-workspace.js";
import { emptySeatingV2State } from "../src/seating-v2-state.js";

const EVENT = "00000000-0000-4000-8000-000000000021";
const ORG = "00000000-0000-4000-8000-000000000001";
const CURRENT_RUN = "00000000-0000-4000-8000-0000000000aa";
const PLAN = "00000000-0000-4000-8000-0000000000bb";
const PUBLICATION = "00000000-0000-4000-8000-0000000000cc";

function run(id: string) {
  return {
    id,
    organisationId: ORG,
    eventId: EVENT,
    schemaVersion: 1,
    packageId: "00000000-0000-4000-8000-0000000000dd",
    packageHash: "pkg",
    status: "FEASIBLE" as const,
    deterministicSeed: id,
    solverVersion: "s06-solver-v2",
    solverConfigHash: "cfg",
    createdAt: "2026-09-05T15:00:00.000Z",
  };
}

describe("currentSeatingV2RunId", () => {
  it("selects exactly one CURRENT run from the published plan source, not DOM order or recency", () => {
    const state = emptySeatingV2State();
    state.runs = Array.from({ length: 12 }, (_, index) => run(`00000000-0000-4000-8000-0000000000${index.toString(16).padStart(2, "0")}`));
    state.runs[3] = run(CURRENT_RUN);
    state.planEditions = [
      {
        id: PLAN,
        organisationId: ORG,
        eventId: EVENT,
        schemaVersion: 1,
        editionNo: 1,
        packageId: "00000000-0000-4000-8000-0000000000dd",
        packageHash: "pkg",
        sourceRunId: CURRENT_RUN,
        assignmentsHash: "assign",
        manualDecisionLogHash: "manual",
        contentHash: "plan",
        status: "APPROVED",
        version: 1,
        createdByPersonId: "00000000-0000-4000-8000-000000000010",
        createdAt: "2026-09-05T15:00:00.000Z",
      },
    ];
    state.publications = [
      {
        id: PUBLICATION,
        organisationId: ORG,
        eventId: EVENT,
        schemaVersion: 1,
        publicationNo: 1,
        planEditionId: PLAN,
        planContentHash: "plan",
        packageId: "00000000-0000-4000-8000-0000000000dd",
        packageContentHash: "pkg",
        layoutPublicationId: "00000000-0000-4000-8000-0000000000ee",
        layoutContentHash: "layout",
        solverVersion: "s06-solver-v2",
        solverConfigHash: "cfg",
        approvalId: "00000000-0000-4000-8000-0000000000ff",
        publisherPersonId: "00000000-0000-4000-8000-000000000010",
        status: "CURRENT",
        publishedAt: "2026-09-05T15:00:00.000Z",
        createdAt: "2026-09-05T15:00:00.000Z",
      },
    ];
    state.eventCurrent = [
      {
        id: "00000000-0000-4000-8000-0000000000a1",
        organisationId: ORG,
        eventId: EVENT,
        schemaVersion: 1,
        currentPublicationId: PUBLICATION,
        version: 1,
        createdAt: "2026-09-05T15:00:00.000Z",
      },
    ];
    const current = currentSeatingV2RunId(state, EVENT);
    assert.equal(current, CURRENT_RUN);
    const marked = state.runs.filter((item) => item.id === current);
    assert.equal(marked.length, 1);
    assert.equal(currentSeatingV2RunId(state, "00000000-0000-4000-8000-000000000099"), undefined);
  });

  it("does not invent a CURRENT run when no governing plan source exists", () => {
    const state = emptySeatingV2State();
    state.runs = Array.from({ length: 12 }, (_, index) => run(`00000000-0000-4000-8000-0000000001${index.toString(16).padStart(2, "0")}`));
    assert.equal(currentSeatingV2RunId(state, EVENT), undefined);
  });
});
