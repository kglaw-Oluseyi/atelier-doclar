import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { FIXTURE_IDS as people } from "../src/fixtures.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { applyCapacity1000SeatingLayout, CAPACITY_1000_LAYOUT_JUSTIFICATION } from "../src/seating-capacity-1000-layout-fixture.js";
import { installCapacityLiveFixture, EVENT_OS_CLEANUP_PROJECT_ID } from "../src/index.js";
import { actor } from "./helpers.js";

const NOW = "2026-09-17T22:30:00.000Z";
const liveEnv = {
  RAILWAY_PROJECT_ID: EVENT_OS_CLEANUP_PROJECT_ID,
  RAILWAY_PROJECT_NAME: "atelier-doclar",
  RAILWAY_ENVIRONMENT_NAME: "production",
  RAILWAY_SERVICE_NAME: "event-os",
  DATABASE_URL: "postgresql://postgres:test@127.0.0.1:5432/railway",
};

describe("CAP1000 layout persistence flush callback", () => {
  it("invokes flush once after every completed layout publish batch and keeps 110/1000", async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const admin = actor(people.personAdmin, { now: NOW, correlationId: "cap1k-flush-admin" });
    const event = service.createEvent(actor(people.personCeo, { now: NOW, correlationId: "cap1k-flush-create" }), {
      organisationId: people.orgMaison,
      clientId: people.clientAlpha,
      code: "CAP1KFLUSH",
      name: "[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000 Flush Test",
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
      reason: "flush test planner",
      idempotencyKey: "cap1k-flush-grant-planner",
    });
    const directorGrant = service.grantAssignment(admin, {
      organisationId: people.orgMaison,
      personId: people.personDirector,
      roleKey: "EVENT_DIRECTOR",
      clientId: people.clientAlpha,
      eventId: event.id,
      reason: "flush test director",
      idempotencyKey: "cap1k-flush-grant-director",
    });

    let flushCount = 0;
    const result = await applyCapacity1000SeatingLayout(
      service,
      store,
      event.id,
      actor(people.personPlanner, { now: NOW, correlationId: "cap1k-flush-planner" }),
      actor(people.personDirector, { now: NOW, correlationId: "cap1k-flush-director" }),
      "cap1k-flush",
      {
        plannerAssignmentId: plannerGrant.id,
        directorAssignmentId: directorGrant.id,
        flush: async () => {
          flushCount += 1;
        },
      },
    );

    // One flush per table command + one flush after each published batch.
    assert.equal(flushCount, CAPACITY_1000_LAYOUT_JUSTIFICATION.totalTables + result.batchDiffs.length);
    assert.equal(result.batchDiffs.length >= 3, true);
    assert.equal(CAPACITY_1000_LAYOUT_JUSTIFICATION.totalTables, 110);
    assert.equal(CAPACITY_1000_LAYOUT_JUSTIFICATION.totalSeats, 1000);
    assert.equal(result.profile.totalTables, 110);
    assert.equal(result.profile.totalSeats, 1000);
    assert.ok(result.publication);
    assert.equal(result.publication.status, "CURRENT");
  });

  it("CAP1000 installer defaults guestFlushEvery to 10 and CAP600 remains 25-compatible", async () => {
    const store = new MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    let guestFlushMarks = 0;
    const installed = await installCapacityLiveFixture(service, store, {
      fixture: "CAP1000",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      onProgress: (message) => {
        if (/guests flushed/.test(message)) guestFlushMarks += 1;
      },
    });
    assert.equal(installed.guestCount, 1000);
    assert.equal(installed.tableCount, 110);
    assert.equal(installed.seatCount, 1000);
    assert.equal(guestFlushMarks, 200); // 1000 / 5
    assert.equal(installed.replay, false);

    const replay = await installCapacityLiveFixture(service, store, {
      fixture: "CAP1000",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      verifyOnly: true,
    });
    assert.equal(replay.replay, true);
    assert.equal(replay.eventId, installed.eventId);
  });
});
