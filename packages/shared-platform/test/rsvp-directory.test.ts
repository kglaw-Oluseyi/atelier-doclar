import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function prepareGuest(service: ReturnType<typeof fixtureService>["service"], extras: Record<string, unknown> = {}) {
  const guest = service.intakeGuest(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: "Folake",
    familyName: "Adeyemi",
    email: "folake.adeyemi@example.test",
    reason: "rsvp fixture",
    ...extras,
  });
  service.prepareEventRsvp(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP surface",
  });
  return guest;
}

describe("RSVP directory and self-service", () => {
  it("keeps attendance states distinct from unknown and does not imply admission", () => {
    const { service } = fixtureService();
    const guest = prepareGuest(service);
    const issued = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue guest access",
    });
    const exchanged = service.exchangeGuestAccess(issued.token, "2026-09-05T16:00:00.000Z");
    assert.equal(exchanged.view.attendanceIntent, "NOT_SUPPLIED");
    assert.equal(exchanged.view.status, "NOT_STARTED");
    const saved = service.saveGuestRsvp(
      exchanged.sessionToken,
      {
        answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
        submit: true,
        idempotencyKey: "rsvp-submit-1",
      },
      "2026-09-05T16:01:00.000Z",
    );
    assert.equal(saved.attendanceIntent, "ATTENDING");
    assert.equal(saved.status, "SUBMITTED");
    assert.equal(saved.provenance, "GUEST_SELF_SERVICE");
    const row = service.listRsvpDirectory(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      attendanceIntent: "ATTENDING",
    })[0];
    assert.ok(row);
    assert.equal(row.guest.id, guest.id);
    assert.equal(row.provenance, "GUEST_SELF_SERVICE");
    assert.notEqual(row.responseStatus, "admitted");
    const guestRecord = service.getGuest(actor(people.personDirector), people.orgMaison, people.eventAlphaOne, guest.id);
    assert.equal(guestRecord.lifecycle, "ACTIVE");
    assert.equal(guestRecord.personId, undefined);
  });

  it("autosaves drafts and issues an immutable receipt on submit", () => {
    const { service } = fixtureService();
    const guest = prepareGuest(service);
    const issued = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue",
    });
    const { sessionToken } = service.exchangeGuestAccess(issued.token);
    const draft = service.saveGuestRsvp(sessionToken, {
      answers: { attendanceIntent: "UNCERTAIN" },
      submit: false,
    });
    assert.equal(draft.status, "IN_PROGRESS");
    assert.equal(draft.receiptId, undefined);
    const submitted = service.saveGuestRsvp(sessionToken, {
      expectedVersion: draft.version,
      answers: { attendanceIntent: "NOT_ATTENDING" },
      submit: true,
    });
    assert.equal(submitted.status, "SUBMITTED");
    assert.ok(submitted.receiptId);
    const receipt = service.currentSnapshot().rsvpReceipts.find((item) => item.id === submitted.receiptId);
    assert.ok(receipt);
    assert.equal(receipt.attendanceIntent, "NOT_ATTENDING");
    const firstHash = receipt.payloadHash;
    service.saveGuestRsvp(sessionToken, {
      expectedVersion: submitted.version,
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      submit: true,
    });
    const receipts = service.currentSnapshot().rsvpReceipts.filter((item) => item.guestId === guest.id);
    assert.equal(receipts.length, 2);
    assert.equal(receipts[0]?.payloadHash, firstHash);
    assert.equal(service.getGuestRsvp(actor(people.personDirector), people.orgMaison, people.eventAlphaOne, guest.id).response?.status, "AMENDED");
  });

  it("preserves staff-verified dietary values and opens a conflict for guest input", () => {
    const { service } = fixtureService();
    const guest = prepareGuest(service);
    const snap = service.currentSnapshot();
    const stored = snap.operationalGuests.find((item) => item.id === guest.id);
    if (!stored) throw new Error("missing guest");
    stored.dietaryRequirement = { value: "Halal", quality: "VERIFIED" };
    service.loadSnapshot(snap);
    const issued = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue",
    });
    const { sessionToken } = service.exchangeGuestAccess(issued.token);
    service.saveGuestRsvp(sessionToken, {
      answers: { attendanceIntent: "ATTENDING", dietary: "Vegetarian", sensitiveConsent: true },
      submit: true,
    });
    const after = service.getGuest(actor(people.personDirector), people.orgMaison, people.eventAlphaOne, guest.id);
    assert.equal(after.dietaryRequirement.value, "Halal");
    assert.equal(after.dietaryRequirement.quality, "CONFLICTING");
    const exceptions = service.listRsvpExceptions(actor(people.personDirector), people.orgMaison, people.eventAlphaOne);
    assert.equal(exceptions.length, 1);
    assert.equal(exceptions[0]?.kind, "VERIFIED_FIELD_CONFLICT");
    assert.equal(exceptions[0]?.existingValue, "Halal");
    assert.equal(exceptions[0]?.submittedValue, "Vegetarian");
    assert.equal(exceptions[0]?.status, "OPEN");
  });

  it("does not allow household responses without explicit entitlement", () => {
    const { service } = fixtureService();
    const primary = prepareGuest(service, { householdKey: "ade yemi" });
    const child = service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Tomi",
      familyName: "Adeyemi",
      householdKey: "ade yemi",
      reason: "child record",
    });
    const issued = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: primary.id,
      reason: "issue",
    });
    const { sessionToken } = service.exchangeGuestAccess(issued.token);
    assert.throws(
      () =>
        service.saveGuestRsvp(sessionToken, {
          answers: {
            attendanceIntent: "ATTENDING",
            householdResponses: [{ guestId: child.id, attendanceIntent: "ATTENDING" }],
            sensitiveConsent: true,
          },
          submit: true,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    service.grantRsvpEntitlement(actor(people.personCeo), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: primary.id,
      kind: "HOUSEHOLD_RESPONDENT",
      subjectGuestIds: [child.id],
      reason: "named household respondent",
    });
    const { sessionToken: next } = service.exchangeGuestAccess(issued.token);
    const saved = service.saveGuestRsvp(next, {
      answers: {
        attendanceIntent: "ATTENDING",
        householdResponses: [{ guestId: child.id, attendanceIntent: "NOT_ATTENDING" }],
        sensitiveConsent: true,
      },
      submit: true,
    });
    assert.equal(saved.answers.householdResponses?.[0]?.attendanceIntent, "NOT_ATTENDING");
  });

  it("lets authorised staff enter and withdraw a response with provenance", () => {
    const { service } = fixtureService();
    const guest = prepareGuest(service);
    const entered = service.staffEnterRsvp(actor(people.personPlanner), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      attendanceIntent: "UNCERTAIN",
      reason: "telephone response",
    });
    assert.equal(entered.provenance, "STAFF_ENTERED");
    const withdrawn = service.staffEnterRsvp(actor(people.personPlanner), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      expectedVersion: entered.version,
      attendanceIntent: "NOT_SUPPLIED",
      withdraw: true,
      reason: "guest asked to withdraw",
    });
    assert.equal(withdrawn.status, "WITHDRAWN");
    assert.equal(withdrawn.attendanceIntent, "NOT_SUPPLIED");
  });

  it("replays identical guest submissions and rejects changed payloads", () => {
    const { service } = fixtureService();
    const guest = prepareGuest(service);
    const issued = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue",
    });
    const { sessionToken } = service.exchangeGuestAccess(issued.token);
    const first = service.saveGuestRsvp(sessionToken, {
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      submit: true,
      idempotencyKey: "same-key",
    });
    const replay = service.saveGuestRsvp(sessionToken, {
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      submit: true,
      idempotencyKey: "same-key",
    });
    assert.equal(replay.id, first.id);
    assert.throws(
      () =>
        service.saveGuestRsvp(sessionToken, {
          answers: { attendanceIntent: "NOT_ATTENDING" },
          submit: true,
          idempotencyKey: "same-key",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "IDEMPOTENCY_CONFLICT",
    );
  });

  it("rejects stale expectedVersion on guest amendment", () => {
    const { service } = fixtureService();
    const guest = prepareGuest(service);
    const issued = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      reason: "issue",
    });
    const { sessionToken } = service.exchangeGuestAccess(issued.token);
    service.saveGuestRsvp(sessionToken, {
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      submit: true,
    });
    assert.throws(
      () =>
        service.saveGuestRsvp(sessionToken, {
          expectedVersion: 1,
          answers: { attendanceIntent: "NOT_ATTENDING" },
          submit: true,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });
});
