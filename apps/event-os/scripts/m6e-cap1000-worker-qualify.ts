/**
 * M6E CAP1000 — frozen-worker rerun against already-scanned digest
 * event-os-solver-worker:m6e-worker-8c8d922
 * (sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f).
 *
 * Corpus lock: 13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668
 * Fresh synthetic event + idempotency scope. Durable enqueue (product layout
 * install OOM path avoided). Does not adopt. Does not overwrite prior CAP1000_*.
 *
 * Ratified perf (doc 08): typical ≤30s; p95 ≤45; hard ceiling 90s.
 *
 * Usage (tunneled DATABASE_URL):
 *   DATABASE_URL=postgresql://…@127.0.0.1:15432/railway \
 *     pnpm exec tsx apps/event-os/scripts/m6e-cap1000-worker-qualify.ts \
 *     --confirm-synthetic-qualification
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import {
  admitCpsatSeatingLaunch,
  freezeCpsatSeatingAuthority,
  enqueueCpsatSeatingRun,
  buildCapacity1000Corpus,
  capacity1000CorpusHash,
  solverRequestToV2Compiled,
  CAPACITY_1000_SCENARIO_SEEDS,
  exactHash,
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  recomputeObjectiveTiers,
  requiredObjectiveTiers,
} from "@maison-doclar/shared-platform";
import { compileV2ToCpsatRequest } from "../../../packages/shared-platform/src/cpsat/compiler.js";

/** Fresh synthetic UUID for this frozen-worker rerun only. */
const EVENT_ID = "e1376606-8c7e-4891-9fc4-28ad2c67eb12";
/** Prior CAP1000 durable-enqueue event — must remain untouched. */
const PRIOR_CAP1000_EVENT = "add41e21-9618-44f9-896a-fecd54badca5";
const PRIOR_CAP1000_RUN = "96aa065d-6318-44ea-87b0-60f33ada020b";
const ORG = "00000000-0000-4000-8000-000000000001";
const BASELINE_ADOPTION = "3b771ad9-c4c9-401b-87df-0371f9eee840";
const CORPUS_LOCK = "13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668";
const EXPECTED_IMAGE = "event-os-solver-worker:m6e-worker-8c8d922";
const EXPECTED_DIGEST = "sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f";
const EXPECTED_SOURCE_SHA = "8c8d92241a550348f3ba44192cb07f655ffe6d5d";
const EXPECTED_DEPLOYMENT_ID = "57b5c9fb-4538-44ef-ad90-7d731a7db948";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const EVIDENCE = join(REPO_ROOT, "docs/control/evidence/eos-s06-cpsat-production/milestone-6de");
const REPORT_FILE = "CAP1000_FROZEN_WORKER_REPORT.json";
const TELEMETRY_FILE = "CAP1000_FROZEN_WORKER_TELEMETRY.jsonl";
const WALL_STOP_LOSS_MS = 90_000;
const HARD_CEILING_MS = 90_000;
const TYPICAL_TARGET_MS = 30_000;

function progress(msg: string, started: number) {
  const line = `[M6E-CAP1000-FROZEN +${Math.round(performance.now() - started)}ms] ${msg}`;
  console.log(line);
  mkdirSync(EVIDENCE, { recursive: true });
  appendFileSync(
    join(EVIDENCE, TELEMETRY_FILE),
    `${JSON.stringify({ at: new Date().toISOString(), msg, elapsedMs: Math.round(performance.now() - started) })}\n`,
  );
}

function writeReport(report: unknown) {
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, REPORT_FILE), JSON.stringify(report, null, 2));
}

if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}
if (EVENT_ID === PRIOR_CAP1000_EVENT) {
  throw new Error("BLOCKED — must not reuse prior CAP1000 event");
}
const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL required");

const corpusHash = capacity1000CorpusHash("B_TYPICAL");
if (corpusHash !== CORPUS_LOCK) {
  throw new Error(`CAP1000 corpus lock mismatch: ${corpusHash}`);
}

