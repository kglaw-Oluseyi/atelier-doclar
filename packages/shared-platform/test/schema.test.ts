import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CreateClientInputSchema, EventRecordSchema } from "../src/schemas.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("schema validation", () => {
  it("rejects unknown fields and invalid timezones", () => {
    const extra = CreateClientInputSchema.safeParse({
      organisationId: people.orgMaison,
      code: "Z",
      displayName: "Zed",
      extra: true,
    });
    assert.equal(extra.success, false);
    const { service } = fixtureService();
    assert.throws(
      () =>
        service.createEvent(actor(people.personCeo), {
          organisationId: people.orgMaison,
          clientId: people.clientAlpha,
          code: "BADTZ",
          name: "Bad timezone",
          startsAt: "2026-12-01T09:00:00.000Z",
          endsAt: "2026-12-01T18:00:00.000Z",
          timezone: "Not/AZone",
        }),
      PlatformError,
    );
    const parsed = EventRecordSchema.safeParse({
      id: people.eventAlphaOne,
      organisationId: people.orgMaison,
    });
    assert.equal(parsed.success, false);
  });
});
