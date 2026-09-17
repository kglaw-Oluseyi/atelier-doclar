#!/usr/bin/env npx tsx
/**
 * Resumable CP-SAT qualification shard runner (Checkpoint 2).
 * Deterministic shards; writes evidence under docs/control/evidence/eos-s06-cpsat-production/qualification/
 * Does NOT recreate abandoned S076 background patterns.
 *
 * Usage:
 *   npx tsx scripts/cpsat-qualification-runner.ts --shard development
 *   npx tsx scripts/cpsat-qualification-runner.ts --shard scale-1000
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import { solverRequestToV2Compiled } from "../src/cpsat/corpus-bridge.js";
import {
  buildCapacity1000Corpus,
  capacity1000CorpusHash,
  type Capacity1000ScenarioId,
} from "../src/seating-capacity-1000-corpus.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
} from "../src/seating-v2-schemas.js";
import { exactHash } from "../src/eec-hash.js";

const EVIDENCE_ROOT = join(
  process.cwd(),
  "../../docs/control/evidence/eos-s06-cpsat-production/qualification",
);

type ShardId = "development" | "scale-50" | "scale-600" | "scale-1000" | "scale-2000" | "b-typical";

function parseArgs(): { shard: ShardId } {
  const idx = process.argv.indexOf("--shard");
  const shard = (idx >= 0 ? process.argv[idx + 1] : "development") as ShardId;
  return { shard };
}

function progress(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function tinyFixture(nGuests: number, seed: string) {
  const tables = Math.ceil(nGuests / 10);
  const guests = Array.from({ length: nGuests }, (_, i) => ({
    token: `g${String(i + 1).padStart(4, "0")}`,
    eligible: true,
    capabilityCodes: [] as string[],
    groupTokens: [] as string[],
  }));
  const positions = [];
  for (let t = 1; t <= tables; t++) {
    const seats = t < tables ? 10 : nGuests - (tables - 1) * 10;
    for (let s = 1; s <= seats; s++) {
      positions.push({
        token: `t${String(t).padStart(4, "0")}:${String(s).padStart(2, "0")}`,
        tableToken: `t${String(t).padStart(4, "0")}`,
        zoneCodes: [] as string[],
        capabilityCodes: [] as string[],
      });
    }
  }
  const rules =
    nGuests >= 2
      ? [
          {
            contentHash: exactHash({ together: "1-2", seed }),
            hardness: "HARD" as const,
            kind: "KEEP_TOGETHER" as const,
            scope: "TABLE" as const,
            subjectTokens: [guests[0]!.token, guests[1]!.token],
            tableTokens: [] as string[],
            zoneCodes: [] as string[],
            capabilityCodes: [] as string[],
            positionToken: null,
            weight: null,
          },
        ]
      : [];
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ seed, nGuests }),
    seed,
    guests,
    positions,
    rules,
    reservations: [],
  };
}

async function runCase(name: string, compiled: Parameters<typeof solveSeatingV2CompiledCpSat>[0], maxTimeSeconds: number) {
  const started = Date.now();
  progress(`START ${name} budget=${maxTimeSeconds}s`);
  const result = await solveSeatingV2CompiledCpSat(compiled, {
    runId: name,
    mode: "REPLAY",
    maxTimeSeconds,
  });
  const elapsedMs = Date.now() - started;
  progress(`DONE ${name} result=${result.productResult} elapsedMs=${elapsedMs} fault=${result.fault ?? ""}`);
  return {
    name,
    productResult: result.productResult,
    fault: result.fault ?? null,
    elapsedMs,
    seated: result.assignments.filter((a) => a.state === "SEATED").length,
    eligible: compiled.guests.filter((g) => g.eligible).length,
    explanationsOk: result.explanationsOk,
    verifierOk: result.verifierOk,
    engine: result.engine,
  };
}

async function main() {
  const { shard } = parseArgs();
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const outPath = join(EVIDENCE_ROOT, `${shard}.json`);
  const cases: Awaited<ReturnType<typeof runCase>>[] = [];

  if (shard === "development" || shard === "b-typical") {
    cases.push(await runCase("tiny-50", tinyFixture(50, "dev-50"), 15));
  }
  if (shard === "development") {
    cases.push(await runCase("tiny-together-3", tinyFixture(3, "dev-3"), 5));
  }
  if (shard === "b-typical" || shard === "scale-1000" || shard === "development") {
    const hash = capacity1000CorpusHash("B_TYPICAL");
    const compiled = solverRequestToV2Compiled(buildCapacity1000Corpus("B_TYPICAL"));
    const row = await runCase("B_TYPICAL", compiled, 90);
    cases.push({ ...row, corpusHash: hash } as typeof row & { corpusHash: string });
  }
  if (shard === "scale-50") cases.push(await runCase("scale-50", tinyFixture(50, "scale-50"), 20));
  if (shard === "scale-600") cases.push(await runCase("scale-600", tinyFixture(600, "scale-600"), 45));
  if (shard === "scale-2000") cases.push(await runCase("scale-2000", tinyFixture(2000, "scale-2000"), 120));

  const report = {
    shard,
    generatedAt: new Date().toISOString(),
    cases,
    summary: {
      passed: cases.filter((c) => (c.productResult === "FEASIBLE" || c.productResult === "OPTIMAL") && c.verifierOk && c.explanationsOk).length,
      total: cases.length,
    },
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  const digest = createHash("sha256").update(JSON.stringify(report)).digest("hex");
  writeFileSync(join(EVIDENCE_ROOT, `${shard}.sha256`), `${digest}  ${shard}.json\n`);
  progress(`WROTE ${outPath} sha256=${digest}`);
  if (report.summary.passed !== report.summary.total) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
