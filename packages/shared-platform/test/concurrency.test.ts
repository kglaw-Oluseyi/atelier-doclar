import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("optimistic concurrency", () => {
  it("rejects a stale event update without overwriting", () => {
    const { service } = fixtureService();
    const first = service.updateEvent(actor(people.personDirector), {
      eventId: people.eventAlphaOne,
      organisationId: people.orgMaison,
      expectedVersion: 1,
      name: "Alpha One revised",
    });
    assert.equal(first.version, 2);
    assert.throws(
      () =>
        service.updateEvent(actor(people.personCeo), {
          eventId: people.eventAlphaOne,
          organisationId: people.orgMaison,
          expectedVersion: 1,
          name: "Stale write",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    assert.equal(service.getEvent(actor(people.personCeo), people.orgMaison, people.eventAlphaOne).name, "Alpha One revised");
  });
});
