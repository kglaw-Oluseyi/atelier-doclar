/**
 * Spawns one short-lived Python child, supplies framed request on stdin,
 * reads framed responses from dedicated fd 3. No DB credentials in child env.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { encodeFrame, FrameDecoder, FRAME_MAX_BYTES } from "./frame.js";

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
  maxTotalResponseBytes?: number;
  cancelGraceMs?: number;
  onProgress?: (phase: string, detail?: string) => void | Promise<void>;
  /** Return true/false, or `{ mode }` so the stop frame carries CANCEL|KEEP_BEST. */
  shouldCancel?: () => Promise<boolean | { mode: "CANCEL" | "KEEP_BEST" }>;
  cancelPollMs?: number;
  /** When set, stdin stays open for the full wall so late stop frames can land. */
  keepStdinOpen?: boolean;
}

export interface ChildRunResult {
  messages: ChildMessage[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  elapsedMs: number;
  timedOut?: boolean;
  cancelled?: boolean;
  truncated?: boolean;
  oversized?: boolean;
  childEnvKeys?: string[];
  stopReason?: string;
  stopMode?: "CANCEL" | "KEEP_BEST";
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
  const cleanEnv = options.cleanEnv === false ? process.env : buildCleanEnv();
  const childEnvKeys = Object.keys(cleanEnv);
  let totalBytes = 0;
  let truncated = false;
  let oversized = false;
  let timedOut = false;
  let cancelled = false;
  let settled = false;

  const child = spawn(options.pythonPath, [options.scriptPath], {
    stdio: ["pipe", "pipe", "pipe", "pipe"],
    env: cleanEnv,
    detached: true,
  });

  const responseStream = child.stdio[3];
  if (!responseStream || typeof (responseStream as NodeJS.ReadableStream).on !== "function") {
    throw new Error("child fd 3 pipe unavailable");
  }

  const maxTotal = options.maxTotalResponseBytes ?? FRAME_MAX_BYTES * 4;

  (responseStream as NodeJS.ReadableStream).on("data", (chunk: Buffer) => {
    totalBytes += chunk.length;
    if (totalBytes > maxTotal) {
      oversized = true;
      killProcessGroup(child, "SIGKILL");
      return;
    }
    try {
      for (const msg of decoder.push(chunk)) {
        const typed = msg as ChildMessage;
        if (!typed || typeof typed !== "object" || typeof (typed as { type?: unknown }).type !== "string") {
          truncated = true;
          continue;
        }
        if (!["progress", "final", "error"].includes(typed.type)) {
          truncated = true;
          messages.push({ type: "error", message: `unknown_frame:${typed.type}` });
          continue;
        }
        messages.push(typed);
        if (typed.type === "progress") {
          void options.onProgress?.(typed.phase, typed.detail);
        }
      }
    } catch {
      truncated = true;
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    messages.push({ type: "progress", phase: "stderr", detail: chunk.toString("utf8").slice(0, 500) });
  });

  child.stdin?.write(encodeFrame(options.request));

  const wallMs = options.wallMs ?? 30_000;
  const cancelGraceMs = options.cancelGraceMs ?? 1_500;
  const cancelPollMs = options.cancelPollMs ?? 250;

  const killer = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    killProcessGroup(child, "SIGTERM");
    setTimeout(() => killProcessGroup(child, "SIGKILL"), cancelGraceMs);
  }, wallMs);

  let cancelTimer: NodeJS.Timeout | undefined;
  let stopModeSent: "CANCEL" | "KEEP_BEST" | null = null;
  const keepStdinOpen = options.keepStdinOpen === true || Boolean(options.shouldCancel);
  if (options.shouldCancel) {
    cancelTimer = setInterval(() => {
      void (async () => {
        if (settled || cancelled || timedOut) return;
        const stop = await options.shouldCancel!();
        if (!stop) return;
        cancelled = true;
        const mode =
          typeof stop === "object" && stop && "mode" in stop
            ? stop.mode
            : ("CANCEL" as const);
        stopModeSent = mode;
        try {
          child.stdin?.write(encodeFrame({ type: "stop", mode, stopMode: mode }));
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          if (settled) return;
          killProcessGroup(child, "SIGTERM");
          setTimeout(() => {
            if (!settled) killProcessGroup(child, "SIGKILL");
          }, cancelGraceMs);
        }, cancelGraceMs);
      })();
    }, cancelPollMs);
  }

  // Keep stdin open while cancellation may still arrive; otherwise close after request.
  if (!keepStdinOpen) {
    setTimeout(() => {
      if (!cancelled) child.stdin?.end();
    }, 50);
  }

  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
  settled = true;
  clearTimeout(killer);
  if (cancelTimer) clearInterval(cancelTimer);
  try {
    child.stdin?.end();
  } catch {
    /* ignore */
  }

  if (timedOut && !messages.some((m) => m.type === "final")) {
    messages.push({ type: "error", message: "wall_clock_kill" });
  }

  return {
    messages,
    exitCode: exit.code,
    signal: exit.signal,
    elapsedMs: Date.now() - started,
    timedOut,
    cancelled,
    truncated,
    oversized,
    childEnvKeys,
    ...(stopModeSent ? { stopReason: "STOP_REQUESTED" as const, stopMode: stopModeSent } : {}),
  };
}

export async function cancelSolverChild(
  pythonPath: string,
  scriptPath: string,
  request: Record<string, unknown>,
  cancelAfterMs: number,
): Promise<ChildRunResult> {
  return runSolverChild({
    pythonPath,
    scriptPath,
    request,
    wallMs: cancelAfterMs + 5_000,
    cancelGraceMs: 1_000,
    shouldCancel: async () => true,
    cancelPollMs: Math.max(10, Math.min(50, cancelAfterMs)),
  });
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
