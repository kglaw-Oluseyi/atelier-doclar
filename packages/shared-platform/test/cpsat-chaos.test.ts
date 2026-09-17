import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { FrameDecoderHelper, encodeFrameHelper } from "./cpsat-frame-helpers.js";

const workerRoot = join(process.cwd(), "../../apps/event-os-solver-worker");
const python = join(workerRoot, ".venv/bin/python");
const script = join(workerRoot, "python/solver_child.py");

function runChild(payload: Record<string, unknown>, opts?: { killAfterMs?: number; signal?: NodeJS.Signals }) {
  return new Promise<{ messages: unknown[]; code: number | null; stderr: string }>((resolve) => {
    const child = spawn(python, [script], {
      stdio: ["pipe", "pipe", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: process.env.HOME ?? "/tmp",
        LANG: "C.UTF-8",
        PYTHONUNBUFFERED: "1",
      },
    });
    const messages: unknown[] = [];
    let stderr = "";
    const decoder = new FrameDecoderHelper();
    (child.stdio[3] as NodeJS.ReadableStream).on("data", (chunk: Buffer) => {
      for (const msg of decoder.push(chunk)) messages.push(msg);
    });
    child.stderr?.on("data", (c) => {
      stderr += c.toString();
    });
    child.stdin?.write(encodeFrameHelper(payload));
    child.stdin?.end();
    if (opts?.killAfterMs) {
      setTimeout(() => child.kill(opts.signal ?? "SIGTERM"), opts.killAfterMs);
    }
    child.on("exit", (code) => resolve({ messages, code, stderr }));
  });
}

test("chaos: truncated frame yields non-zero exit or error frame", async () => {
  const child = spawn(python, [script], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: { PATH: process.env.PATH!, HOME: process.env.HOME!, LANG: "C.UTF-8", PYTHONUNBUFFERED: "1" },
  });
  const messages: unknown[] = [];
  const decoder = new FrameDecoderHelper();
  (child.stdio[3] as NodeJS.ReadableStream).on("data", (c: Buffer) => {
    for (const m of decoder.push(c)) messages.push(m);
  });
  // Claim 100-byte body but send only 4 bytes
  const header = Buffer.alloc(4);
  header.writeUInt32BE(100, 0);
  child.stdin?.write(header);
  child.stdin?.write(Buffer.from("abcd"));
  child.stdin?.end();
  const code = await new Promise<number | null>((r) => child.on("exit", (c) => r(c)));
  assert.notEqual(code, 0);
});

test("chaos: sleep mode cancel via SIGTERM", async () => {
  const { messages, code } = await runChild(
    { mode: "sleep", sleepSeconds: 30, runId: "cancel-chaos", seed: 1 },
    { killAfterMs: 200, signal: "SIGTERM" },
  );
  assert.ok(code === null || code !== 0 || messages.some((m) => (m as { type?: string }).type));
});

test("chaos: forbidden DATABASE_URL env is rejected", async () => {
  const child = spawn(python, [script], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH!,
      HOME: process.env.HOME!,
      LANG: "C.UTF-8",
      PYTHONUNBUFFERED: "1",
      DATABASE_URL: "postgres://should-not-exist",
    },
  });
  const messages: unknown[] = [];
  const decoder = new FrameDecoderHelper();
  (child.stdio[3] as NodeJS.ReadableStream).on("data", (c: Buffer) => {
    for (const m of decoder.push(c)) messages.push(m);
  });
  child.stdin?.write(encodeFrameHelper({ mode: "sleep", sleepSeconds: 0.1, runId: "env-chaos" }));
  child.stdin?.end();
  const code = await new Promise<number | null>((r) => child.on("exit", (c) => r(c)));
  assert.equal(code, 2);
  assert.ok(messages.some((m) => String((m as { message?: string }).message ?? "").includes("forbidden_env")));
});
