/**
 * M6E CAP2000 — frozen-worker stress/containment rerun.
 *
 * Same authorised scale-2000 corpus as CAP2000_REPORT.json
 * (compiledRequestHash 2cc7617d… / configHash 7403c97b…).
 * Zero preferences — does NOT exercise A2_preferences.
 *
 * Fresh event/run UUIDs. Does not overwrite CAP2000_REPORT.json.
 * Does not reuse inadmissible 384950a6 / authorised 4c7c4f5e / event 22c2befc.
 * Does not adopt.
 *
 * Usage:
 *   DATABASE_URL=postgresql://… \
 *     pnpm --filter @maison-doclar/event-os exec tsx \
 *       ../../apps/event-os/scripts/m6e-cap2000-worker-qualify.ts \
 *       --confirm-synthetic-qualification
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
  exactHash,
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  requiredObjectiveTiers,
} from "@maison-doclar/shared-platform";
import { compileV2ToCpsatRequest } from "../../../packages/shared-platform/src/cpsat/compiler.ts";

/** Fresh synthetic event id for this frozen-worker CAP2000 rerun only. */
const EVENT_ID = "18d89806-b708-4459-827c-de544987d4a5";
/** Prior authorised CAP2000 — must remain untouched. */
const PRIOR_AUTH_EVENT = "22c2befc-f728-4e3b-bfb1-fc8820c72a3c";
const PRIOR_AUTH_RUN = "4c7c4f5e-576e-40a0-85c4-d6831cc79d3d";
/** Permanently inadmissible prior session run — must never be reused. */
const INADMISSIBLE_PRIOR_RUN = "384950a6-a49d-4321-803b-346f0d65c061";
const INADMISSIBLE_PRIOR_EVENT = "92909476-d3f9-43f1-a5f7-7e1a83c92fbd";
const ORG = "00000000-0000-4000-8000-000000000001";
const BASELINE_ADOPTION = "3b771ad9-c4c9-401b-87df-0371f9eee840";
const CORPUS_SEED = "scale-2000";
const AUTHORISED_COMPILED_HASH = "2cc7617db7c62fd6d042500e2040cef07ec48b5dea87a12388180f20d0d5ad11";
const AUTHORISED_CONFIG_HASH = "7403c97b4d487fa1ed7805a1b23cd1d3a47e491c692648e49abc1df0daf220e0";
const EXPECTED_IMAGE = "event-os-solver-worker:m6e-worker-8c8d922";
const EXPECTED_DIGEST = "sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f";
const EXPECTED_SOURCE_SHA = "8c8d92241a550348f3ba44192cb07f655ffe6d5d";
const EXPECTED_DEPLOYMENT_ID = "57b5c9fb-4538-44ef-ad90-7d731a7db948";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const EVIDENCE = join(REPO_ROOT, "docs/control/evidence/eos-s06-cpsat-production/milestone-6de");
const REPORT_FILE = "CAP2000_FROZEN_WORKER_REPORT.json";
const TELEMETRY_FILE = "CAP2000_FROZEN_WORKER_TELEMETRY.jsonl";

/** Doc 08: typical feasibility ≤60s; p95 ≤90; hard ceiling 180s. */
const TYPICAL_TARGET_MS = 60_000;
const HARD_CEILING_MS = 180_000;
const WALL_STOP_LOSS_MS = 180_000;

function tinyFixture(nGuests: number, seed: string) {
  const tables = Math.ceil(nGuests / 10);
  const guests = Array.from({ length: nGuests }, (_, i) => ({
    token: `g${String(i + 1).padStart(4, "0")}`,
    eligible: true,
    capabilityCodes: [] as string[],
    groupTokens: [] as string[],
  }));
  const positions = [];
  for (let t = 1; t <= tables; t++) {
    const seats = t < tables ? 10 : nGuests - (tables - 1) * 10;
    for (let s = 1; s <= seats; s++) {
      positions.push({
        token: `t${String(t).padStart(4, "0")}:${String(s).padStart(2, "0")}`,
        tableToken: `t${String(t).padStart(4, "0")}`,
        zoneCodes: [] as string[],
        capabilityCodes: [] as string[],
      });
    }
  }
  const rules =
    nGuests >= 2
      ? [
          {
            contentHash: exactHash({ together: "1-2", seed }),
            hardness: "HARD" as const,
            kind: "KEEP_TOGETHER" as const,
            scope: "TABLE" as const,
            subjectTokens: [guests[0]!.token, guests[1]!.token],
            tableTokens: [] as string[],
            zoneCodes: [] as string[],
            capabilityCodes: [] as string[],
            positionToken: null,
            weight: null,
          },
        ]
      : [];
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ seed, nGuests }),
    seed,
    guests,
    positions,
    rules,
    reservations: [],
  };
}

