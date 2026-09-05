import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { NonProductionIdentityAdapter } from "../src/identity.js";

describe("non-production identity adapter", () => {
  it("resolves a named identity when fixtures are explicitly enabled", () => {
    const adapter = new NonProductionIdentityAdapter(true);
    const resolved = adapter.resolve({
      externalSubject: "ceo@maison-doclar.test",
      email: "ceo@maison-doclar.test",
    });
    assert.equal(resolved.email, "ceo@maison-doclar.test");
  });

  it("refuses to resolve when fixtures are disabled", () => {
    const adapter = new NonProductionIdentityAdapter(false);
    assert.throws(
      () => adapter.resolve({ externalSubject: "ceo@maison-doclar.test" }),
      (error: unknown) => error instanceof PlatformError && error.code === "FIXTURE_FORBIDDEN",
    );
  });
});
