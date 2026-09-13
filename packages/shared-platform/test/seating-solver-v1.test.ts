import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  seatingContradictoryGroup,
  seatingCorpus50,
  seatingCorpus200,
  seatingCorpus600,
  seatingImpossibleCapability,
  seatingImpossibleCapacity,
  seatingImpossibleLocks,
} from "../src/seating-solver-fixtures.js";
import { compareLexicographic, solveSeatingV1 } from "../src/seating-solver-v1.js";
import { DEFAULT_SOLVER_CONFIG } from "../src/seating-solver-types.js";

function seatedGuests(result: ReturnType<typeof solveSeatingV1>): string[] {
  return result.assignments.filter((item) => item.state === "SEATED").map((item) => item.guestToken);
}

function occupiedPositions(result: ReturnType<typeof solveSeatingV1>): string[] {
  return result.assignments.flatMap((item) => (item.positionToken ? [item.positionToken] : []));
}

describe("SeatingSolverV1", () => {
  it("rejects prohibited name, contact and free-text fields", () => {
    const base = seatingCorpus50();
    assert.throws(() => solveSeatingV1({ ...base, name: "Ada" }), /prohibited solver field name/);
    assert.throws(
      () => solveSeatingV1({ ...base, guests: [{ ...base.guests[0], email: "ada@example.test" }] }),
      /prohibited solver field email/,
    );
    assert.throws(
      () =>
        solveSeatingV1({
          ...base,
          guests: [{ ...base.guests[0], token: "SELECT * FROM guests" }],
        }),
      /free-text|valid|token/,
    );
    assert.throws(
      () =>
        solveSeatingV1({
          ...base,
          constraints: [
            {
              id: "inject",
              kind: "HARD",
              predicateType: "KEEP_TOGETHER",
              payload: { predicateType: "KEEP_TOGETHER", guestTokens: ["g0001", "SELECT 1"] },
            },
          ],
        }),
      /free-text|valid/,
    );
  });

  it("rejects unknown keys", () => {
    assert.throws(() => solveSeatingV1({ ...seatingCorpus50(), extra: true }), /valid|unrecognized|required/i);
  });

  it("returns identical hashes for the same 50-guest tuple", () => {
    const first = solveSeatingV1(seatingCorpus50());
    const second = solveSeatingV1(seatingCorpus50());
    assert.equal(first.status, "FEASIBLE");
    assert.equal(first.resultHash, second.resultHash);
    assert.equal(first.score.hardViolations, 0);
    assert.equal(new Set(occupiedPositions(first)).size, occupiedPositions(first).length);
    assert.equal(new Set(seatedGuests(first)).size, seatedGuests(first).length);
  });

  it("changes identity when the seed changes", () => {
    const base = seatingCorpus50();
    const first = solveSeatingV1(base);
    const second = solveSeatingV1({
      ...base,
      config: { ...base.config, seed: "s06-corpus-50-b" },
    });
    assert.notEqual(first.resultHash, second.resultHash);
    assert.notEqual(first.configHash, second.configHash);
  });

  it("does not leak state across consecutive runs", () => {
    const feasible = solveSeatingV1(seatingCorpus50());
    const impossible = solveSeatingV1(seatingImpossibleLocks());
    const again = solveSeatingV1(seatingCorpus50());
    assert.equal(feasible.resultHash, again.resultHash);
    assert.equal(impossible.status, "INFEASIBLE");
    assert.ok(impossible.findings.some((finding) => finding.code === "CONTRADICTION" || finding.code === "LOCKED"));
  });

  it("keeps together and apart hard rules and may leave a weighted preference unsatisfied", () => {
    const result = solveSeatingV1(seatingCorpus50());
    const byGuest = new Map(result.assignments.map((item) => [item.guestToken, item]));
    const tableOf = (token: string) => byGuest.get(token)?.positionToken?.split(":")[0];
    assert.equal(tableOf("g0001"), tableOf("g0002"));
    assert.notEqual(tableOf("g0007"), tableOf("g0009"));
    assert.equal(result.score.hardViolations, 0);
  });

  it("records explicit unseated guests when capacity is short", () => {
    const result = solveSeatingV1(seatingImpossibleCapacity());
    const unseated = result.assignments.filter((item) => item.state === "UNSEATED");
    assert.equal(unseated.length, 6);
    assert.ok(unseated.every((item) => item.reasonCodes.length > 0));
    assert.ok(result.score.hardViolations > 0);
    assert.equal(result.status, "INFEASIBLE");
  });

  it("never relaxes contradictory locks or impossible capability", () => {
    const locks = solveSeatingV1(seatingImpossibleLocks());
    assert.equal(locks.status, "INFEASIBLE");
    assert.ok(locks.score.hardViolations > 0 || locks.findings.length > 0);
    const capability = solveSeatingV1(seatingImpossibleCapability());
    assert.equal(capability.assignments[0]?.state, "UNSEATED");
    assert.ok(capability.assignments[0]?.reasonCodes.includes("REQUIRED_CAPABILITY") || capability.findings.some((item) => item.code === "REQUIRED_CAPABILITY"));
    const contradiction = solveSeatingV1(seatingContradictoryGroup());
    assert.equal(contradiction.status, "INFEASIBLE");
  });

  it("does not trade a higher objective for a lower one", () => {
    const preferred = solveSeatingV1(seatingCorpus50());
    const worse = {
      ...preferred.score,
      seatedEligible: preferred.score.seatedEligible - 1,
      preferenceCost: 0,
    };
    assert.ok(compareLexicographic(preferred.score, worse) < 0);
  });

  it("does not claim FEASIBLE on the 200-guest corpus when wheelchair demand exceeds supply", () => {
    const result = solveSeatingV1(seatingCorpus200());
    assert.equal(result.status, "INFEASIBLE");
    assert.ok(result.score.hardViolations > 0);
    const locked = result.assignments.find((item) => item.guestToken === "g0011");
    assert.equal(locked?.positionToken, "t0002:01");
    const wheelchair = result.assignments.find((item) => item.guestToken === "g0037");
    assert.equal(wheelchair?.state, "SEATED");
    assert.ok(wheelchair?.positionToken?.startsWith("t0001:"));
  });

  it("meets the 600-guest warm performance gate on this host", () => {
    const request = seatingCorpus600();
    solveSeatingV1(request);
    const times: number[] = [];
    const hashes = new Set<string>();
    for (let index = 0; index < 10; index += 1) {
      const result = solveSeatingV1(request);
      times.push(result.metrics.elapsedMs);
      hashes.add(result.resultHash);
      assert.equal(result.status, "INFEASIBLE");
      assert.ok(result.score.hardViolations > 0);
      assert.ok(result.metrics.heapUsedBytes > 0);
    }
    times.sort((left, right) => left - right);
    const p95 = times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)] ?? Number.POSITIVE_INFINITY;
    assert.equal(hashes.size, 1);
    assert.ok(p95 <= 10_000, `warm p95 ${p95}ms exceeded 10s`);
  });

  it("has no network, database or filesystem imports", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/seating-solver-v1.ts", import.meta.url)), "utf8");
    assert.equal(source.includes("node:fs"), false);
    assert.equal(source.includes("node:net"), false);
    assert.equal(source.includes("postgres"), false);
    assert.equal(source.includes("fetch("), false);
    assert.ok(DEFAULT_SOLVER_CONFIG.algorithm === "SeatingSolverV1");
  });
});
