/**
 * Spawns one short-lived Python child, supplies framed request on stdin,
 * reads framed responses from dedicated fd 3. No DB credentials in child env.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { encodeFrame, FrameDecoder } from "./frame.js";

export type ChildMessage =
  | { type: "progress"; phase: string; detail?: string }
  | { type: "final"; ok: boolean; payload: Record<string, unknown> }
  | { type: "error"; message: string };

export interface SpawnChildOptions {
  pythonPath: string;
  scriptPath: string;
  request: Record<string, unknown>;
  wallMs?: number;
  cleanEnv?: boolean;
}

export interface ChildRunResult {
  messages: ChildMessage[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  elapsedMs: number;
}

function buildCleanEnv(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "/tmp",
    LANG: "C.UTF-8",
    PYTHONUNBUFFERED: "1",
  };
}

function killProcessGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      /* fall through */
    }
  }
  child.kill(signal);
}

export async function runSolverChild(options: SpawnChildOptions): Promise<ChildRunResult> {
  const started = Date.now();
  const messages: ChildMessage[] = [];
  const decoder = new FrameDecoder();

  const child = spawn(options.pythonPath, [options.scriptPath], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: options.cleanEnv === false ? process.env : buildCleanEnv(),
    detached: true,
  });

  const responseStream = child.stdio[3];
  if (!responseStream || typeof (responseStream as NodeJS.ReadableStream).on !== "function") {
    throw new Error("child fd 3 pipe unavailable");
  }

  (responseStream as NodeJS.ReadableStream).on("data", (chunk: Buffer) => {
    for (const msg of decoder.push(chunk)) {
      messages.push(msg as ChildMessage);
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    messages.push({ type: "progress", phase: "stderr", detail: chunk.toString("utf8").slice(0, 500) });
  });

  child.stdin?.write(encodeFrame(options.request));
  child.stdin?.end();

  const wallMs = options.wallMs ?? 30_000;
  let timedOut = false;
  const killer = setTimeout(() => {
    timedOut = true;
    killProcessGroup(child, "SIGTERM");
    setTimeout(() => killProcessGroup(child, "SIGKILL"), 1500);
  }, wallMs);

  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(killer);

  if (timedOut && !messages.some((m) => m.type === "final")) {
    messages.push({ type: "error", message: "wall_clock_kill" });
  }

  return {
    messages,
    exitCode: exit.code,
    signal: exit.signal,
    elapsedMs: Date.now() - started,
  };
}

export async function cancelSolverChild(
  pythonPath: string,
  scriptPath: string,
  request: Record<string, unknown>,
  cancelAfterMs: number,
): Promise<ChildRunResult> {
  const started = Date.now();
  const messages: ChildMessage[] = [];
  const decoder = new FrameDecoder();

  const child = spawn(pythonPath, [scriptPath], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: buildCleanEnv(),
    detached: true,
  });

  const responseStream = child.stdio[3] as NodeJS.ReadableStream;
  responseStream.on("data", (chunk: Buffer) => {
    for (const msg of decoder.push(chunk)) {
      messages.push(msg as ChildMessage);
    }
  });

  child.stdin?.write(encodeFrame(request));
  setTimeout(() => {
    try {
      child.stdin?.write(encodeFrame({ type: "stop" }));
    } catch {
      /* ignore */
    }
  }, Math.min(50, cancelAfterMs));

  setTimeout(() => {
    killProcessGroup(child, "SIGTERM");
    setTimeout(() => killProcessGroup(child, "SIGKILL"), 1000);
  }, cancelAfterMs);

  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });

  return {
    messages,
    exitCode: exit.code,
    signal: exit.signal,
    elapsedMs: Date.now() - started,
  };
}

/** Force-crash containment: child hard-exit must not take supervisor down. */
export async function crashContainmentProof(
  pythonPath: string,
  crashScript: string,
): Promise<{ supervisorAlive: true; childExit: number | null; signal: NodeJS.Signals | null }> {
  const child = spawn(pythonPath, [crashScript], {
    stdio: ["ignore", "pipe", "pipe"],
    env: buildCleanEnv(),
    detached: true,
  });
  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
  return { supervisorAlive: true, childExit: exit.code, signal: exit.signal };
}
