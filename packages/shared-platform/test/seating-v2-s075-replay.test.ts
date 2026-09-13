import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { PlatformError } from "../src/errors.js";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { snapshotLayoutAdapter } from "../src/seating-adapters.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import {
  SEATING_V2_COMPILER_VERSION,
  SEATING_V2_LEGACY_COMPILER_VERSION,
  SEATING_V2_VALIDATOR_VERSION,
} from "../src/seating-v2-schemas.js";
import type { SeatingV2Run } from "../src/seating-v2-state.js";
import type { SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people, testClock } from "./helpers.js";

function memoryRepo(v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>) {
  assert.ok(v2.repository instanceof MemorySeatingV2Repository);
  return v2.repository;
}

function memoryRun(v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>, runId: string) {
  const run = memoryRepo(v2).backingStore.collection("runs").find((item) => item.id === runId);
  assert.ok(run);
  return run;
}

const NOW = "2026-09-13T12:30:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-replay-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-replay-director" });
}
function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `s075-replay-${key}`,
  };
}

function keepApart(guestA: string, guestB: string): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

function preparePair(prefix: string, serviceStore?: ReturnType<typeof fixtureService>) {
  const { service, store } = serviceStore ?? fixtureService();
  applyS06SeatingLayoutIfMissing(store, service);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for S075 replay",
    idempotencyKey: `${prefix}-rsvp`,
  });
  const guests = ["Ada", "Bisi"].map((givenName, index) => {
    const guest = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName,
      familyName: "Replay",
      email: `${givenName.toLowerCase()}.${prefix}@example.test`,
      reason: "S075 replay guest",
      idempotencyKey: `${prefix}-g${index}-in`,
    });
    service.staffEnterRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "mark attending for S075 replay",
      idempotencyKey: `${prefix}-g${index}-rsvp`,
    });
    return guest;
  });
  return { service, store, guests };
}

async function activateKeepApart(
  v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>,
  guestA: string,
  guestB: string,
  key: string,
) {
  const created = await v2.createRule(planner(), envelope(people.assignPlanner, `${key}-c`), keepApart(guestA, guestB));
  await v2.activateRule(director(), envelope(people.assignDirector, `${key}-a`), { editionId: created.value.id });
}

