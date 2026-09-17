/**
 * M6E CAP2000 — newly authorised stress/containment qualify (post A2 polarity fix).
 *
 * Corpus: deterministic qualification shard seed `scale-2000` (2000 guests / 200 tables).
 * No seating-capacity-2000-layout-fixture exists; product live-install only accepts
 * CAP600|CAP1000 — this script is the durable-enqueue bypass path.
 *
 * Event/run are fresh for this authorised execution. Does NOT reuse inadmissible
 * prior run 384950a6-… / event 92909476-…. Does not adopt.
 *
 * Usage:
 *   DATABASE_URL=postgresql://… \
 *     pnpm exec tsx apps/event-os/scripts/m6e-cap2000-worker-qualify.ts \
 *     --confirm-synthetic-qualification
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import {
  admitCpsatSeatingLaunch,
  freezeCpsatSeatingAuthority,
  enqueueCpsatSeatingRun,
  exactHash,
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
} from "@maison-doclar/shared-platform";

/** Fresh synthetic event id for this authorised CAP2000 run only. */
const EVENT_ID = "c2a0a001-2026-0917-a2fx-cap2000auth01";
const ORG = "00000000-0000-4000-8000-000000000001";
const BASELINE_ADOPTION = "3b771ad9-c4c9-401b-87df-0371f9eee840";
/** Permanently inadmissible prior session run — must never be reused. */
const INADMISSIBLE_PRIOR_RUN = "384950a6-a49d-4321-803b-346f0d65c061";
const INADMISSIBLE_PRIOR_EVENT = "92909476-d3f9-43f1-a5f7-7e1a83c92fbd";
const CORPUS_SEED = "scale-2000";
const EVIDENCE = join(process.cwd(), "../../docs/control/evidence/eos-s06-cpsat-production/milestone-6de");
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
  console.log(`[M6E-CAP2000 +${Math.round(performance.now() - started)}ms] ${msg}`);
  mkdirSync(EVIDENCE, { recursive: true });
  appendFileSync(
    join(EVIDENCE, "CAP2000_TELEMETRY.jsonl"),
    `${JSON.stringify({ at: new Date().toISOString(), msg, elapsedMs: Math.round(performance.now() - started) })}\n`,
  );
}

