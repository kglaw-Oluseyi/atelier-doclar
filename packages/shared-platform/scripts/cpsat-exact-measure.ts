#!/usr/bin/env npx tsx
/**
 * Exact measurement capture for Checkpoint 2 evidence (B_TYPICAL + scale-2000).
 * Emits phase-level timings from child progress frames + post-solve verifier/explanation costs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { toChildPayload, mapChildAssignmentsToV2 } from "../src/cpsat/child-payload.js";
import { buildExplanations } from "../src/cpsat/explanations.js";
import { verifyCpsatAssignments } from "../src/cpsat-verifier/verify.js";
import { solverRequestToV2Compiled } from "../src/cpsat/corpus-bridge.js";
import { buildCapacity1000Corpus, capacity1000CorpusHash } from "../src/seating-capacity-1000-corpus.js";
import { toCpsatWireSeed } from "../src/cpsat/seed.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
} from "../src/seating-v2-schemas.js";

const EVIDENCE = join(process.cwd(), "../../docs/control/evidence/eos-s06-cpsat-production");

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

function scaleCorpus(nGuests: number, seed: string) {
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
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ seed, nGuests }),
    seed,
    guests,
    positions,
    rules: [
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
    ],
    reservations: [],
  };
}

async function measure(name: string, compiled: ReturnType<typeof scaleCorpus>, maxTimeSeconds: number) {
  const wall0 = performance.now();
  const tCompile0 = performance.now();
  const request = compileV2ToCpsatRequest(compiled, {
    runId: `measure-${name}`,
    mode: "REPLAY",
    maxTimeSeconds,
    wallSeconds: maxTimeSeconds * 3,
    workers: 1,
  });
  const compileMs = performance.now() - tCompile0;
  const seedInfo = toCpsatWireSeed(compiled.seed);
  const tSer0 = performance.now();
  const childPayload = toChildPayload(request);
  const serializeMs = performance.now() - tSer0;
  const payloadBytes = Buffer.byteLength(JSON.stringify(childPayload));

  const workerRoot = join(process.cwd(), "../../apps/event-os-solver-worker");
  const python = join(workerRoot, ".venv/bin/python");
  const script = join(workerRoot, "python/solver_child.py");

  const progressLog: Array<{ atMs: number; phase: string; detail?: string }> = [];
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
    },
  });
  let firstProgressMs: number | null = null;
  (child.stdio[3] as NodeJS.ReadableStream).on("data", (chunk: Buffer) => {
    for (const msg of decoder.push(chunk)) {
      messages.push(msg);
      const m = msg as { type?: string; phase?: string; detail?: string };
      if (m.type === "progress") {
        const atMs = performance.now() - spawn0;
        if (firstProgressMs == null) firstProgressMs = atMs;
        progressLog.push({ atMs, phase: String(m.phase), detail: m.detail });
      }
    }
  });
  child.stdin?.write(encodeFrame(childPayload));
  child.stdin?.end();
  await new Promise<void>((r) => child.on("exit", () => r()));
  const childWallMs = performance.now() - spawn0;

  const finalMsg = [...messages].reverse().find((m) => (m as { type?: string }).type === "final") as
    | { type: "final"; ok: boolean; payload: Record<string, unknown> }
    | undefined;
  if (!finalMsg?.ok || !finalMsg.payload) {
    return { name, error: "CHILD_RESPONSE", messages, progressLog, childWallMs };
  }
  const payload = finalMsg.payload;
  const childAssignments = (payload.assignments as Array<{ guest: number; table: number; seat: number }>) ?? [];

  const tExpl0 = performance.now();
  const expl = buildExplanations(request, childAssignments);
  const explanationMs = performance.now() - tExpl0;
  const assignments = mapChildAssignmentsToV2(
    request,
    childAssignments,
    (expl.explanations ?? []).map((e) => ({ guest: e.guest, code: e.code })),
  );
  const tVer0 = performance.now();
  const verifier = verifyCpsatAssignments(compiled as never, assignments);
  const verificationMs = performance.now() - tVer0;
  const tPersist0 = performance.now();
  const assignmentHash = exactHash(assignments);
  const responseHash = exactHash(payload);
  const persistenceMs = performance.now() - tPersist0;

  const seated = assignments.filter((a) => a.state === "SEATED");
  const g146 = seated.find((a) => a.guestToken === "g0146");
  const g147 = seated.find((a) => a.guestToken === "g0147");
  const table146 = g146 ? compiled.positions.find((p) => p.token === g146.positionToken)?.tableToken : null;
  const table147 = g147 ? compiled.positions.find((p) => p.token === g147.positionToken)?.tableToken : null;

  const hardViolations = verifier.ruleOutcomes.filter((r) => r.outcome === "VIOLATED");
  const totalWallMs = performance.now() - wall0;

  return {
    name,
    productResult: payload.result,
    faultCode: payload.faultCode ?? null,
    seed: {
      authored: compiled.seed,
      wire: seedInfo.seed,
      source: seedInfo.source,
      rawUnsigned: seedInfo.rawUnsigned ?? null,
      normalisedFromOversized: seedInfo.normalisedFromOversized,
    },
    model: {
      version: payload.modelVersion,
      contract: payload.contractVersion,
      guests: request.guests.length,
      seats: request.seats.length,
      tables: request.tables.length,
      units: request.units.length,
      togetherPairs: request.togetherPairs.length,
      apartPairs: request.apartPairs.length,
      preferences: request.preferences.length,
      hardRules: compiled.rules.filter((r) => r.hardness === "HARD").length,
      softRules: compiled.rules.filter((r) => r.hardness === "SOFT").length,
      slackClass: request.guests.filter((g) => g.eligible).length === request.seats.length ? "ZERO_SLACK" : "POSITIVE_SLACK",
      payloadBytes,
    },
    timingsMs: {
      compile: Number(compileMs.toFixed(3)),
      serialize: Number(serializeMs.toFixed(3)),
      childSpawnToFirstProgress: firstProgressMs == null ? null : Number(firstProgressMs.toFixed(3)),
      childWall: Number(childWallMs.toFixed(3)),
      explanation: Number(explanationMs.toFixed(3)),
      verification: Number(verificationMs.toFixed(3)),
      persistence: Number(persistenceMs.toFixed(3)),
      totalWall: Number(totalWallMs.toFixed(3)),
      deterministicSeconds: payload.deterministicSeconds ?? null,
      wallSecondsChild: payload.wallSeconds ?? null,
    },
    progressLog,
    tiers: payload.tiers ?? [],
    proofState: payload.proofState ?? null,
    resources: payload.resources ?? null,
    engine: payload.engine ?? null,
    seated: seated.length,
    eligible: compiled.guests.filter((g) => g.eligible).length,
    explanationsOk: expl.ok,
    explanationCount: expl.explanations?.length ?? 0,
    verifierOk: verifier.ok,
    hardViolations: hardViolations.length,
    hardRuleOutcomes: verifier.ruleOutcomes.length,
    g0146_g0147_sameTable: table146 != null && table146 === table147,
    g0146_table: table146,
    g0147_table: table147,
    assignmentHash,
    responseHash,
    mode: "REPLAY",
  };
}

async function main() {
  mkdirSync(join(EVIDENCE, "qualification"), { recursive: true });
  console.log(`[${new Date().toISOString()}] START exact measurements (B_TYPICAL then scale-2000)`);

  const bHash = capacity1000CorpusHash("B_TYPICAL");
  const bCompiled = solverRequestToV2Compiled(buildCapacity1000Corpus("B_TYPICAL"));
  const b = await measure("B_TYPICAL", bCompiled as never, 120);
  const bPath = join(EVIDENCE, "qualification/B_TYPICAL_EXACT.json");
  writeFileSync(
    bPath,
    JSON.stringify(
      {
        corpusHash: bHash,
        lockedCorpusHash: "13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668",
        corpusHashMatch: bHash === "13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668",
        measuredAt: new Date().toISOString(),
        result: b,
      },
      null,
      2,
    ),
  );
  console.log(`[${new Date().toISOString()}] WROTE ${bPath} product=${(b as { productResult?: string }).productResult}`);

  const s2000 = scaleCorpus(2000, "scale-2000");
  const s = await measure("scale-2000", s2000, 120);
  const sPath = join(EVIDENCE, "qualification/SCALE_2000_EXACT.json");
  writeFileSync(
    sPath,
    JSON.stringify(
      {
        corpusSeed: "scale-2000",
        corpusHash: exactHash(s2000),
        measuredAt: new Date().toISOString(),
        result: s,
      },
      null,
      2,
    ),
  );
  console.log(`[${new Date().toISOString()}] WROTE ${sPath} product=${(s as { productResult?: string }).productResult}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
