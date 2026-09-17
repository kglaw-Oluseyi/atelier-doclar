/**
 * Milestone 3 — review / maker-checker / adoption (ephemeral local PostgreSQL).
 * Uses synthetic sealed candidates — no new CP-SAT child solves.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import {
  EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_REVIEW_ADOPTION_MIGRATION_ID,
} from "../src/cpsat/postgres-schema.js";
import { seatingV2AssignmentsHash } from "../src/seating-v2-hash.js";
import { CPSAT_MODEL_VERSION, CPSAT_REQUEST_CONTRACT, CPSAT_ORTOOLS_VERSION } from "../src/cpsat/contract.js";
import {
  adoptApprovedCpsatCandidate,
  decideCpsatCandidateApproval,
  getCpsatCandidateReview,
  submitCpsatCandidateForApproval,
  type CpsatGovernedAuthoritySnapshot,
} from "../src/cpsat/review-adoption.js";
import { assertAuthorityProjectionAligned } from "../src/cpsat/worker-lifecycle.js";
import { PlatformError } from "../src/errors.js";
import type { CpsatSolveRequest } from "../src/cpsat/compiler.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `cpsat_m3_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M3_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M3_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: pg.Pool;
const EVENT = "00000000-0000-4000-8000-00000000m301";
const ORG = "00000000-0000-4000-8000-00000000org3";
const OTHER_EVENT = "00000000-0000-4000-8000-00000000m399";

const LAYOUT = "layout-hash-" + "a".repeat(48);
const RULES = "rules-hash-" + "b".repeat(49);
const GUESTS = "guest-hash-" + "c".repeat(49);
const OBJECTIVE = "objective-hash-" + "d".repeat(45);
const BASELINE = "NO_BASELINE";

function authority(overrides: Partial<CpsatGovernedAuthoritySnapshot> = {}): CpsatGovernedAuthoritySnapshot {
  return {
    layoutHash: LAYOUT,
    rulesHash: RULES,
    guestEditionHash: GUESTS,
    objectiveEditionHash: OBJECTIVE,
    baselinePlanHash: null,
    holderEpoch: 0,
    ...overrides,
  };
}

function planner(personId = "planner-maker-1") {
  return {
    personId,
    roleKey: "PLANNER",
    permissions: ["seating.view", "seating.plan.submit", "seating.plan.edit"] as const,
  };
}
function director(personId = "director-checker-1") {
  return {
    personId,
    roleKey: "EVENT_DIRECTOR",
    permissions: ["seating.view", "seating.plan.approve"] as const,
  };
}
function ceo(personId = "ceo-adopter-1") {
  return {
    personId,
    roleKey: "CEO",
    permissions: [
      "seating.view",
      "seating.plan.submit",
      "seating.plan.approve",
      "seating.plan.publish",
      "seating.plan.edit",
    ] as const,
  };
}
function auditor(personId = "auditor-1") {
  return {
    personId,
    roleKey: "READ_ONLY_AUDITOR",
    permissions: ["seating.view"] as const,
  };
}

function requestFixture(runId: string): CpsatSolveRequest {
  return {
    contractVersion: CPSAT_REQUEST_CONTRACT,
    modelVersion: CPSAT_MODEL_VERSION,
    runId,
    mode: "REPLAY",
    seed: 7,
    purpose: "PLANNING",
    tables: [{ i: 0, capacity: 2, token: "t1".padEnd(32, "b") }],
    seats: [
      { i: 0, table: 0, token: "p1".padEnd(32, "a"), attrs: [] },
      { i: 1, table: 0, token: "p2".padEnd(32, "c"), attrs: [] },
    ],
    guests: [
      { i: 0, token: "g1".padEnd(32, "0"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 1, token: "g2".padEnd(32, "1"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
    ],
    units: [
      { i: 0, members: [0], domainTables: [0] },
      { i: 1, members: [1], domainTables: [0] },
    ],
    togetherPairs: [],
    apartPairs: [],
    requireTable: [],
    forbidTable: [],
    reservations: [],
    preferences: [],
    baseline: [],
    limits: { maxTimeSeconds: 5, workers: 1, wallSeconds: 10 },
    movementTolerance: 0,
    closureHash: createHash("sha256").update("closure").digest("hex"),
    indexMapHash: createHash("sha256").update("index").digest("hex"),
    unsupportedHardRules: [],
  };
}

async function insertSealedCandidate(input: {
  runId: string;
  eventId?: string;
  sealed?: boolean;
  lifecycle?: string;
  productResult?: string;
  freshness?: string;
  hashOverride?: string;
  countOverride?: number;
  omitAssignment?: boolean;
}): Promise<{ assignmentHash: string; count: number }> {
  const eventId = input.eventId ?? EVENT;
  const runId = input.runId;
  const request = requestFixture(runId);
  const assignments = [
    {
      guestToken: request.guests[0]!.token,
      state: "SEATED" as const,
      positionToken: request.seats[0]!.token,
      typedReasonCodes: ["GLOBAL"],
    },
    {
      guestToken: request.guests[1]!.token,
      state: "SEATED" as const,
      positionToken: request.seats[1]!.token,
      typedReasonCodes: ["GLOBAL"],
    },
  ];
  const assignmentHash = input.hashOverride ?? seatingV2AssignmentsHash(assignments);
  const count = input.countOverride ?? 2;
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO cpsat_solver_runs (
       id, event_id, organisation_id, package_id, priority, status, mode, purpose, seed,
       request_hash, freshness, evidence_grade, product_result, model_version, engine_ortools,
       created_at, updated_at, sealed_at, layout_hash, rules_hash, guest_edition_hash,
       objective_edition_hash, baseline_plan_hash, request_json
     ) VALUES (
       $1,$2,$3,$4,'PLANNING',$5,'REPLAY','PLANNING',7,$6,$7,'FEASIBLE_VERIFIED',$8,$9,$10,
       $11,$11,$11,$12,$13,$14,$15,$16,$17::jsonb
     )`,
    [
      runId,
      eventId,
      ORG,
      randomUUID(),
      input.lifecycle ?? "READY_FOR_REVIEW",
      createHash("sha256").update(runId).digest("hex"),
      input.freshness ?? "CURRENT",
      input.productResult ?? "FEASIBLE",
      CPSAT_MODEL_VERSION,
      CPSAT_ORTOOLS_VERSION,
      now,
      LAYOUT,
      RULES,
      GUESTS,
      OBJECTIVE,
      BASELINE,
      JSON.stringify(request),
    ],
  );
  await pool.query(
    `INSERT INTO cpsat_solver_candidates (
       run_id, sealed, assignment_hash, assignment_count, sealed_at, product_result,
       movement_tier, preference_tier, verification_payload
     ) VALUES ($1,$2,$3,$4,NOW(),$5,0,NULL,$6::jsonb)`,
    [
      runId,
      input.sealed !== false,
      assignmentHash,
      count,
      input.productResult ?? "FEASIBLE",
      JSON.stringify({
        tiers: { movement: 0, preference: 0 },
        tierVerification: {
          required: { movement: false, preferences: false },
          present: { A1_movement: false, A2_preferences: false },
          ok: true,
        },
      }),
    ],
  );
  if (!input.omitAssignment) {
    for (const a of assignments) {
      await pool.query(
        `INSERT INTO cpsat_solver_assignments (run_id, guest_token, position_token, table_token, state, reason_code)
         VALUES ($1,$2,$3,$4,'SEATED',$5)`,
        [runId, a.guestToken, a.positionToken, request.tables[0]!.token, a.typedReasonCodes[0]],
      );
      await pool.query(
        `INSERT INTO cpsat_solver_explanations (run_id, guest_token, code, text, evidence, edition)
         VALUES ($1,$2,'GLOBAL','Seated under global optimisation', '{}'::jsonb, 'cpsat-explain-v1')`,
        [runId, a.guestToken],
      );
    }
  }
  await pool.query(
    `INSERT INTO seating_v2_runs (
       id, organisation_id, event_id, schema_version, package_id, package_hash, semantic_hash,
       compiled_request_hash, compiler_version, solver_version, solver_config_hash, validator_version,
       deterministic_seed, status, created_at
     ) VALUES (
       $1,$2,$3,1,$4,'ph','sh','ch','cv','sv','sch','vv',7,'FEASIBLE',$5
     ) ON CONFLICT (id) DO NOTHING`,
    [runId, ORG, eventId, randomUUID(), now],
  ).catch(() => undefined);
  return { assignmentHash, count };
}

before(async () => {
  const admin = new pg.Pool({ connectionString: ADMIN_URL });
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
  pool = new pg.Pool({ connectionString: TEST_URL });
  const client = {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: typeof client) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      const adapt = {
        async query<T extends object>(text: string, values?: unknown[]) {
          const result = await connected.query(text, values);
          return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
        },
      };
      try {
        await connected.query("BEGIN");
        const out = await fn(adapt as typeof client);
        await connected.query("COMMIT");
        return out;
      } catch (e) {
        await connected.query("ROLLBACK");
        throw e;
      } finally {
        connected.release();
      }
    },
  };
  const report = await runPlatformMigrations(client);
  assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID));
  assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID));
  assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID));
  assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_REVIEW_ADOPTION_MIGRATION_ID));
  void PLATFORM_MIGRATIONS;
});

after(async () => {
  await pool?.end();
  const admin = new pg.Pool({ connectionString: ADMIN_URL });
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.end();
});

describe("CPSAT Milestone 3 review and adoption", () => {
  it("1 sealed candidate review succeeds", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const review = await getCpsatCandidateReview(pool, {
      eventId: EVENT,
      runId,
      actor: planner(),
      currentAuthority: authority(),
    });
    assert.equal(review.assignmentHash, assignmentHash);
    assert.equal(review.lifecycle, "READY_FOR_REVIEW");
    assert.equal(review.seatedGuestCount, 2);
    assert.equal(review.placements.length, 2);
    assert.ok(review.placements.every((p) => p.reasonText.length > 0));
  });

  it("2 unsealed candidate review rejected", async () => {
    const runId = randomUUID();
    await insertSealedCandidate({ runId, sealed: false });
    await assert.rejects(
      () => getCpsatCandidateReview(pool, { eventId: EVENT, runId, actor: planner() }),
      (e: unknown) => e instanceof PlatformError && e.code === "TRANSITION_INVALID",
    );
  });

  it("3 candidate row-count mismatch rejected", async () => {
    const runId = randomUUID();
    await insertSealedCandidate({ runId, countOverride: 99 });
    await assert.rejects(
      () => getCpsatCandidateReview(pool, { eventId: EVENT, runId, actor: planner() }),
      (e: unknown) => e instanceof PlatformError && e.code === "VERSION_CONFLICT",
    );
  });

  it("4 candidate hash mismatch rejected", async () => {
    const runId = randomUUID();
    await insertSealedCandidate({ runId, hashOverride: "deadbeef".repeat(8) });
    await assert.rejects(
      () => getCpsatCandidateReview(pool, { eventId: EVENT, runId, actor: planner() }),
      (e: unknown) => e instanceof PlatformError && e.code === "VERSION_CONFLICT",
    );
  });

  it("5 cross-event review returns safe not-found", async () => {
    const runId = randomUUID();
    await insertSealedCandidate({ runId });
    await assert.rejects(
      () => getCpsatCandidateReview(pool, { eventId: OTHER_EVENT, runId, actor: planner() }),
      (e: unknown) => e instanceof PlatformError && e.code === "NOT_FOUND",
    );
  });

  it("6 role redaction enforced for auditor", async () => {
    const runId = randomUUID();
    await insertSealedCandidate({ runId });
    const review = await getCpsatCandidateReview(pool, {
      eventId: EVENT,
      runId,
      actor: auditor(),
      guestDisplayNames: { ["g1".padEnd(32, "0")]: "Secret Guest" },
    });
    assert.ok(review.placements.every((p) => p.displayName == null));
    assert.equal(review.actions.canSubmit, false);
    assert.equal(review.actions.canApprove, false);
    assert.equal(review.actions.canAdopt, false);
  });

  it("7-9 submit binds hash; idempotent; changed hash cannot reuse", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const first = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner("maker-a"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    assert.equal(first.application, "APPLIED");
    assert.equal(first.lifecycle, "PENDING_APPROVAL");
    const second = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner("maker-a"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    assert.equal(second.application, "REPLAYED");
    assert.equal(second.proposalId, first.proposalId);
    await assert.rejects(
      () =>
        submitCpsatCandidateForApproval(pool, {
          eventId: EVENT,
          runId,
          candidateId: runId,
          assignmentHash: "ff".repeat(32),
          actor: planner("maker-a"),
          organisationId: ORG,
          currentAuthority: authority(),
        }),
      (e: unknown) => e instanceof PlatformError,
    );
  });

  it("10 maker cannot approve", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const submitted = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner("same-maker"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await assert.rejects(
      () =>
        decideCpsatCandidateApproval(pool, {
          eventId: EVENT,
          runId,
          candidateId: runId,
          assignmentHash,
          proposalId: submitted.proposalId,
          decision: "APPROVED",
          actor: { ...planner("same-maker"), permissions: ["seating.view", "seating.plan.approve"] },
          currentAuthority: authority(),
        }),
      (e: unknown) => e instanceof PlatformError && e.code === "FORBIDDEN",
    );
  });

  it("11 unauthorised role cannot approve", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const submitted = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner(),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await assert.rejects(
      () =>
        decideCpsatCandidateApproval(pool, {
          eventId: EVENT,
          runId,
          candidateId: runId,
          assignmentHash,
          proposalId: submitted.proposalId,
          decision: "APPROVED",
          actor: auditor(),
          currentAuthority: authority(),
        }),
      (e: unknown) => e instanceof PlatformError && e.code === "FORBIDDEN",
    );
  });

  it("12-13 checker can reject with reason; candidate untouched", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const submitted = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner("m-rej"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    const decided = await decideCpsatCandidateApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      proposalId: submitted.proposalId,
      decision: "REJECTED",
      reason: "Protocol table conflict",
      actor: director("d-rej"),
      currentAuthority: authority(),
    });
    assert.equal(decided.lifecycle, "REJECTED");
    const cand = await pool.query(`SELECT sealed, assignment_hash FROM cpsat_solver_candidates WHERE run_id = $1`, [runId]);
    assert.equal(cand.rows[0].sealed, true);
    assert.equal(cand.rows[0].assignment_hash, assignmentHash);
    const rows = await pool.query(`SELECT COUNT(*)::int AS n FROM cpsat_solver_assignments WHERE run_id = $1`, [runId]);
    assert.equal(rows.rows[0].n, 2);
  });

  it("14 valid approval succeeds", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const submitted = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner("m-ok"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    const decided = await decideCpsatCandidateApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      proposalId: submitted.proposalId,
      decision: "APPROVED",
      actor: director("d-ok"),
      currentAuthority: authority(),
    });
    assert.equal(decided.lifecycle, "APPROVED");
  });

  it("15 stale candidate cannot submit", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    await assert.rejects(
      () =>
        submitCpsatCandidateForApproval(pool, {
          eventId: EVENT,
          runId,
          candidateId: runId,
          assignmentHash,
          actor: planner(),
          organisationId: ORG,
          currentAuthority: authority({ layoutHash: "changed-layout" }),
        }),
      (e: unknown) => e instanceof PlatformError && e.code === "TRANSITION_INVALID",
    );
    const run = await pool.query(`SELECT freshness FROM cpsat_solver_runs WHERE id = $1`, [runId]);
    assert.equal(run.rows[0].freshness, "STALE");
    assert.equal((await pool.query(`SELECT product_result FROM cpsat_solver_runs WHERE id = $1`, [runId])).rows[0].product_result, "FEASIBLE");
  });

  it("Journey A — successful adoption + Journey C stale after approval", async () => {
    const runId = randomUUID();
    const { assignmentHash } = await insertSealedCandidate({ runId });
    const submitted = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      actor: planner("journey-maker"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await decideCpsatCandidateApproval(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      assignmentHash,
      proposalId: submitted.proposalId,
      decision: "APPROVED",
      actor: director("journey-checker"),
      currentAuthority: authority(),
    });
    const adopted = await adoptApprovedCpsatCandidate(pool, {
      eventId: EVENT,
      runId,
      candidateId: runId,
      approvalId: submitted.proposalId,
      assignmentHash,
      actor: ceo("journey-ceo"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    assert.equal(adopted.application, "APPLIED");
    assert.ok(adopted.adoptionId);
    const pointer = await pool.query(`SELECT current_adoption_id FROM cpsat_solver_authority_pointers WHERE event_id = $1`, [EVENT]);
    assert.equal(pointer.rows[0].current_adoption_id, adopted.adoptionId);
    const aligned = await assertAuthorityProjectionAligned(pool, runId);
    assert.equal(aligned.ok, true);

    // Prior publication preservation under failed successor
    const run2 = randomUUID();
    const sealed2 = await insertSealedCandidate({ runId: run2 });
    const sub2 = await submitCpsatCandidateForApproval(pool, {
      eventId: EVENT,
      runId: run2,
      candidateId: run2,
      assignmentHash: sealed2.assignmentHash,
      actor: planner("maker-2"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await decideCpsatCandidateApproval(pool, {
      eventId: EVENT,
      runId: run2,
      candidateId: run2,
      assignmentHash: sealed2.assignmentHash,
      proposalId: sub2.proposalId,
      decision: "APPROVED",
      actor: director("checker-2"),
      currentAuthority: authority(),
    });
    await assert.rejects(
      () =>
        adoptApprovedCpsatCandidate(pool, {
          eventId: EVENT,
          runId: run2,
          candidateId: run2,
          approvalId: sub2.proposalId,
          assignmentHash: sealed2.assignmentHash,
          actor: ceo("ceo-2"),
          organisationId: ORG,
          currentAuthority: authority({ rulesHash: "mutated-rules", holderEpoch: 1 }),
        }),
      (e: unknown) => e instanceof PlatformError && e.code === "TRANSITION_INVALID",
    );
    const pointerAfter = await pool.query(`SELECT current_adoption_id FROM cpsat_solver_authority_pointers WHERE event_id = $1`, [
      EVENT,
    ]);
    assert.equal(pointerAfter.rows[0].current_adoption_id, adopted.adoptionId);
    const prior = await pool.query(`SELECT status FROM cpsat_solver_adoptions WHERE id = $1`, [adopted.adoptionId]);
    assert.equal(prior.rows[0].status, "CURRENT");
  });

  it("17-18 prior adoption superseded on valid successor", async () => {
    const eventId = "00000000-0000-4000-8000-00000000m318";
    const runA = randomUUID();
    const a = await insertSealedCandidate({ runId: runA, eventId });
    const subA = await submitCpsatCandidateForApproval(pool, {
      eventId,
      runId: runA,
      candidateId: runA,
      assignmentHash: a.assignmentHash,
      actor: planner("mA"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await decideCpsatCandidateApproval(pool, {
      eventId,
      runId: runA,
      candidateId: runA,
      assignmentHash: a.assignmentHash,
      proposalId: subA.proposalId,
      decision: "APPROVED",
      actor: director("cA"),
      currentAuthority: authority(),
    });
    const adoptA = await adoptApprovedCpsatCandidate(pool, {
      eventId,
      runId: runA,
      candidateId: runA,
      approvalId: subA.proposalId,
      assignmentHash: a.assignmentHash,
      actor: ceo("ceoA"),
      organisationId: ORG,
      currentAuthority: authority(),
    });

    const runB = randomUUID();
    const b = await insertSealedCandidate({ runId: runB, eventId });
    const subB = await submitCpsatCandidateForApproval(pool, {
      eventId,
      runId: runB,
      candidateId: runB,
      assignmentHash: b.assignmentHash,
      actor: planner("mB"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await decideCpsatCandidateApproval(pool, {
      eventId,
      runId: runB,
      candidateId: runB,
      assignmentHash: b.assignmentHash,
      proposalId: subB.proposalId,
      decision: "APPROVED",
      actor: director("cB"),
      currentAuthority: authority({ holderEpoch: 1 }),
    });
    const adoptB = await adoptApprovedCpsatCandidate(pool, {
      eventId,
      runId: runB,
      candidateId: runB,
      approvalId: subB.proposalId,
      assignmentHash: b.assignmentHash,
      actor: ceo("ceoB"),
      organisationId: ORG,
      currentAuthority: authority({ holderEpoch: 1 }),
    });
    assert.equal(adoptB.supersededAdoptionId, adoptA.adoptionId);
    const aRow = await pool.query(`SELECT status FROM cpsat_solver_adoptions WHERE id = $1`, [adoptA.adoptionId]);
    assert.equal(aRow.rows[0].status, "SUPERSEDED");
    const bRow = await pool.query(`SELECT status, version FROM cpsat_solver_adoptions WHERE id = $1`, [adoptB.adoptionId]);
    assert.equal(bRow.rows[0].status, "CURRENT");
    assert.equal(Number(bRow.rows[0].version), 2);
  });

  it("20 concurrent adoption race produces one winner", async () => {
    const eventId = "00000000-0000-4000-8000-00000000m320";
    const runId = randomUUID();
    const sealed = await insertSealedCandidate({ runId, eventId });
    const sub = await submitCpsatCandidateForApproval(pool, {
      eventId,
      runId,
      candidateId: runId,
      assignmentHash: sealed.assignmentHash,
      actor: planner("race-m"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await decideCpsatCandidateApproval(pool, {
      eventId,
      runId,
      candidateId: runId,
      assignmentHash: sealed.assignmentHash,
      proposalId: sub.proposalId,
      decision: "APPROVED",
      actor: director("race-c"),
      currentAuthority: authority(),
    });
    const client = {
      async query<T extends object>(text: string, values?: unknown[]) {
        const result = await pool.query(text, values);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
      },
      async transaction<T>(fn: (q: typeof client) => Promise<T>): Promise<T> {
        const connected = await pool.connect();
        const adapt = {
          async query<T extends object>(text: string, values?: unknown[]) {
            const result = await connected.query(text, values);
            return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
          },
        };
        try {
          await connected.query("BEGIN");
          const out = await fn(adapt as typeof client);
          await connected.query("COMMIT");
          return out;
        } catch (e) {
          await connected.query("ROLLBACK");
          throw e;
        } finally {
          connected.release();
        }
      },
    };
    const results = await Promise.allSettled([
      adoptApprovedCpsatCandidate(client, {
        eventId,
        runId,
        candidateId: runId,
        approvalId: sub.proposalId,
        assignmentHash: sealed.assignmentHash,
        actor: ceo("race-ceo-1"),
        organisationId: ORG,
        currentAuthority: authority(),
      }),
      adoptApprovedCpsatCandidate(client, {
        eventId,
        runId,
        candidateId: runId,
        approvalId: sub.proposalId,
        assignmentHash: sealed.assignmentHash,
        actor: ceo("race-ceo-2"),
        organisationId: ORG,
        currentAuthority: authority(),
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    assert.ok(fulfilled.length >= 1);
    const currents = await pool.query(
      `SELECT COUNT(*)::int AS n FROM cpsat_solver_adoptions WHERE event_id = $1 AND status = 'CURRENT'`,
      [eventId],
    );
    assert.equal(currents.rows[0].n, 1);
  });

  it("21 duplicate adoption is idempotent", async () => {
    const eventId = "00000000-0000-4000-8000-00000000m321";
    const runId = randomUUID();
    const sealed = await insertSealedCandidate({ runId, eventId });
    const sub = await submitCpsatCandidateForApproval(pool, {
      eventId,
      runId,
      candidateId: runId,
      assignmentHash: sealed.assignmentHash,
      actor: planner("dup-m"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    await decideCpsatCandidateApproval(pool, {
      eventId,
      runId,
      candidateId: runId,
      assignmentHash: sealed.assignmentHash,
      proposalId: sub.proposalId,
      decision: "APPROVED",
      actor: director("dup-c"),
      currentAuthority: authority(),
    });
    const first = await adoptApprovedCpsatCandidate(pool, {
      eventId,
      runId,
      candidateId: runId,
      approvalId: sub.proposalId,
      assignmentHash: sealed.assignmentHash,
      actor: ceo("dup-ceo"),
      organisationId: ORG,
      currentAuthority: authority(),
    });
    const second = await adoptApprovedCpsatCandidate(pool, {
      eventId,
      runId,
      candidateId: runId,
      approvalId: sub.proposalId,
      assignmentHash: sealed.assignmentHash,
      actor: ceo("dup-ceo"),
      organisationId: ORG,
      currentAuthority: authority({ holderEpoch: 1 }),
    });
    assert.equal(second.application, "REPLAYED");
    assert.equal(second.adoptionId, first.adoptionId);
  });
});
