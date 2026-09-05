import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("event phase transitions", () => {
  it("allows DISCOVER to DESIGN and blocks READY without the scaffold flag", () => {
    const { service } = fixtureService();
    const designed = service.transitionEvent(actor(people.personDirector), {
      eventId: people.eventAlphaOne,
      organisationId: people.orgMaison,
      expectedVersion: 1,
      toPhase: "DESIGN",
      reason: "design authorised",
    });
    assert.equal(designed.phase, "DESIGN");
    const prepared = service.transitionEvent(actor(people.personDirector), {
      eventId: people.eventAlphaOne,
      organisationId: people.orgMaison,
      expectedVersion: 2,
      toPhase: "PREPARE",
      reason: "prepare",
    });
    assert.throws(
      () =>
        service.transitionEvent(actor(people.personDirector), {
          eventId: people.eventAlphaOne,
          organisationId: people.orgMaison,
          expectedVersion: prepared.version,
          toPhase: "READY",
          reason: "too early",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "CAPABILITY_NOT_ENABLED",
    );
  });
});
