/**
 * Milestone 5A — migrate + admit + enqueue against ephemeral Postgres for the candidate worker image.
 * Run with: CPSAT_DATABASE_URL=... npx tsx docs/.../run-hardened-image-journey.mjs
 */
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../../");
const require = createRequire(resolve(root, "apps/event-os/package.json"));
const pg = require("pg");

const DATABASE_URL = process.env.CPSAT_DATABASE_URL;
const MODE = process.env.M5A_MODE ?? "full"; // migrate | wait-ready | enqueue | full
if (!DATABASE_URL) {
  console.error("CPSAT_DATABASE_URL required");
  process.exit(2);
}

const {
  runPlatformMigrations,
  freezeCpsatSeatingAuthority,
  enqueueCpsatSeatingRun,
  admitCpsatSeatingLaunch,
  CPSAT_MODEL_VERSION,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_PYTHON_VERSION,
  CPSAT_REQUEST_CONTRACT,
} = await import(resolve(root, "packages/shared-platform/src/index.ts"));

const EVENT = "00000000-0000-4000-8000-00000000m5a1";
const ORG = "00000000-0000-4000-8000-00000000orga";
const hash = (label) => createHash("sha256").update(label).digest("hex");

const compiled = {
  contract: "eos-s06-solver-v2",
  seed: 202,
  guests: [
    { token: "g1".padEnd(32, "0"), eligible: true, capabilityCodes: [], groupTokens: [], protocolCodes: [] },
    { token: "g2".padEnd(32, "1"), eligible: true, capabilityCodes: [], groupTokens: [], protocolCodes: [] },
  ],
  positions: [
    { token: "p1".padEnd(32, "a"), tableToken: "t1".padEnd(32, "b"), zoneCodes: [], capabilityCodes: [] },
    { token: "p2".padEnd(32, "c"), tableToken: "t1".padEnd(32, "b"), zoneCodes: [], capabilityCodes: [] },
  ],
  rules: [],
  reservations: [],
};

const pkg = {
  id: randomUUID(),
  organisationId: ORG,
  eventId: EVENT,
  schemaVersion: 1,
  semanticHash: hash("semantic"),
  compiledRequestHash: hash("compiled"),
  contentHash: hash("content"),
  cohortHash: hash("cohort"),
  rsvpSnapshotHash: hash("rsvp"),
  seatingLayoutBindingId: randomUUID(),
  layoutId: "layout-m5a",
  layoutPublicationId: "pub-m5a",
  layoutContentHash: hash("layout"),
  eventBriefEditionId: null,
  eventBriefContentHash: null,
  protectionSnapshotHash: null,
  lockSetHash: hash("locks"),
  solverVersion: "s06-solver-v3",
  solverConfigHash: hash("objective"),
  deterministicSeed: "seed-m5a",
  frozenByPersonId: "planner",
  frozenAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
const db = {
  query: (text, values) => pool.query(text, values),
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const out = await fn({ query: (t, v) => client.query(t, v) });
      await client.query("COMMIT");
      return out;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};

const out = {
  mode: MODE,
  migrations: false,
  workerReady: false,
  admissionOk: false,
  enqueuedRunId: null,
  terminalLifecycle: null,
  sealed: null,
  productResult: null,
  workerLifecycleFinal: null,
  leaseOwnerNull: null,
  evidence: {},
};

try {
  if (MODE === "migrate" || MODE === "full") {
    await runPlatformMigrations(db);
    out.migrations = true;
  }

  if (MODE === "wait-ready" || MODE === "full" || MODE === "enqueue") {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const workers = await pool.query(
        `select worker_id, lifecycle, last_heartbeat, image_identity, image_digest, build_source_identity,
                ortools_version, python_version, model_versions, contract_versions, active_jobs
           from cpsat_solver_workers
          where lifecycle = 'READY'
          order by last_heartbeat desc nulls last
          limit 5`,
      );
      if (workers.rows.length > 0) {
        out.workerReady = true;
        out.evidence.readyWorker = workers.rows[0];
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!out.workerReady) throw new Error("no READY worker within 60s");
  }

  if (MODE === "enqueue" || MODE === "full") {
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: pkg,
      compiled,
    });
    const admission = await admitCpsatSeatingLaunch(db, frozen);
    out.admissionOk = admission.ok === true;
    out.evidence.admission = admission;
    if (!admission.ok) throw new Error(`admission failed: ${JSON.stringify(admission)}`);

    const enqueued = await enqueueCpsatSeatingRun(db, frozen, { actorPersonId: "m5a-journey" });
    out.enqueuedRunId = enqueued.run.runId;
    out.evidence.enqueuedLifecycle = enqueued.run.lifecycle;

    const settleDeadline = Date.now() + 120_000;
    while (Date.now() < settleDeadline) {
      const run = await pool.query(
        `select r.id, r.status, r.product_result, r.fault_code, r.lease_owner, r.lease_epoch, r.progress_phase, r.sealed_at,
                c.sealed as candidate_sealed, c.assignment_count
           from cpsat_solver_runs r
           left join cpsat_solver_candidates c on c.run_id = r.id
          where r.id = $1`,
        [out.enqueuedRunId],
      );
      const row = run.rows[0];
      if (!row) throw new Error("run missing");
      out.terminalLifecycle = row.status;
      out.sealed = Boolean(row.candidate_sealed) || row.sealed_at != null;
      out.productResult = row.product_result;
      out.leaseOwnerNull = row.lease_owner == null;
      out.evidence.run = row;
      if (
        ["READY_FOR_REVIEW", "CLOSED_NO_PLAN", "FAILED", "CANCELLED", "VERIFICATION_OR_EXPLAIN_FAULT"].includes(
          row.status,
        )
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const workersFinal = await pool.query(
      `select worker_id, lifecycle, active_jobs, last_heartbeat from cpsat_solver_workers order by last_heartbeat desc`,
    );
    out.evidence.workersFinal = workersFinal.rows;
    out.workerLifecycleFinal = workersFinal.rows[0]?.lifecycle ?? null;
  }

  out.evidence.contract = {
    CPSAT_MODEL_VERSION,
    CPSAT_ORTOOLS_VERSION,
    CPSAT_PYTHON_VERSION,
    CPSAT_REQUEST_CONTRACT,
  };

  console.log(JSON.stringify(out, null, 2));
  if ((MODE === "enqueue" || MODE === "full") && (out.terminalLifecycle !== "READY_FOR_REVIEW" || !out.sealed)) {
    process.exitCode = 1;
  }
} catch (err) {
  console.error(JSON.stringify({ error: String(err?.stack || err), partial: out }, null, 2));
  process.exitCode = 1;
} finally {
  await pool.end();
}
