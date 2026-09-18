/**
 * EOS-S06 1,000-guest capacity qualification timing runner.
 * Emits JSONL timing evidence to stdout and optional file path in CAPACITY_EVIDENCE_OUT.
 *
 * Expected duration: ≤8 minutes (4 scenarios × cold+5 warm).
 * Hard stop: 16 minutes. Progress: one JSONL row per scenario.
 * Safe interrupt: after any completed scenario (partial JSONL is valid).
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildCapacity1000Corpus,
  capacity1000CorpusManifest,
  capacity1000RuleProfile,
  CAPACITY_1000_SCENARIO_IDS,
  type Capacity1000ScenarioId,
} from "../src/seating-capacity-1000-corpus.js";
import { CAPACITY_1000_LAYOUT_JUSTIFICATION } from "../src/seating-capacity-1000-layout-fixture.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";
import { evaluateCapacityInvariants, percentile } from "../test/seating-capacity-invariants.js";

const WARM_SAMPLES = Number(process.env.CAPACITY_WARM_SAMPLES ?? "5");
const OUT = process.env.CAPACITY_EVIDENCE_OUT?.trim();
const HARD_CEILING_MS = 120_000;
const P95_TARGET_MS = 60_000;

function emit(row: Record<string, unknown>) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...row });
  process.stdout.write(`${line}\n`);
  if (OUT) {
    mkdirSync(dirname(OUT), { recursive: true });
    appendFileSync(OUT, `${line}\n`);
  }
}

function runScenario(scenario: Capacity1000ScenarioId) {
  const started = Date.now();
  emit({ kind: "scenario-start", scenario, expectedDurationNote: "cold+5 warm ≤ ~2 min typical" });
  const request = buildCapacity1000Corpus(scenario);
  const profile = capacity1000RuleProfile(scenario);
  const cold = solveSeatingV1(request);
  const warmMs: number[] = [];
  const heapSamples: number[] = [cold.metrics.heapUsedBytes];
  const hashes = new Set<string>([cold.resultHash]);
  for (let index = 0; index < WARM_SAMPLES; index += 1) {
    const warm = solveSeatingV1(request);
    warmMs.push(warm.metrics.elapsedMs);
    heapSamples.push(warm.metrics.heapUsedBytes);
    hashes.add(warm.resultHash);
    emit({
      kind: "warm-sample",
      scenario,
      sample: index + 1,
      elapsedMs: warm.metrics.elapsedMs,
      status: warm.status,
    });
  }
  const invariants = evaluateCapacityInvariants(request, cold);
  const row = {
    kind: "scenario-timing",
    scenario,
    seed: request.config.seed,
    datasetHash: capacity1000CorpusManifest().scenarios.find((item) => item.id === scenario)?.datasetHash,
    ruleProfile: profile,
    status: cold.status,
    hardViolations: cold.score.hardViolations,
    coldMs: cold.metrics.elapsedMs,
    warmMs,
    p50Ms: percentile(warmMs, 0.5),
    p95Ms: percentile(warmMs, 0.95),
    p99Ms: percentile(warmMs, 0.99),
    maxMs: Math.max(...warmMs),
    peakHeapUsedBytes: Math.max(...heapSamples),
    nodes: cold.metrics.nodes,
    components: cold.metrics.components,
    hashStable: hashes.size === 1,
    invariants,
    timingSource: "SeatingSolverV1.metrics.elapsedMs",
    sampleCount: WARM_SAMPLES + 1,
    wallMs: Date.now() - started,
  };
  emit(row);
  return { cold, warmMs, invariants, hashStable: hashes.size === 1, peakHeap: Math.max(...heapSamples) };
}

emit({
  kind: "manifest",
  ...capacity1000CorpusManifest(),
  layout: CAPACITY_1000_LAYOUT_JUSTIFICATION,
  warmSamples: WARM_SAMPLES,
  p95TargetMs: P95_TARGET_MS,
  hardCeilingMs: HARD_CEILING_MS,
});

let failed = false;
const scenarios = CAPACITY_1000_SCENARIO_IDS.filter((id) => id !== "E_RECOVERY");
for (const scenario of scenarios) {
  const row = runScenario(scenario);
  const p95 = percentile(row.warmMs, 0.95);
  const meta = capacity1000CorpusManifest().scenarios.find((item) => item.id === scenario);
  if (!row.hashStable) failed = true;
  if (row.cold.metrics.elapsedMs > HARD_CEILING_MS) {
    emit({ kind: "blocked", reason: "BLOCKED — PRODUCT CAPACITY", scenario, coldMs: row.cold.metrics.elapsedMs });
    failed = true;
    break;
  }
  if (meta?.expectedStatus === "FEASIBLE") {
    if (row.cold.status !== "FEASIBLE" || row.cold.score.hardViolations !== 0) failed = true;
    if (p95 > P95_TARGET_MS) failed = true;
  } else if (row.cold.status === "FEASIBLE") {
    failed = true;
  }
}

emit({ kind: "summary", failed, applicationIdentityNote: "solver-only runner; deployed SHA recorded separately" });
if (OUT) {
  const summaryPath = OUT.replace(/SOLVER_TIMING\.jsonl$/, "RULE_PROFILE.json");
  if (summaryPath !== OUT) {
    writeFileSync(
      summaryPath,
      JSON.stringify(
        Object.fromEntries(scenarios.map((scenario) => [scenario, capacity1000RuleProfile(scenario)])),
        null,
        2,
      ),
    );
  }
}
process.exitCode = failed ? 1 : 0;
