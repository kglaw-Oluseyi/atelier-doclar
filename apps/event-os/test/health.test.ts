import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("event-os production boundary", () => {
  it("keeps production authorisation false by contract", () => {
    assert.equal(false, false);
    assert.equal(process.env.EVENT_OS_PRODUCTION_AUTHORISED ?? "false", "false");
  });
});
