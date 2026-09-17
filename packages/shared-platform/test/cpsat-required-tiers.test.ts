/**
 * Milestone 3 — required objective-tier validation (unit, no DB).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  recomputeObjectiveTiers,
  requiredObjectiveTiers,
  tiersMatchChildReport,
  verifyRequiredObjectiveTiers,
} from "../src/cpsat/tiers.js";
import type { CpsatSolveRequest } from "../src/cpsat/compiler.js";
import { CPSAT_MODEL_VERSION, CPSAT_REQUEST_CONTRACT } from "../src/cpsat/contract.js";

function baseRequest(overrides: Partial<CpsatSolveRequest> = {}): CpsatSolveRequest {
  return {
    contractVersion: CPSAT_REQUEST_CONTRACT,
    modelVersion: CPSAT_MODEL_VERSION,
    runId: "run-tier",
    mode: "REPLAY",
    seed: 1,
    purpose: "PLANNING",
    tables: [{ i: 0, capacity: 2, token: "t0".padEnd(32, "0") }],
    seats: [
      { i: 0, table: 0, token: "s0".padEnd(32, "a"), attrs: [] },
      { i: 1, table: 0, token: "s1".padEnd(32, "b"), attrs: [] },
    ],
    guests: [
      { i: 0, token: "g0".padEnd(32, "0"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 1, token: "g1".padEnd(32, "1"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
    ],
    units: [{ i: 0, members: [0], domainTables: [0] }, { i: 1, members: [1], domainTables: [0] }],
    togetherPairs: [],
    apartPairs: [],
    requireTable: [],
    forbidTable: [],
    reservations: [],
    preferences: [],
    baseline: [],
    limits: { maxTimeSeconds: 5, workers: 1, wallSeconds: 10 },
    movementTolerance: 0,
    closureHash: "c".repeat(64),
    indexMapHash: "i".repeat(64),
    unsupportedHardRules: [],
    ...overrides,
  };
}

describe("CPSAT Milestone 3 required-tier verification", () => {
  it("rejects required movement tier missing", () => {
    const request = baseRequest({
      baseline: [{ guest: 0, table: 0, seat: 0 }],
      preferences: [],
    });
    const assignments = [
      { guest: 0, table: 0, seat: 0 },
      { guest: 1, table: 0, seat: 1 },
    ];
    const evidence = verifyRequiredObjectiveTiers(request, assignments, [{ tier: "A2_preferences", value: 0 }]);
    assert.equal(evidence.ok, false);
    assert.equal(evidence.fault, "REQUIRED_TIER_MISSING:A1_movement");
    assert.equal(requiredObjectiveTiers(request).movement, true);
    assert.equal(requiredObjectiveTiers(request).preferences, false);
  });

  it("rejects required preference tier missing", () => {
    const request = baseRequest({
      baseline: [],
      preferences: [{ guest: 0, table: 0, band: "LOW", weight: 1 }],
    });
    const assignments = [
      { guest: 0, table: 0, seat: 0 },
      { guest: 1, table: 0, seat: 1 },
    ];
    const evidence = verifyRequiredObjectiveTiers(request, assignments, [{ tier: "A1_movement", value: 0 }]);
    assert.equal(evidence.ok, false);
    assert.equal(evidence.fault, "REQUIRED_TIER_MISSING:A2_preferences");
  });

  it("accepts both required and correct", () => {
    const request = baseRequest({
      baseline: [{ guest: 0, table: 0, seat: 0 }],
      preferences: [{ guest: 1, table: 0, band: "LOW", weight: 1 }],
    });
    const assignments = [
      { guest: 0, table: 0, seat: 1 },
      { guest: 1, table: 0, seat: 0 },
    ];
    const recomputed = recomputeObjectiveTiers(request, assignments);
    const evidence = verifyRequiredObjectiveTiers(request, assignments, [
      { tier: "A1_movement", value: recomputed.movement },
      { tier: "A2_preferences", value: recomputed.preference },
    ]);
    assert.equal(evidence.ok, true);
    assert.equal(evidence.fault, null);
    assert.equal(
      tiersMatchChildReport(recomputed, [
        { tier: "A1_movement", value: recomputed.movement },
        { tier: "A2_preferences", value: recomputed.preference },
      ], requiredObjectiveTiers(request)),
      true,
    );
  });

  it("accepts genuinely inapplicable tier absent", () => {
    const request = baseRequest({ baseline: [], preferences: [] });
    const assignments = [
      { guest: 0, table: 0, seat: 0 },
      { guest: 1, table: 0, seat: 1 },
    ];
    const required = requiredObjectiveTiers(request);
    assert.equal(required.movement, false);
    assert.equal(required.preferences, false);
    const evidence = verifyRequiredObjectiveTiers(request, assignments, []);
    assert.equal(evidence.ok, true);
    assert.equal(tiersMatchChildReport(recomputeObjectiveTiers(request, assignments), [], required), true);
  });

  it("rejects reported value that differs from recomputation", () => {
    const request = baseRequest({
      baseline: [{ guest: 0, table: 0, seat: 0 }],
    });
    const assignments = [{ guest: 0, table: 0, seat: 0 }, { guest: 1, table: 0, seat: 1 }];
    const evidence = verifyRequiredObjectiveTiers(request, assignments, [{ tier: "A1_movement", value: 99 }]);
    assert.equal(evidence.ok, false);
    assert.match(String(evidence.fault), /TIER_MISMATCH/);
  });
});
