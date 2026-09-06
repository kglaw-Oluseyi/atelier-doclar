import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_THEME,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  nextTheme,
  persistTheme,
  resolveTheme,
} from "@maison-doclar/design-system";

describe("Event OS theme contract", () => {
  it("uses the shared preference order and dark-first default", () => {
    assert.equal(resolveTheme("light", false), "light");
    assert.equal(resolveTheme(null, true), "light");
    assert.equal(resolveTheme(null, false), DEFAULT_THEME);
    assert.equal(nextTheme("dark"), "light");
    assert.equal(THEME_STORAGE_KEY, "md-theme");
  });

  it("keeps the blocking init script free of delayed paint work", () => {
    assert.match(THEME_INIT_SCRIPT, /localStorage\.getItem\("md-theme"\)/);
    assert.match(THEME_INIT_SCRIPT, /prefers-color-scheme/);
    assert.doesNotMatch(THEME_INIT_SCRIPT, /requestAnimationFrame|setTimeout/);
  });

  it("persists a manual preference for later visits and signed-in navigation", () => {
    const stored: Record<string, string> = {};
    persistTheme("light", { setItem(key, value) { stored[key] = value; } });
    assert.equal(stored[THEME_STORAGE_KEY], "light");
  });
});
