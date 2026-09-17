/**
 * Milestone 4A — real Python CP-SAT child journeys (tiny fixtures only).
 * Hard cap: ≤10 real child executions across this file.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runPlatformMigrations } from "../src/migrations.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledRule,
} from "../src/seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../src/seating-v2-state.js";
import { confirmFullModelInfeasibility } from "../src/cpsat/diagnostics/confirmation.js";
import {
  runDiagCore,
  runDiagMcs,
  runDiagMaxSeat,
  type FeasibilityProbe,
} from "../src/cpsat/diagnostics/models.js";
import {
  createRealChildFeasibilityProbe,
  PRODUCTION_FEASIBILITY_PROBE_FACTORY,
} from "../src/cpsat/diagnostics/real-child-probe.js";
import { executeCounterfactualWhyNot } from "../src/cpsat/diagnostics/counterfactual.js";
import { executeClaimedCpsatRun } from "../src/cpsat/execute-claimed-run.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import { toChildPayload } from "../src/cpsat/child-payload.js";
import { claimNextCpsatRun } from "../src/cpsat/worker-lifecycle.js";
import { enqueueCpsatSeatingRun, freezeCpsatSeatingAuthority } from "../src/cpsat/durable-launch.js";
import { requestCpsatRunStop } from "../src/cpsat/diagnostics/stop-modes.js";
import { CPSAT_ENGINE_EXPECTATION } from "../src/cpsat/durable-launch.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "../../../apps/event-os-solver-worker");
const pythonPath = join(workerRoot, ".venv/bin/python");
const childScript = join(workerRoot, "python/solver_child.py");

const DB_NAME = `cpsat_m4a_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M4A_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M4A_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;
const EVENT = "00000000-0000-4000-8000-00000000m4a1";
const ORG = "00000000-0000-4000-8000-00000000ora4";

let pool: pg.Pool;
let db: {
  query: <T extends object = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
  transaction: <T>(fn: (q: typeof db) => Promise<T>) => Promise<T>;
};
let childExecutions = 0;
const MAX_CHILD = 10;

function tok(label: string): string {
  return createHash("md5").update(label).digest("hex");
}

function rule(
  partial: Partial<SeatingV2CompiledRule> & Pick<SeatingV2CompiledRule, "kind" | "subjectTokens">,
): SeatingV2CompiledRule {
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

/** Two guests, one table (2 seats), KEEP_APART → complete seating infeasible. */
function apartInfeasibleAuthored(): SeatingV2CompiledRequest {
  const g0 = tok("m4a-g0");
  const g1 = tok("m4a-g1");
  const t0 = tok("m4a-t0");
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ m4a: "apart" }),
    seed: "7",
    guests: [
      { token: g0, eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: tok("m4a-p0"), tableToken: t0, zoneCodes: [], capabilityCodes: [] },
      { token: tok("m4a-p1"), tableToken: t0, zoneCodes: [], capabilityCodes: [] },
    ],
    rules: [rule({ kind: "KEEP_APART", subjectTokens: [g0, g1] })],
    reservations: [],
  };
}

function feasibleTinyAuthored(): SeatingV2CompiledRequest {
  const g0 = tok("m4a-fg0");
  const g1 = tok("m4a-fg1");
  const t0 = tok("m4a-ft0");
  const t1 = tok("m4a-ft1");
  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ m4a: "feas" }),
    seed: "11",
    guests: [
      { token: g0, eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: g1, eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: tok("m4a-fp0"), tableToken: t0, zoneCodes: [], capabilityCodes: [] },
      { token: tok("m4a-fp1"), tableToken: t1, zoneCodes: [], capabilityCodes: [] },
    ],
    rules: [],
    reservations: [],
  };
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
    layoutId: "layout-m4a",
    layoutPublicationId: "pub-m4a",
    layoutContentHash: overrides.layoutContentHash ?? hash("layout"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks"),
    solverVersion: "s06-solver-v3",
    solverConfigHash: overrides.solverConfigHash ?? hash("objective"),
    deterministicSeed: "seed-m4a",
    frozenByPersonId: "planner",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function makeChildExecutor() {
  const { runSolverChild } = await import(pathToFileURL(join(workerRoot, "src/child-runner.ts")).href);
  return async (spawnInput: {
    request: Record<string, unknown>;
    wallMs: number;
    cancelGraceMs?: number;
    shouldCancel?: () => Promise<boolean | { mode: "CANCEL" | "KEEP_BEST" }>;
    onProgress?: (phase: string) => void | Promise<void>;
  }) => {
    childExecutions += 1;
    assert.ok(childExecutions <= MAX_CHILD, `exceeded ${MAX_CHILD} real child executions`);
    return runSolverChild({
      pythonPath,
      scriptPath: childScript,
      request: spawnInput.request,
      wallMs: spawnInput.wallMs,
      cancelGraceMs: spawnInput.cancelGraceMs ?? 1_500,
      shouldCancel: spawnInput.shouldCancel,
      onProgress: async (phase) => spawnInput.onProgress?.(phase),
      keepStdinOpen: Boolean(spawnInput.shouldCancel),
    });
  };
}

before(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
  pool = new pg.Pool({ connectionString: TEST_URL, max: 4 });
  db = {
    async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: typeof db) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      const adapt = {
        async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
          const result = await connected.query(text, values);
          return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
        },
      };
      try {
        await connected.query("BEGIN");
        const out = await fn(adapt as typeof db);
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
  await runPlatformMigrations(db);
});

