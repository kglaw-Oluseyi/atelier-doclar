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

/**
 * Mixed satisfied/violated preference fixture (Python A2 = unmet penalty polarity).
 *
 * Guests 0–3, tables 0–1 (capacity 2 each).
 * Prefs:
 *   g0 → t0 weight 10 (HIGH)
 *   g1 → t0 weight 3  (MEDIUM)
 *   g2 → t1 weight 1  (LOW)
 *   g3 → t1 weight 5  (MEDIUM) — guest absent from assignments → contributes 0
 * Assignments (seated):
 *   g0 @ t0 → satisfied → 0
 *   g1 @ t1 → violated  → +3
 *   g2 @ t1 → satisfied → 0
 * Satisfied-sum (old buggy polarity) = 10+1 = 11
 * Violated-sum (Python / correct)    = 3
 * These must differ so a reward-polarity bug cannot pass this test.
 */
function polarityFixture(): {
  request: CpsatSolveRequest;
  assignments: Array<{ guest: number; table: number; seat: number }>;
  expectedMovement: number;
  expectedPreferencePenalty: number;
  buggySatisfiedSum: number;
} {
  const request = baseRequest({
    tables: [
      { i: 0, capacity: 2, token: "t0".padEnd(32, "0") },
      { i: 1, capacity: 2, token: "t1".padEnd(32, "1") },
    ],
    seats: [
      { i: 0, table: 0, token: "s00".padEnd(32, "a"), attrs: [] },
      { i: 1, table: 0, token: "s01".padEnd(32, "b"), attrs: [] },
      { i: 2, table: 1, token: "s10".padEnd(32, "c"), attrs: [] },
      { i: 3, table: 1, token: "s11".padEnd(32, "d"), attrs: [] },
    ],
    guests: [
      { i: 0, token: "g0".padEnd(32, "0"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 1, token: "g1".padEnd(32, "1"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 2, token: "g2".padEnd(32, "2"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 3, token: "g3".padEnd(32, "3"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
    ],
    units: [
      { i: 0, members: [0], domainTables: [0, 1] },
      { i: 1, members: [1], domainTables: [0, 1] },
      { i: 2, members: [2], domainTables: [0, 1] },
      { i: 3, members: [3], domainTables: [0, 1] },
    ],
    baseline: [{ guest: 0, table: 0, seat: 0 }],
    preferences: [
      { guest: 0, table: 0, band: "HIGH", weight: 10 },
      { guest: 1, table: 0, band: "MEDIUM", weight: 3 },
      { guest: 2, table: 1, band: "LOW", weight: 1 },
      { guest: 3, table: 1, band: "MEDIUM", weight: 5 },
    ],
  });
  const assignments = [
    { guest: 0, table: 0, seat: 1 }, // moved from baseline seat 0 → movement +1; pref satisfied
    { guest: 1, table: 1, seat: 2 }, // pref violated (+3)
    { guest: 2, table: 1, seat: 3 }, // pref satisfied
    // guest 3 unseated — pref contributes 0
  ];
  return {
    request,
    assignments,
    expectedMovement: 1,
    expectedPreferencePenalty: 3,
    buggySatisfiedSum: 11,
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

  it("accepts both required and correct with hardcoded Python-polarity A2", () => {
    const { request, assignments, expectedMovement, expectedPreferencePenalty, buggySatisfiedSum } =
      polarityFixture();
    assert.notEqual(
      expectedPreferencePenalty,
      buggySatisfiedSum,
      "fixture must distinguish violated-sum from satisfied-sum",
    );
    const recomputed = recomputeObjectiveTiers(request, assignments);
    assert.equal(recomputed.movement, expectedMovement);
    assert.equal(recomputed.preference, expectedPreferencePenalty);
    assert.notEqual(recomputed.preference, buggySatisfiedSum);

    const evidence = verifyRequiredObjectiveTiers(request, assignments, [
      { tier: "A1_movement", value: expectedMovement },
      { tier: "A2_preferences", value: expectedPreferencePenalty },
    ]);
    assert.equal(evidence.ok, true);
    assert.equal(evidence.fault, null);
    assert.equal(
      tiersMatchChildReport(
        recomputed,
        [
          { tier: "A1_movement", value: expectedMovement },
          { tier: "A2_preferences", value: expectedPreferencePenalty },
        ],
        requiredObjectiveTiers(request),
      ),
      true,
    );

    // Old reward polarity would have accepted buggySatisfiedSum as "matching" itself —
    // prove the verifier rejects that wrong child report against the corrected recompute.
    const wrongPolarity = verifyRequiredObjectiveTiers(request, assignments, [
      { tier: "A1_movement", value: expectedMovement },
      { tier: "A2_preferences", value: buggySatisfiedSum },
    ]);
    assert.equal(wrongPolarity.ok, false);
    assert.equal(wrongPolarity.fault, "TIER_MISMATCH:A2_preferences");
  });

  it("hand-computes A1/A2 on mixed preference fixture exactly", () => {
    const { request, assignments, expectedMovement, expectedPreferencePenalty } = polarityFixture();
    // Explicit hand rules (Python stage_a unmet polarity):
    // A1: baseline g0 was (t0,s0); assigned (t0,s1) → moved → 1
    // A2: g0 satisfied 0; g1 violated +3; g2 satisfied 0; g3 unseated 0 → 3
    const recomputed = recomputeObjectiveTiers(request, assignments);
    assert.deepEqual(recomputed, { movement: expectedMovement, preference: expectedPreferencePenalty });
    assert.deepEqual(recomputed, { movement: 1, preference: 3 });
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
