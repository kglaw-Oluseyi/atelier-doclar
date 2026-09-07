import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { ATELIER_TOKENS, DESIGN_TOKENS } from "../src/index.js";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/atelier.css"), "utf8");

describe("Command Atelier language", () => {
  it("keeps the original operational tokens intact", () => {
    assert.equal(DESIGN_TOKENS.color.brass, "#b79f85");
    assert.equal(DESIGN_TOKENS.color.paper, "#f7f4ef");
  });

  it("defines a warm two-material palette without pure black or bright gold", () => {
    assert.equal(ATELIER_TOKENS.color.onyx, "#11100F");
    assert.equal(ATELIER_TOKENS.color.ivory, "#F5F0E8");
    assert.equal(ATELIER_TOKENS.color.champagne, "#B89A62");
    assert.equal(ATELIER_TOKENS.color.champagneFunctional, "#8B6E38");
    assert.notEqual(ATELIER_TOKENS.color.onyx, "#000000");
    assert.notEqual(ATELIER_TOKENS.color.champagne, "#D4AF37");
    assert.match(css, /--at-onyx:/);
    assert.match(css, /--at-ivory:/);
    assert.match(css, /cursor:\s*pointer/);
    assert.match(css, /prefers-reduced-motion/);
  });
});
