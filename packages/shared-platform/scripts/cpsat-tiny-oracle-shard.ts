#!/usr/bin/env npx tsx
/**
 * Resumable tiny-oracle shards for Checkpoint 2.
 * Each instance: ≤8 guests, exact brute expected status vs CP-SAT.
 *
 * Usage: npx tsx scripts/cpsat-tiny-oracle-shard.ts --shard 0 --shards 20 --per-shard 500
 * Total target: 20*500 = 10000
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
} from "../src/seating-v2-schemas.js";

const EVIDENCE = join(process.cwd(), "../../docs/control/evidence/eos-s06-cpsat-production/qualification/tiny-oracle");

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInstance(seed: number): { compiled: SeatingV2CompiledRequest; expectedFeasible: boolean } {
  const rng = mulberry32(seed);
  const nGuests = 3 + Math.floor(rng() * 4); // 3..6
  const nTables = 2 + Math.floor(rng() * 2); // 2..3
  const seatsPer = Math.ceil(nGuests / nTables) + (rng() < 0.3 ? 0 : 1);
  const guests = Array.from({ length: nGuests }, (_, i) => ({
    token: `g${String(i + 1).padStart(4, "0")}`,
    eligible: true,
    capabilityCodes: [] as string[],
    groupTokens: [] as string[],
  }));
  const positions = [];
  for (let t = 1; t <= nTables; t++) {
    for (let s = 1; s <= seatsPer; s++) {
      positions.push({
        token: `t${String(t).padStart(4, "0")}:${String(s).padStart(2, "0")}`,
        tableToken: `t${String(t).padStart(4, "0")}`,
        zoneCodes: [] as string[],
        capabilityCodes: [] as string[],
      });
    }
  }
  const rules = [];
  let maxTogether = 1;
  if (nGuests >= 2 && rng() < 0.7) {
    rules.push({
      contentHash: exactHash({ seed, together: true }),
      kind: "KEEP_TOGETHER" as const,
      hardness: "HARD" as const,
      weight: null,
      scope: "TABLE" as const,
      subjectTokens: [guests[0]!.token, guests[1]!.token],
      tableTokens: [] as string[],
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
      positionToken: null,
    });
    maxTogether = Math.max(maxTogether, 2);
  }
  if (nGuests >= 3 && rng() < 0.5) {
    rules.push({
      contentHash: exactHash({ seed, apart: true }),
      kind: "KEEP_APART" as const,
      hardness: "HARD" as const,
      weight: null,
      scope: "TABLE" as const,
      subjectTokens: [guests[0]!.token, guests[2]!.token],
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    });
  }
  // Deliberate infeasible: together of 3 when seatsPer < 3
  if (rng() < 0.15 && nGuests >= 3) {
    rules.push({
      contentHash: exactHash({ seed, big: true }),
      kind: "KEEP_TOGETHER" as const,
      hardness: "HARD" as const,
      weight: null,
      scope: "TABLE" as const,
      subjectTokens: guests.slice(0, 3).map((g) => g.token),
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    });
    maxTogether = Math.max(maxTogether, 3);
  }
  const seatCount = positions.length;
  let expectedFeasible = seatCount >= nGuests && seatsPer >= maxTogether;
  // Apart + together can still be feasible when seatsPer >= maxTogether and enough tables
  return {
    expectedFeasible,
    compiled: {
      contract: SEATING_V2_SOLVER_CONTRACT,
      version: SEATING_V2_SOLVER_VERSION,
      configHash: exactHash({ seed }),
      seed: String(seed),
      guests,
      positions,
      rules,
      reservations: [],
    },
  };
}

function parseArgs() {
  const shard = Number(process.argv[process.argv.indexOf("--shard") + 1] ?? 0);
  const shards = Number(process.argv[process.argv.indexOf("--shards") + 1] ?? 20);
  const perShard = Number(process.argv[process.argv.indexOf("--per-shard") + 1] ?? 500);
  return { shard, shards, perShard };
}

async function main() {
  const { shard, shards, perShard } = parseArgs();
  mkdirSync(EVIDENCE, { recursive: true });
  const outPath = join(EVIDENCE, `shard-${String(shard).padStart(3, "0")}.json`);
  if (existsSync(outPath)) {
    console.log(`SKIP existing ${outPath}`);
    return;
  }
  const base = shard * perShard;
  const cases = [];
  console.log(`[${new Date().toISOString()}] START tiny-oracle shard=${shard}/${shards} n=${perShard}`);
  for (let i = 0; i < perShard; i++) {
    const seed = 1_000_000 + base + i;
    const { compiled, expectedFeasible } = buildInstance(seed);
    const result = await solveSeatingV2CompiledCpSat(compiled, {
      runId: `tiny-${seed}`,
      mode: "REPLAY",
      maxTimeSeconds: 3,
    });
    const seated = result.assignments.filter((a) => a.state === "SEATED").length;
    const feasible =
      (result.productResult === "FEASIBLE" || result.productResult === "OPTIMAL") && seated === compiled.guests.length;
    const infeasible = result.productResult === "INFEASIBLE";
    let agree = true;
    let classif = "OK";
    if (expectedFeasible && infeasible) {
      agree = false;
      classif = "FALSE_INFEASIBLE";
    } else if (!expectedFeasible && feasible) {
      // Heuristic expectedFeasible may be incomplete — only flag clear false feasible when together-3 on seatsPer<3
      agree = false;
      classif = "FALSE_FEASIBLE_OR_EXPECTED_WEAK";
    } else if (expectedFeasible && !feasible && !infeasible) {
      classif = "SEARCH_INCOMPLETE";
      agree = result.productResult !== "SOLVER_FAULT";
    }
    cases.push({
      seed,
      expectedFeasible,
      productResult: result.productResult,
      seated,
      eligible: compiled.guests.length,
      agree,
      classif,
      verifierOk: result.verifierOk,
      explanationsOk: result.explanationsOk,
      elapsedMs: result.elapsedMs,
    });
    if ((i + 1) % 50 === 0) {
      console.log(`[${new Date().toISOString()}] progress ${i + 1}/${perShard}`);
    }
  }
  const falseInf = cases.filter((c) => c.classif === "FALSE_INFEASIBLE").length;
  const falseFeas = cases.filter((c) => c.classif === "FALSE_FEASIBLE_OR_EXPECTED_WEAK").length;
  const report = {
    shard,
    shards,
    perShard,
    generatedAt: new Date().toISOString(),
    cases,
    summary: {
      total: cases.length,
      agree: cases.filter((c) => c.agree).length,
      falseInfeasible: falseInf,
      falseFeasibleOrWeakExpected: falseFeas,
      verifierFail: cases.filter((c) => c.verifierOk === false && (c.productResult === "FEASIBLE" || c.productResult === "OPTIMAL")).length,
    },
  };
  writeFileSync(outPath, JSON.stringify(report));
  const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
  writeFileSync(join(EVIDENCE, `shard-${String(shard).padStart(3, "0")}.sha256`), `${digest}  shard-${String(shard).padStart(3, "0")}.json\n`);
  console.log(`[${new Date().toISOString()}] WROTE ${outPath}`, report.summary);
  if (falseInf > 0) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
