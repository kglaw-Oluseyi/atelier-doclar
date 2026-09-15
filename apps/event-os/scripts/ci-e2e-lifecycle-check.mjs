#!/usr/bin/env node
/**
 * Lifecycle proof for formal CI path: reset Postgres, start next start via Playwright,
 * confirm listen, confirm port closed after exit.
 */
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = 3020;

if (process.env.EVENT_OS_CI_POSTGRES !== "1") {
  console.error("lifecycle check requires EVENT_OS_CI_POSTGRES=1");
  process.exit(2);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error("lifecycle check requires DATABASE_URL");
  process.exit(2);
}

function canConnect(host, p, ms = 500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port: p });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, ms);
    socket.on("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function waitFor(predicate, label, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timeout waiting for ${label}`);
}

if (await canConnect("127.0.0.1", port)) {
  throw new Error(`port ${port} already in use; refuse lifecycle check`);
}

const reset = spawnSync("pnpm", ["exec", "tsx", "./scripts/ci-postgres-reset.ts"], {
  cwd: root,
  env: process.env,
  encoding: "utf8",
});
if (reset.status !== 0) {
  console.error(reset.stdout, reset.stderr);
  process.exit(reset.status ?? 1);
}
process.stdout.write(reset.stdout);

const env = {
  ...process.env,
  CI: "1",
  EVENT_OS_CI_POSTGRES: "1",
  EVENT_OS_ALLOW_FIXTURES: "1",
  EVENT_OS_E2E_HEAP_MB: process.env.EVENT_OS_E2E_HEAP_MB ?? "2048",
};
delete env.PLAYWRIGHT_PROD;
delete env.PLAYWRIGHT_LIVE;

const child = spawn(
  "pnpm",
  ["exec", "playwright", "test", "e2e/ux001-authority.spec.ts", "--workers=1", "--retries=0", "--reporter=line"],
  { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
);

let output = "";
child.stdout.on("data", (b) => {
  output += b.toString();
  process.stdout.write(b);
});
child.stderr.on("data", (b) => {
  output += b.toString();
  process.stderr.write(b);
});

await waitFor(() => canConnect("127.0.0.1", port), "next start listen", 120_000);
console.log("lifecycle: next start accepted connections on 3020");

const code = await new Promise((resolve) => child.on("close", (c) => resolve(c ?? 1)));
if (code !== 0) {
  console.error(output.slice(-2000));
  process.exit(code);
}

await waitFor(async () => !(await canConnect("127.0.0.1", port)), "next start exit", 60_000);
console.log("lifecycle: next start port 3020 closed after Playwright exit");