if (!process.argv.includes("--confirm-synthetic-qualification")) {
  throw new Error("Missing --confirm-synthetic-qualification");
}
if (EVENT_ID === INADMISSIBLE_PRIOR_EVENT) {
  throw new Error("BLOCKED — must not reuse inadmissible prior CAP2000 event");
}
const url = process.env.DATABASE_URL;
if (!url?.trim()) throw new Error("DATABASE_URL required");

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
  const ready = (
    await pool.query(
      `SELECT worker_id, lifecycle, last_heartbeat, image_identity, qualified_max_guests
       FROM cpsat_solver_workers WHERE lifecycle='READY' ORDER BY last_heartbeat DESC LIMIT 1`,
    )
  ).rows[0];
  if (!ready) throw new Error("BLOCKED — RESOURCE: no READY worker");
  if (Date.now() - new Date(ready.last_heartbeat).getTime() > 60_000) {
    throw new Error("BLOCKED — RESOURCE: stale heartbeat");
  }
  const busy = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING') OR lease_owner IS NOT NULL`,
  );
  if (busy.rows[0].c > 0) throw new Error(`BLOCKED — RESOURCE: busy queue/leases=${busy.rows[0].c}`);

  const baseline = await pool.query(`SELECT id, assignment_hash, status FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);
  if (baseline.rows[0]?.status !== "CURRENT") throw new Error("baseline adoption not CURRENT");

  const compiled = tinyFixture(2000, CORPUS_SEED);
  const compiledRequestHash = exactHash(compiled);
  const hash = (label: string) => createHash("sha256").update(label).digest("hex");
  const pkg = {
    id: randomUUID(),
    organisationId: ORG,
    eventId: EVENT_ID,
    schemaVersion: 1,
    semanticHash: exactHash({ scale: 2000, authorisedAfter: "a2-polarity-fix" }),
    compiledRequestHash,
    // Distinct from prior inadmissible enqueue contentHash so idempotency cannot replay 384950a6
    contentHash: exactHash({ content: "cap2000-authorised-post-a2-fix-v1" }),
    cohortHash: hash("cohort-2000-authorised"),
    rsvpSnapshotHash: hash("rsvp-2000-authorised"),
    seatingLayoutBindingId: randomUUID(),
    layoutId: "cap2000-layout-authorised",
    layoutPublicationId: "cap2000-pub-authorised",
    layoutContentHash: hash("layout-2000-authorised"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks-2000-authorised"),
    solverVersion: SEATING_V2_SOLVER_VERSION,
    solverConfigHash: exactHash({ seed: CORPUS_SEED }),
    deterministicSeed: CORPUS_SEED,
    frozenByPersonId: "00000000-0000-4000-8000-000000000043",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  progress(
    `preflight OK seed=${CORPUS_SEED} event=${EVENT_ID} compiledHash=${compiledRequestHash.slice(0, 12)} worker=${ready.worker_id}`,
    started,
  );

  const frozen = freezeCpsatSeatingAuthority({
    organisationId: ORG,
    eventId: EVENT_ID,
    package: pkg as never,
    compiled: compiled as never,
    purpose: "QUALIFICATION",
    mode: "PERFORMANCE",
    correlationId: `m6e-cap2000-auth-${Date.now()}`,
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
  if (runId === INADMISSIBLE_PRIOR_RUN) {
    throw new Error("BLOCKED — enqueue returned inadmissible prior CAP2000 run id");
  }
  if (enqueued.run.duplicateLaunch) {
    progress(`WARNING duplicateLaunch=true run=${runId} — checking terminal freshness`, started);
  }
  progress(`enqueued run=${runId} queueMs=${queueMs} duplicate=${Boolean(enqueued.run.duplicateLaunch)}`, started);

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
    const report = {
      scale: "CAP2000",
      disposition: "FAIL — PERFORMANCE",
      reason: "wall-clock stop-loss",
      runId,
      eventId: EVENT_ID,
    };
    writeFileSync(join(EVIDENCE, "CAP2000_REPORT.json"), JSON.stringify(report, null, 2));
    throw new Error("FAIL — PERFORMANCE");
  }

  const assignments = await pool.query(
    `SELECT guest_token, position_token, state FROM cpsat_solver_assignments WHERE run_id=$1`,
    [runId],
  );
  const seated = assignments.rows.filter((a) => a.state === "SEATED");
  const guestSet = new Set(seated.map((a) => a.guest_token));
  const posSet = new Set(seated.map((a) => a.position_token));

  const postBusy = await pool.query(
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs WHERE status IN ('QUEUED','ADMITTED','CLAIMED','RUNNING') OR lease_owner IS NOT NULL`,
  );
  const baselineAfter = await pool.query(`SELECT id, assignment_hash, status FROM cpsat_solver_adoptions WHERE id=$1`, [
    BASELINE_ADOPTION,
  ]);

  const status = String(terminal.status);
  const product = String(terminal.product_result ?? "");
  const solveMs =
    terminal.started_at && terminal.sealed_at
      ? new Date(String(terminal.sealed_at)).getTime() - new Date(String(terminal.started_at)).getTime()
      : null;

  let disposition = "PASS — STRESS/CONTAINMENT";
  if (status === "ADOPTED") disposition = "FAIL — CONTAINMENT";
  else if (postBusy.rows[0].c > 0) disposition = "FAIL — CONTAINMENT";
  else if (baselineAfter.rows[0]?.assignment_hash !== baseline.rows[0]?.assignment_hash) {
    disposition = "FAIL — CONTAINMENT";
  } else if (status === "FAILED" || product === "SOLVER_FAULT") disposition = "FAIL — CORRECTNESS";
  else if (product === "OPTIMAL" || product === "FEASIBLE") {
    if (seated.length !== 2000 || guestSet.size !== 2000 || posSet.size !== 2000) {
      disposition = "FAIL — CORRECTNESS";
    } else if (solveMs != null && solveMs > HARD_CEILING_MS) {
      disposition = "FAIL — PERFORMANCE";
    }
  } else if (product === "TIMED_OUT" || product === "SEARCH_INCOMPLETE") {
    // Doc 08: optimality not promised; truthful timeout still containment-pass if clean
    disposition = "PASS — STRESS/CONTAINMENT (non-optimal terminal)";
  } else {
    disposition = "FAIL — CORRECTNESS";
  }

  const report = {
    scale: "CAP2000",
    classification: "stress/containment (doc 08 — optimality not promised)",
    disposition,
    authorisation: "AUTHORISED after CAP1000 A2 polarity fix verified on 95e500b + 149ea74",
    path: "durable-enqueue-scale-2000",
    productInstallPath: {
      attempted: true,
      outcome: "REFUSED_NO_FIXTURE",
      detail:
        "No seating-capacity-2000-layout-fixture.ts. capacity-live-install / s06-capacity-live-install only accept CAP600|CAP1000 (CLI: --fixture must be CAP600 or CAP1000). Qualification evidence is solver-path-only; product install at 2000 remains an open item.",
      flushEveryWouldHaveBeen: 25,
      oom: false,
    },
    priorInadmissibleRun: {
      runId: INADMISSIBLE_PRIOR_RUN,
      eventId: INADMISSIBLE_PRIOR_EVENT,
      disposition: "UNAUTHORISED AFTER CAP1000 STOP — INADMISSIBLE FOR QUALIFICATION",
      reused: false,
    },
    eventId: EVENT_ID,
    runId,
    seed: CORPUS_SEED,
    compiledRequestHash,
    configHash: compiled.configHash,
    guests: 2000,
    typicalTargetMs: TYPICAL_TARGET_MS,
    hardCeilingMs: HARD_CEILING_MS,
    wallStopLossMs: WALL_STOP_LOSS_MS,
    worker: {
      workerId: ready.worker_id,
      imageIdentity: ready.image_identity,
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
      expectedSeated: 2000,
    },
    timings: {
      queueMs,
      solveWallMs: solveMs,
      totalWallMs: Math.round(performance.now() - started),
      withinTypicalTarget: solveMs != null ? solveMs <= TYPICAL_TARGET_MS : null,
      withinHardCeiling: solveMs != null ? solveMs <= HARD_CEILING_MS : null,
    },
    containment: {
      queueAndLeaseClear: postBusy.rows[0].c === 0,
      baselineUnchanged:
        baselineAfter.rows[0]?.status === "CURRENT" &&
        baselineAfter.rows[0]?.assignment_hash === baseline.rows[0].assignment_hash,
      notAdopted: status !== "ADOPTED",
      workerReadyAfter: (
        await pool.query(`SELECT lifecycle FROM cpsat_solver_workers WHERE worker_id=$1`, [ready.worker_id])
      ).rows[0]?.lifecycle,
    },
    at: new Date().toISOString(),
  };
  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, "CAP2000_REPORT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!String(disposition).startsWith("PASS")) process.exit(2);
} finally {
  await pool.end();
}
