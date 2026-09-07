import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import { PlatformError } from "../src/errors.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { applyEosS04BToSnapshot } from "../src/programme-migration.js";
import { applyS04CFixturesIfMissing, S04C_FIXTURE_IDS } from "../src/merchandise-fixtures.js";
import { applyEosS04CToSnapshot, EOS_S04C_GUEST_GRANT_MIGRATION_ID, migrateEosS04CGuestGrants } from "../src/merchandise-migration.js";
import { actor, fixtureService, people } from "./helpers.js";

function s04cService() {
  const { store, service } = fixtureService();
  store.replace(applyS04AFixtures(store.snapshot()));
  store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
  store.replace(applyS04BFixturesIfMissing(store.snapshot()));
  store.replace(applyEosS04CToSnapshot(store.snapshot(), "2026-09-07T12:00:00.000Z"));
  store.replace(applyS04CFixturesIfMissing(store.snapshot()));
  return { store, service };
}

const director = () => actor(people.personDirector);
const planner = () => actor(people.personPlanner);
const auditor = () => actor(people.personAuditor);
const ALPHA = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };

describe("EOS-S04C primary journeys", () => {
  it("creates a collection, item and named offer without household substitution", () => {
    const { store, service } = s04cService();
    const beforeInvites = store.snapshot().rsvpInvitations.length;
    const beforeAttendance = store.snapshot().phaseEntitlements.length;
    const collection = service.createMerchandiseCollection(director(), {
      ...ALPHA,
      name: "New gele programme",
      hostOwnerLabel: "Host family",
      windowStartsAt: "2026-09-08T00:00:00.000Z",
      windowEndsAt: "2026-10-08T00:00:00.000Z",
      reason: "create collection",
      idempotencyKey: "col-1",
    });
    const replay = service.createMerchandiseCollection(director(), {
      ...ALPHA,
      name: "New gele programme",
      hostOwnerLabel: "Host family",
      windowStartsAt: "2026-09-08T00:00:00.000Z",
      windowEndsAt: "2026-10-08T00:00:00.000Z",
      reason: "create collection",
      idempotencyKey: "col-1",
    });
    assert.equal(collection.id, replay.id);
    const item = service.createMerchandiseItem(director(), {
      ...ALPHA,
      collectionId: collection.id,
      type: "ASO_OKE_GELE",
      name: "Ivory gele",
      description: "Named gele",
      variantLabel: "Ivory",
      reason: "create item",
      idempotencyKey: "item-1",
    });
    const variant = store.snapshot().merchandiseItemVariants.find((record) => record.itemId === item.id);
    assert.ok(variant);
    assert.throws(
      () =>
        service.createHostOfferRule(director(), {
          ...ALPHA,
          collectionId: collection.id,
          itemId: item.id,
          variantIds: [variant.id],
          audienceKind: "NAMED_GUESTS",
          audienceGuestIds: [S04A_FIXTURE_IDS.householdAlakija],
          expectedCollectionVersion: collection.version,
          issueImmediately: true,
          reason: "household substitute",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const rule = service.createHostOfferRule(director(), {
      ...ALPHA,
      collectionId: collection.id,
      itemId: item.id,
      variantIds: [variant.id],
      audienceKind: "NAMED_GUESTS",
      audienceGuestIds: [S04C_FIXTURE_IDS.guestOmotola],
      expectedCollectionVersion: collection.version,
      issueImmediately: true,
      reason: "named offer",
      idempotencyKey: "offer-1",
    });
    assert.equal(rule.status, "ISSUED");
    const preview = service.previewMerchandiseAudience(director(), {
      ...ALPHA,
      audienceKind: "EXPLICIT_COHORT",
      cohortId: S04C_FIXTURE_IDS.cohortParents,
    });
    assert.equal(preview.length, 2);
    assert.ok(preview.every((item) => item.guestId !== S04C_FIXTURE_IDS.cohortParents));
    assert.equal(store.snapshot().rsvpInvitations.length, beforeInvites);
    assert.equal(store.snapshot().phaseEntitlements.length, beforeAttendance);
  });

  it("issues merchandise guest access without RSVP, persists choice, and revokes closed", () => {
    const { store, service } = s04cService();
    const beforeInvites = store.snapshot().rsvpInvitations.length;
    const issued = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: "2026-12-31T00:00:00.000Z",
      reason: "issue merch guest",
      idempotencyKey: "grant-1",
    });
    assert.ok(issued.token);
    const replay = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: "2026-12-31T00:00:00.000Z",
      reason: "issue merch guest",
      idempotencyKey: "grant-1",
    });
    assert.equal(replay.grant.id, issued.grant.id);
    assert.equal(store.snapshot().rsvpInvitations.length, beforeInvites);
    const exchanged = service.exchangeMerchandiseGuestAccess(issued.token, "2026-09-07T13:00:00.000Z");
    assert.ok(exchanged.view.offers.some((item) => item.itemName.includes("fila") || item.madeToMeasureCap));
    service.guestRecordParticipation(exchanged.sessionToken, {
      guestOfferId: S04C_FIXTURE_IDS.offerOlufemiCap,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      choice: "FULL_PARTICIPATION",
      expectedOfferVersion: 1,
      reason: "private choice",
    });
    assert.throws(
      () =>
        service.guestCaptureCapMeasurement(exchanged.sessionToken, {
          guestId: S04A_FIXTURE_IDS.guestOlufemi,
          itemId: S04C_FIXTURE_IDS.itemCap,
          headCircumferenceInches: "22cm",
          consentGiven: true,
          reason: "cm text",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.guestCaptureCapMeasurement(exchanged.sessionToken, {
          guestId: S04A_FIXTURE_IDS.guestOlufemi,
          itemId: S04C_FIXTURE_IDS.itemCap,
          headCircumferenceInches: 22.5,
          consentGiven: false,
          reason: "no consent",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const other = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04C_FIXTURE_IDS.guestYetunde,
      expiresAt: "2026-12-31T00:00:00.000Z",
      reason: "other guest",
    });
    const otherSession = service.exchangeMerchandiseGuestAccess(other.token, "2026-09-07T13:05:00.000Z");
    assert.equal(
      otherSession.view.offers.some((item) => item.id === S04C_FIXTURE_IDS.offerOlufemiCap),
      false,
    );
    service.revokeMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: issued.grant.id,
      expectedVersion: issued.grant.version,
      reason: "revoke",
    });
    assert.throws(
      () => service.guestMerchandiseView(exchanged.sessionToken, "2026-09-07T13:10:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    assert.throws(() => service.guestAttemptCoreMutation(), (error: unknown) => {
      return error instanceof PlatformError && error.code === "FORBIDDEN";
    });
  });

  it("issues, renews and revokes vendor access so an open session fails closed", () => {
    const { service } = s04cService();
    const created = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "synthetic-house-2",
      vendorDisplayName: "Second aso-oke house",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: "2026-12-31T00:00:00.000Z",
      reason: "assign vendor",
      idempotencyKey: "vendor-1",
    });
    assert.ok(created.token);
    const session = service.exchangeVendorAccess(created.token, "2026-09-07T13:00:00.000Z");
    assert.equal(session.view.guestListRestricted, true);
    const capRow = session.view.fulfilments.find((item) => item.id === S04C_FIXTURE_IDS.fulfilmentOlufemiCap);
    assert.equal(capRow?.headCircumferenceInches, 22.5);
    const renewed = service.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: "2026-12-31T12:00:00.000Z",
      expectedVersion: created.assignment.version,
      reason: "renew vendor",
    });
    assert.ok(renewed.token);
    assert.notEqual(renewed.token, created.token);
    assert.throws(
      () => service.vendorPortalView(session.sessionToken, "2026-09-07T13:05:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    const live = service.exchangeVendorAccess(renewed.token, "2026-09-07T13:06:00.000Z");
    service.revokeVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: renewed.assignment.id,
      expectedVersion: renewed.assignment.version,
      reason: "revoke vendor",
    });
    assert.throws(
      () =>
        service.vendorSubmitUpdate(live.sessionToken, {
          assignmentId: renewed.assignment.id,
          fulfilmentId: S04C_FIXTURE_IDS.fulfilmentOlufemiCap,
          reportedState: "IN_PREPARATION",
          reason: "after revoke",
          expectedFulfilmentVersion: 1,
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "AUTH_REQUIRED"),
    );
    assert.throws(
      () =>
        service.createVendorAssignment(planner(), {
          ...ALPHA,
          vendorId: "planner-vendor",
          vendorDisplayName: "Planner",
          collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
          itemIds: [S04C_FIXTURE_IDS.itemCap],
          expiresAt: "2026-12-31T00:00:00.000Z",
          reason: "planner",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.issueMerchandiseGuestAccess(auditor(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestOlufemi,
          expiresAt: "2026-12-31T00:00:00.000Z",
          reason: "auditor",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("rejects forged payment and core-authority fields", () => {
    const { service } = s04cService();
    for (const payload of [
      { amount: 20 },
      { receipt: "R-1" },
      { invitationId: "x" },
      { rsvpEntitlement: true },
      { attendance: "CONFIRMED" },
      { credential: "pass" },
      { perimeter: "open" },
      { companion: "plus-one" },
      { deposit: 5 },
      { settlement: "done" },
    ]) {
      assert.throws(
        () =>
          service.createMerchandiseCollection(director(), {
            ...ALPHA,
            name: "Forged",
            hostOwnerLabel: "Host",
            windowStartsAt: "2026-09-08T00:00:00.000Z",
            windowEndsAt: "2026-10-08T00:00:00.000Z",
            reason: "forged",
            ...payload,
          }),
        (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
      );
    }
  });

  it("applies the additive guest-grant migration once", () => {
    const { store } = s04cService();
    const replayed = migrateEosS04CGuestGrants(store.snapshot(), "2026-09-07T14:00:00.000Z");
    assert.equal(replayed.status, "REPLAYED");
    assert.ok(store.snapshot().s04cMigrationReceipts.some((item) => item.migrationId === EOS_S04C_GUEST_GRANT_MIGRATION_ID));
  });
});
