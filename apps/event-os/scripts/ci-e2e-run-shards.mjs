#!/usr/bin/env node
/**
 * Formal CI Event OS e2e shard runner.
 * Each shard is a separate Playwright process so webServer (next-dev) starts and
 * terminates between shards. Never runs the 279-test monolith against one server.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const planPath = join(root, "scripts", "ci-e2e-shard-plan.json");
const logDir = join(root, "ci-e2e-shard-logs");
const plan = JSON.parse(readFileSync(planPath, "utf8"));

const heapMb = process.env.EVENT_OS_E2E_HEAP_MB ?? String(plan.heapMbDefault ?? 3072);
const only = process.env.CI_E2E_SHARD; // optional: run one shard by id or name
const skipLive = process.env.PLAYWRIGHT_LIVE === "1";

if (skipLive) {
  console.error("ci-e2e-run-shards refuses PLAYWRIGHT_LIVE=1 (formal CI is synthetic file-store only)");
  process.exit(2);
}

mkdirSync(logDir, { recursive: true });

const shards = plan.shards.filter((shard) => {
  if (!only) return true;
  return String(shard.id) === only || shard.name === only;
});

if (!shards.length) {
  console.error(`No shards matched CI_E2E_SHARD=${only}`);
  process.exit(2);
}

function runShard(shard) {
  return new Promise((resolve) => {
    const files = shard.files.map((file) => (file.startsWith("e2e/") ? file : `e2e/${file}`));
    const logPath = join(logDir, `shard-${String(shard.id).padStart(2, "0")}-${shard.name}.log`);
    const args = [
      "exec",
      "playwright",
      "test",
      ...files,
      "--workers=1",
      "--retries=0",
      "--reporter=line",
    ];
    const env = {
      ...process.env,
      CI: "1",
      EVENT_OS_ALLOW_FIXTURES: "1",
      EVENT_OS_E2E_HEAP_MB: heapMb,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--max-old-space-size=${heapMb}`].filter(Boolean).join(" "),
    };
    delete env.DATABASE_URL;
    delete env.PLAYWRIGHT_PROD;
    delete env.PLAYWRIGHT_LIVE;
    delete env.PLAYWRIGHT_BASE_URL;
    delete env.EVENT_OS_CHECKPOINT_MANIFEST;

    console.log(
      `\n=== SHARD ${shard.id} ${shard.name} tests=${shard.tests} files=${files.length} timeout=${shard.timeoutSeconds}s heap=${heapMb}MB ===`,
    );
    const started = Date.now();
    const child = spawn("pnpm", args, {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const append = (buf) => {
      const text = buf.toString();
      output += text;
      process.stdout.write(text);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    const timer = setTimeout(() => {
      console.error(`\nSHARD ${shard.id} HARD TIMEOUT after ${shard.timeoutSeconds}s — terminating`);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 30_000).unref();
    }, shard.timeoutSeconds * 1000);

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const elapsedMs = Date.now() - started;
      writeFileSync(
        logPath,
        [
          `shard=${shard.id} name=${shard.name}`,
          `files=${files.join(" ")}`,
          `exitCode=${code} signal=${signal ?? ""} elapsedMs=${elapsedMs}`,
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
        timedOut: Boolean(signal),
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
    console.error(`\nShard ${result.id} (${result.name}) failed with code ${result.code}`);
    process.exit(result.code || 1);
  }
}

writeFileSync(join(logDir, "summary.json"), JSON.stringify({ ok: true, plan: planPath, results }, null, 2));
console.log(`\nAll ${results.length} shard(s) passed. tests=${results.reduce((n, r) => n + r.tests, 0)}`);
