/**
 * M6E CAP600 CP-SAT qualification against the live Railway worker.
 *
 * Uses frozen CAP600 event 053fa686-… / corpus eos-s06-capacity-600-v1 B_TYPICAL.
 * Does NOT adopt the candidate. Preserves baseline M6B adoption.
 *
 * Usage (with tunneled DATABASE_URL):
 *   DATABASE_URL=postgresql://…@127.0.0.1:15432/railway \
 *     pnpm exec tsx apps/event-os/scripts/m6e-cap600-worker-qualify.ts --confirm-synthetic-qualification
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import {
  FIXTURE_IDS as people,
  PostgresPlatformStore,
  applySyntheticSeedIfNeeded,
  CAPACITY_SCENARIO_SEEDS,
  capacityCorpusHash,
  ACCEPTED_CAP600_CORPUS_HASHES,
  type PgQueryable,
} from "@maison-doclar/shared-platform";

const CAP600_ID = "053fa686-124e-49b3-b8a8-d0497c0a1668";
const BASELINE_EVENT = "92909476-d3f9-43f1-a5f7-7e1a83c92fbd";
const BASELINE_ADOPTION = "3b771ad9-c4c9-401b-87df-0371f9eee840";
const EVIDENCE = join(process.cwd(), "docs/control/evidence/eos-s06-cpsat-production/milestone-6de");

/** Ratified doc 08: 500-guest typical ≤10s / hard 30s. CAP600 uses 45s allow with 90s wall stop-loss (scale-600 runner). */
const MAX_TIME_SECONDS = 45;
const WALL_STOP_LOSS_MS = 90_000;
const HARD_CEILING_MS = 30_000; // performance gate reference for ≤500; CAP600 measured against 45s runner budget

function adapt(pool: Pool): PgQueryable & { transaction<T>(fn: (q: PgQueryable) => Promise<T>): Promise<T> } {
  return {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: PgQueryable) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      try {
        await connected.query("BEGIN");
        const result = await fn({
          async query<R extends object>(text: string, values?: unknown[]) {
            const inner = await connected.query(text, values);
            return { rows: inner.rows as R[], rowCount: inner.rowCount ?? 0 };
          },
        });
        await connected.query("COMMIT");
        return result;
      } catch (error) {
        await connected.query("ROLLBACK");
        throw error;
      } finally {
        connected.release();
      }
    },
  };
}

