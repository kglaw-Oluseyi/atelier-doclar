import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import { PlatformError } from "../src/errors.js";
import { applyS04BFixturesIfMissing } from "../src/programme-fixtures.js";
import { applyEosS04BToSnapshot } from "../src/programme-migration.js";
import { applyS04CFixturesIfMissing, S04C_FIXTURE_IDS, S04C_VENDOR_TOKEN } from "../src/merchandise-fixtures.js";
import { applyEosS04CToSnapshot } from "../src/merchandise-migration.js";
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
const admin = () => actor(people.personAdmin);
const unassigned = () => actor(people.personUnassigned);
const ALPHA = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };

describe("EOS-S04C services", () => {
  it("offers different items to named guests and host-assigned cohorts without inferring family", () => {
    const { store, service } = s04cService();
    const workspace = service.getEventMerchandiseWorkspace(director(), ALPHA.organisationId, ALPHA.eventId);
    assert.ok(workspace.cohorts.every((item) => item.hostAssigned && item.inferred === false));
    const parentOffers = workspace.offers.filter((item) => item.itemName === "Parent aso-oke set");
    assert.ok(parentOffers.some((item) => item.guestId === S04C_FIXTURE_IDS.guestBabatunde));
    assert.ok(parentOffers.some((item) => item.guestId === S04A_FIXTURE_IDS.guestEbunoluwa));
    assert.ok(workspace.offers.some((item) => item.guestId === S04C_FIXTURE_IDS.guestOmotola && item.individualOverride));
    assert.equal(
      store.snapshot().guestOffers.filter((item) => item.guestId === S04C_FIXTURE_IDS.guestBabatunde).length,
      1,
    );
    assert.notEqual(S04C_FIXTURE_IDS.guestBabatunde, S04C_FIXTURE_IDS.cohortParents);
  });

  it("keeps another adult’s private choice out of a household projection", () => {
    const { service } = s04cService();
    const ebun = service.getGuestMerchandiseProjection(
      director(),
      ALPHA.organisationId,
      ALPHA.eventId,
      S04A_FIXTURE_IDS.guestEbunoluwa,
    );
    assert.equal(
      ebun.offers.some((item) => item.choice === "FABRIC_ONLY"),
      false,
    );
    const adewale = service.getGuestMerchandiseProjection(
      director(),
      ALPHA.organisationId,
      ALPHA.eventId,
      S04C_FIXTURE_IDS.guestAdewale,
    );
    assert.equal(adewale.offers[0]?.choice, "FABRIC_ONLY");
  });

  it("captures and withdraws consented cap circumference and rejects other measurements", () => {
    const { service } = s04cService();
    assert.throws(
      () =>
        service.captureCapMeasurement(director(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestOlufemi,
          itemId: S04C_FIXTURE_IDS.itemCap,
          headCircumferenceInches: 22.5,
          consentGiven: true,
          source: "STAFF_ASSISTED",
          waistInches: 34,
          reason: "prohibited",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.captureCapMeasurement(director(), {
          ...ALPHA,
          guestId: S04A_FIXTURE_IDS.guestOlufemi,
          itemId: S04C_FIXTURE_IDS.itemParentSet,
          headCircumferenceInches: 22.5,
          consentGiven: true,
          source: "STAFF_ASSISTED",
          reason: "wrong item",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const withdrawn = service.withdrawCapMeasurement(director(), {
      ...ALPHA,
      measurementId: S04C_FIXTURE_IDS.capOlufemi,
      expectedVersion: 1,
      reason: "guest withdrew consent",
    });
    assert.equal(withdrawn.status, "WITHDRAWN");
  });

  it("hands off to a vendor without an unrestricted guest list and keeps updates attributed", () => {
    const { service } = s04cService();
    const exchanged = service.exchangeVendorAccess(S04C_VENDOR_TOKEN, "2026-09-07T13:00:00.000Z");
    assert.equal(exchanged.view.guestListRestricted, true);
    assert.equal(exchanged.view.rsvpHidden, true);
    assert.ok(exchanged.view.fulfilments.some((item) => item.id === S04C_FIXTURE_IDS.fulfilmentAdewale));
    assert.throws(() => service.vendorAttemptCoreMutation(), (error: unknown) => {
      return error instanceof PlatformError && error.code === "FORBIDDEN";
    });
    const update = service.vendorSubmitUpdate(exchanged.sessionToken, {
      assignmentId: S04C_FIXTURE_IDS.assignmentAsoOke,
      fulfilmentId: S04C_FIXTURE_IDS.fulfilmentAdewale,
      reportedState: "IN_PREPARATION",
      commercialStatus: "VENDOR_CONFIRMED",
      reason: "weaving started",
      expectedFulfilmentVersion: 1,
    }, "2026-09-07T13:01:00.000Z");
    assert.equal(update.reviewState, "PENDING_REVIEW");
    const accepted = service.reviewVendorUpdate(director(), {
      ...ALPHA,
      updateId: update.id,
      accept: true,
      expectedUpdateVersion: 1,
      reason: "accept attributed report",
    });
    assert.equal(accepted.reviewState, "ACCEPTED");
    const workspace = service.getEventMerchandiseWorkspace(director(), ALPHA.organisationId, ALPHA.eventId);
    const fulfilment = workspace.fulfilments.find((item) => item.id === S04C_FIXTURE_IDS.fulfilmentAdewale);
    assert.equal(fulfilment?.commercialStatus.maisonTruth, false);
    assert.equal(fulfilment?.commercialStatus.attributed, true);
  });

  it("tracks a collection exception without storing money", () => {
    const { service } = s04cService();
    const raised = service.raiseMerchandiseException(director(), {
      ...ALPHA,
      type: "REPLACEMENT",
      guestId: S04C_FIXTURE_IDS.guestBabatunde,
      fulfilmentId: S04C_FIXTURE_IDS.fulfilmentBabatunde,
      ownerLabel: "Event Director",
      reason: "Damaged coral weave reported by vendor",
      guestSafeMessage: "A replacement is being arranged privately.",
    });
    assert.equal(raised.type, "REPLACEMENT");
    assert.equal("amount" in raised, false);
  });

  it("fails closed for planner sponsorship, auditor mutation, admin, unassigned, stale and duplicate submits", () => {
    const { service } = s04cService();
    assert.throws(
      () =>
        service.createHostOfferRule(planner(), {
          ...ALPHA,
          collectionId: S04C_FIXTURE_IDS.collectionTraditional,
          itemId: S04C_FIXTURE_IDS.itemNamed,
          variantIds: [S04C_FIXTURE_IDS.variantNamed],
          audienceKind: "NAMED_GUESTS",
          audienceGuestIds: [S04C_FIXTURE_IDS.guestAdewale],
          hostSponsored: true,
          expectedCollectionVersion: 1,
          reason: "planner sponsorship",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.createVendorAssignment(planner(), {
          ...ALPHA,
          vendorId: "vendor-x",
          vendorDisplayName: "X",
          collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
          itemIds: [S04C_FIXTURE_IDS.itemFriendFabric],
          expiresAt: "2026-12-31T00:00:00.000Z",
          reason: "planner vendor grant",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.createMerchandiseCollection(auditor(), { ...ALPHA, name: "No", hostOwnerLabel: "No", windowStartsAt: "2026-09-01T00:00:00.000Z", windowEndsAt: "2026-09-02T00:00:00.000Z", reason: "auditor" }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.getEventMerchandiseWorkspace(admin(), ALPHA.organisationId, ALPHA.eventId),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () => service.getEventMerchandiseWorkspace(unassigned(), ALPHA.organisationId, ALPHA.eventId),
      (error: unknown) => error instanceof PlatformError && (error.code === "ACCESS_PENDING" || error.code === "FORBIDDEN"),
    );
    assert.throws(
      () =>
        service.withdrawCapMeasurement(director(), {
          ...ALPHA,
          measurementId: S04C_FIXTURE_IDS.capOlufemi,
          expectedVersion: 99,
          reason: "stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const payload = {
      ...ALPHA,
      guestOfferId: S04C_FIXTURE_IDS.offerYetunde,
      guestId: S04C_FIXTURE_IDS.guestYetunde,
      choice: "DECLINE_GRACEFULLY" as const,
      expectedOfferVersion: 1,
      reason: "private opt-out",
      idempotencyKey: "opt-out-1",
    };
    const first = service.recordGuestParticipation(director(), payload);
    const replay = service.recordGuestParticipation(director(), payload);
    assert.equal(first.id, replay.id);
  });

  it("rejects cross-event and cross-vendor vendor access", () => {
    const { service } = s04cService();
    const exchanged = service.exchangeVendorAccess(S04C_VENDOR_TOKEN, "2026-09-07T13:00:00.000Z");
    assert.throws(
      () =>
        service.vendorSubmitUpdate(
          exchanged.sessionToken,
          {
            assignmentId: S04C_FIXTURE_IDS.assignmentOther,
            fulfilmentId: S04C_FIXTURE_IDS.fulfilmentAdewale,
            reportedState: "DISPATCHED",
            reason: "cross vendor",
            expectedFulfilmentVersion: 1,
          },
          "2026-09-07T13:01:00.000Z",
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.getEventMerchandiseWorkspace(director(), people.orgMaison, people.eventOther),
      (error: unknown) => error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN"),
    );
  });

  it("does not create invitation or attendance through merchandise", () => {
    const { store, service } = s04cService();
    const beforeInvites = store.snapshot().rsvpInvitations.length;
    const beforeEntitlements = store.snapshot().phaseEntitlements.length;
    service.createHostOfferRule(director(), {
      ...ALPHA,
      collectionId: S04C_FIXTURE_IDS.collectionTraditional,
      itemId: S04C_FIXTURE_IDS.itemFriendFabric,
      variantIds: [S04C_FIXTURE_IDS.variantFriend],
      audienceKind: "NAMED_GUESTS",
      audienceGuestIds: [S04C_FIXTURE_IDS.guestOmotola],
      expectedCollectionVersion: 1,
      issueImmediately: true,
      reason: "named fabric",
    });
    assert.equal(store.snapshot().rsvpInvitations.length, beforeInvites);
    assert.equal(store.snapshot().phaseEntitlements.length, beforeEntitlements);
  });
});
