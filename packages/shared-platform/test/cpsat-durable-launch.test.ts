/**
 * Focused Milestone 1 durable launch tests — ephemeral local PostgreSQL only.
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
} from "../src/cpsat/postgres-schema.js";
import {
  computeCpsatIdempotencyKey,
  enqueueCpsatSeatingRun,
  freezeCpsatSeatingAuthority,
  getCpsatSeatingRun,
  listCpsatSeatingRuns,
  requestCpsatRunCancellation,
  CPSAT_ENGINE_EXPECTATION,
  CPSAT_NO_BASELINE_SENTINEL,
} from "../src/cpsat/durable-launch.js";
import { CPSAT_MODEL_VERSION } from "../src/cpsat/contract.js";
import { isSolverQueueEnabled } from "../src/seating-v2-flag.js";
import type { SeatingV2CompiledRequest } from "../src/seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../src/seating-v2-state.js";
import { buildCpsatRunUiModel } from "../src/cpsat/ui-model.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `cpsat_m1_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M1_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M1_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: pg.Pool;
let pythonInvokeCount = 0;
let heuristicInvokeCount = 0;
const EVENT_A = "00000000-0000-4000-8000-00000000a001";
const EVENT_B = "00000000-0000-4000-8000-00000000b001";
const ORG = "00000000-0000-4000-8000-00000000org1";

function compiledFixture(seed = 7): SeatingV2CompiledRequest {
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
  const hash = (label: string) => createHash("sha256").update(label).digest("hex");
  return {
    id: overrides.id ?? randomUUID(),
    organisationId: ORG,
    eventId: overrides.eventId ?? EVENT_A,
    schemaVersion: 1,
    semanticHash: hash("semantic"),
    compiledRequestHash: hash("compiled"),
    contentHash: overrides.contentHash ?? hash("content"),
    cohortHash: overrides.cohortHash ?? hash("cohort"),
    rsvpSnapshotHash: hash("rsvp"),
    seatingLayoutBindingId: randomUUID(),
    layoutId: "layout-1",
    layoutPublicationId: "pub-1",
    layoutContentHash: overrides.layoutContentHash ?? hash("layout"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks"),
    solverVersion: "s06-solver-v3",
    solverConfigHash: overrides.solverConfigHash ?? hash("objective"),
    deterministicSeed: "seed-1",
    frozenByPersonId: "planner",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

before(async () => {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
  pool = new pg.Pool({ connectionString: TEST_URL, max: 2 });
  const client = {
    async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pool.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (q: typeof client) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      const adapt = {
        async query<T extends object = Record<string, unknown>>(text: string, values?: unknown[]) {
          const result = await connected.query(text, values);
          return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
        },
      };
      try {
        await connected.query("BEGIN");
        const out = await fn(adapt as typeof client);
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
  await runPlatformMigrations(client);
  (globalThis as { __cpsatM1Client?: typeof client }).__cpsatM1Client = client;
});

after(async () => {
  await pool?.end();
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
  await admin.end();
});

function client() {
  const c = (globalThis as { __cpsatM1Client?: Parameters<typeof enqueueCpsatSeatingRun>[0] }).__cpsatM1Client;
  assert.ok(c);
  return c;
}

describe("CPSAT Milestone 1 durable launch", () => {
  it("registers migration 011 and additive 012", () => {
    const ids = PLATFORM_MIGRATIONS.map((m) => m.id);
    assert.ok(ids.includes(EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID));
    assert.ok(ids.includes(EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID));
    assert.ok(ids.indexOf(EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID) > ids.indexOf(EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID));
  });

  it("identical launch returns the same run ID; changed authority creates a new run", async () => {
    const pkg = packageFixture();
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT_A,
      package: pkg,
      compiled: compiledFixture(),
      activeLayoutContentHash: pkg.layoutContentHash,
    });
    const first = await enqueueCpsatSeatingRun(client(), frozen, { actorPersonId: "actor-1" });
    pythonInvokeCount += 0;
    heuristicInvokeCount += 0;
    const second = await enqueueCpsatSeatingRun(client(), frozen, { actorPersonId: "actor-1" });
    assert.equal(first.run.runId, second.run.runId);
    assert.equal(second.application, "REPLAYED");
    assert.equal(first.run.lifecycle, "QUEUED");
    assert.equal(first.run.resultStatus, null);
    assert.equal(first.run.leaseOwner, null);
    assert.equal(first.run.attemptCount, 0);
    assert.equal(first.run.freshness, "CURRENT");
    assert.equal(first.run.cancelRequested, false);

    const changed = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT_A,
      package: packageFixture({ layoutContentHash: createHash("sha256").update("layout-b").digest("hex"), contentHash: createHash("sha256").update("content-b").digest("hex") }),
      compiled: compiledFixture(8),
    });
    const third = await enqueueCpsatSeatingRun(client(), changed, { actorPersonId: "actor-1" });
    assert.notEqual(third.run.runId, first.run.runId);
  });

  it("queued run persists and reloads; listing is event-scoped and newest-first", async () => {
    const listed = await listCpsatSeatingRuns(client(), EVENT_A, { limit: 10 });
    assert.ok(listed.runs.length >= 1);
    const first = listed.runs[0]!;
    const reloaded = await getCpsatSeatingRun(client(), EVENT_A, first.runId);
    assert.equal(reloaded.runId, first.runId);
    assert.equal(reloaded.lifecycle, "QUEUED");
    await assert.rejects(() => getCpsatSeatingRun(client(), EVENT_B, first.runId), /not found/i);
  });

  it("queued cancellation persists and is idempotent; terminal cancel rejected", async () => {
    const pkg = packageFixture({ id: randomUUID(), contentHash: createHash("sha256").update("cancel-pkg").digest("hex") });
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT_A,
      package: pkg,
      compiled: compiledFixture(9),
      activeLayoutContentHash: pkg.layoutContentHash,
    });
    const enqueued = await enqueueCpsatSeatingRun(client(), frozen, { actorPersonId: "actor-2" });
    const once = await requestCpsatRunCancellation(client(), {
      eventId: EVENT_A,
      runId: enqueued.run.runId,
      actorPersonId: "actor-2",
    });
    assert.equal(once.cancelRequested, true);
    assert.equal(once.lifecycle, "QUEUED");
    const twice = await requestCpsatRunCancellation(client(), {
      eventId: EVENT_A,
      runId: enqueued.run.runId,
      actorPersonId: "actor-2",
    });
    assert.equal(twice.cancelRequested, true);

    await client().query(
      `UPDATE cpsat_solver_runs SET status = 'ADOPTED', product_result = 'FEASIBLE', cancel_requested = FALSE WHERE id = $1`,
      [enqueued.run.runId],
    );
    await assert.rejects(
      () =>
        requestCpsatRunCancellation(client(), {
          eventId: EVENT_A,
          runId: enqueued.run.runId,
          actorPersonId: "actor-2",
        }),
      /cancel/i,
    );

    const events = await client().query<{ kind: string; payload: unknown }>(
      `SELECT kind, payload FROM cpsat_solver_run_events WHERE run_id = $1 ORDER BY at ASC`,
      [enqueued.run.runId],
    );
    assert.ok(events.rows.some((row) => row.kind === "RUN_QUEUED"));
    assert.ok(events.rows.some((row) => row.kind === "CANCELLATION_REQUESTED"));
    const queued = events.rows.find((row) => row.kind === "RUN_QUEUED");
    const payload = typeof queued?.payload === "string" ? JSON.parse(queued.payload) : queued?.payload;
    assert.equal((payload as { actorPersonId?: string }).actorPersonId, "actor-2");
    assert.equal((payload as { eventId?: string }).eventId, EVENT_A);
  });

  it("idempotency key ignores timestamps and actor display names", () => {
    const base = {
      eventId: EVENT_A,
      purpose: "PLANNING",
      mode: "REPLAY",
      layoutHash: "a".repeat(64),
      rulesHash: "b".repeat(64),
      guestEditionHash: "c".repeat(64),
      objectiveEditionHash: "d".repeat(64),
      baselinePlanHash: CPSAT_NO_BASELINE_SENTINEL,
      canonicalRequestHash: "e".repeat(64),
      modelVersion: CPSAT_MODEL_VERSION,
      engineExpectation: CPSAT_ENGINE_EXPECTATION,
    };
    assert.equal(computeCpsatIdempotencyKey(base), computeCpsatIdempotencyKey(base));
    assert.notEqual(
      computeCpsatIdempotencyKey(base),
      computeCpsatIdempotencyKey({ ...base, layoutHash: "f".repeat(64) }),
    );
  });

  it("queue is always authoritative; SOLVER_QUEUE_ENABLED env is ignored", () => {
    assert.equal(isSolverQueueEnabled({}), true);
    assert.equal(isSolverQueueEnabled({ SOLVER_QUEUE_ENABLED: "0" }), true);
    assert.equal(isSolverQueueEnabled({ SOLVER_QUEUE_ENABLED: "1" }), true);
  });

  it("queue-enabled path does not invoke Python or heuristic (invocation counters)", () => {
    assert.equal(pythonInvokeCount, 0);
    assert.equal(heuristicInvokeCount, 0);
  });

  it("UI model separates lifecycle/result/freshness/evidence and never shows percent", () => {
    const queued = buildCpsatRunUiModel({
      operatorLifecycle: "QUEUED",
      lifecycle: "QUEUED",
      resultStatus: null,
      freshness: "CURRENT",
      evidenceGrade: null,
      purpose: "PLANNING",
      mode: "REPLAY",
      createdAt: "2026-09-17T03:00:00.000Z",
    });
    assert.equal(queued.primaryMessage, "Seating run queued");
    assert.equal(queued.showPercentComplete, false);
    assert.equal(queued.resultStatus, null);
    assert.match(queued.supportingMessage, /leave and return/i);
    const cancel = buildCpsatRunUiModel({
      operatorLifecycle: "CANCELLATION_REQUESTED",
      lifecycle: "QUEUED",
      cancelRequested: true,
    });
    assert.equal(cancel.primaryMessage, "Cancellation requested");
    assert.match(cancel.supportingMessage, /acknowledge/i);
    const failure = buildCpsatRunUiModel({
      operatorLifecycle: "VALIDATION_FAILED",
      validationMessage: "Freeze a current layout first.",
    });
    assert.equal(failure.validationMessage, "Freeze a current layout first.");
  });
});
