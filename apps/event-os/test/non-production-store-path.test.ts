import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { resolveNonProductionStorePath } from "../src/server/non-production-store-path.ts";

describe("EVENT_OS_NON_PRODUCTION_STORE_PATH guards", () => {
  it("accepts an absolute path under the OS temp directory when fixtures are allowed", () => {
    const path = join(tmpdir(), "s075-store-path-unit.json");
    assert.equal(
      resolveNonProductionStorePath({
        override: path,
        fixturesAllowed: true,
        nodeEnv: "development",
      }),
      path,
    );
  });

  it("refuses a non-temp path", () => {
    assert.throws(
      () =>
        resolveNonProductionStorePath({
          override: join(process.cwd(), "data", "should-not-use.json"),
          fixturesAllowed: true,
          nodeEnv: "development",
        }),
      /temporary directory/,
    );
  });

  it("refuses production", () => {
    assert.throws(
      () =>
        resolveNonProductionStorePath({
          override: join(tmpdir(), "x.json"),
          fixturesAllowed: true,
          nodeEnv: "production",
        }),
      /refused in production/,
    );
  });
});
