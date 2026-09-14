#!/usr/bin/env node
/**
 * Checkpointed Section 13 local runner.
 * Modes via EVENT_OS_CHECKPOINT_MODE:
 *   p1-p5 (default) — foundation through j1a/j1b
 *   j2 — foundation through P3, then j2-prep/reviewer/publish (no j1)
 *   j3-j4 — consume j2 last-known-good only (requires EVENT_OS_CHECKPOINT_LKG_DIR)
 *   full — foundation + j1 + j2 (does not include j3/j4)
 * Fresh next-dev per phase; shared temp file store + manifest under OS tmp.
 * Never pass live/Railway URLs. Does not clean the store until evidence is copied.
 */
import { spawn } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(scriptsDir);
const heapMb = process.env.EVENT_OS_E2E_HEAP_MB ?? "4096";
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const workDir = join(tmpdir(), `s075-ckpt-${stamp}`);
const storePath = join(workDir, "event-os-non-production.json");
const seatingV2Path = storePath.replace(/\.json$/i, ".seating-v2.json");
const manifestPath = join(workDir, "manifest.json");
const evidenceDir = "/tmp/s075-p7-evidence";
const mode = (process.env.EVENT_OS_CHECKPOINT_MODE ?? "p1-p5").trim();
const lkgDir = process.env.EVENT_OS_CHECKPOINT_LKG_DIR?.trim() || "";

const foundationPhases = [
  { id: "p1", spec: "e2e/s075-checkpoint-p1.spec.ts" },
  { id: "p1-guests", spec: "e2e/s075-checkpoint-p1-guests.spec.ts" },
  { id: "p1-venue", spec: "e2e/s075-checkpoint-p1-venue.spec.ts" },
  { id: "p2", spec: "e2e/s075-checkpoint-p2.spec.ts" },
  { id: "p3", spec: "e2e/s075-checkpoint-p3.spec.ts" },
];
const j1Phases = [
  { id: "p4", spec: "e2e/s075-checkpoint-p4.spec.ts" },
  { id: "p5", spec: "e2e/s075-checkpoint-p5.spec.ts" },
];
const j2Phases = [
  { id: "j2-prep", spec: "e2e/s075-checkpoint-j2-prep.spec.ts" },
  { id: "j2-reviewer", spec: "e2e/s075-checkpoint-j2-reviewer.spec.ts" },
  { id: "j2-publish", spec: "e2e/s075-checkpoint-j2-publish.spec.ts" },
];
const j3j4Phases = [
  { id: "j3", spec: "e2e/s075-checkpoint-j3-exports.spec.ts" },
  { id: "j4", spec: "e2e/s075-checkpoint-j4-ux.spec.ts" },
];

const phases =
  mode === "j2"
    ? [...foundationPhases, ...j2Phases]
    : mode === "j3-j4"
      ? j3j4Phases
      : mode === "full"
        ? [...foundationPhases, ...j1Phases, ...j2Phases]
        : [...foundationPhases, ...j1Phases];

const passVerdict =
  mode === "j2" ? "J2_PASS" : mode === "j3-j4" ? "J3_J4_PASS" : mode === "full" ? "FULL_PASS" : "P1_P5_PASS";

function assertTempPath(label, target) {
  const resolved = resolve(target);
  const roots = [tmpdir(), "/tmp", process.env.TMPDIR].filter(Boolean).map((item) => resolve(item));
  if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) {
    throw new Error(`${label} must resolve under an OS temporary directory: ${resolved}`);
  }
  return resolved;
}

function migrateSeatingV2Store(sourcePath, destinationPath, platformPath) {
  const raw = JSON.parse(readFileSync(sourcePath, "utf8"));
  const payload =
    raw && typeof raw === "object" && raw.schemaVersion === 1 && raw.state
      ? {
          schemaVersion: 1,
          platformStorePath: resolve(platformPath),
          state: raw.state,
          audit: Array.isArray(raw.audit) ? raw.audit : [],
        }
      : {
          schemaVersion: 1,
          platformStorePath: resolve(platformPath),
          state: raw.state ?? raw,
          audit: Array.isArray(raw.audit) ? raw.audit : [],
        };
  writeFileSync(destinationPath, `${JSON.stringify(payload)}\n`);
  const lockPath = `${destinationPath}.lock`;
  if (existsSync(lockPath)) rmSync(lockPath, { force: true });
}

