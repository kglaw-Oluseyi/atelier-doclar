import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadCurrentSnapshot } from "../src/load.js";
import {
  assessHealth,
  classifyFailure,
  rejectCorruptEvent,
  restoreVerifiedSnapshot,
  roadmapSurvivesOpsFailure,
} from "../src/ops.js";
import { buildRoadmap } from "../src/roadmap.js";

describe("CT9 operations and failure modes", () => {
  it("keeps independent and CEO gates unsigned and production unauthorised", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T15:10:00.000Z");
    const health = assessHealth({ snapshot });
    assert.equal(health.productionAuthorised, false);
    assert.equal(health.productionApproved, false);
    assert.equal(health.implementationComplete, true);
    assert.equal(health.eventOsImpliedFailed, false);
    assert.equal(health.eventDayImpliedFailed, false);
    assert.ok(health.unsignedProtectedGates.includes("GATE-INDEPENDENT"));
    assert.ok(health.unsignedProtectedGates.includes("GATE-CEO-PRODUCTION"));
    assert.equal(health.applicationAlive, true);
    assert.equal(health.ready, false);
    assert.equal(health.productionAuthorised, false);
  });

  it("classifies GitHub, CI, RAG, stale, permission and partial failures without implying Event OS failure", () => {
    const snapshot = loadCurrentSnapshot("2026-09-05T15:10:00.000Z");
    for (const kind of [
      "github-unavailable",
      "ci-unavailable",
      "rag-unavailable",
      "stale-snapshot",
      "permission-failure",
      "partial-data",
    ] as const) {
      const health = classifyFailure(kind, snapshot);
      assert.equal(health.eventOsImpliedFailed, false);
      assert.equal(health.eventDayImpliedFailed, false);
      assert.notEqual(health.controlTower, "OK");
    }
  });

  it("rejects a corrupt event and inaccessible evidence", () => {
    const corrupt = rejectCorruptEvent({ eventType: "NOT_A_REAL_EVENT" });
    assert.equal(corrupt.rejected, true);
    const inaccessible = classifyFailure("inaccessible-evidence", loadCurrentSnapshot("2026-09-05T15:10:00.000Z"));
    assert.equal(inaccessible.controlTower, "ERROR");
    assert.equal(inaccessible.eventOsImpliedFailed, false);
  });

  it("restores a verified snapshot and keeps the roadmap available during RAG outage", () => {
    const restored = restoreVerifiedSnapshot();
    assert.equal(restored.matchesVerifiedPosition, true);
    const snapshot = loadCurrentSnapshot("2026-09-05T15:10:00.000Z");
    assert.equal(roadmapSurvivesOpsFailure(snapshot), true);
    assert.ok(buildRoadmap(snapshot).nodes.length > 0);
  });
});
