/**
 * M6D local rich UX fixture — real CP-SAT child proof (do not adopt).
 *
 * 12 guests / 3 tables × 4 seats; lock + HARD together + HARD apart + preferences;
 * baseline conflicts requiring movement; feasible by construction.
 *
 *   pnpm exec tsx packages/shared-platform/scripts/m6d-rich-ux-fixture-local-proof.ts
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exactHash } from "../src/eec-hash.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { toChildPayload } from "../src/cpsat/child-payload.js";
import { SEATING_V2_SOLVER_CONTRACT, SEATING_V2_SOLVER_VERSION } from "../src/seating-v2-schemas.js";

const EVIDENCE = join(
  process.cwd(),
  process.cwd().endsWith("shared-platform")
    ? "../../docs/control/evidence/eos-s06-cpsat-production/milestone-6de"
    : "docs/control/evidence/eos-s06-cpsat-production/milestone-6de",
);

const GUESTS = Array.from({ length: 12 }, (_, i) => `ux${String(i + 1).padStart(2, "0")}`);
const TABLES = ["tblA", "tblB", "tblC"];
const positions = TABLES.flatMap((table) =>
  [1, 2, 3, 4].map((seat) => ({
    token: `${table}:${String(seat).padStart(2, "0")}`,
    tableToken: table,
    zoneCodes: [] as string[],
    capabilityCodes: [] as string[],
  })),
);

// Baseline conflicts: locked guest on wrong table vs together/apart; prefer movement.
const baselineAssignments = GUESTS.map((guest, index) => {
  const table = TABLES[index % 3]!;
  const seat = (Math.floor(index / 3) % 4) + 1;
  return {
    guestToken: guest,
    positionToken: `${table}:${String(seat).padStart(2, "0")}`,
    tableToken: table,
  };
});
// Force visible movement: put together-pair on different tables and apart-pair on same table.
baselineAssignments[0]!.tableToken = "tblA";
baselineAssignments[0]!.positionToken = "tblA:01";
baselineAssignments[1]!.tableToken = "tblB";
baselineAssignments[1]!.positionToken = "tblB:01";
baselineAssignments[2]!.tableToken = "tblA";
baselineAssignments[2]!.positionToken = "tblA:02";
baselineAssignments[3]!.tableToken = "tblA";
baselineAssignments[3]!.positionToken = "tblA:03";

const compiled = {
  contract: SEATING_V2_SOLVER_CONTRACT,
  version: SEATING_V2_SOLVER_VERSION,
  configHash: exactHash({ fixture: "m6d-rich-ux" }),
  seed: "42",
  guests: GUESTS.map((token) => ({
    token,
    eligible: true,
    capabilityCodes: [] as string[],
    groupTokens: [] as string[],
  })),
  positions,
  rules: [
    {
      contentHash: exactHash({ lock: "ux01-tblA01" }),
      hardness: "HARD" as const,
      kind: "LOCK_ASSIGNMENT" as const,
      scope: "POSITION" as const,
      subjectTokens: ["ux01"],
      tableTokens: [] as string[],
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
      positionToken: "tblA:01",
      weight: null,
    },
    {
      contentHash: exactHash({ together: "ux01-ux02" }),
      hardness: "HARD" as const,
      kind: "KEEP_TOGETHER" as const,
      scope: "TABLE" as const,
      subjectTokens: ["ux01", "ux02"],
      tableTokens: [] as string[],
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
      positionToken: null,
      weight: null,
    },
    {
      contentHash: exactHash({ apart: "ux03-ux04" }),
      hardness: "HARD" as const,
      kind: "KEEP_APART" as const,
      scope: "TABLE" as const,
      subjectTokens: ["ux03", "ux04"],
      tableTokens: [] as string[],
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
      positionToken: null,
      weight: null,
    },
    {
      contentHash: exactHash({ prefer: "ux05-ux06" }),
      hardness: "SOFT" as const,
      kind: "PREFER_TOGETHER" as const,
      scope: "TABLE" as const,
      subjectTokens: ["ux05", "ux06"],
      tableTokens: [] as string[],
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
      positionToken: null,
      weight: 10,
    },
    {
      contentHash: exactHash({ preferApart: "ux07-ux08" }),
      hardness: "SOFT" as const,
      kind: "PREFER_APART" as const,
      scope: "TABLE" as const,
      subjectTokens: ["ux07", "ux08"],
      tableTokens: [] as string[],
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
      positionToken: null,
      weight: 5,
    },
  ],
  reservations: [],
};

const request = compileV2ToCpsatRequest(compiled, {
  runId: "m6d-rich-ux-local",
  maxTimeSeconds: 30,
  wallSeconds: 60,
  baseline: baselineAssignments.map((b) => ({
    guestToken: b.guestToken,
    positionToken: b.positionToken,
  })),
});
const childPayload = toChildPayload(request);

function encodeFrame(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

class FrameDecoder {
  buffer = Buffer.alloc(0);
  push(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const out: unknown[] = [];
    while (this.buffer.length >= 4) {
      const len = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + len) break;
      const body = this.buffer.subarray(4, 4 + len);
      this.buffer = this.buffer.subarray(4 + len);
      out.push(JSON.parse(body.toString("utf8")));
    }
    return out;
  }
}

const workerRoot = join(
  process.cwd().endsWith("shared-platform") ? "../.." : ".",
  "apps/event-os-solver-worker",
);
const python = join(workerRoot, ".venv/bin/python");
const script = join(workerRoot, "python/solver_child.py");

const child = spawn(python, [script], {
  stdio: ["pipe", "pipe", "pipe", "pipe"],
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    LANG: "C.UTF-8",
  },
});

const decoder = new FrameDecoder();
const messages: unknown[] = [];
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("child timeout")), 90_000);
  child.stdio[3]?.on("data", (chunk: Buffer) => {
    for (const msg of decoder.push(chunk)) messages.push(msg);
    const last = messages.at(-1) as { type?: string } | undefined;
    if (last?.type === "RESULT" || last?.type === "FAULT") {
      clearTimeout(timer);
      resolve();
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  child.on("error", reject);
  child.on("exit", (code) => {
    if (code && code !== 0) reject(new Error(`child exit ${code}`));
  });
  child.stdin?.write(encodeFrame({ type: "SOLVE", request: childPayload }));
  child.stdin?.end();
});

const result = messages.find((m) => (m as { type?: string }).type === "RESULT") as {
  type: "RESULT";
  productResult?: string;
  assignments?: Array<{ guestToken: string; positionToken?: string; tableToken?: string; state: string }>;
  explanations?: unknown[];
  evidenceGrade?: string;
  assignmentHash?: string;
};

assert.ok(result, "child RESULT missing");
assert.ok(["OPTIMAL", "FEASIBLE"].includes(String(result.productResult)), `unexpected result ${result.productResult}`);

const seated = (result.assignments ?? []).filter((a) => a.state === "SEATED");
assert.equal(seated.length, 12, "12/12 seated");

const byGuest = new Map(seated.map((a) => [a.guestToken, a]));
assert.equal(byGuest.get("ux01")?.positionToken, "tblA:01", "lock respected");
assert.equal(byGuest.get("ux01")?.tableToken, byGuest.get("ux02")?.tableToken, "together respected");
assert.notEqual(byGuest.get("ux03")?.tableToken, byGuest.get("ux04")?.tableToken, "apart respected");

const moved = seated.filter((a) => {
  const base = baselineAssignments.find((b) => b.guestToken === a.guestToken);
  return base && (base.positionToken !== a.positionToken || base.tableToken !== a.tableToken);
});
assert.ok(moved.length >= 1, "visible baseline movement");
assert.ok((result.explanations?.length ?? 0) >= 12, "explanations produced");
assert.ok(result.assignmentHash, "candidate sealed with hash");

mkdirSync(EVIDENCE, { recursive: true });
const proof = {
  fixture: "M6D Claude Seating UX Verification (local child)",
  guests: 12,
  tables: 3,
  capacityEach: 4,
  productResult: result.productResult,
  evidenceGrade: result.evidenceGrade ?? null,
  seated: seated.length,
  lockOk: byGuest.get("ux01")?.positionToken === "tblA:01",
  togetherOk: byGuest.get("ux01")?.tableToken === byGuest.get("ux02")?.tableToken,
  apartOk: byGuest.get("ux03")?.tableToken !== byGuest.get("ux04")?.tableToken,
  movementCount: moved.length,
  explanationCount: result.explanations?.length ?? 0,
  assignmentHash: result.assignmentHash,
  adopted: false,
  generatedAt: new Date().toISOString(),
};
writeFileSync(join(EVIDENCE, "RICH_FIXTURE_LOCAL_PROOF.json"), JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
child.kill();
process.exit(0);
