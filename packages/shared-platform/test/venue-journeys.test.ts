import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryPlatformStore,
  PlatformError,
  applySyntheticSnapshot,
  canonicalContentHash,
  canonicalSerialize,
  layoutContentHash,
  migrateEosS05,
  readAttendanceProjection,
  S05_FIXTURE_IDS,
} from "../src/index.js";
import { FROZEN_COORDINATE_SYSTEM, layoutBoundsFromSize } from "../src/venue-geometry.js";

const NOW = "2026-09-08T03:00:00.000Z";

function ceo(now = NOW) {
  return { personId: FIXTURE_IDS.personCeo, correlationId: "s05-ceo", now };
}

function director(now = NOW) {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s05-director", now };
}

function planner(now = NOW) {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s05-planner", now };
}

function admin() {
  return { personId: FIXTURE_IDS.personAdmin, correlationId: "s05-admin", now: NOW };
}

function auditor() {
  return { personId: FIXTURE_IDS.personAuditor, correlationId: "s05-auditor", now: NOW };
}

function otherOrg() {
  return { personId: FIXTURE_IDS.personOtherOrg, correlationId: "s05-other", now: NOW };
}

function seeded() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

function createVenue(service: ReturnType<typeof applySyntheticSnapshot>, suffix = "Pavilion") {
  return service.createVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: `Synthetic ${suffix}`,
    locality: "Ikoyi",
    countryCode: "NG",
    reason: "Register synthetic venue",
    idempotencyKey: `venue-${suffix}-${Date.now()}-${Math.random()}`,
  });
}

