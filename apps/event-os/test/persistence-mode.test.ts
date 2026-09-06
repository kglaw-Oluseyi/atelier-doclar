import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("event-os persistence policy", () => {
  it("keeps productionAuthorised false and does not treat it as memory-only", () => {
    assert.equal(process.env.EVENT_OS_PRODUCTION_AUTHORISED ?? "false", "false");
    assert.notEqual(process.env.EVENT_OS_PRODUCTION_AUTHORISED, "memory");
  });
});
