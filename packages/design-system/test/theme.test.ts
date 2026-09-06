import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_THEME,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  persistTheme,
  readStoredTheme,
  resolveTheme,
} from "../src/theme.js";

describe("theme preference", () => {
  it("honours a stored preference before system or the dark-first default", () => {
    assert.equal(resolveTheme("light", false), "light");
    assert.equal(resolveTheme("dark", true), "dark");
    assert.equal(resolveTheme(null, true), "light");
    assert.equal(resolveTheme(undefined, false), DEFAULT_THEME);
    assert.equal(resolveTheme("system", false), DEFAULT_THEME);
    assert.equal(nextTheme("dark"), "light");
    assert.equal(nextTheme("light"), "dark");
  });

  it("reads storage first and cookies second", () => {
    assert.equal(readStoredTheme({ getItem: () => "light" }, "md-theme=dark"), "light");
    assert.equal(readStoredTheme({ getItem: () => null }, "other=1; md-theme=dark"), "dark");
    assert.equal(readStoredTheme({ getItem: () => null }, ""), null);
  });

  it("persists the manual preference and applies it to the document root", () => {
    const stored: Record<string, string> = {};
    persistTheme("light", { setItem: (key, value) => { stored[key] = value; } });
    assert.equal(stored[THEME_STORAGE_KEY], "light");
    const root = { attrs: {} as Record<string, string>, style: { colorScheme: "" }, setAttribute(name: string, value: string) { this.attrs[name] = value; } };
    applyTheme("light", root);
    assert.equal(root.attrs["data-theme"], "light");
    assert.equal(root.style.colorScheme, "light");
  });

  it("ships a blocking init script that avoids theme flash", () => {
    assert.match(THEME_INIT_SCRIPT, /localStorage\.getItem\("md-theme"\)/);
    assert.match(THEME_INIT_SCRIPT, /prefers-color-scheme:\s*light/);
    assert.match(THEME_INIT_SCRIPT, /setAttribute\("data-theme"/);
    assert.doesNotMatch(THEME_INIT_SCRIPT, /requestAnimationFrame|setTimeout/);
  });
});
