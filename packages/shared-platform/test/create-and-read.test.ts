import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actor, fixtureService, people } from "./helpers.js";

describe("CEO create and read", () => {
  it("can create an event and read it back", () => {
    const { service } = fixtureService();
    const ceo = actor(people.personCeo);
    const created = service.createEvent(ceo, {
      organisationId: people.orgMaison,
      clientId: people.clientBeta,
      code: "E1",
      name: "Epsilon First",
      startsAt: "2026-12-12T09:00:00.000Z",
      endsAt: "2026-12-12T18:00:00.000Z",
      timezone: "Africa/Lagos",
    });
    const read = service.getEvent(ceo, people.orgMaison, created.id);
    assert.equal(read.name, "Epsilon First");
  });
});