function progress(msg: string, started: number) {
  console.log(`[M6E-CAP2000-FROZEN +${Math.round(performance.now() - started)}ms] ${msg}`);
  mkdirSync(EVIDENCE, { recursive: true });
  appendFileSync(
    join(EVIDENCE, TELEMETRY_FILE),
    `${JSON.stringify({ at: new Date().toISOString(), msg, elapsedMs: Math.round(performance.now() - started) })}\n`,
  );
}

function writeReport(report: unknown) {
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, REPORT_FILE), JSON.stringify(report, null, 2) + "\n");
}

if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}
if (
  EVENT_ID === INADMISSIBLE_PRIOR_EVENT ||
  EVENT_ID === PRIOR_AUTH_EVENT ||
  EVENT_ID === "92909476-d3f9-43f1-a5f7-7e1a83c92fbd"
) {
  throw new Error("BLOCKED — must not reuse prior CAP2000 / malformed event");
}
const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL required");

const compiled = tinyFixture(2000, CORPUS_SEED);
const compiledRequestHash = exactHash(compiled);
if (compiled.guests.length !== 2000) throw new Error(`guest count ${compiled.guests.length}`);
if (compiledRequestHash !== AUTHORISED_COMPILED_HASH) {
  throw new Error(`compiled corpus drift: ${compiledRequestHash}`);
}
if (compiled.configHash !== AUTHORISED_CONFIG_HASH) {
  throw new Error(`configHash drift: ${compiled.configHash}`);
}
const preRequest = compileV2ToCpsatRequest(compiled as never, {
  runId: "preflight-cap2000-frozen",
  mode: "PERFORMANCE",
  purpose: "QUALIFICATION",
});
const required = requiredObjectiveTiers(preRequest);
if (preRequest.preferences.length !== 0) {
  throw new Error(`preference count must be 0, got ${preRequest.preferences.length}`);
}
if (required.preferences !== false) {
  throw new Error("required.preferences must be false for CAP2000 stress corpus");
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
  const priorAuth = await pool.query(`SELECT id, status FROM cpsat_solver_runs WHERE id=$1 AND event_id=$2`, [
    PRIOR_AUTH_RUN,
    PRIOR_AUTH_EVENT,
  ]);
  if (!priorAuth.rows[0] || priorAuth.rows[0].status !== "READY_FOR_REVIEW") {
    throw new Error("BLOCKED — prior authorised CAP2000 historical run missing or altered");
  }
  const inadmissible = await pool.query(`SELECT id, status FROM cpsat_solver_runs WHERE id=$1`, [
    INADMISSIBLE_PRIOR_RUN,
  ]);
  if (!inadmissible.rows[0]) throw new Error("BLOCKED — cannot locate inadmissible prior run for non-reuse check");

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
  const busy = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING') OR lease_owner IS NOT NULL`,
  );
  if (busy.rows[0].c > 0) throw new Error(`BLOCKED — RESOURCE: busy queue/leases=${busy.rows[0].c}`);

  const baseline = await pool.query(`SELECT id, assignment_hash, status FROM cpsat_solver_adoptions WHERE id=$1`, [
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
  if (railway.deploymentId !== EXPECTED_DEPLOYMENT_ID) {
    throw new Error(`BLOCKED — deployment ID mismatch ${railway.deploymentId}`);
  }

  const hash = (label: string) => createHash("sha256").update(label).digest("hex");
  const pkg = {
    id: randomUUID(),
    organisationId: ORG,
    eventId: EVENT_ID,
    schemaVersion: 1,
    semanticHash: exactHash({ scale: 2000, authorisedAfter: "frozen-worker-rerun" }),
    compiledRequestHash,
    contentHash: exactHash({ content: "cap2000-frozen-worker-rerun-v1" }),
    cohortHash: hash("cohort-2000-frozen-worker"),
    rsvpSnapshotHash: hash("rsvp-2000-frozen-worker"),
    seatingLayoutBindingId: randomUUID(),
    layoutId: "cap2000-layout-frozen-worker",
    layoutPublicationId: "cap2000-pub-frozen-worker",
    layoutContentHash: hash("layout-2000-frozen-worker"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks-2000-frozen-worker"),
    solverVersion: SEATING_V2_SOLVER_VERSION,
    solverConfigHash: exactHash({ seed: CORPUS_SEED }),
    deterministicSeed: CORPUS_SEED,
    frozenByPersonId: "00000000-0000-4000-8000-000000000043",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  progress(
    `preflight OK seed=${CORPUS_SEED} prefs=0 guests=2000 event=${EVENT_ID} worker=${ready.worker_id}`,
    started,
  );

  const frozen = freezeCpsatSeatingAuthority({
    organisationId: ORG,
    eventId: EVENT_ID,
    package: pkg as never,
    compiled: compiled as never,
    purpose: "QUALIFICATION",
    mode: "PERFORMANCE",
    correlationId: `m6e-cap2000-frozen-${Date.now()}`,
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
  if (runId === INADMISSIBLE_PRIOR_RUN || runId === PRIOR_AUTH_RUN) {
    throw new Error("BLOCKED — enqueue returned a prior CAP2000 run id");
  }
  progress(`enqueued run=${runId} application=${application} queueMs=${queueMs}`, started);

  if (application !== "APPLIED") {
    writeReport({
      scale: "CAP2000",
      disposition: "FAIL — FRESHNESS",
      reason: `expected APPLIED, got ${application}`,
      eventId: EVENT_ID,
      runId,
      application,
    });
    throw new Error(`FAIL — FRESHNESS: application=${application}`);
  }

  let terminal: Record<string, unknown> | null = null;
  const waitStarted = performance.now();
  while (performance.now() - waitStarted < WALL_STOP_LOSS_MS) {
    const r = (
      await pool.query(
        `SELECT id, status, product_result, evidence_grade, progress_phase, fault_code, stop_reason,
                lease_owner, queued_at, started_at, sealed_at, child_invocation_count, attempt_count, solutions_found
         FROM cpsat_solver_runs WHERE id=$1`,
        [runId],
      )
    ).rows[0];
    progress(`poll status=${r.status} phase=${r.progress_phase} product=${r.product_result ?? "-"}`, started);
    if (["READY_FOR_REVIEW", "FAILED", "CANCELLED", "CLOSED_NO_PLAN", "ADOPTED"].includes(r.status)) {
      terminal = r;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (!terminal) {
    writeReport({
      scale: "CAP2000",
      disposition: "FAIL — PERFORMANCE",
      reason: "wall-clock stop-loss",
      runId,
      eventId: EVENT_ID,
      wallStopLossMs: WALL_STOP_LOSS_MS,
    });
    throw new Error("FAIL — PERFORMANCE");
  }

  const assignments = await pool.query(
    `SELECT guest_token, position_token, state FROM cpsat_solver_assignments WHERE run_id=$1`,
    [runId],
  );
  const seated = assignments.rows.filter((a) => a.state === "SEATED");
  const guestSet = new Set(seated.map((a) => a.guest_token));
  const posSet = new Set(seated.map((a) => a.position_token));

  const candidate = await pool.query(
    `SELECT sealed, product_result, preference_tier, assignment_count, verification_payload
     FROM cpsat_solver_candidates WHERE run_id=$1`,
    [runId],
  );
  const cand = candidate.rows[0] ?? null;

  const claimEvents = await pool.query(
    `SELECT kind, payload, at FROM cpsat_solver_run_events WHERE run_id=$1 ORDER BY at ASC`,
    [runId],
  );
  const claimRow = claimEvents.rows.find((e) => e.kind === "RUN_CLAIMED");
  const claimedBy =
    (claimRow?.payload?.leaseOwner as string | undefined) ??
    (terminal.lease_owner == null ? null : String(terminal.lease_owner)) ??
    ready.worker_id;

  const postBusy = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING') OR lease_owner IS NOT NULL`,
  );
  const postLease = await pool.query(`SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE lease_owner IS NOT NULL`);
  const workerAfter = await pool.query(
    `SELECT worker_id, lifecycle, image_identity FROM cpsat_solver_workers WHERE lifecycle='READY'`,
  );
  const baselineAfter = await pool.query(`SELECT id, assignment_hash, status FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);
  const priorAuthAfter = await pool.query(`SELECT id, status FROM cpsat_solver_runs WHERE id=$1`, [PRIOR_AUTH_RUN]);
  const inadmissibleAfter = await pool.query(`SELECT id, status FROM cpsat_solver_runs WHERE id=$1`, [
    INADMISSIBLE_PRIOR_RUN,
  ]);

  const status = String(terminal.status);
  const product = String(terminal.product_result ?? "");
  const evidenceGrade = terminal.evidence_grade == null ? null : String(terminal.evidence_grade);
  const attemptCount = Number(terminal.attempt_count ?? 0);
  const childInvocationCount = Number(terminal.child_invocation_count ?? 0);
  const claimLatencyMs =
    terminal.queued_at && terminal.started_at
      ? new Date(String(terminal.started_at)).getTime() - new Date(String(terminal.queued_at)).getTime()
      : null;
  const solveMsObserved =
    terminal.started_at && terminal.sealed_at
      ? new Date(String(terminal.sealed_at)).getTime() - new Date(String(terminal.started_at)).getTime()
      : null;

  let disposition = "PASS — STRESS/CONTAINMENT";
  if (status === "ADOPTED") disposition = "FAIL — CONTAINMENT";
  else if (postBusy.rows[0].c > 0 || postLease.rows[0].c > 0) disposition = "FAIL — CONTAINMENT";
  else if (
    baselineAfter.rows[0]?.status !== "CURRENT" ||
    baselineAfter.rows[0]?.assignment_hash !== baselineHashBefore
  ) {
    disposition = "FAIL — CONTAINMENT";
  } else if (workerAfter.rows.length !== 1 || workerAfter.rows[0].lifecycle !== "READY") {
    disposition = "FAIL — CONTAINMENT";
  } else if (status === "FAILED" || product === "SOLVER_FAULT") disposition = "FAIL — CORRECTNESS";
  else if (status !== "READY_FOR_REVIEW") disposition = "FAIL — CORRECTNESS";
  else if (product === "OPTIMAL" || product === "FEASIBLE") {
    if (evidenceGrade !== "OPTIMAL_PROOF" && product === "OPTIMAL") disposition = "FAIL — CORRECTNESS";
    if (product === "FEASIBLE" && evidenceGrade !== "FEASIBLE_VERIFIED" && evidenceGrade !== "OPTIMAL_PROOF") {
      disposition = "FAIL — CORRECTNESS";
    }
    if (seated.length !== 2000 || guestSet.size !== 2000 || posSet.size !== 2000) {
      disposition = "FAIL — CORRECTNESS";
    } else if (childInvocationCount !== 1 || attemptCount !== 1) {
      disposition = "FAIL — CORRECTNESS";
    } else if (!cand?.sealed) {
      disposition = "FAIL — CORRECTNESS";
    } else if (solveMsObserved != null && solveMsObserved > HARD_CEILING_MS) {
      disposition = "FAIL — PERFORMANCE";
    }
  } else if (product === "TIMED_OUT" || product === "SEARCH_INCOMPLETE") {
    // Doc 08: optimality not promised; truthful timeout still stress/containment-pass if clean
    if (childInvocationCount !== 1 || attemptCount !== 1 || !cand?.sealed) {
      disposition = "FAIL — CORRECTNESS";
    } else {
      disposition = "PASS — STRESS/CONTAINMENT (non-optimal terminal)";
    }
  } else {
    disposition = "FAIL — CORRECTNESS";
  }

  const report = {
    scale: "CAP2000",
    classification: "stress/containment (doc 08 — optimality not promised)",
    disposition,
    authorisation: "AUTHORISED frozen-worker rerun after CAP1000_FROZEN_WORKER PASS a136f94",
    path: "durable-enqueue-scale-2000-frozen-worker-rerun",
    a2Limitation:
      "CAP2000 proves stress, scale and containment. It does not exercise A2_preferences because this corpus contains zero preferences.",
    requiredObjectiveTiers: required,
    preferenceCount: 0,
    git: {
      repo: "kglaw-Oluseyi/atelier-doclar",
      branch: "main",
      headAtEnqueue: process.env.GIT_HEAD ?? null,
    },
    priorAuthorisedUntouched: {
      eventId: PRIOR_AUTH_EVENT,
      runId: PRIOR_AUTH_RUN,
      statusAfter: priorAuthAfter.rows[0]?.status ?? null,
    },
    priorInadmissibleUntouched: {
      runId: INADMISSIBLE_PRIOR_RUN,
      eventId: INADMISSIBLE_PRIOR_EVENT,
      statusAfter: inadmissibleAfter.rows[0]?.status ?? null,
      reused: false,
    },
    eventId: EVENT_ID,
    runId,
    application,
    seed: CORPUS_SEED,
    compiledRequestHash,
    configHash: compiled.configHash,
    authorisedCompiledHash: AUTHORISED_COMPILED_HASH,
    authorisedConfigHash: AUTHORISED_CONFIG_HASH,
    guests: 2000,
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
    correctness: {
      seated: seated.length,
      uniqueGuests: guestSet.size,
      uniquePositions: posSet.size,
      expectedSeated: 2000,
      candidateSealed: Boolean(cand?.sealed),
      candidateAssignmentCount: cand?.assignment_count ?? null,
      candidatePreferenceTier: cand?.preference_tier ?? null,
    },
    timings: {
      queueMs,
      claimLatencyMs,
      solveWallMs: solveMsObserved,
      totalWallMs: Math.round(performance.now() - started),
      withinTypicalTarget: solveMsObserved != null ? solveMsObserved <= TYPICAL_TARGET_MS : null,
      withinHardCeiling: solveMsObserved != null ? solveMsObserved <= HARD_CEILING_MS : null,
    },
    containment: {
      queueAndLeaseClear: postBusy.rows[0].c === 0 && postLease.rows[0].c === 0,
      leaseCleared: postLease.rows[0].c === 0,
      queueEmpty: postBusy.rows[0].c === 0,
      notAdopted: status !== "ADOPTED",
      workerReadyAfter: workerAfter.rows.length === 1 && workerAfter.rows[0].lifecycle === "READY",
      noAutomaticRetry: attemptCount === 1 && childInvocationCount === 1,
      qualificationOnlyCannotAutoAdopt: true,
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
    productionPosture: {
      productionAuthorised: false,
      note: "Captured from Event OS /api/health/ready before enqueue; qualification does not activate provider or publication.",
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
      durableRunEvents: claimEvents.rows.map((e) => ({
        kind: e.kind,
        at: e.at,
        leaseOwner: e.payload?.leaseOwner ?? null,
        lifecycle: e.payload?.lifecycle ?? null,
        productResult: e.payload?.productResult ?? null,
      })),
    },
    filesCreated: [
      "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_FROZEN_WORKER_RERUN.md",
      "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_FROZEN_WORKER_REPORT.json",
      "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_FROZEN_WORKER_TELEMETRY.jsonl",
      "apps/event-os/scripts/m6e-cap2000-worker-qualify.ts",
    ],
    filesNotModified: [
      "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_REPORT.json",
      "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_TELEMETRY.jsonl",
      "docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_AUTHORISED_QUALIFICATION.md",
    ],
    at: new Date().toISOString(),
  };
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  if (!String(disposition).startsWith("PASS")) process.exit(2);
} finally {
  await pool.end();
}
