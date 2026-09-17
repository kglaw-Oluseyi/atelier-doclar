#!/usr/bin/env npx tsx
/**
 * Narrow B_TYPICAL phase profile — Checkpoint 2 performance diagnosis.
 * Expected ≤3 min. Does not run full matrix.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { toChildPayload } from "../src/cpsat/child-payload.js";
import { solverRequestToV2Compiled } from "../src/cpsat/corpus-bridge.js";
import { buildCapacity1000Corpus, capacity1000CorpusHash } from "../src/seating-capacity-1000-corpus.js";
import { exactHash } from "../src/eec-hash.js";

const EVIDENCE = join(
  process.cwd(),
  "../../docs/control/evidence/eos-s06-cpsat-production/qualification",
);

function encodeFrame(payload: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

class FrameDecoder {
  buffer = Buffer.alloc(0);
  push(chunk: Buffer): unknown[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const out: unknown[] = [];
    while (this.buffer.length >= 4) {
      const len = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + len) break;
      out.push(JSON.parse(this.buffer.subarray(4, 4 + len).toString("utf8")));
      this.buffer = this.buffer.subarray(4 + len);
    }
    return out;
  }
}

async function main() {
  mkdirSync(EVIDENCE, { recursive: true });
  const hash = capacity1000CorpusHash("B_TYPICAL");
  const compiled = solverRequestToV2Compiled(buildCapacity1000Corpus("B_TYPICAL"));

  const t0 = performance.now();
  const request = compileV2ToCpsatRequest(compiled, {
    runId: "b-typical-profile",
    mode: "REPLAY",
    maxTimeSeconds: 85, // leave headroom under 90s wall for Stage B + settle
    wallSeconds: 88,
    workers: 1,
  });
  const compileMs = performance.now() - t0;

  const domainSum = request.units.reduce((s, u) => s + u.domainTables.length, 0);
  const modelStats = {
    guests: request.guests.length,
    seats: request.seats.length,
    tables: request.tables.length,
    units: request.units.length,
    togetherPairs: request.togetherPairs.length,
    apartPairs: request.apartPairs.length,
    preferences: request.preferences.length,
    domainSum,
    avgDomain: domainSum / Math.max(1, request.units.length),
    denseBoolUpperBound: request.units.length * request.tables.length,
    sparseBoolEstimate: domainSum,
  };

  const t1 = performance.now();
  const childPayload = toChildPayload(request);
  // Ask Python for a profiled solve with model stats
  (childPayload as { profile?: boolean }).profile = true;
  const serializeMs = performance.now() - t1;

  const workerRoot = join(process.cwd(), "../../apps/event-os-solver-worker");
  const python = join(workerRoot, ".venv/bin/python");
  const script = join(workerRoot, "python/solver_child.py");

  const progress: Array<{ atMs: number; phase: string; detail?: string }> = [];
  const messages: unknown[] = [];
  const decoder = new FrameDecoder();
  const spawn0 = performance.now();
  const child = spawn(python, [script], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? "/tmp",
      LANG: "C.UTF-8",
      PYTHONUNBUFFERED: "1",
      CPSAT_PROFILE: "1",
    },
  });
  (child.stdio[3] as NodeJS.ReadableStream).on("data", (chunk: Buffer) => {
    for (const msg of decoder.push(chunk)) {
      messages.push(msg);
      const m = msg as { type?: string; phase?: string; detail?: string };
      if (m.type === "progress") {
        progress.push({ atMs: performance.now() - spawn0, phase: String(m.phase), detail: m.detail });
      }
    }
  });
  let stderr = "";
  child.stderr?.on("data", (c) => {
    stderr += c.toString();
  });
  child.stdin?.write(encodeFrame(childPayload));
  child.stdin?.end();
  await new Promise<void>((r) => child.on("exit", () => r()));
  const childWallMs = performance.now() - spawn0;
  const totalWallMs = performance.now() - t0;

  const finalMsg = [...messages].reverse().find((m) => (m as { type?: string }).type === "final") as
    | { ok: boolean; payload: Record<string, unknown> }
    | undefined;

  const report = {
    measuredAt: new Date().toISOString(),
    corpusHash: hash,
    corpusHashLocked: "13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668",
    mode: "REPLAY",
    workers: 1,
    limits: request.limits,
    harness: {
      compileMs: Number(compileMs.toFixed(3)),
      serializeMs: Number(serializeMs.toFixed(3)),
      childWallMs: Number(childWallMs.toFixed(3)),
      totalWallMs: Number(totalWallMs.toFixed(3)),
      includesContainerLaunch: false,
      includesProcessStartupInChildWall: true,
    },
    modelStats,
    progress,
    payload: finalMsg?.payload ?? null,
    stderrTail: stderr.slice(-2000),
    diagnosisHint:
      "Prior exact: A1≈5.7s, A2≈85.0s, StageB≈0.3s — A2 optimality proof dominated wall under dense x[u,t].",
  };

  const out = join(EVIDENCE, "B_TYPICAL_PHASE_PROFILE.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    product: finalMsg?.payload?.result,
    totalWallMs: report.harness.totalWallMs,
    childWallMs: report.harness.childWallMs,
    tiers: finalMsg?.payload?.tiers,
    modelStats,
    profile: finalMsg?.payload?.profile ?? null,
  }, null, 2));
  console.log("WROTE", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
