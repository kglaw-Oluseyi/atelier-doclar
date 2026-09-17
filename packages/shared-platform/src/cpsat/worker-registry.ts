/**
 * Milestone 5 — CP-SAT worker registration / heartbeat / compatibility.
 * Registry holds no guest data and exposes no public endpoint.
 */
import { randomUUID } from "node:crypto";
import { PlatformError } from "../errors.js";
import type { PgQueryable } from "../postgres-schema.js";
import {
  CPSAT_MODEL_VERSION,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_PYTHON_VERSION,
  CPSAT_REQUEST_CONTRACT,
} from "./contract.js";
import { CPSAT_ENGINE_EXPECTATION } from "./durable-launch.js";

export const CPSAT_WORKER_LIFECYCLES = ["STARTING", "READY", "DRAINING", "UNAVAILABLE"] as const;
export type CpsatWorkerLifecycle = (typeof CPSAT_WORKER_LIFECYCLES)[number];

export type CpsatWorkerRegistration = {
  workerId: string;
  imageIdentity: string;
  imageDigest?: string | null;
  modelVersions: string[];
  contractVersions: string[];
  ortoolsVersion: string;
  pythonVersion: string;
  cpuArch: string;
  cpuFeatureHash?: string | null;
  qualifiedMaxGuests?: number | null;
  qualifiedMaxTables?: number | null;
  lifecycle: CpsatWorkerLifecycle;
  concurrencyCapacity: number;
  activeJobs: number;
  lastHeartbeat: string;
  startedAt: string;
  buildSourceIdentity?: string | null;
};

export const DEFAULT_WORKER_HEARTBEAT_FRESHNESS_MS = 30_000;

export type CompatibleWorkerQuery = {
  contractVersion?: string;
  modelVersion?: string;
  engineExpectation?: string;
  guestCount?: number;
  tableCount?: number;
  freshnessMs?: number;
};

function rowToWorker(row: Record<string, unknown>): CpsatWorkerRegistration {
  const models = row.model_versions;
  const contracts = row.contract_versions;
  return {
    workerId: String(row.worker_id),
    imageIdentity: String(row.image_identity),
    imageDigest: row.image_digest == null ? null : String(row.image_digest),
    modelVersions: Array.isArray(models) ? models.map(String) : JSON.parse(String(models ?? "[]")),
    contractVersions: Array.isArray(contracts)
      ? contracts.map(String)
      : JSON.parse(String(contracts ?? "[]")),
    ortoolsVersion: String(row.ortools_version),
    pythonVersion: String(row.python_version),
    cpuArch: String(row.cpu_arch),
    cpuFeatureHash: row.cpu_feature_hash == null ? null : String(row.cpu_feature_hash),
    qualifiedMaxGuests: row.qualified_max_guests == null ? null : Number(row.qualified_max_guests),
    qualifiedMaxTables: row.qualified_max_tables == null ? null : Number(row.qualified_max_tables),
    lifecycle: String(row.lifecycle) as CpsatWorkerLifecycle,
    concurrencyCapacity: Number(row.concurrency_capacity ?? 1),
    activeJobs: Number(row.active_jobs ?? 0),
    lastHeartbeat: new Date(String(row.last_heartbeat)).toISOString(),
    startedAt: new Date(String(row.started_at)).toISOString(),
    buildSourceIdentity: row.build_source_identity == null ? null : String(row.build_source_identity),
  };
}

