/**
 * Long-lived no-ingress CP-SAT supervisor (Milestone 2).
 * PostgreSQL claim → one fresh Python child → verify → sealed settlement.
 */
import { hostname } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import {
  acknowledgeQueuedCancellations,
  claimNextCpsatRun,
  executeClaimedCpsatRun,
  heartbeatCpsatRun,
  newWorkerLeaseOwner,
  reapExpiredCpsatLeases,
} from "@maison-doclar/shared-platform";
import { runSolverChild } from "./child-runner.js";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export type SupervisorConfig = {
  databaseUrl: string;
  workerId: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  leaseSeconds: number;
  cancelGraceMs: number;
  hardWallMs: number;
  maxResponseBytes: number;
  pythonPath: string;
  childScriptPath: string;
  concurrency: number;
  idleBackoffMaxMs: number;
};

export function loadSupervisorConfig(env: NodeJS.ProcessEnv = process.env): SupervisorConfig {
  const databaseUrl = env.CPSAT_DATABASE_URL ?? env.DATABASE_URL;
  if (!databaseUrl) throw new Error("CPSAT_DATABASE_URL (or DATABASE_URL) is required");
  const workerId = env.CPSAT_WORKER_ID ?? newWorkerLeaseOwner(hostname());
  const pollIntervalMs = Number(env.CPSAT_POLL_INTERVAL_MS ?? 1_000);
  const heartbeatIntervalMs = Number(env.CPSAT_HEARTBEAT_INTERVAL_MS ?? 5_000);
  const leaseSeconds = Number(env.CPSAT_LEASE_SECONDS ?? 30);
  const cancelGraceMs = Number(env.CPSAT_CANCEL_GRACE_MS ?? 1_500);
  const hardWallMs = Number(env.CPSAT_HARD_WALL_MS ?? 120_000);
  const maxResponseBytes = Number(env.CPSAT_MAX_RESPONSE_BYTES ?? 8 * 1024 * 1024);
  const pythonPath = env.SOLVER_PYTHON ?? join(here, "../.venv/bin/python");
  const childScriptPath = env.SOLVER_CHILD_SCRIPT ?? join(here, "../python/solver_child.py");
  const concurrency = Number(env.CPSAT_CONCURRENCY ?? 1);
  const idleBackoffMaxMs = Number(env.CPSAT_IDLE_BACKOFF_MAX_MS ?? 8_000);

  for (const [name, value] of Object.entries({
    pollIntervalMs,
    heartbeatIntervalMs,
    leaseSeconds,
    cancelGraceMs,
    hardWallMs,
    maxResponseBytes,
    concurrency,
    idleBackoffMaxMs,
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid config ${name}`);
  }
  if (concurrency !== 1) {
    // Milestone 2 defaults and enforces concurrency 1.
    if (concurrency < 1 || concurrency > 1) throw new Error("CPSAT_CONCURRENCY must be 1 for milestone 2");
  }

  return {
    databaseUrl,
    workerId,
    pollIntervalMs,
    heartbeatIntervalMs,
    leaseSeconds,
    cancelGraceMs,
    hardWallMs,
    maxResponseBytes,
    pythonPath,
    childScriptPath,
    concurrency: 1,
    idleBackoffMaxMs,
  };
}

type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  connect: () => Promise<{
    query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
    release: () => void;
  }>;
  end: () => Promise<void>;
};

function createPgClient(pool: PgPool) {
  const client = {
    async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: typeof client) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      const adapt = {
        async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
          const result = await connected.query(text, values);
          return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
        },
      };
      try {
        await connected.query("BEGIN");
        // SERIALIZABLE for settlement paths that request it via SET LOCAL inside callers when needed.
        const out = await fn(adapt as typeof client);
        await connected.query("COMMIT");
        return out;
      } catch (error) {
        await connected.query("ROLLBACK");
        throw error;
      } finally {
        connected.release();
      }
    },
  };
  return client;
}

export async function runSupervisorLoop(
  config: SupervisorConfig,
  options: { signal?: AbortSignal; once?: boolean } = {},
): Promise<void> {
  const pg = require("pg") as { Pool: new (opts: { connectionString: string; max?: number }) => PgPool };
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 4 });
  const client = createPgClient(pool);
  let stopping = false;
  let idleBackoff = config.pollIntervalMs;

  const stop = () => {
    stopping = true;
  };
  options.signal?.addEventListener("abort", stop);
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  console.error(
    JSON.stringify({
      service: "event-os-solver-worker",
      mode: "supervisor",
      ingress: "none",
      listenPort: null,
      workerId: config.workerId,
      concurrency: config.concurrency,
      childScript: config.childScriptPath,
      python: config.pythonPath,
      // Never log connection secrets — host only.
      databaseHost: (() => {
        try {
          return new URL(config.databaseUrl).host;
        } catch {
          return "(unparsed)";
        }
      })(),
    }),
  );

  try {
    while (!stopping) {
      try {
        await acknowledgeQueuedCancellations(client, 1);
        await reapExpiredCpsatLeases(client, { limit: 5 });

        const claimed = await claimNextCpsatRun(client, {
          leaseOwner: config.workerId,
          leaseSeconds: config.leaseSeconds,
          fair: true,
        });

        if (!claimed) {
          await new Promise((r) => setTimeout(r, idleBackoff));
          idleBackoff = Math.min(config.idleBackoffMaxMs, Math.floor(idleBackoff * 1.5));
          if (options.once) break;
          continue;
        }

        idleBackoff = config.pollIntervalMs;
        let heartbeatTimer: NodeJS.Timeout | undefined;
        let fence = false;
        heartbeatTimer = setInterval(() => {
          void heartbeatCpsatRun(client, {
            runId: claimed.id,
            leaseOwner: config.workerId,
            leaseEpoch: claimed.leaseEpoch,
            leaseSeconds: config.leaseSeconds,
          }).then((ok) => {
            if (!ok) fence = true;
          });
        }, config.heartbeatIntervalMs);

        try {
          const result = await executeClaimedCpsatRun(client, {
            run: claimed,
            leaseOwner: config.workerId,
            wallMs: config.hardWallMs,
            cancelGraceMs: config.cancelGraceMs,
            maxResponseBytes: config.maxResponseBytes,
            childExecutor: async (spawnInput) => {
              if (fence) {
                return {
                  messages: [{ type: "error", message: "lease_fenced" }],
                  exitCode: null,
                  signal: null,
                  elapsedMs: 0,
                  cancelled: true,
                };
              }
              return runSolverChild({
                pythonPath: config.pythonPath,
                scriptPath: config.childScriptPath,
                request: spawnInput.request,
                wallMs: spawnInput.wallMs,
                cancelGraceMs: spawnInput.cancelGraceMs,
                maxTotalResponseBytes: config.maxResponseBytes,
                onProgress: async (phase) => spawnInput.onProgress?.(phase),
                shouldCancel: spawnInput.shouldCancel,
              });
            },
          });
          console.error(JSON.stringify({ event: "job_finished", ...result }));
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "job_contained_fault",
              runId: claimed.id,
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        } finally {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "supervisor_loop_fault",
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        await new Promise((r) => setTimeout(r, config.pollIntervalMs));
      }
      if (options.once) break;
    }
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const config = loadSupervisorConfig();
  await runSupervisorLoop(config);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
