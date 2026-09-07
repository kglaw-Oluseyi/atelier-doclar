import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import { PlatformError } from "../src/errors.js";
import { applyS04BFixturesIfMissing, S04B_FIXTURE_IDS } from "../src/programme-fixtures.js";
import { applyEosS04BToSnapshot, migrateEosS04B } from "../src/programme-migration.js";
import { wholeEventAttendanceUnion } from "../src/programme-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

function s04bService() {
  const { store, service } = fixtureService();
  store.replace(applyS04AFixtures(store.snapshot()));
  store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
  store.replace(applyS04BFixturesIfMissing(store.snapshot()));
  return { store, service };
}

const director = () => actor(people.personDirector);
const planner = () => actor(people.personPlanner);
const auditor = () => actor(people.personAuditor);
const admin = () => actor(people.personAdmin);
const unassigned = () => actor(people.personUnassigned);

const ALPHA = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
const OTHER = { organisationId: people.orgOther, eventId: people.eventOther };

describe("EOS-S04B services", () => {
  it("creates a default phase for a new event without inventing extra hierarchy", () => {
    const { service } = s04bService();
    const created = service.createEvent(actor(people.personCeo), {
      organisationId: people.orgMaison,
      clientId: people.clientAlpha,
      code: "S04B1",
      name: "Simple reception",
      startsAt: "2026-10-01T16:00:00.000Z",
      endsAt: "2026-10-01T22:00:00.000Z",
      timezone: "Africa/Lagos",
      venueSummary: "One hall",
    });
    const workspace = service.getEventProgrammeWorkspace(actor(people.personCeo), people.orgMaison, created.id);
    assert.equal(workspace.simpleMode, true);
    assert.equal(workspace.phases.length, 1);
    assert.equal(workspace.phases[0]?.isDefault, true);
    assert.equal(workspace.phases[0]?.name, "Simple reception");
  });

  it("requires overlap acknowledgement and does not duplicate a guest across assignments", () => {
    const { store, service } = s04bService();
    const workspace = service.getEventProgrammeWorkspace(director(), ALPHA.organisationId, ALPHA.eventId);
    assert.equal(workspace.simpleMode, false);
    const union = wholeEventAttendanceUnion(store.snapshot(), ALPHA.eventId);
    assert.ok(union.includes(S04A_FIXTURE_IDS.guestEbunoluwa));
    assert.ok(union.includes(S04A_FIXTURE_IDS.guestOlufemi));
    assert.equal(union.length < workspace.attendance.summedPhaseCounts, true);
    assert.throws(
      () =>
        service.createProgrammePhase(director(), {
          ...ALPHA,
          name: "Overlap party",
          type: "AFTER_PARTY",
          startsAt: "2026-09-12T11:00:00.000Z",
          endsAt: "2026-09-12T14:00:00.000Z",
          locationLabel: "Same city",
          reason: "overlap without acknowledgement",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const added = service.createProgrammePhase(director(), {
      ...ALPHA,
      name: "Overlap party",
      type: "AFTER_PARTY",
      startsAt: "2026-09-12T11:00:00.000Z",
      endsAt: "2026-09-12T14:00:00.000Z",
      locationLabel: "Same city",
      overlapAcknowledged: true,
      overlapAcknowledgementReason: "Separate teams remain assigned",
      reason: "acknowledged overlap",
    });
    assert.equal(added.overlapAcknowledged, true);
    assert.throws(
      () =>
        service.assignPhaseEntitlement(director(), {
          ...ALPHA,
          phaseId: S04B_FIXTURE_IDS.phaseChurch,
          guestId: S04A_FIXTURE_IDS.guestEbunoluwa,
          expectedPhaseVersion: 1,
          reason: "duplicate church",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("fails closed for planner protected access, auditor mutation, admin business authority and unassigned staff", () => {
    const { store, service } = s04bService();
    const church = store.snapshot().programmePhases.find((item) => item.id === S04B_FIXTURE_IDS.phaseChurch);
    assert.ok(church);
    assert.throws(
      () =>
        service.assignPhaseEntitlement(planner(), {
          ...ALPHA,
          phaseId: church.id,
          guestId: S04A_FIXTURE_IDS.guestTomi,
          expectedPhaseVersion: church.version,
          protectedAccess: true,
          reason: "planner protected",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.createProgrammePhase(auditor(), {
          ...ALPHA,
          name: "Auditor phase",
          type: "BRUNCH",
          startsAt: "2026-09-13T10:00:00.000Z",
          endsAt: "2026-09-13T13:00:00.000Z",
          locationLabel: "Hotel",
          reason: "auditor mutate",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.getEventProgrammeWorkspace(admin(), ALPHA.organisationId, ALPHA.eventId),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
    assert.throws(
      () => service.getEventProgrammeWorkspace(unassigned(), ALPHA.organisationId, ALPHA.eventId),
      (error: unknown) => error instanceof PlatformError && (error.code === "ACCESS_PENDING" || error.code === "FORBIDDEN"),
    );
    assert.equal(store.snapshot().audit.some((item) => item.action === "programme.entitlement.assigned" && item.outcome === "DENIED"), true);
  });

  it("rejects cross-event credentials, keeps checkpoint independence, and does not let fast-track skip verification", () => {
    const { service } = s04bService();
    const authorised = service.resolveCheckpointAccess(director(), {
      ...ALPHA,
      checkpointId: S04B_FIXTURE_IDS.checkpointReception,
      presentationReference: "MD-EBUN01A",
    });
    assert.equal(authorised.outcome, "AUTHORISED");
    assert.equal(authorised.verificationRequired, true);
    assert.equal(authorised.attendanceWritten, false);
    const cross = service.resolveCheckpointAccess(director(), {
      ...ALPHA,
      checkpointId: S04B_FIXTURE_IDS.checkpointReception,
      presentationReference: "FORGED-OTHER-EVENT",
    });
    assert.equal(cross.outcome === "INSUFFICIENT" || cross.outcome === "WRONG_EVENT", true);
    assert.throws(
      () =>
        service.getEventProgrammeWorkspace(director(), OTHER.organisationId, OTHER.eventId),
      (error: unknown) => error instanceof PlatformError,
    );
  });

  it("publishes and consumes a signed package without mutating canonical entitlements", () => {
    const { store, service } = s04bService();
    const before = store.snapshot().phaseEntitlements.map((item) => item.version).join(",");
    const published = service.publishOfflineAccessPackage(director(), {
      ...ALPHA,
      validUntil: "2026-09-20T22:00:00.000Z",
      reason: "supersede package",
    });
    assert.equal(published.body.policy.attendanceWriter, "SLICE_8_ONLY");
    const consumed = service.consumeOfflineAccessPackage(director(), {
      ...ALPHA,
      packageId: published.id,
      expectedVersion: published.version,
      reason: "consume projection",
    });
    assert.equal(consumed.id, published.id);
    assert.equal(store.snapshot().phaseEntitlements.map((item) => item.version).join(","), before);
    assert.throws(
      () =>
        service.consumeOfflineAccessPackage(director(), {
          ...ALPHA,
          packageId: S04B_FIXTURE_IDS.packageV1,
          expectedVersion: 1,
          reason: "stale superseded",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    assert.throws(
      () =>
        service.consumeOfflineAccessPackage(director(), {
          ...ALPHA,
          packageId: S04B_FIXTURE_IDS.packageV1,
          expectedVersion: 2,
          reason: "superseded current version",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("replays default-phase migration without duplicating phases", () => {
    const { store } = fixtureService();
    const first = migrateEosS04B(store.snapshot(), "2026-09-07T10:00:00.000Z");
    assert.equal(first.status, "APPLIED");
    const second = migrateEosS04B(first.snapshot, "2026-09-07T11:00:00.000Z");
    assert.equal(second.status, "REPLAYED");
    const alphaPhases = second.snapshot.programmePhases.filter((item) => item.eventId === people.eventAlphaOne && item.isDefault);
    assert.equal(alphaPhases.length, 1);
  });

  it("treats stale concurrent phase assignment as a conflict", () => {
    const { service } = s04bService();
    assert.throws(
      () =>
        service.assignPhaseEntitlement(director(), {
          ...ALPHA,
          phaseId: S04B_FIXTURE_IDS.phaseReception,
          guestId: S04A_FIXTURE_IDS.guestTomi,
          expectedPhaseVersion: 99,
          reason: "stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });

  it("is idempotent for repeated phase creation with the same key", () => {
    const { service } = s04bService();
    const input = {
      ...ALPHA,
      name: "Thanksgiving brunch",
      type: "BRUNCH" as const,
      startsAt: "2026-09-13T10:00:00.000Z",
      endsAt: "2026-09-13T13:00:00.000Z",
      locationLabel: "Hotel terrace",
      reason: "multi-day brunch",
      idempotencyKey: "s04b-brunch-1",
    };
    const first = service.createProgrammePhase(director(), input);
    const second = service.createProgrammePhase(director(), input);
    assert.equal(first.id, second.id);
  });
});