function progress(msg: string, started: number) {
  const line = `[M6E-CAP600 +${Math.round(performance.now() - started)}ms] ${msg}`;
  console.log(line);
  mkdirSync(EVIDENCE, { recursive: true });
  appendFileSync(join(EVIDENCE, "CAP600_TELEMETRY.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), msg, elapsedMs: Math.round(performance.now() - started) })}\n`);
}

if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}
const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL required");

const corpusHash = capacityCorpusHash("B_TYPICAL");
if (corpusHash !== ACCEPTED_CAP600_CORPUS_HASHES.B_TYPICAL) {
  throw new Error(`CAP600 corpus hash drift: ${corpusHash}`);
}

const pool = new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 15_000 });
const started = performance.now();
try {
  const client = adapt(pool);
  const store = await PostgresPlatformStore.open(client);
  const seeded = await applySyntheticSeedIfNeeded(store, client, {});
  await store.flush();
  const service = seeded.service;

  // Preflight worker
  const workers = await pool.query(
    `SELECT worker_id, lifecycle, concurrency_capacity, active_jobs, last_heartbeat, image_identity, qualified_max_guests
     FROM cpsat_solver_workers WHERE lifecycle='READY' ORDER BY last_heartbeat DESC LIMIT 3`,
  );
  const ready = workers.rows[0];
  if (!ready) throw new Error("BLOCKED — RESOURCE: no READY worker");
  const heartbeatAgeMs = Date.now() - new Date(ready.last_heartbeat).getTime();
  if (heartbeatAgeMs > 60_000) throw new Error(`BLOCKED — RESOURCE: worker heartbeat stale (${heartbeatAgeMs}ms)`);
  if (Number(ready.concurrency_capacity) !== 1) throw new Error("worker concurrency must be 1");
  const queued = await pool.query(`SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING')`);
  if (queued.rows[0].c > 0) throw new Error(`BLOCKED — RESOURCE: active/queued runs=${queued.rows[0].c}`);
  const leased = await pool.query(`SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE lease_owner IS NOT NULL`);
  if (leased.rows[0].c > 0) throw new Error("BLOCKED — RESOURCE: outstanding lease");

  const event = store.snapshot().events.find((e) => e.id === CAP600_ID);
  if (!event || event.code !== "CAP600") throw new Error("CAP600 event missing");
  const guestCount = store.listOperationalGuestsByEventId(people.orgMaison, CAP600_ID).length;
  if (guestCount !== 600) throw new Error(`CAP600 guest count ${guestCount}`);

  const baseline = await pool.query(`SELECT id, status, run_id, assignment_hash FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);
  if (!baseline.rows[0] || baseline.rows[0].status !== "CURRENT") {
    throw new Error("baseline adoption not CURRENT — abort");
  }

  progress(
    `preflight OK worker=${ready.worker_id} image=${ready.image_identity} guests=600 corpus=${corpusHash.slice(0, 12)}`,
    started,
  );

  const plannerGrant = store
    .snapshot()
    .assignments.find((a) => a.eventId === CAP600_ID && a.personId === people.personPlanner && a.status === "ACTIVE");
  if (!plannerGrant) throw new Error("CAP600 planner assignment missing");

  const planner = {
    personId: people.personPlanner,
    correlationId: `m6e-cap600-${Date.now()}`,
    now: new Date().toISOString(),
    actorKind: "HUMAN" as const,
  };
  const v2 = service.seatingV2Commands();
  const seed = CAPACITY_SCENARIO_SEEDS.B_TYPICAL;
  const envelope = (key: string) => ({
    organisationId: people.orgMaison,
    eventId: CAP600_ID,
    actorAssignmentId: plannerGrant.id,
    idempotencyKey: key,
  });

  const freezeStarted = performance.now();
  const frozen = await v2.freezePackage(planner, envelope(`m6e-cap600-freeze-${Date.now()}`), { seed });
  await store.flush();
  const freezeMs = Math.round(performance.now() - freezeStarted);
  progress(`frozen package=${frozen.value.id} application=${frozen.application} freezeMs=${freezeMs}`, started);

  const queueStarted = performance.now();
  const launched = await v2.launchRun(planner, envelope(`m6e-cap600-run-${Date.now()}`), {
    packageId: frozen.value.id,
  });
  await store.flush();
  const queueMs = Math.round(performance.now() - queueStarted);
  const runId = launched.value.id;
  progress(`enqueued run=${runId} application=${launched.application} queueMs=${queueMs}`, started);

  // Wait for terminal via DB (worker settlement)
  let terminal: Record<string, unknown> | null = null;
  const waitStarted = performance.now();
  while (performance.now() - waitStarted < WALL_STOP_LOSS_MS) {
    const row = await pool.query(
      `SELECT id, status, product_result, evidence_grade, progress_phase, fault_code, stop_reason,
              attempt_count, child_invocation_count, queued_at, started_at, sealed_at, lease_owner,
              wall_ms_used, deterministic_ms_used, solutions_found
       FROM cpsat_solver_runs WHERE id=$1`,
      [runId],
    );
    const r = row.rows[0];
    if (!r) throw new Error("run disappeared");
    progress(`poll status=${r.status} phase=${r.progress_phase} product=${r.product_result ?? "-"}`, started);
    if (["READY_FOR_REVIEW", "FAILED", "CANCELLED", "CLOSED_NO_PLAN", "ADOPTED"].includes(r.status)) {
      terminal = r;
      break;
    }
    if (r.status === "ADOPTED") throw new Error("unexpected adoption of scale candidate");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!terminal) {
    writeFileSync(
      join(EVIDENCE, "CAP600_REPORT.json"),
      JSON.stringify({ disposition: "FAIL — PERFORMANCE", reason: "wall-clock stop-loss", runId, wallStopLossMs: WALL_STOP_LOSS_MS }, null, 2),
    );
    throw new Error("FAIL — PERFORMANCE: wall-clock stop-loss");
  }

  const assignments = await pool.query(
    `SELECT guest_token, position_token, table_token, state FROM cpsat_solver_assignments WHERE run_id=$1`,
    [runId],
  );
  const seated = assignments.rows.filter((a) => a.state === "SEATED");
  const guestSet = new Set(seated.map((a) => a.guest_token));
  const posSet = new Set(seated.map((a) => a.position_token));

  const postLease = await pool.query(`SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE lease_owner IS NOT NULL`);
  const postQueued = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING')`,
  );
  const baselineAfter = await pool.query(`SELECT id, status, run_id, assignment_hash FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);

  const claimLatencyMs =
    terminal.queued_at && terminal.started_at
      ? new Date(String(terminal.started_at)).getTime() - new Date(String(terminal.queued_at)).getTime()
      : null;
  const solveMs = terminal.wall_ms_used != null ? Number(terminal.wall_ms_used) : null;
  const totalWallMs = Math.round(performance.now() - started);

  let disposition: string;
  const product = String(terminal.product_result ?? "");
  const status = String(terminal.status);
  if (status === "FAILED" || product === "SOLVER_FAULT") disposition = "FAIL — CORRECTNESS";
  else if (postLease.rows[0].c > 0 || postQueued.rows[0].c > 0) disposition = "FAIL — CONTAINMENT";
  else if (guestSet.size !== seated.length || posSet.size !== seated.length) disposition = "FAIL — CORRECTNESS";
  else if (seated.length !== 600 && product !== "INFEASIBLE") disposition = "FAIL — CORRECTNESS";
  else if (solveMs != null && solveMs > HARD_CEILING_MS * 2 && product === "OPTIMAL") {
    // CAP600 is above 500; allow up to runner budget 45s before performance fail
    disposition = solveMs > MAX_TIME_SECONDS * 1000 ? "FAIL — PERFORMANCE" : "PASS";
  } else if (product === "OPTIMAL" || product === "FEASIBLE") disposition = "PASS";
  else if (product === "TIMED_OUT" || product === "SEARCH_INCOMPLETE") disposition = "FAIL — PERFORMANCE";
  else disposition = "FAIL — CORRECTNESS";

  const report = {
    scale: "CAP600",
    disposition,
    eventId: CAP600_ID,
    runId,
    packageId: frozen.value.id,
    corpusSeed: seed,
    corpusHash,
    acceptedHash: ACCEPTED_CAP600_CORPUS_HASHES.B_TYPICAL,
    maxTimeSeconds: MAX_TIME_SECONDS,
    wallStopLossMs: WALL_STOP_LOSS_MS,
    worker: {
      workerId: ready.worker_id,
      imageIdentity: ready.image_identity,
      imageDigest: process.env.CPSAT_IMAGE_DIGEST?.trim() || null,
      qualifiedMaxGuests: ready.qualified_max_guests,
    },
    terminal: {
      status,
      productResult: product,
      evidenceGrade: terminal.evidence_grade,
      progressPhase: terminal.progress_phase,
      faultCode: terminal.fault_code,
      stopReason: terminal.stop_reason,
      attemptCount: terminal.attempt_count,
      childInvocationCount: terminal.child_invocation_count,
      solutionsFound: terminal.solutions_found,
    },
    correctness: {
      seated: seated.length,
      uniqueGuests: guestSet.size,
      uniquePositions: posSet.size,
      expectedSeated: 600,
    },
    timings: {
      freezeMs,
      queueMs,
      claimLatencyMs,
      solveWallMs: solveMs,
      deterministicMs: terminal.deterministic_ms_used != null ? Number(terminal.deterministic_ms_used) : null,
      totalWallMs,
    },
    containment: {
      leaseCleared: postLease.rows[0].c === 0,
      queueEmpty: postQueued.rows[0].c === 0,
      notAdopted: status !== "ADOPTED",
      baselineUnchanged:
        baselineAfter.rows[0]?.id === BASELINE_ADOPTION &&
        baselineAfter.rows[0]?.status === "CURRENT" &&
        baselineAfter.rows[0]?.assignment_hash === baseline.rows[0].assignment_hash,
      baselineEvent: BASELINE_EVENT,
    },
    at: new Date().toISOString(),
  };
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, "CAP600_REPORT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (disposition !== "PASS") process.exit(2);
} finally {
  await pool.end();
}
