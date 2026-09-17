/**
 * Milestone 4 synthetic journeys A–D (ephemeral Postgres).
 * Real CP-SAT child executions in this file: 0 (probes mocked) to stay within the
 * six-execution milestone budget reserved for optional live smoke.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPlatformMigrations } from "../src/migrations.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledRule,
} from "../src/seating-v2-schemas.js";
import { settleAbnormalInfeasibility } from "../src/cpsat/diagnostics/pipeline.js";
import { executeCounterfactualWhyNot } from "../src/cpsat/diagnostics/counterfactual.js";
import { requestCpsatRunStop } from "../src/cpsat/diagnostics/stop-modes.js";
import { buildInfeasibilityExperience } from "../src/cpsat/diagnostics/experience.js";
import { CPSAT_REQUEST_CONTRACT, CPSAT_MODEL_VERSION } from "../src/cpsat/contract.js";
import type { CpsatSolveRequest } from "../src/cpsat/compiler.js";
import type { FeasibilityProbe } from "../src/cpsat/diagnostics/models.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `cpsat_m4j_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M4_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M4_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;
const EVENT = "00000000-0000-4000-8000-00000000m4j1";
const ORG = "00000000-0000-4000-8000-00000000orj4";

let pool: pg.Pool;
const tok = (l: string) => createHash("md5").update(l).digest("hex");

function rule(partial: Partial<SeatingV2CompiledRule> & Pick<SeatingV2CompiledRule, "kind" | "subjectTokens">): SeatingV2CompiledRule {
  return {
    contentHash: exactHash(partial),
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    tableTokens: [],
    zoneCodes: [],
    capabilityCodes: [],
    positionToken: null,
    ...partial,
  };
}

function planningRequest(runId: string): CpsatSolveRequest {
  return {
    contractVersion: CPSAT_REQUEST_CONTRACT,
    modelVersion: CPSAT_MODEL_VERSION,
    runId,
    mode: "REPLAY",
    seed: 3,
    purpose: "PLANNING",
    tables: [{ i: 0, capacity: 2, token: tok("jt1") }],
    seats: [
      { i: 0, table: 0, token: tok("jp1"), attrs: [] },
      { i: 1, table: 0, token: tok("jp2"), attrs: [] },
    ],
    guests: [
      { i: 0, token: tok("jg1"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
      { i: 1, token: tok("jg2"), eligible: true, attrs: [], lockedSeat: null, lockedTable: null },
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
    limits: { maxTimeSeconds: 5, workers: 1, wallSeconds: 15 },
    movementTolerance: 0,
    closureHash: "c".repeat(64),
    indexMapHash: "i".repeat(64),
    unsupportedHardRules: [],
  };
}

async function insertRun(client: pg.PoolClient, runId: string, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO cpsat_solver_runs (
       id, event_id, organisation_id, priority, status, mode, purpose, seed,
       request_hash, created_at, updated_at, freshness, cancel_requested, stop_and_keep_best,
       solutions_found, incumbent_present, diagnostic_only
     ) VALUES ($1,$2,$3,'PLANNING',$4,'REPLAY','PLANNING',1,$5,$6,$6,'CURRENT',FALSE,FALSE,$7,$8,FALSE)`,
    [
      runId,
      EVENT,
      ORG,
      String(extra.status ?? "CLAIMED"),
      "rh".padEnd(64, "b"),
      now,
      Number(extra.solutions_found ?? 0),
      Boolean(extra.incumbent_present ?? false),
    ],
  );
}

before(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
  pool = new pg.Pool({ connectionString: TEST_URL });
  const client = await pool.connect();
  try {
    const adapt = {
      query: (text: string, params?: unknown[]) => client.query(text, params),
      transaction: async <T>(fn: (tx: { query: typeof client.query }) => Promise<T>) => {
        await client.query("BEGIN");
        try {
          const result = await fn({ query: (t, p) => client.query(t, p) });
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
      },
    };
    await runPlatformMigrations(adapt);
  } finally {
    client.release();
  }
});

after(async () => {
  await pool?.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.end();
});

describe("M4 Journey A — static certified conflict", () => {
  it("certifies without Python and surfaces correction guidance", async () => {
    const client = await pool.connect();
    try {
      const runId = randomUUID();
      await insertRun(client, runId);
      const g1 = tok("jag1");
      const g2 = tok("jag2");
      const authored: SeatingV2CompiledRequest = {
        contract: SEATING_V2_SOLVER_CONTRACT,
        version: SEATING_V2_SOLVER_VERSION,
        configHash: exactHash({ ja: 1 }),
        seed: "1",
        guests: [
          { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
          { token: g2, eligible: true, capabilityCodes: [], groupTokens: [] },
        ],
        positions: [
          { token: tok("jap1"), tableToken: tok("jat1"), zoneCodes: [], capabilityCodes: [] },
          { token: tok("jap2"), tableToken: tok("jat1"), zoneCodes: [], capabilityCodes: [] },
        ],
        rules: [
          rule({ kind: "KEEP_TOGETHER", subjectTokens: [g1, g2] }),
          rule({ kind: "KEEP_APART", subjectTokens: [g1, g2] }),
        ],
        reservations: [],
      };
      const probe: FeasibilityProbe = async () => ({ status: "INFEASIBLE" });
      const result = await settleAbnormalInfeasibility({
        client,
        runId,
        authored,
        request: planningRequest(runId),
        probe,
        allowLockRelaxation: false,
        staticOnly: true,
      });
      assert.equal(result.evidenceGrade, "CERTIFIED");
      assert.equal(result.certificate?.type, "APART_WITHIN_UNIT");
      const exp = buildInfeasibilityExperience({
        productResult: "INFEASIBLE",
        evidenceGrade: "CERTIFIED",
        certificate: result.certificate,
        mcs: result.mcs,
        roleCanSeeRestricted: true,
      });
      assert.match(exp.primaryMessage, /conflict is shown below/);
      assert.ok((result.mcs?.correctionRules.length ?? 0) >= 1);
    } finally {
      client.release();
    }
  });
});

describe("M4 Journey B — full-model infeasible + confirmation + MCS/MAXSEAT", () => {
  it("confirmation + diagnostics; diagnostic plan not adoptable", async () => {
    const client = await pool.connect();
    try {
      const runId = randomUUID();
      await insertRun(client, runId);
      const authored: SeatingV2CompiledRequest = {
        contract: SEATING_V2_SOLVER_CONTRACT,
        version: SEATING_V2_SOLVER_VERSION,
        configHash: exactHash({ jb: 1 }),
        seed: "2",
        guests: [
          { token: tok("jbg1"), eligible: true, capabilityCodes: [], groupTokens: [] },
          { token: tok("jbg2"), eligible: true, capabilityCodes: [], groupTokens: [] },
        ],
        positions: [
          { token: tok("jbp1"), tableToken: tok("jbt1"), zoneCodes: [], capabilityCodes: [] },
          { token: tok("jbp2"), tableToken: tok("jbt1"), zoneCodes: [], capabilityCodes: [] },
        ],
        rules: [],
        reservations: [],
      };
      let probes = 0;
      const probe: FeasibilityProbe = async ({ purpose }) => {
        probes += 1;
        if (purpose === "DIAG_MAXSEAT") {
          return { status: "OPTIMAL", assignments: [{ guest: 0, table: 0, seat: 0 }], maxSeated: 1 };
        }
        if (purpose === "DIAG_MCS") {
          return { status: "FEASIBLE", assignments: [
            { guest: 0, table: 0, seat: 0 },
            { guest: 1, table: 0, seat: 1 },
          ] };
        }
        return { status: "INFEASIBLE" };
      };
      const result = await settleAbnormalInfeasibility({
        client,
        runId,
        authored,
        request: planningRequest(runId),
        probe,
        allowLockRelaxation: false,
        staticOnly: false,
      });
      assert.equal(result.productResult, "INFEASIBLE");
      assert.equal(result.evidenceGrade, "SOLVER_PROOF");
      assert.ok(result.mcs);
      assert.ok(result.maxSeat);
      assert.equal(result.maxSeat.diagnosticOnly, true);
      assert.ok(probes >= 2); // confirmation + diagnostics
      const row = await client.query(
        `SELECT r.confirmation_result, i.evidence_grade
         FROM cpsat_solver_runs r
         LEFT JOIN cpsat_solver_infeasibility i ON i.run_id = r.id
         WHERE r.id = $1`,
        [runId],
      );
      assert.equal(row.rows[0]?.confirmation_result, "INFEASIBLE");
      assert.equal(row.rows[0]?.evidence_grade, "SOLVER_PROOF");
    } finally {
      client.release();
    }
  });
});

describe("M4 Journey C — stop and keep best request", () => {
  it("KEEP_BEST persists stop_mode with incumbent present", async () => {
    const client = await pool.connect();
    try {
      const runId = randomUUID();
      await insertRun(client, runId, { status: "RUNNING", solutions_found: 1, incumbent_present: true });
      const summary = await requestCpsatRunStop(client, {
        eventId: EVENT,
        runId,
        mode: "KEEP_BEST",
        actor: { personId: "planner-j", roleKey: "PLANNER", permissions: ["seating.run.execute"] },
      });
      assert.equal(summary.cancelRequested, true);
      const row = await client.query(
        `SELECT stop_mode, cancel_requested, solutions_found FROM cpsat_solver_runs WHERE id = $1`,
        [runId],
      );
      assert.equal(row.rows[0]?.stop_mode, "KEEP_BEST");
      assert.equal(row.rows[0]?.cancel_requested, true);
      assert.ok(Number(row.rows[0]?.solutions_found) >= 1);
    } finally {
      client.release();
    }
  });
});

describe("M4 Journey D — counterfactual why-not", () => {
  it("persists verified response; candidate identity unchanged", async () => {
    const client = await pool.connect();
    try {
      const runId = randomUUID();
      await insertRun(client, runId, { status: "READY_FOR_REVIEW" });
      const g1 = tok("jdg1");
      const t1 = tok("jdt1");
      const t2 = tok("jdt2");
      const authored: SeatingV2CompiledRequest = {
        contract: SEATING_V2_SOLVER_CONTRACT,
        version: SEATING_V2_SOLVER_VERSION,
        configHash: exactHash({ jd: 1 }),
        seed: "4",
        guests: [{ token: g1, eligible: true, capabilityCodes: [], groupTokens: [] }],
        positions: [
          { token: tok("jdp1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
          { token: tok("jdp2"), tableToken: t2, zoneCodes: [], capabilityCodes: [] },
        ],
        rules: [rule({ kind: "FORBID_TABLE", subjectTokens: [g1], tableTokens: [t2] })],
        reservations: [],
      };
      const assignmentHash = "C".padEnd(64, "7");
      const result = await executeCounterfactualWhyNot(
        client,
        {
          eventId: EVENT,
          organisationId: ORG,
          runId,
          candidateId: runId,
          guestToken: g1,
          tableToken: t2,
          actor: { personId: "dir-1", roleKey: "EVENT_DIRECTOR", permissions: ["seating.view"] },
          sealedAssignmentHash: assignmentHash,
          layoutHash: "L".padEnd(64, "1"),
          rulesHash: "R".padEnd(64, "2"),
          guestEditionHash: "G".padEnd(64, "3"),
          objectiveEditionHash: "O".padEnd(64, "4"),
          authored,
          currentLayoutHash: "L".padEnd(64, "1"),
          currentRulesHash: "R".padEnd(64, "2"),
          currentGuestEditionHash: "G".padEnd(64, "3"),
          currentObjectiveEditionHash: "O".padEnd(64, "4"),
        },
        async () => ({ status: "INFEASIBLE" }),
      );
      assert.equal(result.resultCode, "PROHIBITED_VISIBLE_RULE");
      assert.equal(result.diagnosticOnly, true);
      const cf = await client.query(`SELECT candidate_assignment_hash, diagnostic_only FROM cpsat_solver_counterfactuals WHERE id = $1`, [
        result.id,
      ]);
      assert.equal(cf.rows[0]?.candidate_assignment_hash, assignmentHash);
      assert.equal(cf.rows[0]?.diagnostic_only, true);
    } finally {
      client.release();
    }
  });
});
