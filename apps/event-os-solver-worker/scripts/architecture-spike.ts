/**
 * Checkpoint 1 architecture spike.
 * Purpose: framed contract, cold/warm start, cancel, crash containment, peak RSS.
 * Expected duration: ≤2 minutes. Hard limit: 5 minutes.
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { runSolverChild, cancelSolverChild, crashContainmentProof } from "../src/child-runner.js";
import { encodeFrame, FrameDecoder, sha256Json } from "../src/frame.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "spike/out");
mkdirSync(outDir, { recursive: true });

const pythonPath = process.env.SOLVER_PYTHON ?? join(root, ".venv/bin/python");
const childScript = join(root, "python/solver_child.py");
const crashScript = join(root, "python/crash_child.py");
const evidenceJsonlEnv = process.env.SOLVER_SPIKE_EVIDENCE_JSONL;
const evidenceJsonl =
  evidenceJsonlEnv && evidenceJsonlEnv.length > 0
    ? evidenceJsonlEnv
    : join(outDir, "PERFORMANCE_AND_RESOURCES.jsonl");

function log(obj: Record<string, unknown>): void {
  const line = JSON.stringify({ at: new Date().toISOString(), ...obj });
  console.log(line);
  appendFileSync(evidenceJsonl, `${line}\n`);
  appendFileSync(join(outDir, "spike.jsonl"), `${line}\n`);
}

function rssSampleKb(pid: number): number | undefined {
  const r = spawnSync("ps", ["-o", "rss=", "-p", String(pid)], { encoding: "utf8" });
  if (r.status !== 0) return undefined;
  const n = Number((r.stdout || "").trim());
  return Number.isFinite(n) ? n : undefined;
}

async function main(): Promise<void> {
  // Frame round-trip unit proof
  const sample = { runId: "spike-1", unitCount: 3, tableCount: 2, capacity: 2, seed: 7 };
  const framed = encodeFrame(sample);
  const dec = new FrameDecoder();
  const decoded = dec.push(framed);
  if (JSON.stringify(decoded[0]) !== JSON.stringify(sample)) {
    throw new Error("frame_roundtrip_failed");
  }
  log({ kind: "frame_roundtrip", ok: true, bytes: framed.length, hash: sha256Json(sample) });

  // Cold start
  const coldT0 = performance.now();
  const cold = await runSolverChild({
    pythonPath,
    scriptPath: childScript,
    request: { ...sample, runId: "cold-1", maxTimeSeconds: 2 },
    wallMs: 20_000,
  });
  const coldMs = performance.now() - coldT0;
  const coldFinal = cold.messages.find((m) => m.type === "final");
  log({
    kind: "cold_child",
    elapsedMs: Math.round(coldMs),
    exitCode: cold.exitCode,
    finalOk: coldFinal && coldFinal.type === "final" ? coldFinal.ok : false,
    result: coldFinal && coldFinal.type === "final" ? coldFinal.payload.result : null,
    peakRssKbChild: coldFinal && coldFinal.type === "final" ? coldFinal.payload.resources : null,
  });

  // Warm starts (process still cold-spawned each time — measures spawn+import overhead)
  const warmMs: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const warm = await runSolverChild({
      pythonPath,
      scriptPath: childScript,
      request: { ...sample, runId: `warm-${i}`, maxTimeSeconds: 2 },
      wallMs: 20_000,
    });
    warmMs.push(Math.round(performance.now() - t0));
    if (warm.exitCode !== 0) throw new Error(`warm_exit_${warm.exitCode}`);
  }
  warmMs.sort((a, b) => a - b);
  log({
    kind: "warm_child",
    samples: warmMs,
    p50Ms: warmMs[Math.floor(warmMs.length / 2)],
    maxMs: warmMs[warmMs.length - 1],
  });

  // Cancellation
  const cancel = await cancelSolverChild(
    pythonPath,
    childScript,
    { runId: "cancel-1", mode: "sleep", sleepSeconds: 8 },
    400,
  );
  log({
    kind: "cancellation",
    elapsedMs: cancel.elapsedMs,
    exitCode: cancel.exitCode,
    signal: cancel.signal,
    stoppedUnder2s: cancel.elapsedMs < 2000,
  });

  // Crash containment
  const crash = await crashContainmentProof(pythonPath, crashScript);
  log({
    kind: "crash_containment",
    supervisorAlive: crash.supervisorAlive,
    childExit: crash.childExit,
    signal: crash.signal,
  });

  // Supervisor RSS sample (this process)
  log({
    kind: "supervisor_rss",
    rssKb: rssSampleKb(process.pid),
    note: "supervisor process RSS during spike",
  });

  const summary = {
    python: pythonPath,
    ortoolsPin: "9.15.6755",
    coldMs: Math.round(coldMs),
    warmP50Ms: warmMs[Math.floor(warmMs.length / 2)],
    cancelOk: cancel.elapsedMs < 2000,
    crashContained: crash.supervisorAlive === true && crash.childExit === 99,
    frameOk: true,
  };
  writeFileSync(join(outDir, "SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);
  log({ kind: "summary", ...summary });

  if (!summary.cancelOk || !summary.crashContained || cold.exitCode !== 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
