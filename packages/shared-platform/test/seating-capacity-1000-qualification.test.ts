import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import {
  ACCEPTED_CAP600_CORPUS_HASHES,
  CAP1000_EDITION,
  CAP600_EDITION,
  EVENT_OS_CLEANUP_PROJECT_ID,
  installCapacityLiveFixture,
} from "../src/index.js";
import { FIXTURE_IDS as people } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { applyCapacity1000SeatingLayout, CAPACITY_1000_LAYOUT_JUSTIFICATION } from "../src/seating-capacity-1000-layout-fixture.js";
import {
  buildCapacity1000Corpus,
  capacity1000CorpusHash,
  capacity1000CorpusManifest,
  CAPACITY_1000_SCENARIO_IDS,
} from "../src/seating-capacity-1000-corpus.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";
import { actor } from "./helpers.js";
import { assertFeasibleCapacityInvariants, assertInfeasibleTruth, percentile } from "./seating-capacity-invariants.js";

const NOW = "2026-09-16T14:00:00.000Z";
const liveEnv = {
  RAILWAY_PROJECT_ID: EVENT_OS_CLEANUP_PROJECT_ID,
  RAILWAY_PROJECT_NAME: "atelier-doclar",
  RAILWAY_ENVIRONMENT_NAME: "production",
  RAILWAY_SERVICE_NAME: "event-os",
  DATABASE_URL: "postgresql://postgres:test@127.0.0.1:5432/railway",
};

describe("capacity 1000 corpus and layout", () => {
  it("manifest has stable edition and 1000/1000/1000 counts", () => {
    const manifest = capacity1000CorpusManifest();
    assert.equal(manifest.edition, CAP1000_EDITION);
    assert.equal(manifest.scenarios.length, 5);
    for (const scenario of manifest.scenarios) {
      assert.equal(scenario.guestCount, 1000);
      assert.equal(scenario.eligibleCount, 1000);
      assert.equal(scenario.seatCount, 1000);
      assert.equal(scenario.datasetHash, capacity1000CorpusHash(scenario.id));
    }
  });

  it("layout justification is 110 tables / 1000 seats", () => {
    assert.equal(CAPACITY_1000_LAYOUT_JUSTIFICATION.totalTables, 110);
    assert.equal(CAPACITY_1000_LAYOUT_JUSTIFICATION.totalSeats, 1000);
  });

  it("publishes CAP1000 layout through governed product path", async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const admin = actor(people.personAdmin, { now: NOW, correlationId: "cap1k-admin" });
    const event = service.createEvent(actor(people.personCeo, { now: NOW, correlationId: "cap1k-create" }), {
      organisationId: people.orgMaison,
      clientId: people.clientAlpha,
      code: "CAP1KT",
      name: "[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000 Test",
      startsAt: "2026-12-21T09:00:00.000Z",
      endsAt: "2026-12-21T22:00:00.000Z",
      timezone: "Africa/Lagos",
    });
    const plannerGrant = service.grantAssignment(admin, {
      organisationId: people.orgMaison,
      personId: people.personPlanner,
      roleKey: "PLANNER",
      clientId: people.clientAlpha,
      eventId: event.id,
      reason: "CAP1000 layout test planner",
      idempotencyKey: "cap1k-test-grant-planner",
    });
    const directorGrant = service.grantAssignment(actor(people.personCeo, { now: NOW, correlationId: "cap1k-grant-director" }), {
      organisationId: people.orgMaison,
      personId: people.personDirector,
      roleKey: "EVENT_DIRECTOR",
      clientId: people.clientAlpha,
      eventId: event.id,
      reason: "CAP1000 layout test director",
      idempotencyKey: "cap1k-test-grant-director",
    });
    const result = await applyCapacity1000SeatingLayout(
      service,
      store,
      event.id,
      actor(people.personPlanner, { now: NOW, correlationId: "cap1k-plan" }),
      actor(people.personDirector, { now: NOW, correlationId: "cap1k-dir" }),
      "cap1k-test",
      { plannerAssignmentId: plannerGrant.id, directorAssignmentId: directorGrant.id },
    );
    assert.equal(result.profile.totalTables, 110);
    assert.equal(result.profile.totalSeats, 1000);
    assert.ok(result.batchDiffs.every((batch) => batch.materialDiffSummaryLength <= 800));
  });
});

describe("capacity 1000 solver scenarios", () => {
  for (const scenario of CAPACITY_1000_SCENARIO_IDS.filter((id) => id !== "E_RECOVERY")) {
    it(`${scenario} meets correctness expectations`, () => {
      const request = buildCapacity1000Corpus(scenario);
      const result = solveSeatingV1(request);
      if (scenario === "D_INFEASIBLE") {
        assertInfeasibleTruth(request, result);
      } else {
        assertFeasibleCapacityInvariants(request, result);
        assert.equal(result.status, "FEASIBLE");
      }
    });
  }

  it("A_LIGHT timing sample records solver elapsed under ceiling", () => {
    const request = buildCapacity1000Corpus("A_LIGHT");
    const cold = solveSeatingV1(request);
    assertFeasibleCapacityInvariants(request, cold);
    const warm: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const sample = solveSeatingV1(request);
      warm.push(sample.metrics.elapsedMs);
    }
    const p95 = percentile(warm, 95);
    assert.ok(cold.metrics.elapsedMs <= 60_000, `cold ${cold.metrics.elapsedMs}`);
    assert.ok(p95 <= 60_000, `warm p95 ${p95}`);
  });
});

describe("capacity live install dry-run and replay", () => {
  it("dry-run does not create events", async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const before = store.snapshot().events.length;
    const result = await installCapacityLiveFixture(service, store, {
      fixture: "CAP600",
      confirmSyntheticQualification: true,
      dryRun: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      expectedCorpusHash: ACCEPTED_CAP600_CORPUS_HASHES.B_TYPICAL,
    });
    assert.equal(result.dryRun, true);
    assert.equal(result.eventId, "dry-run-not-created");
    assert.equal(store.snapshot().events.length, before);
    assert.equal(result.edition, CAP600_EDITION);
  });

  it("install then replay returns same CAP1000 event", async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const first = await installCapacityLiveFixture(service, store, {
      fixture: "CAP1000",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      guestFlushEvery: 200,
    });
    assert.equal(first.replay, false);
    assert.equal(first.guestCount, 1000);
    assert.equal(first.tableCount, 110);
    assert.equal(first.seatCount, 1000);
    const second = await installCapacityLiveFixture(service, store, {
      fixture: "CAP1000",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
    });
    assert.equal(second.replay, true);
    assert.equal(second.eventId, first.eventId);
  });
});
