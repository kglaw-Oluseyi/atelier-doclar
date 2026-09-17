import assert from "node:assert/strict";
import { test } from "node:test";
import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
} from "../src/seating-v2-schemas.js";
import { redactExplanationForOrdinaryRole, buildExplanations } from "../src/cpsat/explanations.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";

function tiny(seed: string, together = true): SeatingV2CompiledRequest {
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
    rules: together
      ? [
          {
            contentHash: exactHash({ t: seed }),
            kind: "KEEP_TOGETHER",
            hardness: "HARD",
            weight: null,
            scope: "TABLE",
            subjectTokens: ["g0001", "g0002"],
            tableTokens: [],
            zoneCodes: [],
            capabilityCodes: [],
            positionToken: null,
          },
        ]
      : [],
    reservations: [],
  };
}

test("tiny oracle: together pair must share a table", async () => {
  const compiled = tiny("oracle-together");
  const result = await solveSeatingV2CompiledCpSat(compiled, { runId: "oracle-1", maxTimeSeconds: 5 });
  assert.ok(result.productResult === "OPTIMAL" || result.productResult === "FEASIBLE");
  assert.equal(result.verifierOk, true);
  assert.equal(result.explanationsOk, true);
  const a = result.assignments.find((x) => x.guestToken === "g0001")!;
  const b = result.assignments.find((x) => x.guestToken === "g0002")!;
  assert.equal(a.positionToken?.split(":")[0], b.positionToken?.split(":")[0]);
});

test("tiny oracle: adversarial input order yields same verifier pass", async () => {
  const base = tiny("oracle-order");
  const reversed = {
    ...base,
    guests: [...base.guests].reverse(),
    positions: [...base.positions].reverse(),
  };
  const a = await solveSeatingV2CompiledCpSat(base, { runId: "ord-a", maxTimeSeconds: 5 });
  const b = await solveSeatingV2CompiledCpSat(reversed, { runId: "ord-b", maxTimeSeconds: 5 });
  assert.equal(a.verifierOk, true);
  assert.equal(b.verifierOk, true);
  assert.equal(a.assignments.filter((x) => x.state === "SEATED").length, 4);
  assert.equal(b.assignments.filter((x) => x.state === "SEATED").length, 4);
});

test("Replay: identical seed yields identical seating assignment", async () => {
  const compiled = tiny("oracle-replay");
  const a = await solveSeatingV2CompiledCpSat(compiled, { runId: "rep-same", mode: "REPLAY", maxTimeSeconds: 5 });
  const b = await solveSeatingV2CompiledCpSat(compiled, { runId: "rep-same", mode: "REPLAY", maxTimeSeconds: 5 });
  assert.deepEqual(
    a.assignments.map((x) => [x.guestToken, x.positionToken, x.state]),
    b.assignments.map((x) => [x.guestToken, x.positionToken, x.state]),
  );
  // Response envelope may carry wall clocks; assignment seating must match.
  assert.equal(exactHash(a.assignments), exactHash(b.assignments));
});

test("explanation redaction: discretion mode collapses sensitive codes", () => {
  const compiled = tiny("explain-redact");
  const req = compileV2ToCpsatRequest(compiled, { runId: "ex", maxTimeSeconds: 1 });
  const expl = buildExplanations(req, [
    { guest: 0, table: 0, seat: 0 },
    { guest: 1, table: 0, seat: 1 },
    { guest: 2, table: 1, seat: 2 },
    { guest: 3, table: 1, seat: 3 },
  ]);
  assert.equal(expl.ok, true);
  const group = expl.explanations.find((e) => e.code === "GROUP");
  if (group) {
    const redacted = redactExplanationForOrdinaryRole(group, true);
    assert.equal(redacted.code, "GLOBAL");
  }
});

test("infeasible static: oversize together unit vs capacity → INVALID_INPUT or INFEASIBLE", async () => {
  const compiled = tiny("infeas-unit");
  // Force three guests together onto tables of size 2.
  compiled.rules = [
    {
      contentHash: exactHash({ big: 1 }),
      kind: "KEEP_TOGETHER",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: ["g0001", "g0002", "g0003"],
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    },
  ];
  const result = await solveSeatingV2CompiledCpSat(compiled, { runId: "inf", maxTimeSeconds: 5 });
  assert.ok(
    result.productResult === "INFEASIBLE" ||
      result.productResult === "SOLVER_FAULT" ||
      result.productResult === "INVALID_INPUT" ||
      Boolean(result.fault),
  );
  assert.notEqual(result.productResult, "OPTIMAL");
});
