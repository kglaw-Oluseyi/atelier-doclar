import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURE_IDS, vendorReference } from "../src/index.js";

describe("MD-PR-UX001 vendor references", () => {
  it("gives newly generated references distinct guest fragments for sequential fixture UUIDs", () => {
    const first = vendorReference(FIXTURE_IDS.eventAlphaOne, "00000000-0000-4000-8000-0000000000a1");
    const second = vendorReference(FIXTURE_IDS.eventAlphaTwo, "00000000-0000-4000-8000-0000000000a2");
    assert.notEqual(first, second);
    assert.match(first, /^VR-[0-9A-F]{8}-[0-9A-F]{6}$/);
    assert.notEqual(first.slice(3, 11), "00000000");
    assert.notEqual(second.slice(3, 11), "00000000");
  });
});
