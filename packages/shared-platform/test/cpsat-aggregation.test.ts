/**
 * Aggregation equivalence negative boundaries (Checkpoint 2 / A1–A4).
 * Product path: guests that differ by one material characteristic must not
 * silently share outcomes that would require distinct Stage A classes.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
} from "../src/seating-v2-schemas.js";

function base(seed: string): SeatingV2CompiledRequest {
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ seed }),
    seed,
    guests: [
      { token: "g0001", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0002", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0003", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0004", eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: "t0001:01", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
      { token: "t0001:02", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
      { token: "t0002:01", tableToken: "t0002", zoneCodes: [], capabilityCodes: [] },
      { token: "t0002:02", tableToken: "t0002", zoneCodes: [], capabilityCodes: [] },
    ],
    rules: [],
    reservations: [],
  };
}

test("aggregation: identical interchangeable guests seat completely under REPLAY", async () => {
  const compiled = base("agg-identical");
  const a = await solveSeatingV2CompiledCpSat(compiled, { runId: "agg-a", mode: "REPLAY", maxTimeSeconds: 5 });
  const b = await solveSeatingV2CompiledCpSat(compiled, { runId: "agg-b", mode: "REPLAY", maxTimeSeconds: 5 });
  assert.ok(a.productResult === "OPTIMAL" || a.productResult === "FEASIBLE");
  assert.equal(a.verifierOk, true);
  assert.equal(a.assignments.filter((x) => x.state === "SEATED").length, 4);
  assert.deepEqual(
    a.assignments.map((x) => [x.guestToken, x.positionToken]).sort(),
    b.assignments.map((x) => [x.guestToken, x.positionToken]).sort(),
  );
});

test("aggregation negative: lock forces distinct placement honour", async () => {
  const compiled = base("agg-lock");
  compiled.rules = [
    {
      contentHash: exactHash({ lock: 1 }),
      kind: "LOCK_ASSIGNMENT",
      hardness: "HARD",
      weight: null,
      scope: "POSITION",
      subjectTokens: ["g0001"],
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: "t0002:01",
    },
  ];
  const r = await solveSeatingV2CompiledCpSat(compiled, { runId: "agg-lock", mode: "REPLAY", maxTimeSeconds: 5 });
  assert.ok(r.productResult === "OPTIMAL" || r.productResult === "FEASIBLE");
  assert.equal(r.verifierOk, true);
  const g1 = r.assignments.find((a) => a.guestToken === "g0001");
  assert.equal(g1?.positionToken, "t0002:01");
});

test("aggregation negative: require-table cannot be swapped with unrestricted peer", async () => {
  const compiled = base("agg-req");
  compiled.rules = [
    {
      contentHash: exactHash({ req: 1 }),
      kind: "REQUIRE_TABLE",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: ["g0001"],
      tableTokens: ["t0001"],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    },
  ];
  const r = await solveSeatingV2CompiledCpSat(compiled, { runId: "agg-req", mode: "REPLAY", maxTimeSeconds: 5 });
  assert.ok(r.productResult === "OPTIMAL" || r.productResult === "FEASIBLE");
  assert.equal(r.verifierOk, true);
  const g1 = r.assignments.find((a) => a.guestToken === "g0001");
  assert.equal(g1?.positionToken?.startsWith("t0001:"), true);
});

test("aggregation negative: keep-apart endpoints remain separated", async () => {
  const compiled = base("agg-apart");
  compiled.rules = [
    {
      contentHash: exactHash({ apart: 1 }),
      kind: "KEEP_APART",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: ["g0001", "g0002"],
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    },
  ];
  const r = await solveSeatingV2CompiledCpSat(compiled, { runId: "agg-apart", mode: "REPLAY", maxTimeSeconds: 5 });
  assert.ok(r.productResult === "OPTIMAL" || r.productResult === "FEASIBLE");
  assert.equal(r.verifierOk, true);
  const t1 = r.assignments.find((a) => a.guestToken === "g0001")!.positionToken!.split(":")[0];
  const t2 = r.assignments.find((a) => a.guestToken === "g0002")!.positionToken!.split(":")[0];
  assert.notEqual(t1, t2);
});

test("aggregation expansion: no duplicate seats or missing eligible guests", async () => {
  const compiled = base("agg-expand");
  // Larger interchangeable pool
  for (let i = 5; i <= 8; i++) {
    compiled.guests.push({
      token: `g${String(i).padStart(4, "0")}`,
      eligible: true,
      capabilityCodes: [],
      groupTokens: [],
    });
  }
  compiled.positions.push(
    { token: "t0001:03", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
    { token: "t0001:04", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
    { token: "t0002:03", tableToken: "t0002", zoneCodes: [], capabilityCodes: [] },
    { token: "t0002:04", tableToken: "t0002", zoneCodes: [], capabilityCodes: [] },
  );
  const r = await solveSeatingV2CompiledCpSat(compiled, { runId: "agg-exp", mode: "REPLAY", maxTimeSeconds: 8 });
  assert.ok(r.productResult === "OPTIMAL" || r.productResult === "FEASIBLE");
  assert.equal(r.verifierOk, true);
  const seated = r.assignments.filter((a) => a.state === "SEATED");
  assert.equal(seated.length, 8);
  assert.equal(new Set(seated.map((a) => a.guestToken)).size, 8);
  assert.equal(new Set(seated.map((a) => a.positionToken)).size, 8);
});
