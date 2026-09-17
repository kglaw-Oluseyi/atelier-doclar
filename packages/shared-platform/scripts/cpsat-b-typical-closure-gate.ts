#!/usr/bin/env npx tsx
/**
 * B_TYPICAL closure gate: 5 cold + 5 warm Replay samples under 90s hard ceiling.
 * Expected ≤15 min. Stops with exit 2 if any sample ≥90000ms or quality fails.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import { solverRequestToV2Compiled } from "../src/cpsat/corpus-bridge.js";
import { buildCapacity1000Corpus, capacity1000CorpusHash } from "../src/seating-capacity-1000-corpus.js";
import { exactHash } from "../src/eec-hash.js";
import { redactExplanationForOrdinaryRole, buildExplanations } from "../src/cpsat/explanations.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { verifyCpsatAssignments } from "../src/cpsat-verifier/verify.js";

const HARD_CEILING_MS = 90_000;
const EVIDENCE = join(process.cwd(), "../../docs/control/evidence/eos-s06-cpsat-production/qualification");
const LOCKED = "13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668";

async function oneSample(label: string, compiled: ReturnType<typeof solverRequestToV2Compiled>) {
  const t0 = performance.now();
  const result = await solveSeatingV2CompiledCpSat(compiled, {
    runId: `b-typical-gate-${label}`,
    mode: "REPLAY",
    maxTimeSeconds: 60,
  });
  const wallMs = performance.now() - t0;
  const seated = result.assignments.filter((a) => a.state === "SEATED");
  const g146 = seated.find((a) => a.guestToken === "g0146");
  const g147 = seated.find((a) => a.guestToken === "g0147");
  const t146 = g146 ? compiled.positions.find((p) => p.token === g146.positionToken)?.tableToken : null;
  const t147 = g147 ? compiled.positions.find((p) => p.token === g147.positionToken)?.tableToken : null;
  const assignmentHash = exactHash(
    seated.map((a) => ({ g: a.guestToken, p: a.positionToken })).sort((a, b) => a.g.localeCompare(b.g)),
  );
  const verifier = verifyCpsatAssignments(compiled, result.assignments);
  const req = compileV2ToCpsatRequest(compiled, { runId: "leak-scan", maxTimeSeconds: 1 });
  // Redaction leak scan on explanation texts for ordinary role
  let redactionLeaks = 0;
  if (result.explanationsOk) {
    const childLike = result.assignments
      .filter((a) => a.state === "SEATED")
      .map((a) => {
        const gi = compiled.guests.findIndex((g) => g.token === a.guestToken);
        const seat = compiled.positions.findIndex((p) => p.token === a.positionToken);
        const table = compiled.positions.find((p) => p.token === a.positionToken);
        const ti = table ? [...new Set(compiled.positions.map((p) => p.tableToken))].indexOf(table.tableToken) : 0;
        return { guest: gi, table: ti, seat };
      })
      .filter((a) => a.guest >= 0 && a.seat >= 0);
    const expl = buildExplanations(req, childLike);
    for (const e of expl.explanations ?? []) {
      const red = redactExplanationForOrdinaryRole(e, true);
      if (JSON.stringify(red).includes("@") || /guestToken|email|name/i.test(JSON.stringify(e.evidence))) {
        redactionLeaks += 1;
      }
      // Evidence must be indices only
      for (const v of Object.values(e.evidence)) {
        if (typeof v === "string" && /[A-Za-z]{3,}/.test(v) && !["LOW", "MEDIUM", "HIGH", "PRINCIPAL", "GUARANTEE", "HOLD"].includes(v)) {
          redactionLeaks += 1;
        }
      }
    }
  }

  const hardViolations = verifier.ruleOutcomes.filter((r) => r.outcome === "VIOLATED").length;
  const ok =
    (result.productResult === "FEASIBLE" || result.productResult === "OPTIMAL") &&
    !result.fault &&
    seated.length === 1000 &&
    verifier.ok &&
    hardViolations === 0 &&
    t146 != null &&
    t146 === t147 &&
    result.explanationsOk &&
    redactionLeaks === 0 &&
    wallMs < HARD_CEILING_MS;

  return {
    label,
    ok,
    wallMs: Number(wallMs.toFixed(3)),
    underCeiling: wallMs < HARD_CEILING_MS,
    productResult: result.productResult,
    fault: result.fault ?? null,
    seated: seated.length,
    verifierOk: verifier.ok,
    hardViolations,
    explanationsOk: result.explanationsOk,
    redactionLeaks,
    g0146_g0147_sameTable: t146 === t147,
    assignmentHash,
    elapsedMsSolver: result.elapsedMs,
  };
}

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const hash = capacity1000CorpusHash("B_TYPICAL");
  if (hash !== LOCKED) {
    console.error("CORPUS_HASH_DRIFT", hash);
    process.exit(2);
  }
  const compiled = solverRequestToV2Compiled(buildCapacity1000Corpus("B_TYPICAL"));
  const samples = [];
  console.log(`[${new Date().toISOString()}] START B_TYPICAL closure gate hardCeilingMs=${HARD_CEILING_MS}`);

  for (let i = 1; i <= 5; i++) {
    console.log(`[${new Date().toISOString()}] COLD ${i}/5`);
    samples.push(await oneSample(`cold-${i}`, compiled));
    console.log(JSON.stringify(samples.at(-1)));
  }
  for (let i = 1; i <= 5; i++) {
    console.log(`[${new Date().toISOString()}] WARM ${i}/5`);
    samples.push(await oneSample(`warm-${i}`, compiled));
    console.log(JSON.stringify(samples.at(-1)));
  }

  const hashes = new Set(samples.map((s) => s.assignmentHash));
  const walls = samples.map((s) => s.wallMs).sort((a, b) => a - b);
  const p95 = walls[Math.min(walls.length - 1, Math.ceil(walls.length * 0.95) - 1)]!;
  const allOk = samples.every((s) => s.ok);
  const allUnder = samples.every((s) => s.underCeiling);
  const replayStable = hashes.size === 1;

  const report = {
    measuredAt: new Date().toISOString(),
    corpusHash: hash,
    hardCeilingMs: HARD_CEILING_MS,
    samples,
    summary: {
      allOk,
      allUnderCeiling: allUnder,
      replayAssignmentHashStable: replayStable,
      uniqueAssignmentHashes: [...hashes],
      wallMs: { min: walls[0], max: walls[walls.length - 1], p95, mean: walls.reduce((a, b) => a + b, 0) / walls.length },
      disposition: allOk && allUnder && replayStable ? "B_TYPICAL_CLOSURE_GATE_GREEN" : "BLOCKED — CP-SAT 1000 PERFORMANCE",
    },
  };
  const out = join(EVIDENCE, "B_TYPICAL_CLOSURE_GATE.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log("WROTE", out);
  console.log(JSON.stringify(report.summary, null, 2));
  if (!allOk || !allUnder || !replayStable) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