function seedFromLkg() {
  if (!lkgDir) {
    throw new Error("EVENT_OS_CHECKPOINT_LKG_DIR is required for j3-j4 mode");
  }
  const source = assertTempPath("EVENT_OS_CHECKPOINT_LKG_DIR", lkgDir);
  const lkgStore = existsSync(join(source, "event-os-non-production.json"))
    ? join(source, "event-os-non-production.json")
    : join(source, "checkpoint-store.json");
  const lkgSeating = existsSync(join(source, "event-os-non-production.seating-v2.json"))
    ? join(source, "event-os-non-production.seating-v2.json")
    : join(source, "checkpoint-store.seating-v2.json");
  const lkgManifest = existsSync(join(source, "manifest.json"))
    ? join(source, "manifest.json")
    : join(source, "checkpoint-manifest.json");
  if (!existsSync(lkgStore) || !existsSync(lkgSeating) || !existsSync(lkgManifest)) {
    throw new Error(`j2 LKG incomplete under ${source}`);
  }
  copyFileSync(lkgStore, storePath);
  migrateSeatingV2Store(lkgSeating, seatingV2Path, storePath);
  copyFileSync(lkgManifest, manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest.phasesCompleted) || !manifest.phasesCompleted.includes("j2-publish")) {
    throw new Error("LKG manifest is missing j2-publish");
  }
  if (!manifest.j2PublicationBadge || !manifest.j2LkgDraftHash || !manifest.j2SubmittedHash) {
    throw new Error("LKG manifest is missing publication/hash fields");
  }
}

mkdirSync(workDir, { recursive: true });
mkdirSync(evidenceDir, { recursive: true });
assertTempPath("workDir", workDir);
assertTempPath("storePath", storePath);
assertTempPath("manifestPath", manifestPath);

