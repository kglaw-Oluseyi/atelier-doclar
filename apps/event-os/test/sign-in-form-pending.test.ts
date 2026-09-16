import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

describe("sign-in form pending UX", () => {
  it("uses PendingSubmit, pending status and disables inputs while pending", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/components/sign-in-form.tsx", import.meta.url)), "utf8");
    assert.match(source, /PendingSubmit/);
    assert.match(source, /Signing in…/);
    assert.match(source, /aria-live=\"polite\"/);
    assert.match(source, /disabled=\{pending\}/);
    assert.match(source, /role=\"alert\"/);
    assert.match(source, /errorRef\.current\?\.focus/);
  });
});
