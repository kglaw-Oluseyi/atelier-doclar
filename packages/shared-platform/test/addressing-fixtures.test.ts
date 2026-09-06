import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyS04AFixtures,
  fixtureS03CompanionEntitlement,
  fixtureS04AGuests,
  S04A_FIXTURE_IDS,
} from "../src/addressing-fixtures.js";
import { emptySnapshot, type PlatformSnapshot } from "../src/store.js";

function assertS04AFixtureIntegrity(snap: PlatformSnapshot): void {
  for (const entitlement of snap.companionEntitlements) {
    if (entitlement.authority.kind !== "RSVP_ENTITLEMENT" && entitlement.authority.kind !== "RSVP_POLICY_DEFAULT") {
      throw new Error("S04A entitlement authority kind is not an EOS-S03 authority");
    }
    const authority = entitlement.authority;
    if (authority.kind === "RSVP_ENTITLEMENT") {
      const s03 = snap.rsvpEntitlements.find((item) => item.id === authority.rsvpEntitlementId);
      if (!s03) throw new Error("S04A entitlement authority reference is orphaned");
      if (s03.organisationId !== entitlement.organisationId) throw new Error("S04A/S03 organisation scope mismatch");
      if (s03.clientId !== entitlement.clientId) throw new Error("S04A/S03 client scope mismatch");
      if (s03.eventId !== entitlement.eventId) throw new Error("S04A/S03 event scope mismatch");
      if (s03.guestId !== entitlement.principalGuestId) throw new Error("S04A/S03 principal scope mismatch");
      if (entitlement.invitationId) {
        const invitation = snap.rsvpInvitations.find((item) => item.id === entitlement.invitationId);
        if (!invitation) throw new Error("S04A entitlement invitation reference is orphaned");
        if (invitation.organisationId !== entitlement.organisationId || invitation.eventId !== entitlement.eventId) {
          throw new Error("S04A/S03 invitation scope mismatch");
        }
      }
      if (entitlement.allowance > (s03.allowance ?? 0)) throw new Error("S04A entitlement exceeds S03 quantity authority");
    }
    if (
      (entitlement.status === "AVAILABLE" || entitlement.status === "DECLINED" || entitlement.status === "EXPIRED") &&
      entitlement.nominatedGuestId
    ) {
      throw new Error("unnamed S04A entitlement must not carry nominatedGuestId");
    }
  }
}

describe("EOS-S04A fixture integrity", () => {
  it("resolves every S04A entitlement authority to a scoped EOS-S03 record", () => {
    const snap = applyS04AFixtures(emptySnapshot());
    assertS04AFixtureIntegrity(snap);
    const s03 = snap.rsvpEntitlements.find((item) => item.id === S04A_FIXTURE_IDS.rsvpEntitlementPlusOne);
    const s04a = snap.companionEntitlements.find((item) => item.id === S04A_FIXTURE_IDS.entitlementPlusOne);
    assert.ok(s03);
    assert.ok(s04a);
    assert.equal(s04a.nominatedGuestId, undefined);
    assert.deepEqual(fixtureS03CompanionEntitlement().id, S04A_FIXTURE_IDS.rsvpEntitlementPlusOne);
  });

  it("keeps Adéṣínà Ọládàpọ̀ as an unrelated existing OperationalGuest", () => {
    const snap = applyS04AFixtures(emptySnapshot());
    const adesina = snap.operationalGuests.find((item) => item.id === S04A_FIXTURE_IDS.guestAdesina);
    assert.ok(adesina);
    assert.equal(adesina.householdId, undefined);
    assert.equal(adesina.givenName.value, "Adéṣínà");
    assert.equal(adesina.familyName.value, "Ọládàpọ̀");
    assert.equal(
      snap.guestPartyMembers.some((item) => item.guestId === S04A_FIXTURE_IDS.guestAdesina),
      false,
    );
    assert.equal(
      snap.companionNominations.some((item) => item.guestId === S04A_FIXTURE_IDS.guestAdesina),
      false,
    );
    assert.equal(
      snap.companionEntitlements.some((item) => item.nominatedGuestId === S04A_FIXTURE_IDS.guestAdesina),
      false,
    );
    assert.ok(fixtureS04AGuests().some((item) => item.id === S04A_FIXTURE_IDS.guestAdesina));
  });

  it("fails when an authority reference is orphaned or scope-mismatched", () => {
    const orphaned = applyS04AFixtures(emptySnapshot());
    orphaned.rsvpEntitlements = [];
    assert.throws(() => assertS04AFixtureIntegrity(orphaned), /orphaned/);

    const mismatched = applyS04AFixtures(emptySnapshot());
    mismatched.rsvpEntitlements[0]!.eventId = "00000000-0000-4000-8000-000000000022";
    assert.throws(() => assertS04AFixtureIntegrity(mismatched), /event scope mismatch/);
  });
});
