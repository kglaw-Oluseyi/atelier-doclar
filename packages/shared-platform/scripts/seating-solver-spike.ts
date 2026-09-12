import { seatingCorpus50, seatingCorpus200, seatingCorpus600, seatingImpossibleCapability, seatingImpossibleCapacity, seatingImpossibleLocks } from "../src/seating-solver-fixtures.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";
import type { SolverRequest } from "../src/seating-solver-types.js";

type SpikeRow = {
  corpus: string;
  coldMs: number;
  warmMs: number[];
  p95Ms: number;
  heapUsedBytes: number;
  status: string;
  hardViolations: number;
  resultHash: string;
  hashStable: boolean;
};

function percentile(values: number[], ratio: number): number {
  const ranked = [...values].sort((left, right) => left - right);
  return ranked[Math.min(ranked.length - 1, Math.ceil(ranked.length * ratio) - 1)];
}

function runCorpus(name: string, request: SolverRequest): SpikeRow {
  const cold = solveSeatingV1(request);
  const warm: ReturnType<typeof solveSeatingV1>[] = [];
  for (let index = 0; index < 10; index += 1) warm.push(solveSeatingV1(request));
  const hashes = new Set(warm.map((item) => item.resultHash));
  hashes.add(cold.resultHash);
  return {
    corpus: name,
    coldMs: cold.metrics.elapsedMs,
    warmMs: warm.map((item) => item.metrics.elapsedMs),
    p95Ms: percentile(warm.map((item) => item.metrics.elapsedMs), 0.95),
    heapUsedBytes: Math.max(...warm.map((item) => item.metrics.heapUsedBytes)),
    status: cold.status,
    hardViolations: cold.score.hardViolations,
    resultHash: cold.resultHash,
    hashStable: hashes.size === 1,
  };
}

const rows = [
  runCorpus("50", seatingCorpus50()),
  runCorpus("200", seatingCorpus200()),
  runCorpus("600", seatingCorpus600()),
  runCorpus("impossible-capacity", seatingImpossibleCapacity()),
  runCorpus("impossible-locks", seatingImpossibleLocks()),
  runCorpus("impossible-capability", seatingImpossibleCapability()),
];

for (const row of rows) {
  process.stdout.write(`${JSON.stringify(row)}\n`);
}

const gate600 = rows.find((row) => row.corpus === "600");
if (!gate600 || gate600.p95Ms > 10_000 || gate600.coldMs > 20_000 || gate600.hardViolations !== 0 || !gate600.hashStable) {
  process.exitCode = 1;
}
