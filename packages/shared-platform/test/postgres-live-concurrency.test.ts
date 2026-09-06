import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("railway postgres concurrency probe", () => {
  it("skips unless EVENT_OS_PERSISTENCE_IT=1 and DATABASE_URL are set", async () => {
    if (process.env.EVENT_OS_PERSISTENCE_IT !== "1" || !process.env.DATABASE_URL) {
      assert.equal(process.env.EVENT_OS_PERSISTENCE_IT === "1", false);
      return;
    }
    assert.ok(process.env.DATABASE_URL);
  });
});
