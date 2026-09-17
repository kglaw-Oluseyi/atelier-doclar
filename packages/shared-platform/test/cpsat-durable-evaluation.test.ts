/**
 * M6D — durable event-scoped CP-SAT seating evaluation (ephemeral PostgreSQL).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import { EOS_S06_CPSAT_DURABLE_SEATING_EVALUATION_MIGRATION_ID } from "../src/cpsat/postgres-schema.js";
import {
  CPSAT_SEATING_EVAL_CASE_IDS,
  evaluateCpsatSeatingFacts,
  loadLatestCpsatSeatingEvaluation,
  persistCpsatSeatingEvaluation,
  runAndPersistCpsatSeatingEvaluation,
  type CpsatSeatingEvaluationFacts,
} from "../src/cpsat/durable-evaluation.js";
import type { PgQueryable } from "../src/postgres-schema.js";
import { PostgresSeatingV2Repository } from "../src/postgres-seating-v2-store.js";
import type { AuditEvent } from "../src/schemas.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const DB_NAME = `cpsat_m6d_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M6D_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M6D_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: pg.Pool;
let txClient: PgQueryable & { transaction: <T>(fn: (q: PgQueryable) => Promise<T>) => Promise<T> };
const ORG = "00000000-0000-4000-8000-00000000org1";
const EVENT_A = "00000000-0000-4000-8000-00000000a001";
const EVENT_B = "00000000-0000-4000-8000-00000000b001";

function adapt(queryable: { query: (text: string, values?: unknown[]) => Promise<{ rows: object[]; rowCount?: number | null }> }): PgQueryable {
  return {
    async query<T extends object>(text: string, values?: unknown[]) {
      const result = await queryable.query(text, values);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
}

function transactionalClient(pool: pg.Pool) {
  return {
    ...adapt(pool),
    async transaction<T>(fn: (queryable: PgQueryable) => Promise<T>): Promise<T> {
      const connected = await pool.connect();
      try {
        await connected.query("BEGIN");
        const result = await fn(adapt(connected));
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

function baseFacts(overrides: Partial<CpsatSeatingEvaluationFacts> = {}): CpsatSeatingEvaluationFacts {
  return {
    organisationId: ORG,
    eventId: EVENT_A,
    layoutBindingActive: true,
    layoutBindingCount: 1,
    legacyCurrentPublicationCount: 0,
    authorityAdoptionId: null,
    currentAdoption: null,
    adoptedRun: null,
    assignments: [],
    workerReadyCount: 1,
    ...overrides,
  };
}

describe("M6D durable CP-SAT seating evaluation", () => {
  before(async () => {
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: TEST_URL, max: 4 });
    txClient = transactionalClient(pool);
    const report = await runPlatformMigrations(txClient);
    assert.equal(report.status, "APPLIED");
    assert.ok(PLATFORM_MIGRATIONS.some((m) => m.id === EOS_S06_CPSAT_DURABLE_SEATING_EVALUATION_MIGRATION_ID));
    const applied = await pool.query(`SELECT id FROM platform_schema_migrations WHERE id = $1`, [
      EOS_S06_CPSAT_DURABLE_SEATING_EVALUATION_MIGRATION_ID,
    ]);
    assert.equal(applied.rows.length, 1);
  });

  after(async () => {
    await pool.end();
    const admin = new pg.Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.end();
  });

  it("registers migration 018", () => {
    assert.equal(
      PLATFORM_MIGRATIONS.at(-1)?.id,
      EOS_S06_CPSAT_DURABLE_SEATING_EVALUATION_MIGRATION_ID,
    );
  });

  it("evaluates event facts with fixed case set", () => {
    const result = evaluateCpsatSeatingFacts(baseFacts());
    assert.equal(result.cases.length, CPSAT_SEATING_EVAL_CASE_IDS.length);
    assert.equal(result.status, "PASSED");
    assert.equal(result.readinessResult, "NOT_RELEASE_READY");
  });

  it("persists event-scoped evaluation and reloads deterministically", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // seed worker ready
      await client.query(
        `INSERT INTO cpsat_solver_workers (
          worker_id, image_identity, model_versions, contract_versions, ortools_version, python_version,
          cpu_arch, lifecycle, concurrency_capacity, active_jobs, last_heartbeat, started_at, created_at, updated_at
        ) VALUES ($1,$2,'["cpsat-model-v1"]'::jsonb,'["md.seating.solve.request/1"]'::jsonb,'9.15.6755','3.12.14','x64','READY',1,0,NOW(),NOW(),NOW(),NOW())
        ON CONFLICT (worker_id) DO UPDATE SET lifecycle='READY', last_heartbeat=NOW()`,
        ["worker:m6d-test", "event-os-solver-worker:test"],
      );
      const first = await persistCpsatSeatingEvaluation(client, {
        organisationId: ORG,
        eventId: EVENT_A,
        actorPersonId: "person-planner",
        actorRoleKey: "PLANNER",
        correlationId: "corr-eval-1",
        idempotencyKey: "idem-eval-1-abcdefgh",
        evaluatedAt: new Date().toISOString(),
        facts: baseFacts({ workerReadyCount: 1 }),
      });
      await client.query("COMMIT");

      const latest = await loadLatestCpsatSeatingEvaluation(pool, EVENT_A);
      assert.ok(latest);
      assert.equal(latest!.id, first.id);
      assert.equal(latest!.correlationId, "corr-eval-1");
      assert.equal(latest!.eventId, EVENT_A);
      assert.equal(latest!.caseCount, CPSAT_SEATING_EVAL_CASE_IDS.length);

      const other = await loadLatestCpsatSeatingEvaluation(pool, EVENT_B);
      assert.equal(other, null);
    } finally {
      client.release();
    }
  });

  it("rolls back evaluation persistence when audit insert fails in the same transaction", async () => {
    const repo = new PostgresSeatingV2Repository(txClient);
    let evaluationId: string | null = null;
    await assert.rejects(async () => {
      await repo.transaction(async (tx) => {
        const sqlClient = {
          query: async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => {
            const result = await tx.executeSql!<T>(sql, params);
            return { rows: result.rows, rowCount: result.rowCount };
          },
        };
        const record = await runAndPersistCpsatSeatingEvaluation(sqlClient, {
          organisationId: ORG,
          eventId: EVENT_A,
          actorPersonId: "person-planner",
          actorRoleKey: "PLANNER",
          correlationId: "corr-rollback",
          idempotencyKey: "idem-rollback-abcdef",
          evaluatedAt: new Date().toISOString(),
          layoutBindingActive: true,
          layoutBindingCount: 1,
        });
        evaluationId = record.id;
        await tx.appendAudit({
          id: randomUUID(),
          occurredAt: new Date().toISOString(),
          actorType: "USER",
          actorPersonId: "person-planner",
          service: "shared-platform",
          action: "seatingV2.runEvaluation",
          outcome: "SUCCESS",
          organisationId: ORG,
          eventId: EVENT_A,
          resourceType: "cpsat_seating_evaluation",
          resourceId: record.id,
          correlationId: "corr-rollback",
          schemaVersion: 1,
          metadata: { forceFail: true },
        } as AuditEvent);
        throw new Error("forced-audit-path-failure");
      });
    }, /forced-audit-path-failure/);

    assert.ok(evaluationId);
    const remaining = await pool.query(`SELECT id FROM cpsat_seating_evaluations WHERE id = $1`, [evaluationId]);
    assert.equal(remaining.rows.length, 0);
    const audits = await pool.query(`SELECT id FROM platform_audit WHERE body::text LIKE '%corr-rollback%'`);
    assert.equal(audits.rows.length, 0);
  });

  it("keeps evaluation when transaction commits with audit", async () => {
    const repo = new PostgresSeatingV2Repository(txClient);
    const correlationId = `corr-commit-${randomUUID()}`;
    const result = await repo.transaction(async (tx) => {
      const sqlClient: PgQueryable = {
        query: async <T extends object = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
          const result = await tx.executeSql!(sql, params);
          return { rows: result.rows as T[], rowCount: result.rowCount };
        },
      };
      const record = await runAndPersistCpsatSeatingEvaluation(sqlClient, {
        organisationId: ORG,
        eventId: EVENT_A,
        actorPersonId: "person-planner",
        actorRoleKey: "PLANNER",
        correlationId,
        idempotencyKey: `idem-commit-${randomUUID()}`,
        evaluatedAt: new Date().toISOString(),
        layoutBindingActive: true,
        layoutBindingCount: 1,
      });
      await tx.appendAudit({
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        actorType: "USER",
        actorPersonId: "person-planner",
        service: "shared-platform",
        action: "seatingV2.runEvaluation",
        outcome: "SUCCESS",
        organisationId: ORG,
        eventId: EVENT_A,
        resourceType: "cpsat_seating_evaluation",
        resourceId: record.id,
        correlationId,
        schemaVersion: 1,
        metadata: {
          status: record.status,
          caseCount: record.caseCount,
          passedCount: record.passedCount,
          failedCount: record.failedCount,
          readinessResult: record.readinessResult,
          safeFailureCodes: record.safeFailureCodes,
        },
      } as AuditEvent);
      return record;
    });

    const latest = await loadLatestCpsatSeatingEvaluation(pool, EVENT_A);
    assert.equal(latest?.id, result.id);
    assert.equal(latest?.correlationId, correlationId);
    const audit = await pool.query(
      `SELECT action, outcome, body FROM platform_audit WHERE event_id = $1 AND action = $2 ORDER BY occurred_at DESC LIMIT 1`,
      [EVENT_A, "seatingV2.runEvaluation"],
    );
    assert.equal(audit.rows[0]?.outcome, "SUCCESS");
    assert.match(JSON.stringify(audit.rows[0]?.body), new RegExp(correlationId));
    assert.match(JSON.stringify(audit.rows[0]?.body), /readinessResult/);
  });

  it("isolates events and does not write seating_v2_evaluation_runs", async () => {
    const before = await pool.query(`SELECT COUNT(*)::int AS n FROM seating_v2_evaluation_runs`);
    await runAndPersistCpsatSeatingEvaluation(pool, {
      organisationId: ORG,
      eventId: EVENT_B,
      actorPersonId: "person-director",
      actorRoleKey: "EVENT_DIRECTOR",
      correlationId: "corr-event-b",
      idempotencyKey: "idem-event-b-abcdef",
      evaluatedAt: new Date().toISOString(),
      layoutBindingActive: false,
      layoutBindingCount: 0,
    });
    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM seating_v2_evaluation_runs`);
    assert.equal(after.rows[0].n, before.rows[0].n);
    const forB = await loadLatestCpsatSeatingEvaluation(pool, EVENT_B);
    assert.ok(forB);
    assert.equal(forB!.eventId, EVENT_B);
    assert.ok(forB!.safeFailureCodes.includes("LAYOUT_BINDING_ABSENT"));
  });
});
