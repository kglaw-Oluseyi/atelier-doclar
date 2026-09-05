import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { operationalDisplayName } from "../src/guest-matching.js";
import { actor, fixtureService, people } from "./helpers.js";

function intake(service: ReturnType<typeof fixtureService>["service"], extras: Record<string, unknown> = {}) {
  return service.intakeGuest(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: "Ada",
    familyName: "Okoye",
    email: "ada.okoye@example.test",
    reason: "manual staff intake",
    ...extras,
  });
}

describe("guest intake and directory", () => {
  it("creates an operational guest without creating a person", () => {
    const { service } = fixtureService();
    const before = service.currentSnapshot().persons.length;
    const guest = intake(service);
    assert.equal(guest.lifecycle, "ACTIVE");
    assert.equal(guest.identityResolution, "UNRESOLVED");
    assert.equal(guest.email.quality, "UNVERIFIED");
    assert.equal(guest.personId, undefined);
    assert.equal(operationalDisplayName(guest), "Ada Okoye");
    assert.equal(service.currentSnapshot().persons.length, before);
  });

  it("keeps missing, not supplied and unverified states distinct", () => {
    const { service } = fixtureService();
    const guest = service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      familyName: "Okoye",
      reason: "partial intake",
    });
    assert.equal(guest.givenName.quality, "NOT_SUPPLIED");
    assert.equal(guest.givenName.value, undefined);
    assert.equal(guest.familyName.quality, "UNVERIFIED");
    assert.equal(guest.email.quality, "NOT_SUPPLIED");
    assert.equal(operationalDisplayName(guest), "Okoye");
  });

  it("lists only the requested event and supports search and attention filter", () => {
    const { service } = fixtureService();
    const created = intake(service);
    service.intakeGuest(actor(people.personCeo), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaTwo,
      givenName: "Ada",
      familyName: "Okoye",
      email: "ada.other@example.test",
      reason: "other event",
    });
    const directory = service.listGuests(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      query: "okoye",
    });
    assert.equal(directory.length, 1);
    assert.equal(directory[0]?.id, created.id);
    const attention = service.listGuests(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      attentionRequired: true,
    });
    assert.equal(attention.length, 0);
  });

  it("amends with expectedVersion and does not last-write-wins a verified field", () => {
    const { service } = fixtureService();
    const guest = intake(service);
    guest.email.quality = "VERIFIED";
    service.currentSnapshot();
    const snap = service.currentSnapshot();
    const stored = snap.operationalGuests.find((item) => item.id === guest.id);
    if (!stored) throw new Error("missing guest");
    stored.email.quality = "VERIFIED";
    service.loadSnapshot(snap);
    assert.throws(
      () =>
        service.amendGuest(actor(people.personDirector), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          guestId: guest.id,
          expectedVersion: guest.version,
          email: "changed@example.test",
          reason: "silent overwrite",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    const amended = service.amendGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      expectedVersion: guest.version,
      email: "changed@example.test",
      replaceVerifiedField: true,
      reason: "operator confirmed replacement",
    });
    assert.equal(amended.email.value, "changed@example.test");
    assert.equal(amended.email.quality, "PENDING_VERIFICATION");
    assert.equal(amended.attentionRequired, true);
  });

  it("surfaces exact email duplicates without merging", () => {
    const { service } = fixtureService();
    const first = intake(service);
    const second = intake(service, { preferredName: "Ada Two", idempotencyKey: "intake-2" });
    assert.equal(second.identityResolution, "DUPLICATE_RISK");
    assert.notEqual(second.id, first.id);
    const candidates = service.listGuestDuplicates(actor(people.personDirector), people.orgMaison, people.eventAlphaOne);
    assert.equal(candidates.some((item) => item.kind === "EXACT_EMAIL" && item.status === "OPEN"), true);
  });

  it("does not treat similar names alone as an automatic merge", () => {
    const { service } = fixtureService();
    intake(service, { email: "one@example.test" });
    const other = intake(service, { email: "two@example.test", idempotencyKey: "name-only" });
    assert.equal(other.identityResolution, "UNRESOLVED");
    const fuzzy = service
      .listGuestDuplicates(actor(people.personDirector), people.orgMaison, people.eventAlphaOne)
      .filter((item) => item.kind === "FUZZY_NAME");
    assert.equal(fuzzy.length, 1);
    assert.equal(fuzzy[0]?.status, "OPEN");
  });

  it("links an existing person through a guest reference and can reverse the link", () => {
    const { service } = fixtureService();
    const guest = intake(service);
    const linked = service.linkGuestPerson(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      personId: people.personPlanner,
      expectedVersion: guest.version,
      reason: "exact person known to staff",
    });
    assert.equal(linked.identityResolution, "LINKED");
    assert.equal(linked.personId, people.personPlanner);
    assert.ok(linked.guestReferenceId);
    const reference = service.currentSnapshot().guestReferences.find((item) => item.id === linked.guestReferenceId);
    assert.equal(reference?.status, "REFERENCE_ONLY");
    const unlinked = service.unlinkGuestPerson(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: linked.id,
      expectedVersion: linked.version,
      reason: "link was incorrect",
    });
    assert.equal(unlinked.personId, undefined);
    assert.equal(unlinked.identityResolution, "UNRESOLVED");
    assert.equal(service.currentSnapshot().guestReferences.some((item) => item.id === linked.guestReferenceId), true);
  });

  it("imports canonical CSV rows and keeps invalid rows unpromoted", () => {
    const { service } = fixtureService();
    const batch = service.importGuests(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      filename: "alpha-one.csv",
      reason: "fixture import",
      csv: [
        "givenName,familyName,email,phone,householdKey",
        "Bisi,Adeyemi,bisi@example.test,+2348012345678,Adeyemi",
        "Invalid,,not-an-email,,",
      ].join("\n"),
    });
    assert.equal(batch.promotedCount, 1);
    assert.equal(batch.invalidCount, 1);
    const guests = service.listGuests(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
    });
    assert.equal(guests.length, 1);
    assert.equal(guests[0]?.householdId !== undefined, true);
  });
});
