/**
 * Long-lived no-ingress CP-SAT supervisor (Milestone 5).
 * Register → READY → claim → heartbeat → child → settle.
 * SIGTERM/SIGINT → DRAINING → stop claims → stop child → exit.
 */
import { hostname } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { accessSync, constants } from "node:fs";
import {
  acknowledgeQueuedCancellations,
  claimNextCpsatRun,
  executeClaimedCpsatRun,
  heartbeatCpsatRun,
  heartbeatCpsatWorker,
  newWorkerLeaseOwner,
  reapExpiredCpsatLeases,
  registerCpsatWorker,
  setCpsatWorkerLifecycle,
  CPSAT_MODEL_VERSION,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_PYTHON_VERSION,
  CPSAT_REQUEST_CONTRACT,
} from "@maison-doclar/shared-platform";
import { runSolverChild, type ChildRunResult } from "./child-runner.js";

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
  imageIdentity: string;
  imageDigest: string | null;
  buildSourceIdentity: string | null;
  drainGraceMs: number;
  qualifiedMaxGuests: number;
  qualifiedMaxTables: number;
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
  const pythonPath = resolve(env.SOLVER_PYTHON ?? join(here, "../.venv/bin/python"));
  const childScriptPath = resolve(env.SOLVER_CHILD_SCRIPT ?? join(here, "../python/solver_child.py"));
  const concurrency = Number(env.CPSAT_CONCURRENCY ?? 1);
  const idleBackoffMaxMs = Number(env.CPSAT_IDLE_BACKOFF_MAX_MS ?? 8_000);
  const drainGraceMs = Number(env.CPSAT_DRAIN_GRACE_MS ?? 15_000);
  const qualifiedMaxGuests = Number(env.CPSAT_QUALIFIED_MAX_GUESTS ?? 10_000);
  const qualifiedMaxTables = Number(env.CPSAT_QUALIFIED_MAX_TABLES ?? 2_000);

  for (const [name, value] of Object.entries({
    pollIntervalMs,
    heartbeatIntervalMs,
    leaseSeconds,
    cancelGraceMs,
    hardWallMs,
    maxResponseBytes,
    concurrency,
    idleBackoffMaxMs,
    drainGraceMs,
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid config ${name}`);
  }
  if (concurrency !== 1) throw new Error("CPSAT_CONCURRENCY must be 1");
  if (!isAbsolute(pythonPath) || !isAbsolute(childScriptPath)) {
    throw new Error("SOLVER_PYTHON and SOLVER_CHILD_SCRIPT must be absolute paths");
  }
  accessSync(pythonPath, constants.X_OK);
  accessSync(childScriptPath, constants.R_OK);
  if (childScriptPath.includes("fake_malformed") || childScriptPath.includes("crash_child")) {
    throw new Error("production supervisor rejects fake/malformed child fixtures");
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
    imageIdentity: env.CPSAT_IMAGE_IDENTITY ?? "event-os-solver-worker:local",
    imageDigest: env.CPSAT_IMAGE_DIGEST ?? null,
    buildSourceIdentity: env.CPSAT_BUILD_SOURCE ?? env.SOURCE_SHA ?? null,
    drainGraceMs,
    qualifiedMaxGuests,
    qualifiedMaxTables,
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
  let draining = false;
  let stopping = false;
  let activeChildCancel: (() => void) | null = null;
  let activeJobs = 0;
  let drainFailed = false;
  let idleBackoff = config.pollIntervalMs;

  const beginDrain = () => {
    if (draining) return;
    draining = true;
    stopping = true;
    console.error(JSON.stringify({ event: "supervisor_drain_begin", workerId: config.workerId }));
    void setCpsatWorkerLifecycle(client, config.workerId, "DRAINING").catch(() => {
      /* best effort */
    });
    activeChildCancel?.();
  };

  options.signal?.addEventListener("abort", beginDrain);
  process.on("SIGTERM", beginDrain);
  process.on("SIGINT", beginDrain);

  await registerCpsatWorker(client, {
    workerId: config.workerId,
    imageIdentity: config.imageIdentity,
    imageDigest: config.imageDigest,
    modelVersions: [CPSAT_MODEL_VERSION],
    contractVersions: [CPSAT_REQUEST_CONTRACT],
    ortoolsVersion: CPSAT_ORTOOLS_VERSION,
    pythonVersion: CPSAT_PYTHON_VERSION,
    cpuArch: process.arch,
    qualifiedMaxGuests: config.qualifiedMaxGuests,
    qualifiedMaxTables: config.qualifiedMaxTables,
    concurrencyCapacity: 1,
    buildSourceIdentity: config.buildSourceIdentity,
    lifecycle: "STARTING",
  });
  await setCpsatWorkerLifecycle(client, config.workerId, "READY");
  await heartbeatCpsatWorker(client, { workerId: config.workerId, activeJobs: 0, lifecycle: "READY" });

  const workerHeartbeat = setInterval(() => {
    void heartbeatCpsatWorker(client, {
      workerId: config.workerId,
      activeJobs,
      lifecycle: draining ? "DRAINING" : "READY",
    }).then((ok) => {
      if (!ok && activeJobs > 0) {
        // Self-fence: cannot maintain registry heartbeat — stop child; never settle without lease.
        activeChildCancel?.();
      }
    });
  }, config.heartbeatIntervalMs);

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
      imageIdentity: config.imageIdentity,
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
    while (!stopping || activeJobs > 0) {
      if (draining && activeJobs === 0) break;
      try {
        await acknowledgeQueuedCancellations(client, 1);
        await reapExpiredCpsatLeases(client, { limit: 5 });

        if (draining) {
          await new Promise((r) => setTimeout(r, Math.min(500, config.pollIntervalMs)));
          continue;
        }

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
        activeJobs = 1;
        await heartbeatCpsatWorker(client, { workerId: config.workerId, activeJobs: 1 });

        let heartbeatTimer: NodeJS.Timeout | undefined;
        let fence = false;
        let cancelRequested = false;
        activeChildCancel = () => {
          cancelRequested = true;
        };
        heartbeatTimer = setInterval(() => {
          void heartbeatCpsatRun(client, {
            runId: claimed.id,
            leaseOwner: config.workerId,
            leaseEpoch: claimed.leaseEpoch,
            leaseSeconds: config.leaseSeconds,
          }).then((ok) => {
            if (!ok) {
              fence = true;
              cancelRequested = true;
            }
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
              if (fence || draining) {
                return {
                  messages: [{ type: "error", message: fence ? "lease_fenced" : "worker_draining" }],
                  exitCode: null,
                  signal: null,
                  elapsedMs: 0,
                  cancelled: true,
                } satisfies ChildRunResult;
              }
              return runSolverChild({
                pythonPath: config.pythonPath,
                scriptPath: config.childScriptPath,
                request: spawnInput.request,
                wallMs: spawnInput.wallMs,
                cancelGraceMs: spawnInput.cancelGraceMs,
                maxTotalResponseBytes: config.maxResponseBytes,
                onProgress: async (phase) => spawnInput.onProgress?.(phase),
                shouldCancel: async () => {
                  if (cancelRequested || draining || fence) return true;
                  return spawnInput.shouldCancel?.() ?? false;
                },
              });
            },
          });
          console.error(
            JSON.stringify({
              event: "job_finished",
              runId: claimed.id,
              workerId: config.workerId,
              ...result,
            }),
          );
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "job_contained_fault",
              runId: claimed.id,
              workerId: config.workerId,
              message: error instanceof Error ? error.message : String(error),
            }),
          );
        } finally {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          activeChildCancel = null;
          activeJobs = 0;
          await heartbeatCpsatWorker(client, {
            workerId: config.workerId,
            activeJobs: 0,
            lifecycle: draining ? "DRAINING" : "READY",
          });
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "supervisor_loop_fault",
            workerId: config.workerId,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        await new Promise((r) => setTimeout(r, config.pollIntervalMs));
      }
      if (options.once && activeJobs === 0) break;
      if (draining && activeJobs > 0) {
        // Bounded grace then force-cancel child.
        await new Promise((r) => setTimeout(r, Math.min(1_000, config.drainGraceMs)));
      }
    }
    if (draining && activeJobs > 0) {
      drainFailed = true;
      activeChildCancel?.();
    }
  } finally {
    clearInterval(workerHeartbeat);
    try {
      await setCpsatWorkerLifecycle(client, config.workerId, draining ? "DRAINING" : "UNAVAILABLE");
    } catch {
      /* ignore */
    }
    await pool.end();
  }

  if (drainFailed) {
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const config = loadSupervisorConfig();
  void runSupervisorLoop(config).catch((error) => {
    console.error(JSON.stringify({ event: "supervisor_fatal", message: String(error) }));
    process.exit(1);
  });
}
