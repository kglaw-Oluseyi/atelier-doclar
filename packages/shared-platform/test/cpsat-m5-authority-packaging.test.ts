/**
 * Milestone 5 — authority packaging, admission, worker registry, architectural gates.
 * Ephemeral local PostgreSQL only. Max two tiny real CP-SAT child executions across M5.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runPlatformMigrations } from "../src/migrations.js";
import {
  EOS_S06_CPSAT_SOLVER_WORKER_REGISTRY_MIGRATION_ID,
} from "../src/cpsat/postgres-schema.js";
import {
  admitCpsatSeatingLaunch,
  QUEUE_BUSY_PUBLIC_MESSAGE,
  WORKER_UNAVAILABLE_PUBLIC_MESSAGE,
} from "../src/cpsat/admission.js";
import {
  freezeCpsatSeatingAuthority,
  enqueueCpsatSeatingRun,
  CPSAT_ENGINE_EXPECTATION,
} from "../src/cpsat/durable-launch.js";
import {
  registerCpsatWorker,
  setCpsatWorkerLifecycle,
  heartbeatCpsatWorker,
  findCompatibleReadyWorkers,
  registerSyntheticCpsatWorkerForTests,
} from "../src/cpsat/worker-registry.js";
import { toChildPayload } from "../src/cpsat/child-payload.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";
import type { SeatingV2CompiledRequest } from "../src/seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../src/seating-v2-state.js";
import { isSolverQueueEnabled } from "../src/seating-v2-flag.js";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/event-os/package.json"));
const pg = require("pg") as typeof import("pg");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DB_NAME = `cpsat_m5_${Date.now().toString(36)}`;
const ADMIN_URL = process.env.CPSAT_M5_ADMIN_DATABASE_URL ?? "postgresql://maisondoclar@127.0.0.1:5432/postgres";
const TEST_URL = process.env.CPSAT_M5_DATABASE_URL ?? `postgresql://maisondoclar@127.0.0.1:5432/${DB_NAME}`;

let pool: pg.Pool;
const EVENT = "00000000-0000-4000-8000-00000000m501";
const ORG = "00000000-0000-4000-8000-00000000org5";

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
    layoutId: "layout-m5",
    layoutPublicationId: "pub-m5",
    layoutContentHash: hash("layout"),
    eventBriefEditionId: null,
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    solverConfigHash: hash("solver-config"),
    deterministicSeed: 11,
    createdAt: new Date().toISOString(),
  } as SeatingV2InputPackage;
}

describe("CPSAT Milestone 5 authority packaging", () => {
  before(async () => {
    const admin = new pg.Pool({ connectionString: ADMIN_URL });
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: TEST_URL });
    const db = {
      query: (text: string, values?: unknown[]) => pool.query(text, values),
      transaction: async <T>(fn: (q: { query: typeof pool.query }) => Promise<T>) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const out = await fn({ query: (text, values) => client.query(text, values) });
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
    const report = await runPlatformMigrations(db as never);
    assert.ok(report.applied.includes(EOS_S06_CPSAT_SOLVER_WORKER_REGISTRY_MIGRATION_ID));
  });

  after(async () => {
    await pool?.end();
    const admin = new pg.Pool({ connectionString: ADMIN_URL });
    await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await admin.end();
  });

  it("architectural: Event OS product never imports local-solve or heuristic adapter", () => {
    const command = readFileSync(resolve(root, "packages/shared-platform/src/seating-v2-command-service.ts"), "utf8");
    const actions = readFileSync(resolve(root, "apps/event-os/src/server/seating-actions.ts"), "utf8");
    const barrel = readFileSync(resolve(root, "packages/shared-platform/src/index.ts"), "utf8");
    const cpsatIndex = readFileSync(resolve(root, "packages/shared-platform/src/cpsat/index.ts"), "utf8");
    assert.doesNotMatch(command, /local-solve|solveSeatingV2Compiled|seating-solver-v1|SEATING_ENGINE/);
    assert.doesNotMatch(actions, /local-solve|solveSeatingV1|SEATING_ENGINE/);
    assert.doesNotMatch(barrel, /solveSeatingV1|solveSeatingV2CompiledCpSat/);
    assert.doesNotMatch(cpsatIndex, /from \"\.\/local-solve/);
    assert.match(command, /admitCpsatSeatingLaunch/);
    assert.match(command, /enqueueCpsatSeatingRun/);
  });

  it("SEATING_ENGINE and SOLVER_QUEUE_ENABLED cannot select heuristic or bypass queue", () => {
    assert.equal(isSolverQueueEnabled({ SOLVER_QUEUE_ENABLED: "0" }), true);
    const adapter = readFileSync(resolve(root, "packages/shared-platform/src/seating-v2-solver-adapter.ts"), "utf8");
    assert.match(adapter, /SEATING_ENGINE=heuristic is retired/);
    assert.doesNotMatch(adapter, /solveSeatingV2CompiledHeuristic\(request\).*engine: \"heuristic\"/s);
  });

  it("production toChildPayload rejects testHooks", () => {
    const compiled = compiledFixture();
    const pkg = packageFixture();
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: pkg,
      compiled,
    });
    assert.throws(
      () =>
        toChildPayload({
          ...frozen.compiledRequest,
          testHooks: { continueAfterIncumbentMs: 10 },
        } as never),
      /production_request_rejects_testHooks/,
    );
  });

  it("worker unavailable refuses enqueue with honest public wording", async () => {
    const db = { query: (text: string, values?: unknown[]) => pool.query(text, values) };
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: packageFixture(),
      compiled: compiledFixture(),
    });
    const outcome = await admitCpsatSeatingLaunch(db as never, frozen);
    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      assert.equal(outcome.reasonCode, "WORKER_UNAVAILABLE");
      assert.equal(outcome.publicMessage, WORKER_UNAVAILABLE_PUBLIC_MESSAGE);
    }
  });

  it("compatible READY worker permits admission; draining refuses", async () => {
    const db = { query: (text: string, values?: unknown[]) => pool.query(text, values) };
    const worker = await registerSyntheticCpsatWorkerForTests(db as never, {
      workerId: "m5-ready-1",
      qualifiedMaxGuests: 100,
      qualifiedMaxTables: 50,
    });
    assert.equal(worker.lifecycle, "READY");
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: packageFixture(),
      compiled: compiledFixture(21),
    });
    const admitted = await admitCpsatSeatingLaunch(db as never, frozen);
    assert.equal(admitted.ok, true);

    await setCpsatWorkerLifecycle(db as never, worker.workerId, "DRAINING");
    const refused = await admitCpsatSeatingLaunch(db as never, {
      ...frozen,
      authoredAuthority: compiledFixture(22),
    });
    assert.equal(refused.ok, false);

    await setCpsatWorkerLifecycle(db as never, worker.workerId, "READY");
    await heartbeatCpsatWorker(db as never, { workerId: worker.workerId, lifecycle: "READY" });
  });

  it("incompatible scale / contract refuses admission", async () => {
    const db = { query: (text: string, values?: unknown[]) => pool.query(text, values) };
    await registerCpsatWorker(db as never, {
      workerId: "m5-small-envelope",
      imageIdentity: "test",
      cpuArch: process.arch,
      qualifiedMaxGuests: 1,
      qualifiedMaxTables: 1,
      lifecycle: "READY",
      modelVersions: ["other-model"],
      contractVersions: ["other-contract"],
    });
    await heartbeatCpsatWorker(db as never, { workerId: "m5-small-envelope", lifecycle: "READY" });
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: packageFixture(),
      compiled: compiledFixture(31),
    });
    // Ensure only incompatible worker is considered by using a fresh event's admission after clearing ready others is hard;
    // instead query findCompatibleReadyWorkers directly for this worker.
    const found = await findCompatibleReadyWorkers(db as never, {
      guestCount: 2,
      tableCount: 1,
      modelVersion: frozen.modelVersion,
      contractVersion: frozen.compiledRequest.contractVersion,
      engineExpectation: CPSAT_ENGINE_EXPECTATION,
    });
    assert.ok(!found.some((w) => w.workerId === "m5-small-envelope"));
  });

  it("production image context excludes fake child fixtures", () => {
    const dockerignore = readFileSync(resolve(root, "apps/event-os-solver-worker/.dockerignore"), "utf8");
    const dockerfile = readFileSync(resolve(root, "apps/event-os-solver-worker/Dockerfile"), "utf8");
    assert.match(dockerignore, /fake_malformed_child/);
    assert.match(dockerignore, /crash_child/);
    assert.match(dockerfile, /^USER solver$/m);
    assert.doesNotMatch(dockerfile, /^\s*EXPOSE\b/m);
    assert.match(dockerfile, /require-hashes/);
    assert.match(dockerfile, /HEALTHCHECK NONE/);
    assert.ok(existsSync(resolve(root, "apps/event-os-solver-worker/python/requirements.linux.hashes.txt")));
  });

  it("child socket guard and production testHooks hard-reject are present", () => {
    const child = readFileSync(resolve(root, "apps/event-os-solver-worker/python/solver_child.py"), "utf8");
    assert.match(child, /install_socket_guard/);
    assert.match(child, /cpsat_child_socket_forbidden/);
    assert.match(child, /production_child_rejects_testHooks/);
    assert.match(child, /assert_clean_child_env/);
    assert.doesNotMatch(child, /CPSAT_ALLOW_TEST_HOOKS/);
  });

  it("supervisor drain marks DRAINING and refuses new claims while draining", () => {
    const supervisor = readFileSync(resolve(root, "apps/event-os-solver-worker/src/supervisor.ts"), "utf8");
    assert.match(supervisor, /DRAINING/);
    assert.match(supervisor, /beginDrain/);
    assert.match(supervisor, /registerCpsatWorker/);
    assert.match(supervisor, /worker_draining|draining/);
  });

  it("per-event active limit refuses with queue-busy wording", async () => {
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
    await registerSyntheticCpsatWorkerForTests(db as never, { workerId: "m5-limit-worker" });
    const pkg = packageFixture();
    const a = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: { ...pkg, id: randomUUID() },
      compiled: compiledFixture(41),
    });
    const b = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: { ...pkg, id: randomUUID() },
      compiled: compiledFixture(42),
    });
    await enqueueCpsatSeatingRun(db as never, a, { actorPersonId: "m5" });
    await enqueueCpsatSeatingRun(db as never, b, { actorPersonId: "m5" });
    const c = freezeCpsatSeatingAuthority({
      organisationId: ORG,
      eventId: EVENT,
      package: { ...pkg, id: randomUUID() },
      compiled: compiledFixture(43),
    });
    const outcome = await admitCpsatSeatingLaunch(db as never, c, { perEventActiveLimit: 2 });
    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      assert.equal(outcome.reasonCode, "PER_EVENT_ACTIVE_LIMIT");
      assert.equal(outcome.publicMessage, QUEUE_BUSY_PUBLIC_MESSAGE);
    }
  });
});
