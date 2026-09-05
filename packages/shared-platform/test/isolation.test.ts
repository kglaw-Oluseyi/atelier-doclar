import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("organisation and event isolation", () => {
  it("conceals another organisation's client and event", () => {
    const { service } = fixtureService();
    const ceo = actor(people.personCeo);
    assert.equal(
      service.listClients(ceo, people.orgMaison).some((item) => item.id === people.clientOther),
      false,
    );
    assert.throws(() => service.getClient(ceo, people.orgMaison, people.clientOther), PlatformError);
    assert.throws(() => service.getEvent(ceo, people.orgMaison, people.eventOther), PlatformError);
    assert.throws(
      () =>
        service.createEvent(ceo, {
          organisationId: people.orgMaison,
          clientId: people.clientOther,
          code: "X1",
          name: "Leak",
          startsAt: "2026-12-01T09:00:00.000Z",
          endsAt: "2026-12-01T18:00:00.000Z",
          timezone: "Africa/Lagos",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
  });

  it("prevents an event-scoped planner from reading another event", () => {
    const { service } = fixtureService();
    const planner = actor(people.personPlanner);
    const visible = service.getEvent(planner, people.orgMaison, people.eventAlphaOne);
    assert.equal(visible.id, people.eventAlphaOne);
    assert.throws(() => service.getEvent(planner, people.orgMaison, people.eventAlphaTwo), PlatformError);
    assert.equal(
      service.listEvents(planner, people.orgMaison).some((item) => item.id === people.eventAlphaTwo),
      false,
    );
  });

  it("prevents the other-organisation operator from seeing Maison records", () => {
    const { service } = fixtureService();
    const other = actor(people.personOtherOrg);
    assert.equal(service.listClients(other, people.orgOther)[0]?.id, people.clientOther);
    assert.throws(() => service.getClient(other, people.orgOther, people.clientAlpha), PlatformError);
    assert.throws(() => service.listClients(other, people.orgMaison), PlatformError);
  });

  it("rejects URL-like scope spoofing when lineage does not match", () => {
    const { service } = fixtureService();
    const planner = actor(people.personPlanner);
    assert.throws(
      () =>
        service.updateEvent(planner, {
          eventId: people.eventOther,
          organisationId: people.orgMaison,
          expectedVersion: 1,
          name: "Hijack",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND",
    );
  });
});