export async function registerCpsatWorker(
  client: PgQueryable,
  input: {
    workerId: string;
    imageIdentity: string;
    imageDigest?: string | null;
    modelVersions?: string[];
    contractVersions?: string[];
    ortoolsVersion?: string;
    pythonVersion?: string;
    cpuArch: string;
    cpuFeatureHash?: string | null;
    qualifiedMaxGuests?: number | null;
    qualifiedMaxTables?: number | null;
    concurrencyCapacity?: number;
    buildSourceIdentity?: string | null;
    lifecycle?: CpsatWorkerLifecycle;
  },
): Promise<CpsatWorkerRegistration> {
  const now = new Date().toISOString();
  const lifecycle = input.lifecycle ?? "STARTING";
  const modelVersions = input.modelVersions ?? [CPSAT_MODEL_VERSION];
  const contractVersions = input.contractVersions ?? [CPSAT_REQUEST_CONTRACT];
  await client.query(
    `INSERT INTO cpsat_solver_workers (
      worker_id, image_identity, image_digest, model_versions, contract_versions,
      ortools_version, python_version, cpu_arch, cpu_feature_hash,
      qualified_max_guests, qualified_max_tables, lifecycle, concurrency_capacity,
      active_jobs, last_heartbeat, started_at, build_source_identity, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4::jsonb,$5::jsonb,
      $6,$7,$8,$9,
      $10,$11,$12,$13,
      0,$14,$14,$15,$14,$14
    )
    ON CONFLICT (worker_id) DO UPDATE SET
      image_identity = EXCLUDED.image_identity,
      image_digest = EXCLUDED.image_digest,
      model_versions = EXCLUDED.model_versions,
      contract_versions = EXCLUDED.contract_versions,
      ortools_version = EXCLUDED.ortools_version,
      python_version = EXCLUDED.python_version,
      cpu_arch = EXCLUDED.cpu_arch,
      cpu_feature_hash = EXCLUDED.cpu_feature_hash,
      qualified_max_guests = EXCLUDED.qualified_max_guests,
      qualified_max_tables = EXCLUDED.qualified_max_tables,
      lifecycle = EXCLUDED.lifecycle,
      concurrency_capacity = EXCLUDED.concurrency_capacity,
      build_source_identity = EXCLUDED.build_source_identity,
      last_heartbeat = EXCLUDED.last_heartbeat,
      updated_at = EXCLUDED.updated_at`,
    [
      input.workerId,
      input.imageIdentity,
      input.imageDigest ?? null,
      JSON.stringify(modelVersions),
      JSON.stringify(contractVersions),
      input.ortoolsVersion ?? CPSAT_ORTOOLS_VERSION,
      input.pythonVersion ?? CPSAT_PYTHON_VERSION,
      input.cpuArch,
      input.cpuFeatureHash ?? null,
      input.qualifiedMaxGuests ?? null,
      input.qualifiedMaxTables ?? null,
      lifecycle,
      input.concurrencyCapacity ?? 1,
      now,
      input.buildSourceIdentity ?? null,
    ],
  );
  const loaded = await getCpsatWorker(client, input.workerId);
  if (!loaded) throw new Error("worker registration failed");
  return loaded;
}

