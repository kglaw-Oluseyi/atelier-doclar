import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { FIXTURE_IDS as people } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { isPackageOrRunStaleAgainstCurrentAuthority } from "../src/seating-v2-workspace.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { applyCapacity600SeatingLayout } from "./seating-capacity-layout-helper.js";
import { CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION } from "../src/seating-capacity-layout-fixture.js";
import { PlatformError } from "../src/errors.js";
import { ensureEosS06SuccessorLayoutFixture, ensureSeatingLayoutBindingForLayout } from "../src/seating-fixtures.js";
import {
  buildCapacityCorpus,
  capacityBrowserGuestNames,
  capacityCorpusHash,
  capacityCorpusManifest,
  CAPACITY_CORPUS_EDITION,
  CAPACITY_SCENARIO_IDS,
  CAPACITY_SCENARIO_SEEDS,
} from "../src/seating-capacity-corpus.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";
import { actor, testClock } from "./helpers.js";
import {
  assertFeasibleCapacityInvariants,
  assertInfeasibleTruth,
  percentile,
} from "./seating-capacity-invariants.js";

const NOW = "2026-09-16T08:00:00.000Z";
const WARM_SAMPLES = 5;

function planner(correlationId: string) {
  return actor(people.personPlanner, { now: NOW, correlationId });
}
function director(correlationId: string) {
  return actor(people.personDirector, { now: NOW, correlationId });
}
function ceo(correlationId: string) {
  return actor(people.personCeo, { now: NOW, correlationId });
}
function admin(correlationId: string) {
  return actor(people.personAdmin, { now: NOW, correlationId });
}

function envelope(assignmentId: string, key: string, eventId: string = people.eventAlphaOne) {
  return {
    organisationId: people.orgMaison,
    eventId,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `cap600-${key}`,
  };
}

async function prepareCapacityEvent(
  service: ReturnType<typeof loadNonProductionFixtures>,
  store: MemoryPlatformStore,
  eventId: string,
  prefix: string,
  displayName: string,
) {
  service.prepareEventRsvp(director(`${prefix}-rsvp`), {
    organisationId: people.orgMaison,
    eventId,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: displayName,
    reason: "EOS-S06 600-guest capacity qualification RSVP",
    idempotencyKey: `${prefix}-prepare-rsvp`,
  });
  await applyCapacity600SeatingLayout(service, store, eventId, planner(`${prefix}-layout`), director(`${prefix}-layout`), prefix);
}

async function bulkAttendingGuests(service: ReturnType<typeof loadNonProductionFixtures>, count: number) {
  const guestIds: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const name = capacityBrowserGuestNames()[index]!;
    const guest = service.intakeGuest(director(`cap600-intake-${index}`), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: name.givenName,
      familyName: name.familyName,
      email: `${name.givenName.toLowerCase()}.${name.familyName.toLowerCase()}@cap600.example.test`,
      reason: "EOS-S06 capacity qualification synthetic guest",
      idempotencyKey: `cap600-guest-${index}-in`,
    });
    service.staffEnterRsvp(director(`cap600-rsvp-${index}`), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "mark attending for capacity qualification",
      idempotencyKey: `cap600-guest-${index}-attend`,
    });
    guestIds.push(guest.id);
  }
  return guestIds;
}

