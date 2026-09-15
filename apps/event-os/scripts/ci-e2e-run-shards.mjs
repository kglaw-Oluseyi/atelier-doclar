#!/usr/bin/env node
/**
 * Formal CI Event OS e2e shard runner — Postgres + next start only.
 * Never launches next-dev. Resets ephemeral Postgres before each shard.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const planPath = join(root, "scripts", "ci-e2e-shard-plan.json");
const logDir = join(root, "ci-e2e-shard-logs");
const plan = JSON.parse(readFileSync(planPath, "utf8"));

if (process.env.PLAYWRIGHT_LIVE === "1") {
  console.error("ci-e2e-run-shards refuses PLAYWRIGHT_LIVE=1");
  process.exit(2);
}
if (process.env.EVENT_OS_CI_POSTGRES !== "1") {
  console.error("ci-e2e-run-shards requires EVENT_OS_CI_POSTGRES=1 (formal CI is Postgres + next start)");
  process.exit(2);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error("ci-e2e-run-shards requires DATABASE_URL for the ephemeral CI Postgres service");
  process.exit(2);
}
if (/railway\.app|railway\.internal/i.test(process.env.DATABASE_URL)) {
  console.error("ci-e2e-run-shards refuses Railway DATABASE_URL");
  process.exit(2);
}

const only = process.env.CI_E2E_SHARD;
mkdirSync(logDir, { recursive: true });

const shards = plan.shards.filter((shard) => {
  if (!only) return true;
  return String(shard.id) === only || shard.name === only;
});
if (!shards.length) {
  console.error(`No shards matched CI_E2E_SHARD=${only}`);
  process.exit(2);
}

function classifyFailure(output, timedOut) {
  if (timedOut) return "SERVER_STARTUP";
  if (/Server is approaching the used memory threshold|FATAL ERROR: Reached heap|JavaScript heap out of memory/i.test(output)) {
    return "MEMORY";
  }
  if (/ECONNRESET|ECONNREFUSED|ERR_CONNECTION_REFUSED|socket hang up|aborted/i.test(output)) {
    return "TRANSPORT";
  }
  if (/migration|DATABASE_URL|Postgres|ECONNREFUSED.*5432|password authentication failed|relation .* does not exist/i.test(output)) {
    return "DATABASE";
  }
  if (/Error: expect\(|AssertionError|expect\(.*\)\.(to|not)/i.test(output)) {
    return "PRODUCT_ASSERTION";
  }
  if (/webServer|Timed out waiting|Failed to start/i.test(output)) {
    return "SERVER_STARTUP";
  }
  return "UNKNOWN";
}

function resetDatabase() {
  const result = spawnSync("pnpm", ["exec", "tsx", "./scripts/ci-postgres-reset.ts"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`ci-postgres-reset failed with code ${result.status}`);
  }
  process.stdout.write(result.stdout);
}

function runShard(shard) {
  return new Promise((resolve) => {
    resetDatabase();
    const files = shard.files.map((file) => (file.startsWith("e2e/") ? file : `e2e/${file}`));
    const logPath = join(logDir, `shard-${String(shard.id).padStart(2, "0")}-${shard.name}.log`);
    const args = ["exec", "playwright", "test", ...files, "--workers=1", "--retries=0", "--reporter=line"];
    const env = {
      ...process.env,
      CI: "1",
      EVENT_OS_CI_POSTGRES: "1",
      EVENT_OS_ALLOW_FIXTURES: "1",
      // Modest heap for next start — not a next-dev prop.
      EVENT_OS_E2E_HEAP_MB: process.env.EVENT_OS_E2E_HEAP_MB ?? "2048",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--max-old-space-size=${process.env.EVENT_OS_E2E_HEAP_MB ?? "2048"}`]
        .filter(Boolean)
        .join(" "),
    };
    delete env.PLAYWRIGHT_LIVE;
    delete env.PLAYWRIGHT_BASE_URL;
    delete env.PLAYWRIGHT_EXPECTED_SHA;
    delete env.EVENT_OS_CHECKPOINT_MANIFEST;
    // Explicitly keep DATABASE_URL. Do not set PLAYWRIGHT_PROD (Section 13 refuses that label).

    console.log(
      `\n=== SHARD ${shard.id} ${shard.name} tests=${shard.tests} files=${files.length} timeout=${shard.timeoutSeconds}s mode=postgres+next-start ===`,
    );
    const started = Date.now();
    const child = spawn("pnpm", args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const append = (buf) => {
      const text = buf.toString();
      output += text;
      process.stdout.write(text);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      console.error(`\nSHARD ${shard.id} HARD TIMEOUT after ${shard.timeoutSeconds}s — terminating`);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 30_000).unref();
    }, shard.timeoutSeconds * 1000);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const elapsedMs = Date.now() - started;
      const classification = code === 0 ? "PASS" : classifyFailure(output, timedOut || Boolean(signal));
      writeFileSync(
        logPath,
        [
          `shard=${shard.id} name=${shard.name}`,
          `files=${files.join(" ")}`,
          `exitCode=${code} signal=${signal ?? ""} elapsedMs=${elapsedMs} classification=${classification}`,
          `artifacts=ci-e2e-shard-logs/,test-results/,playwright-report/`,
          "",
          output,
        ].join("\n"),
      );
      resolve({
        id: shard.id,
        name: shard.name,
        tests: shard.tests,
        files: shard.files,
        code: code ?? 1,
        signal: signal ?? null,
        elapsedMs,
        logPath,
        timedOut,
        classification,
      });
    });
  });
}

const results = [];
for (const shard of shards) {
  // eslint-disable-next-line no-await-in-loop
  const result = await runShard(shard);
  results.push(result);
  if (result.code !== 0) {
    writeFileSync(join(logDir, "summary.json"), JSON.stringify({ plan: planPath, results }, null, 2));
    console.error(
      `\nShard ${result.id} (${result.name}) failed classification=${result.classification} log=${result.logPath}`,
    );
    if (result.classification === "PRODUCT_ASSERTION") {
      console.error("Stop: clean product assertion failure in an otherwise healthy Postgres+next-start shard.");
    }
    process.exit(result.code || 1);
  }
}

writeFileSync(join(logDir, "summary.json"), JSON.stringify({ ok: true, plan: planPath, results }, null, 2));
console.log(`\nAll ${results.length} shard(s) passed. tests=${results.reduce((n, r) => n + r.tests, 0)}`);
