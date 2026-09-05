import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function createAlphaGuest(service: ReturnType<typeof fixtureService>["service"]) {
  return service.intakeGuest(actor(people.personDirector), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName: "Chidi",
    familyName: "Nwosu",
    email: "chidi.nwosu@example.test",
    reason: "security fixture",
  });
}

describe("guest directory adversarial controls", () => {
  it("denies cross-organisation guest lookup and mutation", () => {
    const { service } = fixtureService();
    const guest = createAlphaGuest(service);
    const other = actor(people.personOtherOrg);
    assert.throws(
      () => service.listGuests(other, { organisationId: people.orgMaison, eventId: people.eventAlphaOne }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
    assert.throws(
      () => service.getGuest(other, people.orgMaison, people.eventAlphaOne, guest.id),
      PlatformError,
    );
    assert.throws(
      () =>
        service.intakeGuest(other, {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          familyName: "Leak",
          reason: "cross-org write",
        }),
      PlatformError,
    );
  });

  it("denies cross-event guest lookup and mutation", () => {
    const { service } = fixtureService();
    const guest = createAlphaGuest(service);
    const planner = actor(people.personPlanner);
    assert.throws(
      () => service.listGuests(planner, { organisationId: people.orgMaison, eventId: people.eventAlphaTwo }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    assert.throws(
      () => service.getGuest(planner, people.orgMaison, people.eventAlphaTwo, guest.id),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    assert.throws(
      () =>
        service.amendGuest(planner, {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaTwo,
          guestId: guest.id,
          expectedVersion: 1,
          preferredName: "Hijack",
          reason: "cross-event write",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
  });

  it("conceals forged organisation and event identifiers", () => {
    const { service } = fixtureService();
    const guest = createAlphaGuest(service);
    const director = actor(people.personDirector);
    assert.throws(
      () => service.getGuest(director, people.orgOther, people.eventAlphaOne, guest.id),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
    assert.throws(
      () =>
        service.intakeGuest(director, {
          organisationId: people.orgMaison,
          eventId: people.eventOther,
          familyName: "Forged",
          reason: "forged event",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
  });

  it("does not trust a client-side role spoof and denies insufficient roles", () => {
    const { service } = fixtureService();
    const auditor = actor(people.personAuditor);
    service.listGuests(auditor, { organisationId: people.orgMaison, eventId: people.eventAlphaOne });
    assert.throws(
      () =>
        service.intakeGuest(auditor, {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          familyName: "Denied",
          reason: "auditor write",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        service.linkGuestPerson(actor(people.personPlanner), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          guestId: people.eventAlphaOne,
          personId: people.personPlanner,
          expectedVersion: 1,
          reason: "planner cannot link",
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND"),
    );
  });

  it("rejects unauthenticated, malformed and unknown-field payloads", () => {
    const { service } = fixtureService();
    assert.throws(() => service.resolveActor("00000000-0000-4000-8000-000000000099"), PlatformError);
    assert.throws(
      () =>
        service.intakeGuest(actor(people.personDirector), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          familyName: "X",
          reason: "bad",
          extra: true,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.intakeGuest(actor(people.personDirector), {
          organisationId: "not-a-uuid",
          eventId: people.eventAlphaOne,
          familyName: "X",
          reason: "bad",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("replays idempotent intake and rejects stale versions", () => {
    const { service } = fixtureService();
    const first = service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      familyName: "Idem",
      reason: "first",
      idempotencyKey: "guest-idem-1",
    });
    const replay = service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      familyName: "Idem",
      reason: "first",
      idempotencyKey: "guest-idem-1",
    });
    assert.equal(replay.id, first.id);
    assert.throws(
      () =>
        service.intakeGuest(actor(people.personDirector), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          familyName: "Different",
          reason: "reuse",
          idempotencyKey: "guest-idem-1",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "IDEMPOTENCY_CONFLICT",
    );
    assert.throws(
      () =>
        service.amendGuest(actor(people.personDirector), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          guestId: first.id,
          expectedVersion: 99,
          preferredName: "Stale",
          reason: "stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });

  it("keeps audit append-only and fixture records marked non-production", () => {
    const { service } = fixtureService();
    createAlphaGuest(service);
    const first = service.searchAudit(actor(people.personCeo), people.orgMaison);
    const created = first.find((item) => item.action === "guest.intake.created");
    assert.ok(created);
    const createdId = created.id;
    const createdHash = created.afterHash;
    service.intakeGuest(actor(people.personDirector), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      familyName: "Second",
      reason: "second intake",
    });
    const after = service.searchAudit(actor(people.personCeo), people.orgMaison);
    assert.ok(after.length > first.length);
    const original = after.find((item) => item.id === createdId);
    assert.equal(original?.afterHash, createdHash);
    assert.equal(original?.action, "guest.intake.created");
    assert.equal(service.currentSnapshot().organisations.every((item) => item.nonProductionFixture === true), true);
    assert.equal(service.currentSnapshot().operationalGuests.every((item) => item.nonProductionFixture === undefined), true);
  });
});
