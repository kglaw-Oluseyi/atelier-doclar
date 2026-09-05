import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

describe("idempotency", () => {
  it("replays an identical create and rejects a conflicting replay", () => {
    const { service } = fixtureService();
    const payload = {
      organisationId: people.orgMaison,
      code: "GAMMA",
      displayName: "Gamma Client",
      idempotencyKey: "create-gamma-1",
    };
    const first = service.createClient(actor(people.personCeo), payload);
    const second = service.createClient(actor(people.personCeo), payload);
    assert.equal(first.id, second.id);
    assert.throws(
      () =>
        service.createClient(actor(people.personCeo), {
          ...payload,
          displayName: "Different",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "IDEMPOTENCY_CONFLICT",
    );
  });
});
