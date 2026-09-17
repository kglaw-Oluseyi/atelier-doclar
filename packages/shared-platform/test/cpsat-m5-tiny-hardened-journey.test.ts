/**
 * Milestone 5 — one tiny real queued solve through hardened worker child path.
 * Counts toward the Milestone 5 cap of two real CP-SAT child executions.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { accessSync, constants, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runPlatformMigrations } from "../src/migrations.js";
import { freezeCpsatSeatingAuthority, enqueueCpsatSeatingRun } from "../src/cpsat/durable-launch.js";
import { admitCpsatSeatingLaunch } from "../src/cpsat/admission.js";
import { registerSyntheticCpsatWorkerForTests } from "../src/cpsat/worker-registry.js";
import { claimNextCpsatRun } from "../src/cpsat/worker-lifecycle.js";
import { executeClaimedCpsatRun } from "../src/cpsat/execute-claimed-run.js";
import type { SeatingV2CompiledRequest } from "../src/seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../src/seating-v2-state.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const pythonPath = resolve(root, "apps/event-os-solver-worker/.venv/bin/python");
const childScript = resolve(root, "apps/event-os-solver-worker/python/solver_child.py");
const DB_NAME = `cpsat_m5j_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M5_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M5_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: pg.Pool;
let tmpRunDir: string;
const EVENT = "00000000-0000-4000-8000-00000000m5j1";
const ORG = "00000000-0000-4000-8000-00000000orgj";

function compiledFixture(): SeatingV2CompiledRequest {
  return {
    contract: "eos-s06-solver-v2",
    seed: 101,
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

function packageFixture(): SeatingV2InputPackage {
  const hash = (label: string) => createHash("sha256").update(label).digest("hex");
  return {
    id: randomUUID(),
    organisationId: ORG,
    eventId: EVENT,
    schemaVersion: 1,
    semanticHash: hash("semantic"),
    compiledRequestHash: hash("compiled"),
    contentHash: hash("content"),
    cohortHash: hash("cohort"),
    rsvpSnapshotHash: hash("rsvp"),
    seatingLayoutBindingId: randomUUID(),
    layoutId: "layout-m5j",
    layoutPublicationId: "pub-m5j",
    layoutContentHash: hash("layout"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    lockSetHash: hash("locks"),
    solverVersion: "s06-solver-v3",
    solverConfigHash: hash("objective"),
    deterministicSeed: "seed-m5j",
    frozenByPersonId: "planner",
    frozenAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

describe("CPSAT Milestone 5 tiny hardened-worker journey", () => {
  before(async () => {
    accessSync(pythonPath, constants.X_OK);
    accessSync(childScript, constants.R_OK);
    tmpRunDir = mkdtempSync(join(tmpdir(), "cpsat-m5-"));
    const admin = new pg.Pool({ connectionString: ADMIN_URL });
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: TEST_URL, max: 4 });
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
    await runPlatformMigrations(db as never);
  });

  after(async () => {
    await pool?.end();
    const admin = new pg.Pool({ connectionString: ADMIN_URL });
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.end();
    try {
      rmSync(tmpRunDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("admit → enqueue → claim → real child → settle without credentials in child env", async () => {
    const { runSolverChild } = await import(
      resolve(root, "apps/event-os-solver-worker/src/child-runner.ts")
    );
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

    await registerSyntheticCpsatWorkerForTests(db as never, { workerId: "m5-journey-worker" });
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: packageFixture(),
      compiled: compiledFixture(),
    });
    const admission = await admitCpsatSeatingLaunch(db as never, frozen);
    assert.equal(admission.ok, true);
    const enqueued = await enqueueCpsatSeatingRun(db as never, frozen, { actorPersonId: "m5-journey" });
    assert.equal(enqueued.run.lifecycle, "QUEUED");

    const claimed = await claimNextCpsatRun(db as never, {
      leaseOwner: "m5-journey-worker",
      leaseSeconds: 30,
      fair: true,
    });
    assert.ok(claimed);

    let childEnvKeys: string[] = [];
    const result = await executeClaimedCpsatRun(db as never, {
      run: claimed!,
      leaseOwner: "m5-journey-worker",
      wallMs: 20_000,
      cancelGraceMs: 1_000,
      maxResponseBytes: 2 * 1024 * 1024,
      childExecutor: async (spawnInput) => {
        assert.equal("testHooks" in spawnInput.request, false);
        assert.equal("DATABASE_URL" in (spawnInput.request as object), false);
        const child = await runSolverChild({
          pythonPath,
          scriptPath: childScript,
          request: spawnInput.request,
          wallMs: spawnInput.wallMs,
          cancelGraceMs: spawnInput.cancelGraceMs,
          maxTotalResponseBytes: 2 * 1024 * 1024,
          onProgress: async (phase) => spawnInput.onProgress?.(phase),
          shouldCancel: spawnInput.shouldCancel,
        });
        childEnvKeys = child.childEnvKeys ?? [];
        return child;
      },
    });

    assert.ok(result.settled);
    assert.ok(
      ["OPTIMAL", "FEASIBLE", "INFEASIBLE", "READY_FOR_REVIEW", "CLOSED_NO_PLAN", "FAILED", "VERIFICATION_OR_EXPLAIN_FAULT"].some(
        (token) => String(result.outcome).includes(token) || result.outcome === token,
      ),
      `unexpected outcome ${result.outcome}`,
    );
    assert.ok(!childEnvKeys.includes("DATABASE_URL"));
    assert.ok(!childEnvKeys.some((k) => /SECRET|PASSWORD|RAILWAY/i.test(k)));
    assert.deepEqual(
      childEnvKeys.sort(),
      ["HOME", "LANG", "PATH", "PYTHONUNBUFFERED", "TMPDIR"].sort(),
    );
  });
});
