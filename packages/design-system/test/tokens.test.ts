import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESIGN_TOKENS, STATUS_WORDS } from "../src/tokens.js";

describe("design tokens", () => {
  it("keeps the restrained Maison Doclar palette and worded status", () => {
    assert.equal(DESIGN_TOKENS.color.brass, "#b79f85");
    assert.equal(DESIGN_TOKENS.touch, 44);
    assert.equal(STATUS_WORDS.DRAFT, "Draft");
    assert.notEqual(STATUS_WORDS.LIVE, "");
  });
});
