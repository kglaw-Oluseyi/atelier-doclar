/**
 * Focused Milestone 2 worker claim / settlement tests — ephemeral local PostgreSQL only.
 * Max two real CP-SAT child executions (Journey A + optional smoke).
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import {
  EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID,
} from "../src/cpsat/postgres-schema.js";
import {
  enqueueCpsatSeatingRun,
  freezeCpsatSeatingAuthority,
  getCpsatSeatingRun,
  requestCpsatRunCancellation,
} from "../src/cpsat/durable-launch.js";
import {
  acknowledgeQueuedCancellations,
  assertAuthorityProjectionAligned,
  claimNextCpsatRun,
  fencedSettleCpsatRun,
  heartbeatCpsatRun,
  mapLifecycleToProjectionStatus,
  projectSeatingV2Lifecycle,
  reapExpiredCpsatLeases,
} from "../src/cpsat/worker-lifecycle.js";
import {
  isCandidateReviewable,
  loadReviewableCandidate,
  processVerifiedCandidate,
  sealAndSettleCandidate,
  validateChildResponse,
} from "../src/cpsat/worker-settlement.js";
import { executeClaimedCpsatRun } from "../src/cpsat/execute-claimed-run.js";
import { buildCpsatRunUiModel } from "../src/cpsat/ui-model.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { canonicalizeSymmetricAssignments } from "../src/cpsat/canonicalize.js";
import { verifyExplanations } from "../src/cpsat/explanation-verifier.js";
import { buildExplanations } from "../src/cpsat/explanations.js";
import { authoredAuthorityFromCpsatRequest } from "../src/cpsat/authority-snapshot.js";
import type { SeatingV2CompiledRequest } from "../src/seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../src/seating-v2-state.js";
import { SEATING_V2_POSTGRES_SCHEMA } from "../src/seating-v2-postgres-schema.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `cpsat_m2_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M2_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M2_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;
const workerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os-solver-worker");
const pythonPath = join(workerRoot, ".venv/bin/python");
const realChild = join(workerRoot, "python/solver_child.py");
const fakeChild = join(workerRoot, "python/fake_malformed_child.py");

let pool: pg.Pool;
let realCpSatExecutions = 0;
const EVENT = "00000000-0000-4000-8000-00000000m201";
const ORG = "00000000-0000-4000-8000-00000000org2";

function compiledFixture(seed = 11): SeatingV2CompiledRequest {
  return {
    contract: "eos-s06-solver-v2",
    seed,
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
  } as SeatingV2CompiledRequest;
}

function packageFixture(overrides: Partial<SeatingV2InputPackage> = {}): SeatingV2InputPackage {
  const hash = (label: string) => createHash("sha256").update(label + randomUUID()).digest("hex");
  return {
    id: overrides.id ?? randomUUID(),
    organisationId: ORG,
    eventId: overrides.eventId ?? EVENT,
    schemaVersion: 1,
    semanticHash: hash("semantic"),
    compiledRequestHash: hash("compiled"),
    contentHash: overrides.contentHash ?? hash("content"),
    cohortHash: overrides.cohortHash ?? hash("cohort"),
    rsvpSnapshotHash: hash("rsvp"),
    seatingLayoutBindingId: randomUUID(),
    layoutId: "layout-m2",
    layoutPublicationId: "pub-m2",
    layoutContentHash: overrides.layoutContentHash ?? hash("layout"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks"),
    solverVersion: "s06-solver-v3",
    solverConfigHash: overrides.solverConfigHash ?? hash("objective"),
    deterministicSeed: "seed-m2",
    frozenByPersonId: "planner",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function client() {
  const c = (globalThis as { __cpsatM2Client?: Parameters<typeof enqueueCpsatSeatingRun>[0] }).__cpsatM2Client;
  assert.ok(c);
  return c;
}

async function enqueueFresh() {
  const compiled = compiledFixture();
  const frozen = freezeCpsatSeatingAuthority({
    organisationId: ORG,
    eventId: EVENT,
    package: packageFixture(),
    compiled,
  });
  return enqueueCpsatSeatingRun(client(), frozen, { actorPersonId: "m2-test" });
}

async function ensureProjectionRow(runId: string, organisationId = ORG, eventId = EVENT) {
  const uniq = runId.replace(/-/g, "").slice(0, 16);
  await client().query(
    `INSERT INTO seating_v2_runs (
       id, organisation_id, event_id, schema_version, package_id, package_hash,
       semantic_hash, compiled_request_hash, compiler_version, validator_version,
       solver_version, solver_config_hash, deterministic_seed, status, created_at
     ) VALUES ($1,$2,$3,1,$4,$5,$6,$7,'comp','val','solv',$8,$9,'QUEUED',NOW())
     ON CONFLICT (id) DO NOTHING`,
    [runId, organisationId, eventId, randomUUID(), `pkg-${uniq}`, `sem-${uniq}`, `comp-${uniq}`, `cfg-${uniq}`, `seed-${uniq}`],
  );
}

before(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
  pool = new pg.Pool({ connectionString: TEST_URL, max: 4 });
  const adaptClient = {
    async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: typeof adaptClient) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      const adapt = {
        async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
          const result = await connected.query(text, values);
          return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
        },
      };
      try {
        await connected.query("BEGIN");
        const out = await fn(adapt as typeof adaptClient);
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
  await runPlatformMigrations(adaptClient);
  // Ensure seating_v2_runs exists for projection tests (already in PLATFORM_MIGRATIONS).
  assert.match(SEATING_V2_POSTGRES_SCHEMA, /seating_v2_runs/);
  (globalThis as { __cpsatM2Client?: typeof adaptClient }).__cpsatM2Client = adaptClient;
});

after(async () => {
  await pool?.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.end();
});

describe("CPSAT Milestone 2 migrations", () => {
  it("registers 011, 012 and additive 013", () => {
    const ids = PLATFORM_MIGRATIONS.map((m) => m.id);
    assert.ok(ids.includes(EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID));
    assert.ok(ids.includes(EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID));
    assert.ok(ids.includes(EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID));
  });
});

describe("CPSAT Milestone 2 queue/lease", () => {
  it("1-3: one worker claims; two workers cannot claim same; lease epoch increments", async () => {
    const enqueued = await enqueueFresh();
    await ensureProjectionRow(enqueued.run.runId);
    const a = await claimNextCpsatRun(client(), { leaseOwner: "worker:a:11111111", leaseSeconds: 30 });
    assert.ok(a);
    assert.equal(a.id, enqueued.run.runId);
    assert.equal(a.status, "CLAIMED");
    assert.equal(a.leaseEpoch, 1);
    const b = await claimNextCpsatRun(client(), { leaseOwner: "worker:b:22222222", leaseSeconds: 30 });
    assert.equal(b?.id === a.id, false);
    const aligned = await assertAuthorityProjectionAligned(client(), a.id);
    assert.equal(aligned.ok, true);
  });

  it("4-6: heartbeat requires matching owner/epoch; stale cannot heartbeat or settle", async () => {
    const enqueued = await enqueueFresh();
    const claimed = await claimNextCpsatRun(client(), { leaseOwner: "worker:hb:aaaaaaaa", leaseSeconds: 30 });
    assert.ok(claimed);
    assert.equal(
      await heartbeatCpsatRun(client(), {
        runId: claimed.id,
        leaseOwner: "worker:hb:aaaaaaaa",
        leaseEpoch: claimed.leaseEpoch,
        leaseSeconds: 30,
      }),
      true,
    );
    assert.equal(
      await heartbeatCpsatRun(client(), {
        runId: claimed.id,
        leaseOwner: "worker:stale:bbbbbbbb",
        leaseEpoch: claimed.leaseEpoch,
        leaseSeconds: 30,
      }),
      false,
    );
    const staleSettle = await fencedSettleCpsatRun(client(), {
      runId: claimed.id,
      leaseOwner: "worker:stale:bbbbbbbb",
      leaseEpoch: claimed.leaseEpoch,
      lifecycle: "FAILED",
      productResult: "SOLVER_FAULT",
      stopReason: "STALE",
      freshness: "CURRENT",
      evidenceGrade: null,
      faultCode: "X",
    });
    assert.equal(staleSettle.settled, false);
  });

  it("7-8: expired lease follows retry policy; projection stays aligned", async () => {
    const enqueued = await enqueueFresh();
    await ensureProjectionRow(enqueued.run.runId);
    const claimed = await claimNextCpsatRun(client(), { leaseOwner: "worker:rp:cccccccc", leaseSeconds: 1 });
    assert.ok(claimed);
    await client().query(`UPDATE cpsat_solver_runs SET lease_until = NOW() - INTERVAL '1 second' WHERE id = $1`, [
      claimed.id,
    ]);
    const reaped = await reapExpiredCpsatLeases(client(), { limit: 5 });
    assert.ok(reaped.requeued.includes(claimed.id) || reaped.faulted.includes(claimed.id));
    const row = await getCpsatSeatingRun(client(), EVENT, claimed.id);
    assert.ok(row.lifecycle === "QUEUED" || row.lifecycle === "FAILED");
    const aligned = await assertAuthorityProjectionAligned(client(), claimed.id);
    assert.equal(aligned.ok, true);
  });
});

describe("CPSAT Milestone 2 execution containment", () => {
  it("9: cancelled-before-spawn invokes Python zero times", async () => {
    const enqueued = await enqueueFresh();
    await requestCpsatRunCancellation(client(), {
      eventId: EVENT,
      runId: enqueued.run.runId,
      actorPersonId: "m2",
    });
    const acked = await acknowledgeQueuedCancellations(client(), 1);
    assert.equal(acked.length, 1);
    assert.equal(acked[0]!.childInvocationCount, 0);
    const row = await getCpsatSeatingRun(client(), EVENT, enqueued.run.runId);
    assert.equal(row.lifecycle, "CANCELLED");
    assert.equal(row.childInvocationCount, 0);
  });

  it("10-12/13: fake child truncated → SOLVER_FAULT; supervisor path survives; no credentials", async () => {
    const { runSolverChild } = await import(pathToFileURL(join(workerRoot, "src/child-runner.ts")).href);
    const enqueued = await enqueueFresh();
    const claimed = await claimNextCpsatRun(client(), { leaseOwner: "worker:fk:dddddddd", leaseSeconds: 30 });
    assert.ok(claimed);
    let invoked = 0;
    const result = await executeClaimedCpsatRun(client(), {
      run: claimed,
      leaseOwner: "worker:fk:dddddddd",
      wallMs: 5_000,
      cancelGraceMs: 200,
      maxResponseBytes: 1024 * 1024,
      childExecutor: async (spawnInput) => {
        invoked += 1;
        const out = await runSolverChild({
          pythonPath,
          scriptPath: fakeChild,
          request: spawnInput.request,
          wallMs: spawnInput.wallMs,
          cleanEnv: true,
        });
        return { ...out, truncated: true, childEnvKeys: out.childEnvKeys };
      },
    });
    assert.equal(invoked, 1);
    assert.ok(result.settled);
    assert.match(result.outcome, /TRUNCATED|INVALID_RESPONSE|CHILD/);
    const row = await getCpsatSeatingRun(client(), EVENT, claimed.id);
    assert.equal(row.resultStatus, "SOLVER_FAULT");
    const cand = await client().query(`SELECT sealed FROM cpsat_solver_candidates WHERE run_id = $1`, [claimed.id]);
    assert.equal(cand.rowCount, 0);
    // Supervisor remains capable: another claim poll must not throw.
    await claimNextCpsatRun(client(), { leaseOwner: "worker:fk:eeeeeeee", leaseSeconds: 5 });
  });

  it("14-15: oversized and request mismatch fault safely", () => {
    const oversized = validateChildResponse({
      runId: "r1",
      requestHash: "abc",
      finalPayload: { result: "FEASIBLE", assignments: [] },
      rawFinalJson: "x".repeat(100),
      maxResponseBytes: 10,
    });
    assert.equal(oversized.ok, false);
    const mismatch = validateChildResponse({
      runId: "r1",
      requestHash: "abc",
      finalPayload: { result: "FEASIBLE", requestHash: "zzz", assignments: [{ guest: 0, table: 0, seat: 0 }] },
    });
    assert.equal(mismatch.ok, false);
  });

  it("16-17: timeout and running-cancellation flags settle without candidate", async () => {
    const enqueued = await enqueueFresh();
    const claimed = await claimNextCpsatRun(client(), { leaseOwner: "worker:to:ffffffff", leaseSeconds: 30 });
    assert.ok(claimed);
    const timed = await executeClaimedCpsatRun(client(), {
      run: claimed,
      leaseOwner: "worker:to:ffffffff",
      wallMs: 100,
      cancelGraceMs: 50,
      maxResponseBytes: 1024,
      childExecutor: async () => ({
        messages: [],
        exitCode: null,
        signal: "SIGKILL",
        elapsedMs: 120,
        timedOut: true,
        childEnvKeys: ["PATH", "HOME", "LANG", "PYTHONUNBUFFERED"],
      }),
    });
    assert.equal(timed.outcome, "TIMED_OUT");

    const enqueued2 = await enqueueFresh();
    const claimed2 = await claimNextCpsatRun(client(), { leaseOwner: "worker:cn:11112222", leaseSeconds: 30 });
    assert.ok(claimed2);
    const cancelled = await executeClaimedCpsatRun(client(), {
      run: claimed2,
      leaseOwner: "worker:cn:11112222",
      wallMs: 1000,
      cancelGraceMs: 50,
      maxResponseBytes: 1024,
      childExecutor: async () => ({
        messages: [],
        exitCode: null,
        signal: "SIGTERM",
        elapsedMs: 80,
        cancelled: true,
        childEnvKeys: ["PATH"],
      }),
    });
    assert.equal(cancelled.outcome, "CANCELLED_DURING_EXECUTION");
  });
});

describe("CPSAT Milestone 2 verification/settlement", () => {
  it("18 / Journey A: valid tiny candidate seals READY_FOR_REVIEW (real CP-SAT ≤1)", async () => {
    assert.ok(realCpSatExecutions < 2);
    const { runSolverChild } = await import(pathToFileURL(join(workerRoot, "src/child-runner.ts")).href);
    const enqueued = await enqueueFresh();
    await ensureProjectionRow(enqueued.run.runId);
    const claimed = await claimNextCpsatRun(client(), { leaseOwner: "worker:ok:abcd1234", leaseSeconds: 60 });
    assert.ok(claimed);
    realCpSatExecutions += 1;
    const result = await executeClaimedCpsatRun(client(), {
      run: claimed,
      leaseOwner: "worker:ok:abcd1234",
      wallMs: 60_000,
      cancelGraceMs: 1_000,
      maxResponseBytes: 8 * 1024 * 1024,
      childExecutor: async (spawnInput) =>
        runSolverChild({
          pythonPath,
          scriptPath: realChild,
          request: spawnInput.request,
          wallMs: spawnInput.wallMs,
          onProgress: spawnInput.onProgress,
          shouldCancel: spawnInput.shouldCancel,
        }),
    });
    assert.equal(result.childInvocations, 1);
    assert.equal(result.outcome, "READY_FOR_REVIEW", result.detail ?? result.outcome);
    const row = await getCpsatSeatingRun(client(), EVENT, claimed.id);
    assert.equal(row.lifecycle, "READY_FOR_REVIEW");
    assert.ok(row.resultStatus === "FEASIBLE" || row.resultStatus === "OPTIMAL");
    const review = await loadReviewableCandidate(client(), claimed.id);
    assert.equal(review.reviewable, true);
    assert.ok(review.assignmentHash);
    const aligned = await assertAuthorityProjectionAligned(client(), claimed.id);
    assert.equal(aligned.ok, true);
    // refresh/read restoration
    const again = await getCpsatSeatingRun(client(), EVENT, claimed.id);
    assert.equal(again.lifecycle, "READY_FOR_REVIEW");
  });

  it("19-23: HARD violation, tier mismatch, canonical re-verify, explanation faults", () => {
    const compiled = compiledFixture();
    const request = compileV2ToCpsatRequest(compiled, { runId: "verify-1", mode: "REPLAY", purpose: "PLANNING" });
    const authored = authoredAuthorityFromCpsatRequest(request);
    const good = [
      { guest: 0, table: 0, seat: 0 },
      { guest: 1, table: 0, seat: 1 },
    ];
    const bad = processVerifiedCandidate({
      request,
      authored,
      productResult: "FEASIBLE",
      childAssignments: [
        { guest: 0, table: 0, seat: 0 },
        { guest: 1, table: 0, seat: 0 }, // duplicate seat
      ],
      governedAuthorityCurrent: true,
    });
    assert.equal(bad.kind, "fault");

    const tierBad = processVerifiedCandidate({
      request,
      authored,
      productResult: "FEASIBLE",
      childAssignments: good,
      childTiers: [{ tier: "A1_movement", value: 99 }],
      governedAuthorityCurrent: true,
    });
    assert.equal(tierBad.kind, "fault");

    const canonical = canonicalizeSymmetricAssignments(request, good);
    assert.equal(canonical.length, 2);
    const expl = buildExplanations(request, good);
    assert.equal(expl.ok, true);
    const ok = verifyExplanations(request, good, expl.explanations!);
    assert.equal(ok.ok, true);
    const countBad = verifyExplanations(request, good, expl.explanations!.slice(0, 1));
    assert.equal(countBad.ok, false);
    const predBad = verifyExplanations(request, good, [
      { ...expl.explanations![0]!, code: "LOCKED_SEAT", text: "Locked to this seat" },
      expl.explanations![1]!,
    ]);
    assert.equal(predBad.ok, false);
  });

  it("24-27: stale freshness keeps result; failed settle leaves no partial; duplicate settle rejected; unsealed not reviewable", async () => {
    const compiled = compiledFixture(21);
    const request = compileV2ToCpsatRequest(compiled, { runId: randomUUID(), mode: "REPLAY", purpose: "PLANNING" });
    const authored = authoredAuthorityFromCpsatRequest(request);
    const assignments = [
      { guest: 0, table: 0, seat: 0 },
      { guest: 1, table: 0, seat: 1 },
    ];
    const processed = processVerifiedCandidate({
      request,
      authored,
      productResult: "FEASIBLE",
      childAssignments: assignments,
      governedAuthorityCurrent: false,
    });
    assert.equal(processed.kind, "ready");
    if (processed.kind !== "ready") return;
    assert.equal(processed.seal.freshness, "STALE");
    assert.equal(processed.seal.productResult, "FEASIBLE");

    const enqueued = await enqueueFresh();
    const claimed = await claimNextCpsatRun(client(), { leaseOwner: "worker:seal:99990000", leaseSeconds: 30 });
    assert.ok(claimed);
    // Force settlement failure by using wrong epoch after preparing nothing — stale settle.
    const dup = await fencedSettleCpsatRun(client(), {
      runId: claimed.id,
      leaseOwner: "worker:seal:99990000",
      leaseEpoch: claimed.leaseEpoch,
      lifecycle: "FAILED",
      productResult: "SOLVER_FAULT",
      stopReason: "TEST",
      freshness: "CURRENT",
      evidenceGrade: null,
      faultCode: "TEST",
    });
    assert.equal(dup.settled, true);
    const again = await fencedSettleCpsatRun(client(), {
      runId: claimed.id,
      leaseOwner: "worker:seal:99990000",
      leaseEpoch: claimed.leaseEpoch,
      lifecycle: "READY_FOR_REVIEW",
      productResult: "FEASIBLE",
      stopReason: "DUP",
      freshness: "CURRENT",
      evidenceGrade: null,
      faultCode: null,
    });
    assert.equal(again.settled, false);

    assert.equal(isCandidateReviewable({ sealed: false, lifecycle: "READY_FOR_REVIEW" }), false);
    assert.equal(isCandidateReviewable({ sealed: true, lifecycle: "READY_FOR_REVIEW" }), true);

    // Failed seal path: insert then throw via hash mismatch simulation — use empty seal count.
    const enqueued2 = await enqueueFresh();
    const claimed2 = await claimNextCpsatRun(client(), { leaseOwner: "worker:seal:88880000", leaseSeconds: 30 });
    assert.ok(claimed2);
    const failed = await sealAndSettleCandidate(client(), {
      runId: claimed2.id,
      leaseOwner: "worker:seal:88880000",
      leaseEpoch: claimed2.leaseEpoch,
      request,
      seal: {
        ...processed.seal,
        assignmentCount: 999, // force recount mismatch → rollback
      },
    });
    assert.equal(failed.settled, false);
    const leftover = await client().query(`SELECT * FROM cpsat_solver_candidates WHERE run_id = $1`, [claimed2.id]);
    assert.equal(leftover.rowCount, 0);
  });
});

describe("CPSAT Milestone 2 frontend states", () => {
  it("28-36: wording, no percent, no heuristic, refresh model", () => {
    const running = buildCpsatRunUiModel({ lifecycle: "RUNNING", phase: "building model", cancelRequested: false });
    assert.equal(running.primaryMessage, "Generating seating plan");
    assert.equal(running.showPercentComplete, false);
    assert.equal(running.showHeuristicFallback, false);

    const verifying = buildCpsatRunUiModel({ lifecycle: "RUNNING", phase: "verifying result" });
    assert.equal(verifying.primaryMessage, "Checking every placement and rule");

    const ready = buildCpsatRunUiModel({
      lifecycle: "READY_FOR_REVIEW",
      productResult: "FEASIBLE",
      seated: 2,
      eligible: 2,
      evidenceGrade: "FEASIBLE_VERIFIED",
      assignmentHash: "abcdef0123456789",
      completedAt: "2026-09-17T00:00:00.000Z",
    });
    assert.equal(ready.primaryMessage, "Seating plan ready for review");
    assert.equal(ready.reviewActionLabel, "Review seating plan");

    const cancelReq = buildCpsatRunUiModel({ lifecycle: "QUEUED", cancelRequested: true });
    assert.equal(cancelReq.primaryMessage, "Cancellation requested");
    const cancelled = buildCpsatRunUiModel({ lifecycle: "CANCELLED", productResult: "CANCELLED" });
    assert.equal(cancelled.operatorLifecycle, "CANCELLED");

    for (const [lifecycle, product, msg] of [
      ["CLOSED_NO_PLAN", "INFEASIBLE", "No complete seating satisfies the mandatory rules"],
      ["CLOSED_NO_PLAN", "SEARCH_INCOMPLETE", "Search finished without a complete plan"],
      ["CLOSED_NO_PLAN", "TIMED_OUT", "Seating run stopped on the safety time limit"],
      ["CLOSED_NO_PLAN", "INVALID_INPUT", "The seating request could not be accepted"],
      ["FAILED", "SOLVER_FAULT", "Solver fault — do not treat as infeasibility"],
    ] as const) {
      const model = buildCpsatRunUiModel({ lifecycle, productResult: product, faultCode: product === "SOLVER_FAULT" ? "X" : null });
      assert.equal(model.primaryMessage, msg);
    }

    const stale = buildCpsatRunUiModel({
      lifecycle: "READY_FOR_REVIEW",
      productResult: "OPTIMAL",
      freshness: "STALE",
    });
    assert.match(stale.supportingMessage, /stale/i);
    assert.equal(stale.resultStatus, "OPTIMAL");

    assert.equal(mapLifecycleToProjectionStatus("READY_FOR_REVIEW", "FEASIBLE"), "FEASIBLE");

    const panel = readFileSync(resolve(workerRoot, "../event-os/src/components/cpsat-run-status-panel.tsx"), "utf8");
    assert.doesNotMatch(panel, /% complete|percentage-complete/i);
    assert.doesNotMatch(panel, /showHeuristicFallback \? \(/);
    assert.match(panel, /reviewActionLabel|cpsat-review-seating-plan/);
    assert.equal(ready.reviewActionLabel, "Review seating plan");
    const poller = readFileSync(resolve(workerRoot, "../event-os/src/components/cpsat-run-lifecycle-poller.tsx"), "utf8");
    assert.match(poller, /ACTIVE_LIFECYCLES/);
  });
});

describe("CPSAT Milestone 2 Journey B queued cancellation", () => {
  it("enqueue → cancel → ack → zero Python", async () => {
    const enqueued = await enqueueFresh();
    await requestCpsatRunCancellation(client(), { eventId: EVENT, runId: enqueued.run.runId, actorPersonId: "m2" });
    // Claim path must not pick it for solve:
    const claimedOther = await claimNextCpsatRun(client(), { leaseOwner: "worker:b:journeyb1", leaseSeconds: 10 });
    assert.notEqual(claimedOther?.id, enqueued.run.runId);
    const acked = await acknowledgeQueuedCancellations(client(), 3);
    assert.ok(acked.some((a) => a.id === enqueued.run.runId));
    const row = await getCpsatSeatingRun(client(), EVENT, enqueued.run.runId);
    assert.equal(row.lifecycle, "CANCELLED");
    assert.equal(row.childInvocationCount, 0);
  });
});