export async function setCpsatWorkerLifecycle(
  client: PgQueryable,
  workerId: string,
  lifecycle: CpsatWorkerLifecycle,
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await client.query(
    `UPDATE cpsat_solver_workers
     SET lifecycle = $2, last_heartbeat = $3, updated_at = $3
     WHERE worker_id = $1
     RETURNING worker_id`,
    [workerId, lifecycle, now],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function heartbeatCpsatWorker(
  client: PgQueryable,
  input: { workerId: string; activeJobs?: number; lifecycle?: CpsatWorkerLifecycle },
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await client.query(
    `UPDATE cpsat_solver_workers
     SET last_heartbeat = $2,
         updated_at = $2,
         active_jobs = COALESCE($3, active_jobs),
         lifecycle = COALESCE($4, lifecycle)
     WHERE worker_id = $1
     RETURNING worker_id`,
    [input.workerId, now, input.activeJobs ?? null, input.lifecycle ?? null],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getCpsatWorker(
  client: PgQueryable,
  workerId: string,
): Promise<CpsatWorkerRegistration | null> {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_workers WHERE worker_id = $1`,
    [workerId],
  );
  const row = result.rows[0];
  return row ? rowToWorker(row) : null;
}

export function workerSupportsCompatibility(
  worker: CpsatWorkerRegistration,
  query: CompatibleWorkerQuery,
  nowMs = Date.now(),
): boolean {
  if (worker.lifecycle !== "READY") return false;
  const freshnessMs = query.freshnessMs ?? DEFAULT_WORKER_HEARTBEAT_FRESHNESS_MS;
  const last = Date.parse(worker.lastHeartbeat);
  if (!Number.isFinite(last) || nowMs - last > freshnessMs) return false;
  const contract = query.contractVersion ?? CPSAT_REQUEST_CONTRACT;
  const model = query.modelVersion ?? CPSAT_MODEL_VERSION;
  if (!worker.contractVersions.includes(contract)) return false;
  if (!worker.modelVersions.includes(model)) return false;
  if (query.engineExpectation) {
    const expected = `${"ortools-cpsat"}@${worker.ortoolsVersion}+py${worker.pythonVersion}`;
    // Accept either full expectation or OR-Tools pin match.
    if (
      query.engineExpectation !== expected &&
      query.engineExpectation !== CPSAT_ENGINE_EXPECTATION &&
      !query.engineExpectation.includes(worker.ortoolsVersion)
    ) {
      return false;
    }
  }
  if (
    query.guestCount != null &&
    worker.qualifiedMaxGuests != null &&
    query.guestCount > worker.qualifiedMaxGuests
  ) {
    return false;
  }
  if (
    query.tableCount != null &&
    worker.qualifiedMaxTables != null &&
    query.tableCount > worker.qualifiedMaxTables
  ) {
    return false;
  }
  if (worker.activeJobs >= worker.concurrencyCapacity) return false;
  return true;
}

export async function findCompatibleReadyWorkers(
  client: PgQueryable,
  query: CompatibleWorkerQuery = {},
): Promise<CpsatWorkerRegistration[]> {
  const freshnessMs = query.freshnessMs ?? DEFAULT_WORKER_HEARTBEAT_FRESHNESS_MS;
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_workers
     WHERE lifecycle = 'READY'
       AND last_heartbeat >= NOW() - ($1::text || ' milliseconds')::interval
     ORDER BY last_heartbeat DESC`,
    [String(freshnessMs)],
  );
  return result.rows.map(rowToWorker).filter((w) => workerSupportsCompatibility(w, query));
}

/**
 * Test/local bootstrap only. Refuses production NODE_ENV and requires explicit opt-in.
 * Never import from Event OS product launch paths.
 */
export async function registerSyntheticCpsatWorkerForTests(
  client: PgQueryable,
  overrides: Partial<Parameters<typeof registerCpsatWorker>[1]> = {},
): Promise<CpsatWorkerRegistration> {
  if (process.env.NODE_ENV === "production" && process.env.CPSAT_ALLOW_SYNTHETIC_WORKER !== "1") {
    throw new PlatformError("PRODUCTION_ADAPTER_FORBIDDEN", "synthetic worker bootstrap forbidden in production", {
      publicMessage: "Seating generation is temporarily unavailable. Your event data has not been changed. Please try again when the solver service is ready.",
    });
  }
  if (process.env.CPSAT_ALLOW_SYNTHETIC_WORKER !== "1" && process.env.NODE_ENV === "production") {
    throw new PlatformError("FIXTURE_FORBIDDEN", "synthetic worker requires CPSAT_ALLOW_SYNTHETIC_WORKER=1", {
      publicMessage: "Seating generation is temporarily unavailable. Your event data has not been changed. Please try again when the solver service is ready.",
    });
  }
  // Local/ephemeral tests may omit the env flag when NODE_ENV is not production.
  const workerId = overrides.workerId ?? `synthetic-worker-${randomUUID()}`;
  const registered = await registerCpsatWorker(client, {
    workerId,
    imageIdentity: overrides.imageIdentity ?? "synthetic-local-test",
    imageDigest: overrides.imageDigest ?? null,
    modelVersions: overrides.modelVersions,
    contractVersions: overrides.contractVersions,
    ortoolsVersion: overrides.ortoolsVersion,
    pythonVersion: overrides.pythonVersion,
    cpuArch: overrides.cpuArch ?? process.arch,
    cpuFeatureHash: overrides.cpuFeatureHash ?? null,
    qualifiedMaxGuests: overrides.qualifiedMaxGuests ?? 10_000,
    qualifiedMaxTables: overrides.qualifiedMaxTables ?? 2_000,
    concurrencyCapacity: overrides.concurrencyCapacity ?? 1,
    buildSourceIdentity: overrides.buildSourceIdentity ?? "test-bootstrap",
    lifecycle: "STARTING",
  });
  await setCpsatWorkerLifecycle(client, registered.workerId, "READY");
  await heartbeatCpsatWorker(client, { workerId: registered.workerId, activeJobs: 0, lifecycle: "READY" });
  const ready = await getCpsatWorker(client, registered.workerId);
  if (!ready) throw new Error("synthetic worker bootstrap failed");
  return ready;
}
