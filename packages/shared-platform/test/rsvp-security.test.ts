import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function prepared(service: ReturnType<typeof fixtureService>["service"]) {
  const guest = service.intakeGuest(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: "Ife",
    familyName: "Banjo",
    reason: "security guest",
  });
  const other = service.intakeGuest(actor(people.personCeo), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaTwo,
    givenName: "Other",
    familyName: "Guest",
    reason: "other event guest",
  });
  service.prepareEventRsvp(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    reason: "prepare",
  });
  service.prepareEventRsvp(actor(people.personCeo), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaTwo,
    reason: "prepare two",
  });
  const invitation = service.issueRsvpInvitation(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    reason: "issue",
  });
  return { guest, other, invitation };
}

describe("RSVP adversarial controls", () => {
  it("rejects a forged self-service token with a generic unavailable error", () => {
    const { service } = fixtureService();
    prepared(service);
    assert.throws(
      () => service.exchangeGuestAccess("forged-token-value"),
      (error: unknown) =>
        error instanceof PlatformError &&
        error.code === "NOT_FOUND" &&
        error.publicMessage === "This guest access is no longer available.",
    );
  });

  it("rejects expired and revoked invitations with the same public message", () => {
    const { service } = fixtureService();
    const { invitation } = prepared(service);
    service.revokeRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      invitationId: invitation.invitation.id,
      expectedVersion: invitation.invitation.version,
      reason: "revoke fixture",
    });
    assert.throws(
      () => service.exchangeGuestAccess(invitation.token),
      (error: unknown) => error instanceof PlatformError && error.publicMessage === "This guest access is no longer available.",
    );
    const guest = service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Expired",
      familyName: "Link",
      reason: "expiry",
    });
    const short = service.issueRsvpInvitation(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      expiresAt: "2026-09-05T15:00:01.000Z",
      reason: "short lived",
    });
    assert.throws(
      () => service.exchangeGuestAccess(short.token, "2026-09-05T15:00:02.000Z"),
      (error: unknown) => error instanceof PlatformError && error.publicMessage === "This guest access is no longer available.",
    );
  });

  it("binds a token to one guest and one event", () => {
    const { service } = fixtureService();
    const { invitation, other } = prepared(service);
    const { sessionToken, view } = service.exchangeGuestAccess(invitation.token);
    assert.equal(view.guestDisplayName.includes("Ife"), true);
    assert.throws(
      () =>
        service.saveGuestRsvp(sessionToken, {
          answers: {
            attendanceIntent: "ATTENDING",
            householdResponses: [{ guestId: other.id, attendanceIntent: "ATTENDING" }],
            sensitiveConsent: true,
          },
          submit: true,
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
    const otherInvite = service.issueRsvpInvitation(actor(people.personCeo), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaTwo,
      guestId: other.id,
      reason: "other event invite",
    });
    const otherSession = service.exchangeGuestAccess(otherInvite.token);
    assert.equal(otherSession.view.eventDisplayName.length > 0, true);
    assert.notEqual(otherSession.view.guestDisplayName, view.guestDisplayName);
  });

  it("denies cross-organisation staff RSVP operations as not found or forbidden", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    assert.throws(
      () =>
        service.listRsvpDirectory(actor(people.personOtherOrg), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
    assert.throws(
      () =>
        service.staffEnterRsvp(actor(people.personOtherOrg), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          guestId: guest.id,
          attendanceIntent: "ATTENDING",
          reason: "cross-org spoof",
        }),
      PlatformError,
    );
  });

  it("does not treat sequential guest identifiers as authority", () => {
    const { service } = fixtureService();
    const { invitation, guest } = prepared(service);
    assert.throws(() => service.exchangeGuestAccess(guest.id), PlatformError);
    assert.notEqual(invitation.token, guest.id);
    assert.equal(invitation.token.includes(guest.id), false);
  });

  it("rejects malformed payloads and unknown fields", () => {
    const { service } = fixtureService();
    const { invitation } = prepared(service);
    const { sessionToken } = service.exchangeGuestAccess(invitation.token);
    assert.throws(
      () => service.saveGuestRsvp(sessionToken, { answers: { attendanceIntent: "MAYBE" }, submit: true }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.saveGuestRsvp(sessionToken, {
          answers: { attendanceIntent: "ATTENDING" },
          submit: true,
          extra: true,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("denies unauthorised field amendment and staff role spoofing", () => {
    const { service } = fixtureService();
    const { guest } = prepared(service);
    assert.throws(
      () =>
        service.staffEnterRsvp(actor(people.personAuditor), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          guestId: guest.id,
          attendanceIntent: "ATTENDING",
          reason: "auditor spoof",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.issueRsvpInvitation(actor(people.personAuditor), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          guestId: guest.id,
          reason: "auditor issue",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("requires an authenticated staff actor and keeps guest audit immutable", () => {
    const { service } = fixtureService();
    const { invitation } = prepared(service);
    assert.throws(
      () =>
        service.listRsvpDirectory(
          { personId: "00000000-0000-4000-8000-000000000099", correlationId: "none" },
          { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
        ),
      PlatformError,
    );
    const { sessionToken } = service.exchangeGuestAccess(invitation.token);
    service.saveGuestRsvp(sessionToken, {
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      submit: true,
    });
    const before = service.currentSnapshot().audit.length;
    const guestEvents = service.currentSnapshot().audit.filter((item) => item.actorType === "GUEST_CAPABILITY");
    assert.ok(guestEvents.length >= 1);
    assert.equal(
      guestEvents.every((item) => !JSON.stringify(item).includes(invitation.token)),
      true,
    );
    assert.equal(service.currentSnapshot().audit.length, before);
  });

  it("revokes guest sessions on logout and does not create a staff person session", () => {
    const { service } = fixtureService();
    const { invitation } = prepared(service);
    const { sessionToken } = service.exchangeGuestAccess(invitation.token);
    service.logoutGuestSession(sessionToken);
    assert.throws(() => service.guestSelfServiceView(sessionToken), PlatformError);
    const persons = service.currentSnapshot().persons.length;
    service.exchangeGuestAccess(invitation.token);
    assert.equal(service.currentSnapshot().persons.length, persons);
  });
});