if (mode === "j3-j4") {
  seedFromLkg();
} else {
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ label: "", organisationName: "", eventId: "", eventName: "", seatingPath: "", phasesCompleted: [] }, null, 2)}\n`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseEnv() {
  const env = {
    ...process.env,
    PORT: "3020",
    NODE_OPTIONS: `--max-old-space-size=${heapMb}`,
    EVENT_OS_E2E_HEAP_MB: heapMb,
    EVENT_OS_ALLOW_FIXTURES: "1",
    EVENT_OS_TEST_NOW: "2026-09-05T14:00:00.000Z",
    CI: process.env.CI ?? "1",
    EVENT_OS_ACCESS_TOKEN: "event-os-access-token-not-for-production",
    EVENT_OS_SESSION_SECRET: "event-os-session-secret-not-for-production-32",
    EVENT_OS_RSVP_PEPPER: "rsvp-invitation-pepper-not-for-production",
    EVENT_OS_RSVP_SESSION_SECRET: "rsvp-guest-session-secret-not-for-production-32",
    EVENT_OS_ATELIER_LINK_PEPPER: "s04e-atelier-link-pepper-not-for-production-32",
    EVENT_OS_ATELIER_SESSION_SECRET: "s04e-atelier-session-secret-not-for-production",
    EVENT_OS_LAYOUT_EXPORT_FIXTURE_STORE: "1",
    EVENT_OS_DIAGNOSTIC_TOKEN: "s073-local-diagnostic-token-not-for-production",
    EVENT_OS_NON_PRODUCTION_STORE_PATH: storePath,
    EVENT_OS_CHECKPOINT_MANIFEST: manifestPath,
  };
  delete env.DATABASE_URL;
  delete env.PLAYWRIGHT_LIVE;
  delete env.PLAYWRIGHT_PROD;
  delete env.PLAYWRIGHT_BASE_URL;
  delete env.PLAYWRIGHT_EXPECTED_SHA;
  delete env.EVENT_OS_CHECKPOINT_LKG_DIR;
  return env;
}

async function waitReady(timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch("http://127.0.0.1:3020/sign-in");
      if (response.ok) return;
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error("next-dev did not become ready on 127.0.0.1:3020");
}

async function stopServer(child) {
  if (!child || child.exitCode != null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(8_000).then(() => child.kill("SIGKILL")),
  ]);
  await sleep(1_000);
  const lockPath = `${seatingV2Path}.lock`;
  if (existsSync(lockPath)) rmSync(lockPath, { force: true });
}

function runPhase(phase, logPath) {
  return new Promise((resolve, reject) => {
    const out = [];
    const child = spawn(
      "pnpm",
      ["exec", "playwright", "test", phase.spec, "--reporter=line"],
      {
        cwd: appDir,
        env: baseEnv(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const onData = (chunk) => {
      const text = chunk.toString();
      out.push(text);
      process.stdout.write(text);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      writeFileSync(logPath, out.join(""));
      if (code === 0) resolve();
      else reject(new Error(`${phase.id} failed with exit ${code}`));
    });
  });
}

function classifyRestart(logText) {
  return /memory threshold|Server is approaching the used memory threshold|restarting\.\.\./i.test(logText);
}

async function main() {
  if (process.env.PLAYWRIGHT_LIVE === "1") {
    throw new Error("refusing PLAYWRIGHT_LIVE=1");
  }
  if (/railway\.app|event-os-production/i.test(process.env.PLAYWRIGHT_BASE_URL ?? "")) {
    throw new Error("refusing Railway PLAYWRIGHT_BASE_URL");
  }
  console.log(`checkpoint mode=${mode}`);
  console.log(`checkpoint workDir=${workDir}`);
  console.log(`store=${storePath}`);
  console.log(`manifest=${manifestPath}`);
  if (mode === "j3-j4") console.log(`lkgDir=${resolve(lkgDir)}`);

  const summary = { mode, workDir, storePath, manifestPath, lkgDir: lkgDir || null, phases: [], verdict: "IN_PROGRESS" };

  for (const phase of phases) {
    const logPath = join(evidenceDir, `checkpoint-${phase.id}.txt`);
    const serverLogPath = join(evidenceDir, `checkpoint-${phase.id}-server.txt`);
    const serverChunks = [];
    const server = spawn("pnpm", ["dev"], {
      cwd: appDir,
      env: baseEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const onServer = (chunk) => {
      const text = chunk.toString();
      serverChunks.push(text);
      process.stdout.write(`[${phase.id}-server] ${text}`);
    };
    server.stdout.on("data", onServer);
    server.stderr.on("data", onServer);

    try {
      await waitReady();
      await runPhase(phase, logPath);
      writeFileSync(serverLogPath, serverChunks.join(""));
      const restarted = classifyRestart(serverChunks.join("")) || classifyRestart(readFileSync(logPath, "utf8"));
      summary.phases.push({ id: phase.id, ok: true, restarted });
      if (restarted && phase.id === "p2") {
        summary.verdict = "STOP_P2_LAYOUT_COMPILER_MEMORY";
        writeFileSync(join(evidenceDir, "checkpoint-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
        await stopServer(server);
        console.error("P2 restarted at layout compile under a fresh next-dev. Stop and use a known-good isolated runner.");
        process.exit(2);
      }
      if (restarted) {
        throw new Error(`${phase.id} completed but next-dev restarted mid-phase`);
      }
    } catch (error) {
      writeFileSync(serverLogPath, serverChunks.join(""));
      const restarted = classifyRestart(serverChunks.join(""));
      summary.phases.push({
        id: phase.id,
        ok: false,
        restarted,
        error: error instanceof Error ? error.message : String(error),
      });
      if (phase.id === "p2" && restarted) {
        summary.verdict = "STOP_P2_LAYOUT_COMPILER_MEMORY";
      } else {
        summary.verdict = `FAIL_${phase.id.toUpperCase()}`;
      }
      writeFileSync(join(evidenceDir, "checkpoint-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
      if (existsSync(manifestPath)) {
        copyFileSync(manifestPath, join(evidenceDir, "checkpoint-manifest.json"));
      }
      if (existsSync(storePath)) {
        copyFileSync(storePath, join(evidenceDir, "checkpoint-store.json"));
      }
      if (existsSync(seatingV2Path)) {
        copyFileSync(seatingV2Path, join(evidenceDir, "checkpoint-store.seating-v2.json"));
      }
      await stopServer(server);
      console.error(summary.verdict, error);
      process.exit(phase.id === "p2" && restarted ? 2 : 1);
    }

    await stopServer(server);
  }

  summary.verdict = passVerdict;
  if (existsSync(manifestPath)) {
    copyFileSync(manifestPath, join(evidenceDir, "checkpoint-manifest.json"));
  }
  if (existsSync(storePath)) {
    copyFileSync(storePath, join(evidenceDir, "checkpoint-store.json"));
  }
  if (existsSync(seatingV2Path)) {
    copyFileSync(seatingV2Path, join(evidenceDir, "checkpoint-store.seating-v2.json"));
  }
  writeFileSync(join(evidenceDir, "checkpoint-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log("checkpoint complete", summary.verdict);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
