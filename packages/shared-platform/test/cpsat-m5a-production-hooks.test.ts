/**
 * Milestone 5A — production test-hook removal and Docker-context boundary enforcement.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { toChildPayload } from "../src/cpsat/child-payload.js";
import { freezeCpsatSeatingAuthority } from "../src/cpsat/durable-launch.js";
import { createHash, randomUUID } from "node:crypto";
import type { SeatingV2CompiledRequest } from "../src/seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../src/seating-v2-state.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const workerRoot = join(root, "apps/event-os-solver-worker");

describe("CPSAT Milestone 5A production hook removal", () => {
  it("production request schema forbids testHooks (boolean false schema)", () => {
    const schema = readFileSync(join(workerRoot, "schemas/solve-request.schema.json"), "utf8");
    const parsed = JSON.parse(schema) as { properties: Record<string, unknown> };
    assert.equal(parsed.properties.testHooks, false);
    assert.doesNotMatch(schema, /continueAfterIncumbentMs/);
  });

  it("production Python child rejects testHooks and has no CPSAT_ALLOW_TEST_HOOKS escape", () => {
    const child = readFileSync(join(workerRoot, "python/solver_child.py"), "utf8");
    const solve = readFileSync(join(workerRoot, "python/model/solve.py"), "utf8");
    assert.match(child, /production_child_rejects_testHooks/);
    assert.match(child, /if request\.get\("testHooks"\) is not None:/);
    assert.doesNotMatch(child, /CPSAT_ALLOW_TEST_HOOKS/);
    assert.doesNotMatch(solve, /CPSAT_ALLOW_TEST_HOOKS/);
    assert.doesNotMatch(solve, /testHooks/);
    assert.doesNotMatch(solve, /continueAfterIncumbentMs/);
  });

  it("production supervisor has no test-hook forwarding", () => {
    const supervisor = readFileSync(join(workerRoot, "src/supervisor.ts"), "utf8");
    assert.doesNotMatch(supervisor, /testHooks|CPSAT_ALLOW_TEST_HOOKS|continueAfterIncumbentMs/);
  });

  it("production Dockerfile and env cannot activate test hooks", () => {
    const dockerfile = readFileSync(join(workerRoot, "Dockerfile"), "utf8");
    const dockerignore = readFileSync(join(workerRoot, ".dockerignore"), "utf8");
    assert.doesNotMatch(dockerfile, /ENV[^\n]*CPSAT_ALLOW_TEST_HOOKS/);
    assert.match(dockerfile, /if grep -R "CPSAT_ALLOW_TEST_HOOKS"/);
    assert.match(dockerignore, /^test-only$/m);
    assert.match(dockerignore, /fake_malformed_child/);
    assert.match(dockerignore, /crash_child/);
    assert.match(dockerfile, /test ! -d \/app\/test-only/);
  });

  it("production Docker context excludes fixtures, tests, qualification, debug, test-only child", () => {
    const dockerignore = readFileSync(join(workerRoot, ".dockerignore"), "utf8");
    for (const pattern of [
      "test-only",
      "fake_malformed_child",
      "crash_child",
      "spike",
      "scripts",
      "^test$",
    ]) {
      assert.match(dockerignore, new RegExp(pattern, "m"));
    }
    assert.ok(existsSync(join(workerRoot, "test-only/keep_best_timing_child.py")));
  });

  it("test-only timing child is outside production package exports", () => {
    const barrel = readFileSync(join(root, "packages/shared-platform/src/index.ts"), "utf8");
    const cpsatIndex = readFileSync(join(root, "packages/shared-platform/src/cpsat/index.ts"), "utf8");
    assert.doesNotMatch(barrel, /keep_best_timing|test-only|CPSAT_ALLOW_TEST_HOOKS/);
    assert.doesNotMatch(cpsatIndex, /keep_best_timing|test-only|CPSAT_ALLOW_TEST_HOOKS/);
    const probe = readFileSync(
      join(root, "packages/shared-platform/src/cpsat/diagnostics/real-child-probe.ts"),
      "utf8",
    );
    assert.doesNotMatch(probe, /CPSAT_ALLOW_TEST_HOOKS|allowTestHooks/);
  });

  it("toChildPayload always rejects testHooks; no allow option", () => {
    const hash = (label: string) => createHash("sha256").update(label).digest("hex");
    const compiled = {
      contract: "eos-s06-solver-v2",
      seed: 7,
      guests: [
        { token: "g1".padEnd(32, "0"), eligible: true, capabilityCodes: [], groupTokens: [], protocolCodes: [] },
      ],
      positions: [
        { token: "p1".padEnd(32, "a"), tableToken: "t1".padEnd(32, "b"), zoneCodes: [], capabilityCodes: [] },
      ],
      rules: [],
      reservations: [],
    } as SeatingV2CompiledRequest;
    const pkg = {
      id: randomUUID(),
      organisationId: "00000000-0000-4000-8000-00000000org1",
      eventId: "00000000-0000-4000-8000-00000000a001",
      schemaVersion: 1,
      semanticHash: hash("s"),
      compiledRequestHash: hash("c"),
      contentHash: hash("content"),
      cohortHash: hash("cohort"),
      rsvpSnapshotHash: hash("rsvp"),
      seatingLayoutBindingId: randomUUID(),
      layoutId: "layout-1",
      layoutPublicationId: "pub-1",
      layoutContentHash: hash("layout"),
      eventBriefEditionId: null,
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      lockSetHash: hash("locks"),
      solverVersion: "s06-solver-v3",
      solverConfigHash: hash("objective"),
      deterministicSeed: "seed-1",
      frozenByPersonId: "planner",
      frozenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    } as SeatingV2InputPackage;
    const frozen = freezeCpsatSeatingAuthority({
      organisationId: pkg.organisationId,
      eventId: pkg.eventId,
      package: pkg,
      compiled,
    });
    assert.throws(
      () => toChildPayload({ ...frozen.compiledRequest, testHooks: { continueAfterIncumbentMs: 1 } } as never),
      /production_request_rejects_testHooks/,
    );
    const src = readFileSync(join(root, "packages/shared-platform/src/cpsat/child-payload.ts"), "utf8");
    assert.doesNotMatch(src, /allowTestHooks/);
  });

  it("missing production executor path remains fail-closed in supervisor config", () => {
    const supervisor = readFileSync(join(workerRoot, "src/supervisor.ts"), "utf8");
    assert.match(supervisor, /accessSync\(pythonPath/);
    assert.match(supervisor, /accessSync\(childScriptPath/);
    assert.match(supervisor, /fake_malformed|crash_child/);
  });
});