describe("EOS-S05 venue and blank-layout journeys", () => {
  it("seeds the additive migration and a synthetic venue without rewriting prior collections", () => {
    const { store } = seeded();
    const snap = store.snapshot();
    const result = migrateEosS05(snap, NOW);
    assert.equal(result.status, "REPLAYED");
    assert.ok(snap.venues.some((item) => item.id === S05_FIXTURE_IDS.venueIkoyi));
    assert.ok(snap.events.some((item) => item.id === FIXTURE_IDS.eventAlphaOne));
    assert.ok(snap.languageProfiles.length >= 0);
  });

  it("creates organisation-owned venues with facts, unknown states and metadata-only evidence", () => {
    const { service } = seeded();
    const venue = createVenue(service, "Harbour");
    const fact = service.recordVenueFact(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      venueId: venue.id,
      factType: "DECLARED_CAPACITY",
      subtype: "VENUE_STATED",
      unit: "COUNT",
      valueInteger: 180,
      sourceKind: "UNVERIFIED_REPORT",
      sourceLabel: "Synthetic venue note",
      verificationState: "UNVERIFIED",
      evidenceFileName: "capacity-note.pdf",
      evidenceMimeType: "application/pdf",
      reason: "Record unverified declared capacity",
    });
    assert.equal(fact.verificationState, "UNVERIFIED");
    assert.equal(fact.mayBecomeLockedSafetyConstraint, false);
    const detail = service.getVenueDetailWorkspace(director(), FIXTURE_IDS.orgMaison, venue.id);
    assert.equal(detail.binaryUploadAvailable, false);
    assert.match(detail.assetGap, /object-storage/);
    assert.equal(detail.facts[0]?.evidence?.uploadAvailable, false);
    assert.equal(detail.facts[0]?.evidence?.storageState, "UNAVAILABLE");
  });

  it("rejects guest identity on venue records and denies sysadmin verification", () => {
    const { service } = seeded();
    const venue = createVenue(service, "Identity");
    assert.throws(
      () =>
        service.createVenue(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          displayName: "Guest linked venue",
          guestId: FIXTURE_IDS.personCeo,
          reason: "forbidden",
        }),
      (error: unknown) => error instanceof PlatformError && /guest identity/i.test(error.message),
    );
    const fact = service.recordVenueFact(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      venueId: venue.id,
      factType: "SAFETY_THRESHOLD",
      subtype: "MAX_OCCUPANCY",
      unit: "COUNT",
      valueInteger: 200,
      sourceKind: "VENUE_SUPPLIED",
      sourceLabel: "Venue schedule",
      reason: "Record safety threshold",
    });
    assert.equal(fact.mayBecomeLockedSafetyConstraint, true);
    assert.throws(
      () =>
        service.verifyVenueFact(admin(), {
          organisationId: FIXTURE_IDS.orgMaison,
          venueId: venue.id,
          factId: fact.id,
          expectedVersion: fact.version,
          reason: "Admin must not verify",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const verified = service.verifyVenueFact(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      venueId: venue.id,
      factId: fact.id,
      expectedVersion: fact.version,
      reason: "Director verifies venue-supplied threshold",
    });
    assert.equal(verified.verificationState, "VERIFIED");
  });

  it("adopts a venue into an event without mutating the reusable source and denies cross-client reuse", () => {
    const { service } = seeded();
    const venue = createVenue(service, "Reuse");
    const before = service.getVenueDetailWorkspace(director(), FIXTURE_IDS.orgMaison, venue.id);
    const adopted = service.adoptVenue(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      venueId: venue.id,
      reason: "Adopt synthetic venue",
    });
    assert.equal(adopted.eventId, FIXTURE_IDS.eventAlphaOne);
    assert.equal(adopted.clientId, FIXTURE_IDS.clientAlpha);
    const after = service.getVenueDetailWorkspace(director(), FIXTURE_IDS.orgMaison, venue.id);
    assert.equal(after.venue.version, before.venue.version);
    service.recordEventVenueOverride(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      eventVenueId: adopted.id,
      factType: "OTHER",
      subtype: "GENERAL",
      unit: "TEXT",
      valueText: "Event-only floral set-up note",
      sourceKind: "STAFF_OBSERVED",
      sourceLabel: "Event production",
      reason: "Event-only override",
    });
    const workspace = service.getEventVenueWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    assert.equal(workspace.overrideFacts.length, 1);
    assert.equal(workspace.adopted?.venueName, venue.displayName);
    const betaEvent = service.createEvent(ceo(), {
      organisationId: FIXTURE_IDS.orgMaison,
      clientId: FIXTURE_IDS.clientBeta,
      code: "B1",
      name: "Beta One",
      startsAt: "2026-12-02T09:00:00.000Z",
      endsAt: "2026-12-02T22:00:00.000Z",
      timezone: "Africa/Lagos",
    });
    assert.throws(
      () =>
        service.adoptVenue(ceo(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: betaEvent.id,
          venueId: venue.id,
          reason: "Cross-client reuse",
        }),
      (error: unknown) => error instanceof PlatformError && /cross-client/i.test(error.message),
    );
  });

  it("enforces two-organisation isolation", () => {
    const { service } = seeded();
    const venue = createVenue(service, "Isolation");
    assert.throws(
      () => service.listVenues(otherOrg(), FIXTURE_IDS.orgMaison),
      (error: unknown) =>
        error instanceof PlatformError &&
        (error.code === "FORBIDDEN" || error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH"),
    );
    assert.throws(
      () => service.getVenueDetailWorkspace(otherOrg(), FIXTURE_IDS.orgMaison, venue.id),
      (error: unknown) => error instanceof PlatformError,
    );
    const otherVisible = service.listVenues(otherOrg(), FIXTURE_IDS.orgOther);
    assert.equal(otherVisible.some((item) => item.id === venue.id), false);
  });

  it("creates a blank layout with deterministic hash, rejects pixels and stale versions, and isolates events", () => {
    const { service, store } = seeded();
    const venue = createVenue(service, "Layout");
    const adopted = service.adoptVenue(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      venueId: venue.id,
      reason: "Adopt for layout",
    });
    const layout = service.createBlankLayout(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      eventVenueId: adopted.id,
      name: "Ceremony floor",
      widthMm: 24000,
      heightMm: 18000,
      displayLengthUnit: "METRE",
      reason: "Create blank layout",
    });
    const expectedHash = layoutContentHash({
      coordinateSystem: FROZEN_COORDINATE_SYSTEM,
      bounds: layoutBoundsFromSize(24000, 18000),
      objects: [],
    });
    assert.equal(layout.contentHash, expectedHash);
    assert.equal(canonicalSerialize({ a: 1, b: 2 }), canonicalSerialize({ b: 2, a: 1 }));
    assert.equal(canonicalContentHash({ a: 1, b: 2 }), createHash("sha256").update(canonicalSerialize({ a: 1, b: 2 })).digest("hex"));
    assert.throws(
      () =>
        service.updateLayoutSetup(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: layout.version,
          expectedRevisionNumber: layout.currentRevisionNumber,
          widthMm: 25000,
          screenX: 640,
          reason: "pixel persistence",
        }),
      (error: unknown) => error instanceof PlatformError && /pixel/i.test(error.message),
    );
    assert.throws(
      () =>
        service.createBlankLayout(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          eventVenueId: adopted.id,
          name: "Bad",
          widthMm: Number.NaN,
          heightMm: 1000,
          reason: "NaN",
        }),
      (error: unknown) => error instanceof PlatformError,
    );
    const updated = service.updateLayoutSetup(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      widthMm: 26000,
      reason: "Widen floor",
    });
    assert.equal(updated.currentRevisionNumber, 2);
    assert.notEqual(updated.contentHash, layout.contentHash);
    assert.throws(
      () =>
        service.updateLayoutSetup(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: layout.version,
          expectedRevisionNumber: layout.currentRevisionNumber,
          widthMm: 27000,
          reason: "stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    assert.throws(
      () => service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaTwo, layout.id),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    const revisions = store.snapshot().layoutRevisions.filter((item) => item.layoutId === layout.id);
    assert.equal(revisions.length, 2);
    assert.ok(revisions.every((item) => item.immutable));
  });

  it("replays idempotent venue creation and audits denied verification", () => {
    const { service, store } = seeded();
    const first = service.createVenue(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      displayName: "Idempotent Hall",
      reason: "Create once",
      idempotencyKey: "s05-venue-once",
    });
    const replayed = service.createVenue(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      displayName: "Idempotent Hall",
      reason: "Create once",
      idempotencyKey: "s05-venue-once",
    });
    assert.equal(replayed.id, first.id);
    assert.throws(
      () =>
        service.createVenue(director(), {
          organisationId: FIXTURE_IDS.orgMaison,
          displayName: "Different Hall",
          reason: "Different payload",
          idempotencyKey: "s05-venue-once",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "IDEMPOTENCY_CONFLICT",
    );
    const beforeAudit = store.snapshot().audit.length;
    assert.throws(
      () =>
        service.verifyVenueFact(auditor(), {
          organisationId: FIXTURE_IDS.orgMaison,
          venueId: first.id,
          factId: first.id,
          expectedVersion: 1,
          reason: "auditor cannot verify",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const denied = store.snapshot().audit.filter((item) => item.action === "venue.fact.verified" && item.outcome === "DENIED");
    assert.ok(denied.length >= 1);
    assert.ok(store.snapshot().audit.length > beforeAudit);
  });

  it("reads attendance products without mutating source ledgers or summing phases", () => {
    const { service, store } = seeded();
    const before = structuredClone(store.snapshot());
    const projection = service.readEventAttendanceProjection(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne);
    const after = store.snapshot();
    assert.equal(projection.adapterMutatesSource, false);
    assert.equal(projection.phaseCountsMustNotBeSummedAsWholeEventPeople, true);
    assert.equal(projection.observedRsvp.mutable, false);
    assert.equal(projection.wholeEventDistinctPersonForecast.mutable, false);
    assert.equal(JSON.stringify(before.rsvpEventProjections), JSON.stringify(after.rsvpEventProjections));
    assert.equal(JSON.stringify(before.forecastEstimates), JSON.stringify(after.forecastEstimates));
    assert.equal(JSON.stringify(before.operationalProvisionRecommendations), JSON.stringify(after.operationalProvisionRecommendations));
    const direct = readAttendanceProjection(after, FIXTURE_IDS.eventAlphaOne);
    const phaseSum = direct.phaseOccupancy.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    if (direct.wholeEventDistinctPersonForecast.quantity !== undefined && direct.phaseOccupancy.length > 1) {
      assert.notEqual(phaseSum, direct.wholeEventDistinctPersonForecast.quantity);
    }
  });
});