after(async () => {
  await pool?.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.end();
});

describe("CPSAT Milestone 4A real child execution", () => {
  it("20. production construction binds real-child probe factory", () => {
    assert.equal(PRODUCTION_FEASIBILITY_PROBE_FACTORY, createRealChildFeasibilityProbe);
    const src = readFileSync(resolve(__dirname, "../src/cpsat/execute-claimed-run.ts"), "utf8");
    assert.match(src, /createRealChildFeasibilityProbe/);
    assert.doesNotMatch(src, /process\.env\.[A-Z_]*MOCK|process\.env\.[A-Z_]*PROBE/);
  });

  it("A. full-model confirmation uses different seed + real child", async () => {
    const childExecutor = await makeChildExecutor();
    const probe = createRealChildFeasibilityProbe({
      childExecutor,
      wallMs: 15_000,
      cancelGraceMs: 500,
    });
    const authored = apartInfeasibleAuthored();
    const request = compileV2ToCpsatRequest(authored, {
      runId: `m4a-confirm-${randomUUID().slice(0, 8)}`,
      purpose: "PLANNING",
      mode: "REPLAY",
      maxTimeSeconds: 3,
      wallSeconds: 10,
      workers: 1,
    });
    const first = await probe({ purpose: "PLANNING", authored, request, maxTimeSeconds: 3 });
    assert.equal(first.status, "INFEASIBLE");
    const confirmation = await confirmFullModelInfeasibility({
      authored,
      request,
      probe,
      initialResponseHash: exactHash(first),
    });
    assert.equal(confirmation.kind, "CONFIRMED_INFEASIBLE");
    if (confirmation.kind === "CONFIRMED_INFEASIBLE") {
      assert.notEqual(confirmation.confirmationSeed, request.seed);
      assert.equal(confirmation.evidenceGrade, "SOLVER_PROOF");
    }
  });

  it("B/C/D. genuine CORE + MCS + MAXSEAT reach Python", async () => {
    const childExecutor = await makeChildExecutor();
    const probe = createRealChildFeasibilityProbe({
      childExecutor,
      wallMs: 15_000,
      cancelGraceMs: 500,
    });
    const authored = apartInfeasibleAuthored();
    const runId = `m4a-diag-${randomUUID().slice(0, 8)}`;

    const core = await runDiagCore({
      authored,
      probe,
      allowLockRelaxation: false,
      runId: `${runId}-core`,
    });
    assert.equal(core.diagnosticOnly, true);
    assert.ok(core.coreRules.length >= 1, "CORE should cite at least one rule");
    assert.ok(core.coreRules.some((r) => r.kind === "KEEP_APART"));

    const mcs = await runDiagMcs({
      authored,
      probe,
      allowLockRelaxation: false,
      runId: `${runId}-mcs`,
    });
    assert.equal(mcs.diagnosticOnly, true);
    assert.ok(mcs.correctionRules.length >= 1);
    assert.ok(mcs.verifiedCompletePlan || mcs.optimality !== "NONE");
    assert.equal(mcs.diagnosticOnly, true);

    const maxSeat = await runDiagMaxSeat({
      authored,
      probe,
      runId: `${runId}-max`,
    });
    assert.equal(maxSeat.diagnosticOnly, true);
    assert.ok(maxSeat.maxSeatCount !== null);
    assert.ok((maxSeat.maxSeatCount ?? 99) <= 1);
  });

  it("E. counterfactual production path forces table in child request", async () => {
    const childExecutor = await makeChildExecutor();
    const probe = createRealChildFeasibilityProbe({
      childExecutor,
      wallMs: 15_000,
      cancelGraceMs: 500,
    });
    const authored = feasibleTinyAuthored();
    const runId = randomUUID();
    const candidateId = randomUUID();
    const g0 = authored.guests[0]!.token;
    const t1 = [...new Set(authored.positions.map((p) => p.tableToken))].sort()[1]!;
    const h = "b".repeat(64);
    await db.query(
      `INSERT INTO cpsat_solver_runs (
         id, event_id, organisation_id, priority, status, mode, purpose, seed,
         request_hash, created_at, updated_at, freshness, cancel_requested, stop_and_keep_best,
         solutions_found, incumbent_present, diagnostic_only
       ) VALUES ($1,$2,$3,'PLANNING','READY_FOR_REVIEW','REPLAY','PLANNING',1,$4,NOW(),NOW(),'CURRENT',FALSE,FALSE,1,TRUE,FALSE)`,
      [runId, EVENT, ORG, exactHash({ runId })],
    );

    let capturedForce: Record<string, unknown> | null = null;
    const wrappingProbe: FeasibilityProbe = async (input) => {
      const payload = toChildPayload(input.request as Parameters<typeof toChildPayload>[0]);
      if (input.purpose === "COUNTERFACTUAL" || payload.counterfactual) {
        capturedForce = (payload.counterfactual ?? (input.request as { counterfactual?: unknown }).counterfactual) as Record<
          string,
          unknown
        >;
      }
      return probe(input);
    };

    const result = await executeCounterfactualWhyNot(
      db,
      {
        eventId: EVENT,
        organisationId: ORG,
        runId,
        candidateId,
        guestToken: g0,
        tableToken: t1,
        actor: {
          personId: "m4a",
          roleKey: "EVENT_PLANNER",
          permissions: ["seating.view", "seating.run.execute"],
        },
        sealedAssignmentHash: h,
        layoutHash: h,
        rulesHash: h,
        guestEditionHash: h,
        objectiveEditionHash: h,
        authored,
        currentLayoutHash: h,
        currentRulesHash: h,
        currentGuestEditionHash: h,
        currentObjectiveEditionHash: h,
      },
      wrappingProbe,
    );
    assert.equal(result.diagnosticOnly, true);
    assert.ok(capturedForce, "forced table must be present on diagnostic request");
    assert.equal(typeof capturedForce!.tableIndex, "number");
    assert.equal(typeof capturedForce!.guestIndex, "number");
    assert.ok(
      result.resultCode === "FEASIBLE_WITH_TIER_DELTAS" ||
        result.resultCode === "COMPLETE_SEATING_IMPOSSIBLE" ||
        result.resultCode === "SEARCH_INCOMPLETE",
    );
  });

  it("F. KEEP_BEST stop frame seals FEASIBLE + OPERATOR_STOP", async () => {
    const authored = feasibleTinyAuthored();
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: packageFixture(),
      compiled: authored,
    });
    const enqueued = await enqueueCpsatSeatingRun(db, frozen, { actorPersonId: "m4a-kb" });
    const claimed = await claimNextCpsatRun(db, {
      leaseOwner: "worker:m4a:keepbest",
      leaseSeconds: 60,
    });
    assert.ok(claimed);
    assert.equal(claimed.id, enqueued.run.runId);

    let stopArmed = false;
    const result = await executeClaimedCpsatRun(db, {
      run: claimed,
      leaseOwner: "worker:m4a:keepbest",
      wallMs: 25_000,
      cancelGraceMs: 4_000,
      maxResponseBytes: 2 * 1024 * 1024,
      childExecutor: async (spawnInput) => {
        assert.equal("testHooks" in spawnInput.request, false);
        const request = {
          ...spawnInput.request,
          limits: {
            ...(spawnInput.request.limits as object),
            maxTimeSeconds: 10,
            wallSeconds: 20,
          },
        };
        setTimeout(() => {
          void (async () => {
            await db.query(
              `UPDATE cpsat_solver_runs
               SET solutions_found = GREATEST(solutions_found, 1),
                   incumbent_present = TRUE,
                   updated_at = NOW()
               WHERE id = $1`,
              [claimed.id],
            );
            await requestCpsatRunStop(db, {
              eventId: EVENT,
              runId: claimed.id,
              mode: "KEEP_BEST",
              actor: {
                personId: "m4a-kb",
                roleKey: "EVENT_PLANNER",
                permissions: ["seating.run.execute"],
              },
            });
            stopArmed = true;
          })();
        }, 200);
        const { runSolverChild } = await import(pathToFileURL(join(workerRoot, "src/child-runner.ts")).href);
        childExecutions += 1;
        return runSolverChild({
          pythonPath,
          scriptPath: join(workerRoot, "test-only/keep_best_timing_child.py"),
          request,
          wallMs: spawnInput.wallMs,
          cancelGraceMs: 4_000,
          shouldCancel: spawnInput.shouldCancel,
          onProgress: async (phase) => spawnInput.onProgress?.(phase),
          keepStdinOpen: true,
          cleanEnv: true,
        });
      },
    });

    assert.ok(stopArmed, "KEEP_BEST stop must have been requested");
    assert.equal(result.outcome, "KEEP_BEST_READY_FOR_REVIEW");
    const row = await db.query<Record<string, unknown>>(
      `SELECT status, product_result, stop_reason FROM cpsat_solver_runs WHERE id = $1`,
      [claimed.id],
    );
    assert.equal(row.rows[0]?.status, "READY_FOR_REVIEW");
    assert.equal(row.rows[0]?.product_result, "FEASIBLE");
    assert.equal(row.rows[0]?.stop_reason, "OPERATOR_STOP");
  });

  it("budget: real child executions within cap", () => {
    assert.ok(childExecutions > 0, "expected real child executions");
    assert.ok(childExecutions <= MAX_CHILD, `used ${childExecutions} > ${MAX_CHILD}`);
    console.error(JSON.stringify({ event: "m4a_child_execution_count", childExecutions }));
  });
});
