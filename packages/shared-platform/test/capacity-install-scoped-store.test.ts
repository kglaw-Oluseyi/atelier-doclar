/**
 * Phase 2 — audit/idempotency read-site safety for CAP1000 installer scoping.
 * Generated during CAP1000 product-install OOM closure; dated artifact.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadNonProductionFixtures } from "../src/bootstrap.js";
import { FIXTURE_IDS as people } from "../src/fixtures.js";
import {
  CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
  EVENT_OS_CLEANUP_PROJECT_ID,
  installCapacityLiveFixture,
  openCapacityInstallPostgresStore,
} from "../src/index.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { applyCapacity1000SeatingLayout, CAPACITY_1000_LAYOUT_JUSTIFICATION } from "../src/seating-capacity-1000-layout-fixture.js";
import { actor } from "./helpers.js";

const NOW = "2026-09-18T00:20:00.000Z";
const liveEnv = {
  RAILWAY_PROJECT_ID: EVENT_OS_CLEANUP_PROJECT_ID,
  RAILWAY_PROJECT_NAME: "atelier-doclar",
  RAILWAY_ENVIRONMENT_NAME: "production",
  RAILWAY_SERVICE_NAME: "event-os",
  DATABASE_URL: "postgresql://postgres:test@127.0.0.1:5432/railway",
};

function collectionCountsFromDocs(
  pg: MemoryPlatformPg,
  eventId: string,
): Record<string, number> {
  const byCollection: Record<string, number> = {};
  for (const row of pg.documents) {
    if (row.event_id !== eventId && (row.body as { eventId?: string })?.eventId !== eventId) continue;
    byCollection[row.collection] = (byCollection[row.collection] ?? 0) + 1;
  }
  return byCollection;
}

describe("CAP1000 installer-scoped Postgres hydrate", () => {
  it("scoped open omits historical audit and prefix-filters idempotency without changing default open", async () => {
    const pg = new MemoryPlatformPg();
    pg.audit.push({
      id: "hist-audit-1",
      action: "other.session",
      outcome: "SUCCESS",
      organisationId: people.orgMaison,
      resourceType: "event",
      correlationId: "hist",
      occurredAt: NOW,
      schemaVersion: 1,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
    });
    pg.idempotency.push({
      key: "other-process-key",
      action: "event.created",
      hash: "h1",
      resultRef: "r1",
      createdAt: NOW,
      body: { key: "other-process-key", action: "event.created", hash: "h1", resultRef: "r1", createdAt: NOW },
    });
    pg.idempotency.push({
      key: "cap1000-live-prior-guest-0-in",
      action: "guest.intake.recorded",
      hash: "h2",
      resultRef: "r2",
      createdAt: NOW,
      body: {
        key: "cap1000-live-prior-guest-0-in",
        action: "guest.intake.recorded",
        hash: "h2",
        resultRef: "r2",
        createdAt: NOW,
      },
    });

    const full = await PostgresPlatformStore.open(pg);
    assert.equal(full.viewSnapshot().audit.some((item) => item.id === "hist-audit-1"), true);
    assert.equal(full.viewSnapshot().idempotency.some((item) => item.key === "other-process-key"), true);

    const scoped = await openCapacityInstallPostgresStore(pg, {
      idempotencyKeyLike: CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
      omitHistoricalAudit: true,
    });
    assert.equal(scoped.viewSnapshot().audit.length, 0);
    assert.equal(scoped.viewSnapshot().idempotency.every((item) => item.key.startsWith("cap1000-live-")), true);
    assert.equal(scoped.viewSnapshot().idempotency.some((item) => item.key === "cap1000-live-prior-guest-0-in"), true);
    assert.equal(scoped.viewSnapshot().idempotency.some((item) => item.key === "other-process-key"), false);
  });

  it("scoped and unscoped installs persist equivalent event-scoped structure and installer idempotency keys", async () => {
    async function installOnce(scoped: boolean) {
      const pg = new MemoryPlatformPg();
      pg.audit.push({
        id: "noise-audit",
        action: "noise",
        outcome: "SUCCESS",
        organisationId: people.orgMaison,
        resourceType: "event",
        correlationId: "noise",
        occurredAt: NOW,
        schemaVersion: 1,
        createdAt: NOW,
        updatedAt: NOW,
        version: 1,
      });
      pg.idempotency.push({
        key: "noise-key",
        action: "noise",
        hash: "n",
        resultRef: "n",
        createdAt: NOW,
        body: { key: "noise-key", action: "noise", hash: "n", resultRef: "n", createdAt: NOW },
      });
      const store = scoped
        ? await openCapacityInstallPostgresStore(pg, {
            idempotencyKeyLike: CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
            omitHistoricalAudit: true,
          })
        : await PostgresPlatformStore.open(pg);
      const service = loadNonProductionFixtures(store);
      const installed = await installCapacityLiveFixture(service, store, {
        fixture: "CAP1000",
        confirmSyntheticQualification: true,
        env: liveEnv,
        productionAuthorised: false,
        providersInactive: true,
        communicationsInactive: true,
        now: NOW,
      });
      await store.flush();
      const byCollection = collectionCountsFromDocs(pg, installed.eventId);
      const idemSuffixes = pg.idempotency
        .filter((row) => row.key.startsWith(`cap1000-live-${installed.eventId}`))
        .map((row) => `${row.action}:${row.key.slice(`cap1000-live-${installed.eventId}`.length)}`)
        .sort();
      return {
        eventId: installed.eventId,
        byCollection,
        idemSuffixes,
        guestCount: installed.guestCount,
        tableCount: installed.tableCount,
        seatCount: installed.seatCount,
        foreignIdempotencyUntouched: pg.idempotency.some((row) => row.key === "noise-key"),
      };
    }

    const unscoped = await installOnce(false);
    const scoped = await installOnce(true);
    assert.equal(scoped.guestCount, 1000);
    assert.equal(scoped.tableCount, 110);
    assert.equal(scoped.seatCount, 1000);
    assert.deepEqual(scoped.byCollection, unscoped.byCollection);
    assert.deepEqual(scoped.idemSuffixes, unscoped.idemSuffixes);
    assert.equal(scoped.foreignIdempotencyUntouched, true);
    assert.equal(unscoped.foreignIdempotencyUntouched, true);
  });

  it("scoped mode still detects installer idempotency replay for own keys", async () => {
    const pg = new MemoryPlatformPg();
    const store = await openCapacityInstallPostgresStore(pg, {
      idempotencyKeyLike: CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE,
      omitHistoricalAudit: true,
    });
    const service = loadNonProductionFixtures(store);
    const first = await installCapacityLiveFixture(service, store, {
      fixture: "CAP1000",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      now: NOW,
    });
    await store.flush();
    const replay = await installCapacityLiveFixture(service, store, {
      fixture: "CAP1000",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      now: NOW,
    });
    assert.equal(replay.replay, true);
    assert.equal(replay.eventId, first.eventId);
    assert.equal(replay.guestCount, 1000);
  });

  it("CAP600 installer path does not require scoped open (default open remains available)", async () => {
    const pg = new MemoryPlatformPg();
    pg.audit.push({
      id: "keep-me",
      action: "noise",
      outcome: "SUCCESS",
      organisationId: people.orgMaison,
      resourceType: "event",
      correlationId: "noise",
      occurredAt: NOW,
      schemaVersion: 1,
      createdAt: NOW,
      updatedAt: NOW,
      version: 1,
    });
    const store = await PostgresPlatformStore.open(pg);
    assert.equal(store.viewSnapshot().audit.some((item) => item.id === "keep-me"), true);
    const service = loadNonProductionFixtures(store);
    const installed = await installCapacityLiveFixture(service, store, {
      fixture: "CAP600",
      confirmSyntheticQualification: true,
      env: liveEnv,
      productionAuthorised: false,
      providersInactive: true,
      communicationsInactive: true,
      now: NOW,
      expectedCorpusHash: undefined,
    });
    assert.equal(installed.fixture, "CAP600");
    assert.equal(installed.guestCount, 600);
    // Historical audit still present under default open (CAP600 does not opt into scoped mode).
    assert.equal(store.viewSnapshot().audit.some((item) => item.id === "keep-me"), true);
  });

  it("flush callback still fires per table + batch under layout fixture", async () => {
    const store = new (await import("../src/memory-store.js")).MemoryPlatformStore();
    const service = loadNonProductionFixtures(store);
    const admin = actor(people.personAdmin, { now: NOW, correlationId: "cap1k-scoped-flush-admin" });
    const event = service.createEvent(actor(people.personCeo, { now: NOW, correlationId: "cap1k-scoped-flush-create" }), {
      organisationId: people.orgMaison,
      clientId: people.clientAlpha,
      code: "CAP1KSCOPE",
      name: "[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000 Scope Flush",
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
      reason: "scope flush planner",
      idempotencyKey: "cap1k-scope-flush-grant-planner",
    });
    const directorGrant = service.grantAssignment(admin, {
      organisationId: people.orgMaison,
      personId: people.personDirector,
      roleKey: "EVENT_DIRECTOR",
      clientId: people.clientAlpha,
      eventId: event.id,
      reason: "scope flush director",
      idempotencyKey: "cap1k-scope-flush-grant-director",
    });
    let flushCount = 0;
    const result = await applyCapacity1000SeatingLayout(
      service,
      store,
      event.id,
      actor(people.personPlanner, { now: NOW, correlationId: "cap1k-scope-flush-planner" }),
      actor(people.personDirector, { now: NOW, correlationId: "cap1k-scope-flush-director" }),
      "cap1k-scope-flush",
      {
        plannerAssignmentId: plannerGrant.id,
        directorAssignmentId: directorGrant.id,
        flush: async () => {
          flushCount += 1;
        },
      },
    );
    assert.equal(flushCount, CAPACITY_1000_LAYOUT_JUSTIFICATION.totalTables + result.batchDiffs.length);
  });
});