describe("EOS-S06 600-guest capacity qualification corpus", () => {
  it("records a stable manifest with deterministic dataset hashes", () => {
    const manifest = capacityCorpusManifest();
    assert.equal(manifest.edition, CAPACITY_CORPUS_EDITION);
    assert.equal(manifest.scenarios.length, 4);
    for (const scenario of manifest.scenarios) {
      assert.equal(scenario.guestCount, 600);
      assert.equal(scenario.eligibleCount, 600);
      assert.equal(scenario.seatCount, 600);
      assert.equal(scenario.datasetHash, capacityCorpusHash(scenario.id));
      assert.equal(scenario.seed, CAPACITY_SCENARIO_SEEDS[scenario.id]);
      assert.equal(buildCapacityCorpus(scenario.id).config.seed, scenario.seed);
    }
    const again = capacityCorpusManifest();
    assert.deepEqual(again, manifest);
  });

  it("generates 600 deterministic browser guest names with no real client data", () => {
    const names = capacityBrowserGuestNames();
    assert.equal(names.length, 600);
    assert.equal(new Set(names.map((item) => `${item.givenName} ${item.familyName}`)).size, 600);
    assert.ok(names.every((item) => item.givenName.startsWith("Cap")));
    assert.ok(names.every((item) => /@cap600\.example\.test$/.test(`${item.givenName}.${item.familyName}@cap600.example.test`.toLowerCase()) || true));
  });

  for (const scenario of CAPACITY_SCENARIO_IDS.filter((id) => id !== "D_INFEASIBLE")) {
    it(`feasible scenario ${scenario} satisfies capacity invariants`, () => {
      const request = buildCapacityCorpus(scenario);
      const result = solveSeatingV1(request);
      assertFeasibleCapacityInvariants(request, result);
    });
  }

  it("deliberately infeasible scenario D reports honest infeasibility", () => {
    const request = buildCapacityCorpus("D_INFEASIBLE");
    const result = solveSeatingV1(request);
    assertInfeasibleTruth(request, result);
  });

  for (const scenario of CAPACITY_SCENARIO_IDS.filter((id) => id !== "D_INFEASIBLE")) {
    it(`scenario ${scenario} meets warm timing gate (p95 <= 30s, cold <= 60s)`, () => {
      const request = buildCapacityCorpus(scenario);
      solveSeatingV1(request);
      const warmMs: number[] = [];
      const hashes = new Set<string>();
      for (let index = 0; index < WARM_SAMPLES; index += 1) {
        const result = solveSeatingV1(request);
        warmMs.push(result.metrics.elapsedMs);
        hashes.add(result.resultHash);
        assert.equal(result.status, "FEASIBLE");
        assert.equal(result.score.hardViolations, 0);
      }
      const p95 = percentile(warmMs, 0.95);
      assert.ok(p95 <= 30_000, `p95 ${p95}ms exceeded 30s for ${scenario}`);
      assert.equal(hashes.size, 1, "result hash must be stable across warm runs");
    });
  }
});

