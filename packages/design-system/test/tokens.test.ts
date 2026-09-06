import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { ACCENT_THEMES, ACTIVE_ACCENT_THEME, DESIGN_TOKENS, STATUS_WORDS, THEME_PALETTES } from "../src/tokens.js";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/tokens.css"), "utf8");

describe("design tokens", () => {
  it("keeps worded status and the 44px touch target", () => {
    assert.equal(DESIGN_TOKENS.touch, 44);
    assert.equal(STATUS_WORDS.DRAFT, "Draft");
    assert.notEqual(STATUS_WORDS.LIVE, "");
  });

  it("defines the restrained-luxury semantic palette without a pure-black canvas", () => {
    assert.equal(THEME_PALETTES.dark.bgPage, "#0A0A0A");
    assert.equal(THEME_PALETTES.dark.surfacePrimary, "#141414");
    assert.equal(THEME_PALETTES.dark.surfaceElevated, "#242424");
    assert.equal(THEME_PALETTES.light.bgPage, "#F9F8F6");
    assert.equal(THEME_PALETTES.light.surfacePrimary, "#FFFFFF");
    assert.notEqual(THEME_PALETTES.dark.bgPage, "#000000");
    assert.equal(DESIGN_TOKENS.color.accent, "#D4AF37");
    assert.equal(DESIGN_TOKENS.color.brass, "#D4AF37");
    assert.match(css, /--md-bg-page:/);
    assert.match(css, /--md-surface-primary:/);
    assert.match(css, /--md-surface-elevated:/);
    assert.match(css, /--md-surface-subtle:/);
    assert.match(css, /--md-text-primary:/);
    assert.match(css, /--md-text-secondary:/);
    assert.match(css, /--md-text-tertiary:/);
    assert.match(css, /--md-border-subtle:/);
    assert.match(css, /--md-border-strong:/);
    assert.match(css, /--md-accent:/);
    assert.match(css, /--md-accent-hover:/);
    assert.match(css, /--md-accent-active:/);
    assert.match(css, /--md-accent-foreground:/);
    assert.match(css, /--md-focus-ring:/);
    assert.match(css, /--md-success:/);
    assert.match(css, /--md-warning:/);
    assert.match(css, /--md-error:/);
    assert.match(css, /--md-information:/);
    assert.match(css, /--md-overlay:/);
    assert.match(css, /--md-content-width:/);
    assert.doesNotMatch(css, /#000(?:000)?\b/i);
  });

  it("reserves future accent themes without activating them", () => {
    assert.equal(ACTIVE_ACCENT_THEME, "champagne");
    assert.equal(ACCENT_THEMES.emerald.accent, "#2E8B65");
    assert.equal(ACCENT_THEMES.navy.accent, "#3D5A80");
    assert.equal(ACCENT_THEMES.copper.accent, "#B87333");
    assert.match(css, /--md-accent-emerald:/);
    assert.match(css, /--md-accent-navy:/);
    assert.match(css, /--md-accent-copper:/);
    assert.doesNotMatch(css, /data-accent-theme/);
  });

  it("encodes spacing, type, motion and interaction foundations", () => {
    assert.deepEqual(DESIGN_TOKENS.space, [4, 8, 12, 16, 20, 24, 32, 48]);
    assert.equal(DESIGN_TOKENS.radius.sm, 6);
    assert.equal(DESIGN_TOKENS.contentWidth, 1200);
    assert.equal(DESIGN_TOKENS.motion.duration, "220ms");
    assert.match(css, /cursor:\s*pointer/);
    assert.match(css, /cursor:\s*not-allowed/);
    assert.match(css, /cursor:\s*text/);
    assert.match(css, /outline:\s*2px solid var\(--md-focus-ring\)/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /\[data-theme="light"\]/);
    assert.match(css, /forced-colors:\s*active/);
  });
});
