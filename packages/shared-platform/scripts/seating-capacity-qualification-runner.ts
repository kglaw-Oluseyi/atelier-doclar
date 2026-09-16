/**
 * EOS-S06 600-guest capacity qualification timing runner.
 * Emits JSONL timing evidence to stdout and optional file path in CAPACITY_EVIDENCE_OUT.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildCapacityCorpus,
  capacityCorpusManifest,
  CAPACITY_SCENARIO_IDS,
  type CapacityScenarioId,
} from "../src/seating-capacity-corpus.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";
import { evaluateCapacityInvariants, percentile } from "../test/seating-capacity-invariants.js";

const WARM_SAMPLES = Number(process.env.CAPACITY_WARM_SAMPLES ?? "10");
const OUT = process.env.CAPACITY_EVIDENCE_OUT?.trim();

function emit(row: Record<string, unknown>) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...row });
  process.stdout.write(`${line}\n`);
  if (OUT) {
    mkdirSync(dirname(OUT), { recursive: true });
    appendFileSync(OUT, `${line}\n`);
  }
}

function runScenario(scenario: CapacityScenarioId) {
  const request = buildCapacityCorpus(scenario);
  const cold = solveSeatingV1(request);
  const warmMs: number[] = [];
  const hashes = new Set<string>([cold.resultHash]);
  for (let index = 0; index < WARM_SAMPLES; index += 1) {
    const warm = solveSeatingV1(request);
    warmMs.push(warm.metrics.elapsedMs);
    hashes.add(warm.resultHash);
  }
  const invariants = evaluateCapacityInvariants(request, cold);
  emit({
    kind: "scenario-timing",
    scenario,
    seed: request.config.seed,
    datasetHash: capacityCorpusManifest().scenarios.find((item) => item.id === scenario)?.datasetHash,
    status: cold.status,
    hardViolations: cold.score.hardViolations,
    coldMs: cold.metrics.elapsedMs,
    warmMs,
    p50Ms: percentile(warmMs, 0.5),
    p95Ms: percentile(warmMs, 0.95),
    p99Ms: percentile(warmMs, 0.99),
    maxMs: Math.max(...warmMs),
    heapUsedBytes: Math.max(cold.metrics.heapUsedBytes, ...warmMs.map((_, index) => cold.metrics.heapUsedBytes)),
    hashStable: hashes.size === 1,
    invariants,
    timingSource: "SeatingSolverV1.metrics.elapsedMs",
    sampleCount: WARM_SAMPLES + 1,
  });
  return { cold, warmMs, invariants, hashStable: hashes.size === 1 };
}

emit({ kind: "manifest", ...capacityCorpusManifest(), warmSamples: WARM_SAMPLES });

let failed = false;
for (const scenario of CAPACITY_SCENARIO_IDS) {
  const row = runScenario(scenario);
  const p95 = percentile(row.warmMs, 0.95);
  const meta = capacityCorpusManifest().scenarios.find((item) => item.id === scenario);
  if (!row.hashStable) failed = true;
  if (meta?.expectedStatus === "FEASIBLE") {
    if (row.cold.status !== "FEASIBLE" || row.cold.score.hardViolations !== 0) failed = true;
    if (p95 > 30_000 || row.cold.metrics.elapsedMs > 60_000) failed = true;
  } else if (row.cold.status === "FEASIBLE") {
    failed = true;
  }
}

emit({ kind: "summary", failed, applicationIdentityNote: "solver-only runner; deployed SHA recorded separately" });
process.exitCode = failed ? 1 : 0;