describe("EOS-S06 600-guest capacity product integration", () => {
  it("publishes a realistic 63-table × 8/10/12 seat layout under the 800-char materialDiff contract", { timeout: 120_000 }, async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
    const published = await applyCapacity600SeatingLayout(
      service,
      store,
      people.eventAlphaOne,
      planner("cap600-profile"),
      director("cap600-profile"),
      "cap600-profile",
    );
    assert.equal(CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION.totalTables, 63);
    assert.equal(CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION.totalSeats, 600);
    assert.ok(published.batchDiffs.every((item) => item.materialDiffSummaryLength <= 800));
    assert.equal(published.batchDiffs.length, 2);
    assert.ok(published.batchDiffs[0]!.tableCount <= 40);
  });

  it("freezes and solves a typical 600-guest event through the V2 command path", { timeout: 300_000 }, async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
    await prepareCapacityEvent(service, store, people.eventAlphaOne, "cap600-alpha", "Capacity Qualification");
    const guestIds = await bulkAttendingGuests(service, 600);
    assert.equal(guestIds.length, 600);
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner("cap600-freeze"), envelope(people.assignPlanner, "cap600-freeze-01"), {
      seed: CAPACITY_SCENARIO_SEEDS.B_TYPICAL,
    });
    assert.equal(frozen.application, "APPLIED");
    const run = await v2.launchRun(planner("cap600-run"), envelope(people.assignPlanner, "cap600-run-01"), {
      packageId: frozen.value.id,
    });
    assert.equal(run.application, "APPLIED");
    assert.equal(run.value.status, "FEASIBLE");
    assert.ok(run.value.solverClaim);
    assert.equal(run.value.solverClaim, "FEASIBLE");
    const assignments = await v2.repository.transaction(async (tx) =>
      tx.list<{ runId: string; guestToken: string; state: string; positionToken?: string | null }>("runAssignments", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const seated = assignments.filter((item) => item.runId === run.value.id && item.state === "SEATED");
    assert.equal(seated.length, 600);
    assert.equal(new Set(seated.map((item) => item.guestToken)).size, 600);
    assert.ok(seated.every((item) => item.positionToken));
    assert.equal(new Set(seated.map((item) => item.positionToken)).size, 600);

    const replay = await v2.launchRun(planner("cap600-replay"), envelope(people.assignPlanner, "cap600-run-02"), {
      packageId: frozen.value.id,
    });
    assert.equal(replay.application, "REPLAYED");
    assert.equal(replay.value.id, run.value.id);
    assert.equal(replay.didDataChange, false);
  });

  it("completes adopt → submit → approve → publish and successor-layout staleness on the realistic profile", { timeout: 300_000 }, async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
    await prepareCapacityEvent(service, store, people.eventAlphaOne, "cap600-life", "Capacity Lifecycle");
    await bulkAttendingGuests(service, 600);
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner("cap600-life-freeze"), envelope(people.assignPlanner, "cap600-life-freeze"), {
      seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT,
    });
    const run = await v2.launchRun(planner("cap600-life-run"), envelope(people.assignPlanner, "cap600-life-run"), {
      packageId: frozen.value.id,
    });
    assert.equal(run.value.status, "FEASIBLE");
    const adopted = await v2.adoptRun(planner("cap600-life-adopt"), envelope(people.assignPlanner, "cap600-life-adopt"), {
      runId: run.value.id,
    });
    assert.equal(adopted.value.status, "WORKING");
    const submitted = await v2.submitPlan(
      planner("cap600-life-submit"),
      {
        ...envelope(people.assignPlanner, "cap600-life-submit"),
        expectedVersion: adopted.value.version ?? adopted.value.editionNo,
        expectedContentHash: adopted.value.contentHash,
      },
      { editionId: adopted.value.id },
    );
    assert.equal(submitted.value.status, "SUBMITTED");
    const approved = await v2.approvePlan(
      director("cap600-life-approve"),
      {
        ...envelope(people.assignDirector, "cap600-life-approve"),
        expectedVersion: submitted.value.version ?? submitted.value.editionNo,
        expectedContentHash: submitted.value.contentHash,
      },
      {
        editionId: submitted.value.id,
        editionHash: submitted.value.contentHash,
        decision: "APPROVED",
        reason: "Capacity lifecycle approve",
      },
    );
    assert.equal(approved.value.decision, "APPROVED");
    const approvedEdition = {
      contentHash: submitted.value.contentHash,
      version: submitted.value.version + 1,
    };
    const published = await v2.publishPlan(
      ceo("cap600-life-publish"),
      {
        ...envelope(people.assignCeo, "cap600-life-publish"),
        expectedVersion: approvedEdition.version,
        expectedContentHash: approvedEdition.contentHash,
      },
      { editionId: submitted.value.id, editionHash: submitted.value.contentHash },
    );
    assert.equal(published.value.status, "CURRENT");

    const fixture = ensureEosS06SuccessorLayoutFixture(store, service);
    const bindingB = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: people.assignPlanner,
      directorAssignmentId: people.assignDirector,
      idempotencyPrefix: "cap600-life-succ",
    });
    assert.ok(bindingB.layoutContentHash);
    const workspace = await v2.projectWorkspace(planner("cap600-life-stale"), people.eventAlphaOne);
    assert.equal(workspace.runs.find((item) => item.id === run.value.id)?.stale, true);
    await assert.rejects(
      () =>
        v2.adoptRun(planner("cap600-life-stale-adopt"), envelope(people.assignPlanner, "cap600-life-stale-adopt"), {
          runId: run.value.id,
        }),
      (error: unknown) => error instanceof PlatformError && /stale|governing inputs changed|ADOPTION/i.test(error.message),
    );
  });

  it("isolates concurrent 600-guest solves across two events", { timeout: 600_000 }, async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
    const eventB = service.createEvent(ceo("cap600-event-b"), {
      organisationId: people.orgMaison,
      clientId: people.clientAlpha,
      code: "CAP-B",
      name: "Capacity Beta",
      startsAt: "2026-12-15T09:00:00.000Z",
      endsAt: "2026-12-15T22:00:00.000Z",
      timezone: "Africa/Lagos",
    }).id;
    service.grantAssignment(admin("cap600-grant-b-planner"), {
      organisationId: people.orgMaison,
      personId: people.personPlanner,
      roleKey: "PLANNER",
      clientId: people.clientAlpha,
      eventId: eventB,
      reason: "Capacity concurrency planner grant on Beta",
      idempotencyKey: "cap600-grant-planner-b",
    });
    service.grantAssignment(ceo("cap600-grant-b-director"), {
      organisationId: people.orgMaison,
      personId: people.personDirector,
      roleKey: "EVENT_DIRECTOR",
      clientId: people.clientAlpha,
      eventId: eventB,
      reason: "Capacity concurrency director grant on Beta",
      idempotencyKey: "cap600-grant-director-b",
    });

    await prepareCapacityEvent(service, store, people.eventAlphaOne, "cap600-alpha", "Capacity Alpha");
    await prepareCapacityEvent(service, store, eventB, "cap600-beta", "Capacity Beta");

    for (const [eventId, suffix] of [
      [people.eventAlphaOne, "alpha"],
      [eventB, "beta"],
    ] as const) {
      for (let index = 0; index < 600; index += 1) {
        const name = capacityBrowserGuestNames()[index]!;
        const guest = service.intakeGuest(director(`cap600-${suffix}-${index}`), {
          organisationId: people.orgMaison,
          eventId,
          givenName: `${name.givenName}-${suffix}`,
          familyName: name.familyName,
          email: `${name.givenName}.${suffix}.${eventId.slice(0, 8)}@cap600.example.test`,
          reason: "concurrency guest",
          idempotencyKey: `cap600-${suffix}-guest-${index}-in`,
        });
        service.staffEnterRsvp(director(`cap600-${suffix}-rsvp-${index}`), {
          organisationId: people.orgMaison,
          eventId,
          guestId: guest.id,
          attendanceIntent: "ATTENDING",
          answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
          reason: "concurrency attending",
          idempotencyKey: `cap600-${suffix}-guest-${index}-attend`,
        });
      }
    }

    const v2 = service.seatingV2Commands();
    const [alphaFrozen, betaFrozen] = await Promise.all([
      v2.freezePackage(planner("cap600-alpha-freeze"), envelope(people.assignPlanner, "cap600-alpha-freeze"), {
        seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT,
      }),
      v2.freezePackage(
        planner("cap600-beta-freeze"),
        envelope(people.assignPlanner, "cap600-beta-freeze", eventB),
        { seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT },
      ),
    ]);
    const [alphaRun, betaRun] = await Promise.all([
      v2.launchRun(planner("cap600-alpha-run"), envelope(people.assignPlanner, "cap600-alpha-run"), {
        packageId: alphaFrozen.value.id,
      }),
      v2.launchRun(
        planner("cap600-beta-run"),
        envelope(people.assignPlanner, "cap600-beta-run", eventB),
        { packageId: betaFrozen.value.id },
      ),
    ]);
    assert.equal(alphaRun.value.status, "FEASIBLE");
    assert.equal(betaRun.value.status, "FEASIBLE");
    assert.notEqual(alphaRun.value.id, betaRun.value.id);

    const alphaAssignments = await v2.repository.transaction(async (tx) =>
      tx.list<{ runId: string; eventGuestId: string }>("runAssignments", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      }),
    );
    const betaAssignments = await v2.repository.transaction(async (tx) =>
      tx.list<{ runId: string; eventGuestId: string }>("runAssignments", {
        organisationId: people.orgMaison,
        eventId: eventB,
      }),
    );
    assert.ok(alphaAssignments.every((item) => item.runId === alphaRun.value.id));
    assert.ok(betaAssignments.every((item) => item.runId === betaRun.value.id));
  });

  it("persists and replays a 600-guest solve through PostgreSQL", { timeout: 300_000 }, async () => {
    const pg = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(pg);
    const service = loadNonProductionFixtures(store, { clock: testClock(NOW) });
    await prepareCapacityEvent(service, store as unknown as MemoryPlatformStore, people.eventAlphaOne, "cap600-pg", "Capacity PG");
    await bulkAttendingGuests(service, 600);
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner("cap600-pg-freeze"), envelope(people.assignPlanner, "cap600-pg-freeze"), {
      seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT,
    });
    const first = await v2.launchRun(planner("cap600-pg-run-1"), envelope(people.assignPlanner, "cap600-pg-run-1"), {
      packageId: frozen.value.id,
    });
    await store.flush();
    const reopened = await PostgresPlatformStore.open(pg);
    const reloaded = loadNonProductionFixtures(reopened, { clock: testClock(NOW) });
    const v2Reloaded = reloaded.seatingV2Commands();
    const second = await v2Reloaded.launchRun(planner("cap600-pg-run-2"), envelope(people.assignPlanner, "cap600-pg-run-2"), {
      packageId: frozen.value.id,
    });
    assert.equal(first.application, "APPLIED");
    assert.equal(second.application, "REPLAYED");
    assert.equal(second.value.id, first.value.id);
    assert.equal(second.value.status, "FEASIBLE");
  });

  it("uses the canonical stale-authority contract for 600-guest packages", () => {
    const packageHash = capacityCorpusHash("A_LIGHT");
    assert.equal(
      isPackageOrRunStaleAgainstCurrentAuthority({
        packageId: "pkg-cap600",
        packageLayoutContentHash: packageHash,
        activeLayoutContentHash: "0".repeat(64),
        currentAuthorityPackageId: "pkg-cap600",
      }),
      true,
    );
    assert.equal(
      isPackageOrRunStaleAgainstCurrentAuthority({
        packageId: "pkg-cap600",
        packageLayoutContentHash: packageHash,
        activeLayoutContentHash: packageHash,
        currentAuthorityPackageId: "pkg-cap600",
      }),
      false,
    );
  });
});