const solverRequest = buildCapacity1000Corpus("B_TYPICAL");
const compiled = solverRequestToV2Compiled(solverRequest);
compiled.contract = SEATING_V2_SOLVER_CONTRACT;
compiled.version = SEATING_V2_SOLVER_VERSION;
const preCompile = compileV2ToCpsatRequest(compiled, {
  runId: "preflight-cap1000-frozen",
  mode: "PERFORMANCE",
  purpose: "QUALIFICATION",
});
const required = requiredObjectiveTiers(preCompile);
if (solverRequest.guests.length !== 1000) throw new Error(`guest count ${solverRequest.guests.length}`);
if (preCompile.preferences.length !== 24) throw new Error(`preference count ${preCompile.preferences.length}`);
if (required.preferences !== true) throw new Error("A2_preferences must be applicable (required.preferences=true)");
if (required.movement !== false) {
  throw new Error(`required.movement must follow corpus (expected false, got ${required.movement})`);
}

const pool = new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 15_000 });
const db = {
  query: (text: string, values?: unknown[]) => pool.query(text, values),
  transaction: async <T>(fn: (q: { query: typeof pool.query }) => Promise<T>) => {
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

const started = performance.now();
try {
  const priorIntact = await pool.query(
    `SELECT id, status, product_result FROM cpsat_solver_runs WHERE id=$1 AND event_id=$2`,
    [PRIOR_CAP1000_RUN, PRIOR_CAP1000_EVENT],
  );
  if (!priorIntact.rows[0] || priorIntact.rows[0].status !== "READY_FOR_REVIEW") {
    throw new Error("BLOCKED — prior CAP1000 historical run missing or altered");
  }

  const workers = await pool.query(
    `SELECT worker_id, lifecycle, concurrency_capacity, active_jobs, last_heartbeat, image_identity, qualified_max_guests
     FROM cpsat_solver_workers WHERE lifecycle='READY' ORDER BY last_heartbeat DESC`,
  );
  if (workers.rows.length !== 1) {
    throw new Error(`BLOCKED — RESOURCE: expected exactly one READY worker, got ${workers.rows.length}`);
  }
  const ready = workers.rows[0];
  if (Date.now() - new Date(ready.last_heartbeat).getTime() > 60_000) {
    throw new Error("BLOCKED — RESOURCE: stale heartbeat");
  }
  if (Number(ready.concurrency_capacity) !== 1) throw new Error("worker concurrency must be 1");
  if (String(ready.image_identity) !== EXPECTED_IMAGE) {
    throw new Error(`BLOCKED — unexpected worker image_identity ${ready.image_identity}`);
  }
  const active = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING') OR lease_owner IS NOT NULL`,
  );
  if (active.rows[0].c > 0) throw new Error(`BLOCKED — RESOURCE: busy queue/leases=${active.rows[0].c}`);

  const baseline = await pool.query(`SELECT id, status, assignment_hash FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);
  if (baseline.rows[0]?.status !== "CURRENT") throw new Error("baseline adoption not CURRENT");
  const baselineHashBefore = String(baseline.rows[0].assignment_hash);

  const railway = {
    project: process.env.RAILWAY_PROJECT_NAME ?? "atelier-doclar",
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.RAILWAY_ENVIRONMENT ?? "production",
    service: process.env.RAILWAY_SERVICE_NAME ?? "solver-worker",
    serviceId: process.env.RAILWAY_SERVICE_ID ?? "32f09234-9295-4a6c-8b8d-952d61d08706",
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? EXPECTED_DEPLOYMENT_ID,
    imageIdentity: process.env.CPSAT_IMAGE_IDENTITY ?? EXPECTED_IMAGE,
    imageDigest: process.env.CPSAT_IMAGE_DIGEST ?? EXPECTED_DIGEST,
    sourceSha: process.env.SOURCE_SHA ?? EXPECTED_SOURCE_SHA,
  };
  if (railway.imageDigest !== EXPECTED_DIGEST || railway.sourceSha !== EXPECTED_SOURCE_SHA) {
    throw new Error("BLOCKED — Railway digest/SOURCE_SHA mismatch vs frozen identity");
  }

  progress(
    `preflight OK corpus=${corpusHash.slice(0, 12)} prefs=24 worker=${ready.worker_id} event=${EVENT_ID}`,
    started,
  );

  const hash = (label: string) => createHash("sha256").update(label).digest("hex");
  const pkg = {
    id: randomUUID(),
    organisationId: ORG,
    eventId: EVENT_ID,
    schemaVersion: 1,
    semanticHash: exactHash({ corpus: "B_TYPICAL", corpusHash, rerun: "frozen-worker" }),
    compiledRequestHash: exactHash(compiled),
    contentHash: exactHash({ content: "cap1000-b-typical-frozen-worker-rerun-v1" }),
    cohortHash: hash("cohort-cap1000-frozen-worker"),
    rsvpSnapshotHash: hash("rsvp-cap1000-frozen-worker"),
    seatingLayoutBindingId: randomUUID(),
    layoutId: "cap1000-layout-frozen-worker",
    layoutPublicationId: "cap1000-pub-frozen-worker",
    layoutContentHash: hash("layout-cap1000-frozen-worker"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks-cap1000-frozen-worker"),
    solverVersion: SEATING_V2_SOLVER_VERSION,
    solverConfigHash: exactHash({ seed: CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL }),
    deterministicSeed: CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL,
    frozenByPersonId: "00000000-0000-4000-8000-000000000043",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const frozen = freezeCpsatSeatingAuthority({
    organisationId: ORG,
    eventId: EVENT_ID,
    package: pkg as never,
    compiled,
    purpose: "QUALIFICATION",
    mode: "PERFORMANCE",
    correlationId: `m6e-cap1000-frozen-${Date.now()}`,
  });

  const admission = await admitCpsatSeatingLaunch(db as never, frozen);
  if (!admission.ok) throw new Error(`admission failed: ${JSON.stringify(admission)}`);
  progress("admission OK", started);

  const queueStarted = performance.now();
  const enqueued = await enqueueCpsatSeatingRun(db as never, frozen, {
    actorPersonId: "00000000-0000-4000-8000-000000000043",
  });
  const queueMs = Math.round(performance.now() - queueStarted);
  const runId = enqueued.run.runId;
  const application = enqueued.application;
  progress(`enqueued run=${runId} application=${application} queueMs=${queueMs}`, started);

  if (application !== "APPLIED") {
    const report = {
      scale: "CAP1000",
      disposition: "FAIL — FRESHNESS",
      reason: `expected APPLIED, got ${application}`,
      eventId: EVENT_ID,
      runId,
      application,
    };
    writeReport(report);
    throw new Error(`FAIL — FRESHNESS: application=${application}`);
  }

  let terminal: Record<string, unknown> | null = null;
  const waitStarted = performance.now();
  while (performance.now() - waitStarted < WALL_STOP_LOSS_MS) {
    const row = await pool.query(
      `SELECT id, status, product_result, evidence_grade, progress_phase, fault_code, stop_reason,
              attempt_count, child_invocation_count, queued_at, started_at, sealed_at, lease_owner,
              wall_ms_used, deterministic_ms_used, solutions_found, request_json
       FROM cpsat_solver_runs WHERE id=$1`,
      [runId],
    );
    const r = row.rows[0];
    progress(`poll status=${r.status} phase=${r.progress_phase} product=${r.product_result ?? "-"}`, started);
    if (["READY_FOR_REVIEW", "FAILED", "CANCELLED", "CLOSED_NO_PLAN", "ADOPTED"].includes(r.status)) {
      terminal = r;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!terminal) {
    writeReport({
      scale: "CAP1000",
      disposition: "FAIL — PERFORMANCE",
      reason: "wall-clock stop-loss",
      runId,
      eventId: EVENT_ID,
      wallStopLossMs: WALL_STOP_LOSS_MS,
    });
    throw new Error("FAIL — PERFORMANCE");
  }

  const claimLatencyMs =
    terminal.queued_at && terminal.started_at
      ? new Date(String(terminal.started_at)).getTime() - new Date(String(terminal.queued_at)).getTime()
      : null;
  const solveMsObserved =
    terminal.started_at && terminal.sealed_at
      ? new Date(String(terminal.sealed_at)).getTime() - new Date(String(terminal.started_at)).getTime()
      : null;
  const solveMs = terminal.wall_ms_used != null ? Number(terminal.wall_ms_used) : solveMsObserved;

  const assignments = await pool.query(
    `SELECT guest_token, position_token, table_token, state FROM cpsat_solver_assignments WHERE run_id=$1`,
    [runId],
  );
  const seated = assignments.rows.filter((a) => a.state === "SEATED");
  const guestSet = new Set(seated.map((a) => a.guest_token));
  const posSet = new Set(seated.map((a) => a.position_token));

  const candidate = await pool.query(
    `SELECT sealed, product_result, movement_tier, preference_tier, assignment_count, verification_payload
     FROM cpsat_solver_candidates WHERE run_id=$1`,
    [runId],
  );
  const cand = candidate.rows[0] ?? null;

  const requestJson = terminal.request_json as {
    preferences: Array<{ guest: number; table: number; weight: number; band?: string }>;
    baseline: Array<{ guest: number; table: number; seat: number }>;
    guests: Array<{ token: string }>;
    tables: Array<{ token: string }>;
  };
  const guestIndex = new Map(requestJson.guests.map((g, i) => [g.token, i]));
  const tableIndex = new Map(requestJson.tables.map((t, i) => [t.token, i]));
  const indexed = seated.map((a) => {
    const guest = guestIndex.get(a.guest_token);
    const table = tableIndex.get(a.table_token);
    if (guest == null || table == null) {
      throw new Error(`index map miss guest=${a.guest_token} table=${a.table_token}`);
    }
    const seatPart = String(a.position_token).split(":")[1] ?? "1";
    return { guest, table, seat: Number(seatPart) - 1 };
  });
  const independentlyRecomputed = recomputeObjectiveTiers(
    {
      preferences: requestJson.preferences,
      baseline: requestJson.baseline ?? [],
    } as never,
    indexed,
  );
  const childReportedA2 =
    cand?.preference_tier != null
      ? Number(cand.preference_tier)
      : cand?.verification_payload?.tierVerification?.reported?.A2_preferences ?? null;
  const settlementRecomputedA2 =
    cand?.verification_payload?.tierVerification?.recomputed?.preference ?? null;

  const postBusy = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING') OR lease_owner IS NOT NULL`,
  );
  const postLease = await pool.query(`SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE lease_owner IS NOT NULL`);
  const workerAfter = await pool.query(
    `SELECT worker_id, lifecycle, image_identity, last_heartbeat FROM cpsat_solver_workers WHERE lifecycle='READY'`,
  );
  const baselineAfter = await pool.query(`SELECT id, status, assignment_hash FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);
  const priorAfter = await pool.query(`SELECT id, status, product_result FROM cpsat_solver_runs WHERE id=$1`, [
    PRIOR_CAP1000_RUN,
  ]);

  const claimOwner = terminal.lease_owner == null ? null : String(terminal.lease_owner);
  // lease cleared at terminal; recover claimer from run_events if needed
  const claimEvents = await pool.query(
    `SELECT kind, payload, at FROM cpsat_solver_run_events WHERE run_id=$1 AND kind ILIKE '%CLAIM%' ORDER BY at ASC LIMIT 5`,
    [runId],
  );
  const claimedBy =
    claimOwner ??
    (claimEvents.rows[0]?.payload?.workerId as string | undefined) ??
    (claimEvents.rows[0]?.payload?.leaseOwner as string | undefined) ??
    ready.worker_id;

  const product = String(terminal.product_result ?? "");
  const status = String(terminal.status);
  const evidenceGrade = terminal.evidence_grade == null ? null : String(terminal.evidence_grade);
  const attemptCount = Number(terminal.attempt_count ?? 0);
  const childInvocationCount = Number(terminal.child_invocation_count ?? 0);

  const a2Present =
    cand?.verification_payload?.tierVerification?.present?.A2_preferences === true ||
    childReportedA2 != null;
  const a2Match =
    childReportedA2 != null &&
    childReportedA2 === independentlyRecomputed.preference &&
    (settlementRecomputedA2 == null || settlementRecomputedA2 === independentlyRecomputed.preference);
  const noTierMismatch =
    cand?.verification_payload?.tierVerification?.fault == null &&
    String(terminal.fault_code ?? "") !== "SOLVER_FAULT(VERIFICATION_FAILED):TIER_MISMATCH:A2_preferences" &&
    String(terminal.stop_reason ?? "") !== "TIER_MISMATCH";

  let disposition = "PASS";
  if (status === "FAILED" || product === "SOLVER_FAULT") disposition = "FAIL — CORRECTNESS";
  else if (postBusy.rows[0].c > 0 || postLease.rows[0].c > 0) disposition = "FAIL — CONTAINMENT";
  else if (status !== "READY_FOR_REVIEW") disposition = "FAIL — CORRECTNESS";
  else if (product !== "OPTIMAL") disposition = "FAIL — CORRECTNESS";
  else if (evidenceGrade !== "OPTIMAL_PROOF") disposition = "FAIL — CORRECTNESS";
  else if (childInvocationCount !== 1 || attemptCount !== 1) disposition = "FAIL — CORRECTNESS";
  else if (seated.length !== 1000 || guestSet.size !== 1000 || posSet.size !== 1000) disposition = "FAIL — CORRECTNESS";
  else if (guestSet.size !== seated.length || posSet.size !== seated.length) disposition = "FAIL — CORRECTNESS";
  else if (!a2Present || !a2Match || !noTierMismatch) disposition = "FAIL — CORRECTNESS";
  else if (!cand?.sealed) disposition = "FAIL — CORRECTNESS";
  else if (status === "ADOPTED") disposition = "FAIL — CONTAINMENT";
  else if (
    baselineAfter.rows[0]?.status !== "CURRENT" ||
    baselineAfter.rows[0]?.assignment_hash !== baselineHashBefore
  ) {
    disposition = "FAIL — CONTAINMENT";
  } else if (priorAfter.rows[0]?.status !== "READY_FOR_REVIEW") disposition = "FAIL — CONTAINMENT";
  else if (workerAfter.rows.length !== 1 || workerAfter.rows[0].lifecycle !== "READY") {
    disposition = "FAIL — CONTAINMENT";
  } else if (solveMs != null && solveMs > HARD_CEILING_MS) disposition = "FAIL — PERFORMANCE";

  const report = {
    scale: "CAP1000",
    disposition,
    path: "durable-enqueue-frozen-B_TYPICAL-frozen-worker-rerun",
    git: {
      repo: "kglaw-Oluseyi/atelier-doclar",
      branch: "main",
      headAtEnqueue: process.env.GIT_HEAD ?? null,
    },
    eventId: EVENT_ID,
    runId,
    application,
    priorHistoricalUntouched: {
      eventId: PRIOR_CAP1000_EVENT,
      runId: PRIOR_CAP1000_RUN,
      statusAfter: priorAfter.rows[0]?.status ?? null,
    },
    corpusSeed: CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL,
    corpusHash,
    corpusLock: CORPUS_LOCK,
    guestCount: 1000,
    preferenceCount: 24,
    requiredObjectiveTiers: required,
    typicalTargetMs: TYPICAL_TARGET_MS,
    hardCeilingMs: HARD_CEILING_MS,
    wallStopLossMs: WALL_STOP_LOSS_MS,
    railway,
    worker: {
      workerId: ready.worker_id,
      claimedBy,
      imageIdentity: ready.image_identity,
      imageDigest: railway.imageDigest,
      sourceSha: railway.sourceSha,
      deploymentId: railway.deploymentId,
      qualifiedMaxGuests: ready.qualified_max_guests,
      concurrency: ready.concurrency_capacity,
    },
    terminal: {
      status,
      productResult: product,
      evidenceGrade,
      progressPhase: terminal.progress_phase,
      faultCode: terminal.fault_code,
      stopReason: terminal.stop_reason,
      attemptCount,
      childInvocationCount,
      solutionsFound: terminal.solutions_found,
      queuedAt: terminal.queued_at,
      startedAt: terminal.started_at,
      sealedAt: terminal.sealed_at,
    },
    a2: {
      childReported: childReportedA2,
      independentlyRecomputed: independentlyRecomputed.preference,
      settlementRecomputed: settlementRecomputedA2,
      present: a2Present,
      match: a2Match,
      noTierMismatch,
      candidateMovementTier: cand?.movement_tier ?? null,
      candidatePreferenceTier: cand?.preference_tier ?? null,
    },
    correctness: {
      seated: seated.length,
      uniqueGuests: guestSet.size,
      uniquePositions: posSet.size,
      expectedSeated: 1000,
      candidateSealed: Boolean(cand?.sealed),
      candidateAssignmentCount: cand?.assignment_count ?? null,
    },
    timings: {
      queueMs,
      claimLatencyMs,
      solveWallMs: solveMs,
      solveWallMsObserved: solveMsObserved,
      totalWallMs: Math.round(performance.now() - started),
      withinTypicalTarget: solveMs != null ? solveMs <= TYPICAL_TARGET_MS : null,
    },
    containment: {
      queueAndLeaseClear: postBusy.rows[0].c === 0 && postLease.rows[0].c === 0,
      leaseCleared: postLease.rows[0].c === 0,
      queueEmpty: postBusy.rows[0].c === 0,
      notAdopted: status !== "ADOPTED",
      workerReadyAfter: workerAfter.rows.length === 1 && workerAfter.rows[0].lifecycle === "READY",
      noAutomaticRetry: attemptCount === 1 && childInvocationCount === 1,
      baselineBefore: { id: BASELINE_ADOPTION, status: "CURRENT", assignmentHash: baselineHashBefore },
      baselineAfter: {
        id: baselineAfter.rows[0]?.id ?? null,
        status: baselineAfter.rows[0]?.status ?? null,
        assignmentHash: baselineAfter.rows[0]?.assignment_hash ?? null,
      },
      baselineUnchanged:
        baselineAfter.rows[0]?.status === "CURRENT" &&
        baselineAfter.rows[0]?.assignment_hash === baselineHashBefore,
    },
    runToDigestBinding: {
      method: "CORRELATED FROM WORKER REGISTRY + RAILWAY DEPLOYMENT + TIMESTAMPS",
      note: "Run claim/seal timestamps correlated with READY worker image_identity and pre-verified Railway deployment digest; digest is not durably written on the run row.",
      runStartedAt: terminal.started_at,
      runSealedAt: terminal.sealed_at,
      workerId: claimedBy,
      workerRegistryImageIdentity: ready.image_identity,
      railwayDeploymentId: railway.deploymentId,
      railwayImageTag: railway.imageIdentity,
      immutableDigest: railway.imageDigest,
      sourceSha: railway.sourceSha,
    },
    note: "Product layout install on exact CAP1000 OOM'd locally; qualification uses locked corpus via durable worker enqueue (same CP-SAT child path).",
    at: new Date().toISOString(),
  };
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  if (disposition !== "PASS") process.exit(2);
} finally {
  await pool.end();
}
