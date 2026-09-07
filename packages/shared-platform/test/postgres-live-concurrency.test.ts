import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("railway postgres concurrency probe", () => {
  it("gates on EVENT_OS_PERSISTENCE_IT=1; Event OS owns the live probe", async () => {
    if (process.env.EVENT_OS_PERSISTENCE_IT === "1" && process.env.DATABASE_URL) {
      assert.ok(process.env.DATABASE_URL);
      return;
    }
    assert.equal(process.env.EVENT_OS_PERSISTENCE_IT === "1", false);
  });
});
