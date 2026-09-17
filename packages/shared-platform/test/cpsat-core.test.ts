import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTogetherUnits } from "../src/cpsat/compiler.js";
import { solverRequestToV2Compiled } from "../src/cpsat/corpus-bridge.js";
import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import {
  buildCapacity1000Corpus,
  capacity1000CorpusHash,
  CAPACITY_1000_SCENARIO_SEEDS,
} from "../src/seating-capacity-1000-corpus.js";
import { solveSeatingV2CompiledHeuristic } from "../src/seating-v2-solver-adapter.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
} from "../src/seating-v2-schemas.js";
import { exactHash } from "../src/eec-hash.js";

const LOCKED_B_TYPICAL_HASH = "13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668";

test("verifier module does not import compiler", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const verifySrc = readFileSync(join(here, "../src/cpsat-verifier/verify.ts"), "utf8");
  const importLines = verifySrc.split("\n").filter((line) => /^\s*import\s/.test(line)).join("\n");
  assert.equal(/cpsat\/compiler|seating-solver-v1|local-solve/.test(importLines), false);
});

test("together units do not bridge ineligible guests (D1)", () => {
  const eligible = [true, false, true];
  const { units, filteredPairs } = buildTogetherUnits(eligible, [
    [0, 1],
    [1, 2],
  ]);
  assert.deepEqual(filteredPairs, []);
  assert.equal(units.length, 2);
});

test("B_TYPICAL corpus hash remains locked", () => {
  assert.equal(CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL, "eos-s06-cap-B-typical-1000-v2");
  assert.equal(capacity1000CorpusHash("B_TYPICAL"), LOCKED_B_TYPICAL_HASH);
});

test("CP-SAT solves tiny together fixture with verifier + explanations", async () => {
  const compiled = {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ k: "tiny" }),
    seed: "7",
    guests: [
      { token: "g0001", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0002", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0003", eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: "t0001:01", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
      { token: "t0001:02", tableToken: "t0001", zoneCodes: [], capabilityCodes: [] },
      { token: "t0002:01", tableToken: "t0002", zoneCodes: [], capabilityCodes: [] },
      { token: "t0002:02", tableToken: "t0002", zoneCodes: [], capabilityCodes: [] },
    ],
    rules: [
      {
        contentHash: exactHash({ together: "ab" }),
        hardness: "HARD" as const,
        kind: "KEEP_TOGETHER" as const,
        scope: "TABLE" as const,
        subjectTokens: ["g0001", "g0002"],
        tableTokens: [],
        zoneCodes: [],
        capabilityCodes: [],
        positionToken: null,
        weight: null,
      },
    ],
    reservations: [],
  };
  const result = await solveSeatingV2CompiledCpSat(compiled, {
    runId: "tiny-together",
    maxTimeSeconds: 5,
  });
  assert.equal(result.fault, undefined, result.fault);
  assert.equal(result.explanationsOk, true);
  assert.equal(result.verifierOk, true);
  assert.ok(
    result.productResult === "FEASIBLE" || result.productResult === "OPTIMAL",
    result.productResult,
  );
  const seated = result.assignments.filter((a) => a.state === "SEATED");
  assert.equal(seated.length, 3);
  const tableOf = (guest: string) => {
    const pos = seated.find((a) => a.guestToken === guest)?.positionToken;
    return pos?.split(":")[0];
  };
  assert.equal(tableOf("g0001"), tableOf("g0002"));
});

test("B_TYPICAL CP-SAT regression — planted feasible, together pair seated", async () => {
  assert.equal(capacity1000CorpusHash("B_TYPICAL"), LOCKED_B_TYPICAL_HASH);
  const request = buildCapacity1000Corpus("B_TYPICAL");
  const compiled = solverRequestToV2Compiled(request);

  const result = await solveSeatingV2CompiledCpSat(compiled, {
    runId: "b-typical-cpsat",
    mode: "REPLAY",
    maxTimeSeconds: 120,
  });

  assert.equal(result.fault, undefined, result.fault);
  assert.ok(
    result.productResult === "FEASIBLE" || result.productResult === "OPTIMAL",
    `${result.productResult}`,
  );
  assert.notEqual(result.productResult, "TIMED_OUT");
  const seated = result.assignments.filter((a) => a.state === "SEATED");
  assert.equal(seated.length, 1000);
  assert.equal(result.explanationsOk, true);
  assert.equal(result.verifierOk, true);

  const g146 = seated.find((a) => a.guestToken === "g0146");
  const g147 = seated.find((a) => a.guestToken === "g0147");
  assert.ok(g146 && g147);
  const table146 = compiled.positions.find((p) => p.token === g146!.positionToken)?.tableToken;
  const table147 = compiled.positions.find((p) => p.token === g147!.positionToken)?.tableToken;
  assert.equal(table146, table147);

  const heuristic = solveSeatingV2CompiledHeuristic(compiled);
  assert.ok(
    heuristic.solverClaim === "TIMED_OUT" ||
      heuristic.assignments.filter((a) => a.state === "SEATED").length < 1000,
  );
}, { timeout: 180_000 });