describe("S075 run reuse identity", () => {
  it("replays an identical tuple onto the same durable run without a second computation", async () => {
    const { service, guests } = preparePair("ident");
    const v2 = service.seatingV2Commands();
    await activateKeepApart(v2, guests[0]!.id, guests[1]!.id, "ident");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "ident-freeze"), { seed: "s075-ident" });
    const first = await v2.launchRun(planner(), envelope(people.assignPlanner, "ident-run-1"), { packageId: frozen.value.id });
    assert.equal(first.application, "APPLIED");
    assert.equal(first.didDataChange, true);
    assert.equal(first.value.compilerVersion, SEATING_V2_COMPILER_VERSION);
    assert.equal(first.value.validatorVersion, SEATING_V2_VALIDATOR_VERSION);
    assert.equal(first.value.semanticHash, frozen.value.semanticHash);
    assert.equal(first.value.compiledRequestHash, frozen.value.compiledRequestHash);
    const second = await v2.launchRun(planner(), envelope(people.assignPlanner, "ident-run-2"), { packageId: frozen.value.id });
    assert.equal(second.application, "REPLAYED");
    assert.equal(second.didDataChange, false);
    assert.equal(second.value.id, first.value.id);
    const launchAudits = memoryRepo(v2).backingStore.audit.filter((item) => item.action === "seatingV2.launchRun");
    assert.equal(launchAudits.filter((item) => item.metadata?.replayed !== true).length, 1);
    assert.equal(launchAudits.filter((item) => item.metadata?.replayed === true).length, 1);
  });

  it("creates a new run when validator, compiler or compiled-request identity changes", async () => {
    const { service, guests } = preparePair("changed");
    const v2 = service.seatingV2Commands();
    await activateKeepApart(v2, guests[0]!.id, guests[1]!.id, "changed");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "changed-freeze"), {
      seed: "s075-changed",
    });
    const first = await v2.launchRun(planner(), envelope(people.assignPlanner, "changed-run-1"), {
      packageId: frozen.value.id,
    });
    memoryRun(v2, first.value.id).validatorVersion = "s06-validator-v2";
    const afterValidator = await v2.launchRun(planner(), envelope(people.assignPlanner, "changed-run-2"), {
      packageId: frozen.value.id,
    });
    assert.equal(afterValidator.application, "APPLIED");
    assert.notEqual(afterValidator.value.id, first.value.id);
    memoryRun(v2, afterValidator.value.id).compilerVersion = SEATING_V2_LEGACY_COMPILER_VERSION;
    const afterCompiler = await v2.launchRun(planner(), envelope(people.assignPlanner, "changed-run-3"), {
      packageId: frozen.value.id,
    });
    assert.equal(afterCompiler.application, "APPLIED");
    assert.notEqual(afterCompiler.value.id, afterValidator.value.id);
    memoryRun(v2, afterCompiler.value.id).compiledRequestHash = "c".repeat(64);
    const afterCompiled = await v2.launchRun(planner(), envelope(people.assignPlanner, "changed-run-4"), {
      packageId: frozen.value.id,
    });
    assert.equal(afterCompiled.application, "APPLIED");
    assert.notEqual(afterCompiled.value.id, afterCompiler.value.id);
    assert.equal(memoryRun(v2, first.value.id).id, first.value.id);
  });

  it("does not reuse TIMED_OUT as success and returns an in-progress run without duplicating it", async () => {
    const { service, guests } = preparePair("states");
    const v2 = service.seatingV2Commands();
    await activateKeepApart(v2, guests[0]!.id, guests[1]!.id, "states");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "states-freeze"), { seed: "s075-states" });
    const timedOutId = "00000000-0000-4000-8000-00000000aa01";
    const runningId = "00000000-0000-4000-8000-00000000aa02";
    const identity = {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      schemaVersion: 1,
      packageId: frozen.value.id,
      packageHash: frozen.value.contentHash,
      semanticHash: frozen.value.semanticHash,
      compiledRequestHash: frozen.value.compiledRequestHash,
      compilerVersion: SEATING_V2_COMPILER_VERSION,
      solverVersion: frozen.value.solverVersion,
      solverConfigHash: frozen.value.solverConfigHash,
      validatorVersion: SEATING_V2_VALIDATOR_VERSION,
      deterministicSeed: frozen.value.deterministicSeed,
      createdAt: NOW,
    };
    await v2.repository.transaction(async (tx) => {
      await tx.insert("runs", { ...identity, id: timedOutId, status: "TIMED_OUT" });
    });
    const retry = await v2.launchRun(planner(), envelope(people.assignPlanner, "states-retry"), {
      packageId: frozen.value.id,
    });
    assert.equal(retry.application, "APPLIED");
    assert.notEqual(retry.value.id, timedOutId);
    assert.notEqual(retry.value.status, "TIMED_OUT");
    const frozenRunning = await v2.freezePackage(planner(), envelope(people.assignPlanner, "states-freeze-run"), {
      seed: "s075-states-running",
    });
    await v2.repository.transaction(async (tx) => {
      await tx.insert("runs", {
        ...identity,
        id: runningId,
        status: "RUNNING",
        packageId: frozenRunning.value.id,
        packageHash: frozenRunning.value.contentHash,
        semanticHash: frozenRunning.value.semanticHash,
        compiledRequestHash: frozenRunning.value.compiledRequestHash,
        deterministicSeed: frozenRunning.value.deterministicSeed,
      });
    });
    const inProgress = await v2.launchRun(planner(), envelope(people.assignPlanner, "states-running"), {
      packageId: frozenRunning.value.id,
    });
    assert.equal(inProgress.application, "REPLAYED");
    assert.equal(inProgress.didDataChange, false);
    assert.equal(inProgress.value.id, runningId);
    assert.equal(inProgress.value.status, "RUNNING");
  });

  it("changes package identity after reservation withdrawal and may reuse an exact reverted seed", async () => {
    const { service, store, guests } = preparePair("revert");
    const v2 = service.seatingV2Commands();
    await activateKeepApart(v2, guests[0]!.id, guests[1]!.id, "revert");
    const tableId = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne).tables[0]!.objectId;
    const reserved = await v2.createReservation(planner(), envelope(people.assignPlanner, "revert-res-c"), {
      exact: 1,
      eligibleMemberIds: [guests[0]!.id],
      targets: [{ type: "TABLE", idOrCode: tableId }],
    });
    await v2.activateReservation(director(), envelope(people.assignDirector, "revert-res-a"), {
      editionId: reserved.value.id,
    });
    const withReservation = await v2.freezePackage(planner(), envelope(people.assignPlanner, "revert-freeze-1"), {
      seed: "s075-revert-a",
    });
    const runReserved = await v2.launchRun(planner(), envelope(people.assignPlanner, "revert-run-1"), {
      packageId: withReservation.value.id,
    });
    await v2.withdrawReservation(planner(), envelope(people.assignPlanner, "revert-res-w"), {
      editionId: reserved.value.id,
      reason: "Withdraw reservation for S075 replay",
    });
    const afterWithdraw = await v2.freezePackage(planner(), envelope(people.assignPlanner, "revert-freeze-2"), {
      seed: "s075-revert-a",
    });
    assert.notEqual(afterWithdraw.value.id, withReservation.value.id);
    assert.notEqual(afterWithdraw.value.contentHash, withReservation.value.contentHash);
    const runWithdrawn = await v2.launchRun(planner(), envelope(people.assignPlanner, "revert-run-2"), {
      packageId: afterWithdraw.value.id,
    });
    assert.notEqual(runWithdrawn.value.id, runReserved.value.id);
    const historic = await v2.repository.transaction(async (tx) => tx.load<SeatingV2Run>("runs", runReserved.value.id, envelope(people.assignPlanner, "revert-hist")));
    assert.ok(historic);
    assert.equal(historic.packageHash, withReservation.value.contentHash);
    const seedB = await v2.freezePackage(planner(), envelope(people.assignPlanner, "revert-freeze-b"), {
      seed: "s075-revert-b",
    });
    const runB = await v2.launchRun(planner(), envelope(people.assignPlanner, "revert-run-b"), { packageId: seedB.value.id });
    const seedAAgain = await v2.freezePackage(planner(), envelope(people.assignPlanner, "revert-freeze-a2"), {
      seed: "s075-revert-a",
    });
    assert.equal(seedAAgain.application, "REPLAYED");
    assert.equal(seedAAgain.value.id, afterWithdraw.value.id);
    const runAAgain = await v2.launchRun(planner(), envelope(people.assignPlanner, "revert-run-a2"), {
      packageId: seedAAgain.value.id,
    });
    assert.equal(runAAgain.application, "REPLAYED");
    assert.equal(runAAgain.didDataChange, false);
    assert.equal(runAAgain.value.id, runWithdrawn.value.id);
    assert.notEqual(runAAgain.value.id, runB.value.id);
  });

  it("keeps a historic compiler run immutable and refuses adopt under the corrected compiler", async () => {
    const { service, guests } = preparePair("historic");
    const v2 = service.seatingV2Commands();
    await activateKeepApart(v2, guests[0]!.id, guests[1]!.id, "historic");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "historic-freeze"), {
      seed: "s075-historic",
    });
    const current = await v2.launchRun(planner(), envelope(people.assignPlanner, "historic-run"), {
      packageId: frozen.value.id,
    });
    memoryRun(v2, current.value.id).compilerVersion = SEATING_V2_LEGACY_COMPILER_VERSION;
    const unchanged = memoryRun(v2, current.value.id);
    assert.equal(unchanged?.compilerVersion, SEATING_V2_LEGACY_COMPILER_VERSION);
    assert.equal(unchanged?.packageHash, frozen.value.contentHash);
    await assert.rejects(
      () => v2.adoptRun(planner(), envelope(people.assignPlanner, "historic-adopt"), { runId: current.value.id }),
      (error: unknown) => error instanceof PlatformError && error.code === "ADOPTION_MISMATCH",
    );
    const relaunch = await v2.launchRun(planner(), envelope(people.assignPlanner, "historic-relaunch"), {
      packageId: frozen.value.id,
    });
    assert.equal(relaunch.application, "APPLIED");
    assert.notEqual(relaunch.value.id, current.value.id);
    assert.equal(relaunch.value.compilerVersion, SEATING_V2_COMPILER_VERSION);
  });

  it("replays the identical tuple through PostgreSQL integration", async () => {
    const pg = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(pg);
    const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
    const { guests } = preparePair("pg", { service, store });
    const v2 = service.seatingV2Commands();
    await activateKeepApart(v2, guests[0]!.id, guests[1]!.id, "pg");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "pg-freeze"), { seed: "s075-pg" });
    const first = await v2.launchRun(planner(), envelope(people.assignPlanner, "pg-run-1"), { packageId: frozen.value.id });
    const second = await v2.launchRun(planner(), envelope(people.assignPlanner, "pg-run-2"), { packageId: frozen.value.id });
    assert.equal(first.application, "APPLIED");
    assert.equal(second.application, "REPLAYED");
    assert.equal(second.didDataChange, false);
    assert.equal(second.value.id, first.value.id);
    assert.equal(second.value.compilerVersion, SEATING_V2_COMPILER_VERSION);
    assert.equal(second.value.validatorVersion, SEATING_V2_VALIDATOR_VERSION);
  });
});
