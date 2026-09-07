import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { ATELIER_ACCENT, ATELIER_TOKENS } from "../src/atelier.js";
import { contrastRatio, hexChannels, WCAG_CONTRAST } from "../src/contrast.js";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/atelier.css"), "utf8");

const LIGHT_SURFACES = {
  ivory: ATELIER_TOKENS.color.ivory,
  porcelain: ATELIER_TOKENS.color.porcelain,
  parchment: ATELIER_TOKENS.color.parchment,
} as const;

function assertNonText(foreground: string, background: string, label: string) {
  const ratio = contrastRatio(foreground, background);
  assert.ok(
    ratio >= WCAG_CONTRAST.nonTextUi,
    `${label} is ${ratio.toFixed(2)}:1 against ${background}, below ${WCAG_CONTRAST.nonTextUi}:1`,
  );
  return ratio;
}

describe("Command Atelier functional contrast contract", () => {
  it("keeps decorative champagne as the approved brand thread", () => {
    assert.equal(ATELIER_TOKENS.color.champagne, "#B89A62");
    assert.equal(ATELIER_ACCENT.decorative, "#B89A62");
    assert.notEqual(ATELIER_TOKENS.color.champagneFunctional, ATELIER_TOKENS.color.champagne);
    assert.equal(ATELIER_ACCENT.functionalLight, ATELIER_TOKENS.color.champagneFunctional);
  });

  it("requires functional champagne above 3:1 on ivory, porcelain and parchment", () => {
    const functional = ATELIER_TOKENS.color.champagneFunctional;
    const ivory = assertNonText(functional, LIGHT_SURFACES.ivory, "functional champagne on ivory");
    const porcelain = assertNonText(functional, LIGHT_SURFACES.porcelain, "functional champagne on porcelain");
    const parchment = assertNonText(functional, LIGHT_SURFACES.parchment, "functional champagne on parchment");
    assert.ok(ivory >= 3.5, `ivory ratio ${ivory.toFixed(2)} should sit comfortably above 3:1`);
    assert.ok(porcelain >= 3.5, `porcelain ratio ${porcelain.toFixed(2)} should sit comfortably above 3:1`);
    assert.ok(parchment >= 3.5, `parchment ratio ${parchment.toFixed(2)} should sit comfortably above 3:1`);
  });

  it("keeps decorative champagne above 3:1 on onyx and espresso", () => {
    assertNonText(ATELIER_TOKENS.color.champagne, ATELIER_TOKENS.color.onyx, "decorative champagne on onyx");
    assertNonText(ATELIER_TOKENS.color.champagnePale, ATELIER_TOKENS.color.onyx, "pale champagne on onyx");
    assertNonText(ATELIER_TOKENS.color.champagne, ATELIER_TOKENS.color.espresso, "decorative champagne on espresso");
  });

  it("treats accent-coloured text against the applicable text threshold", () => {
    const umberOnIvory = contrastRatio(ATELIER_TOKENS.color.umber, ATELIER_TOKENS.color.ivory);
    const inkOnIvory = contrastRatio(ATELIER_TOKENS.color.ink, ATELIER_TOKENS.color.ivory);
    const paleOnOnyx = contrastRatio(ATELIER_TOKENS.color.champagnePale, ATELIER_TOKENS.color.onyx);
    assert.ok(umberOnIvory >= WCAG_CONTRAST.textNormal, `umber on ivory is ${umberOnIvory.toFixed(2)}:1`);
    assert.ok(inkOnIvory >= WCAG_CONTRAST.textNormal, `ink on ivory is ${inkOnIvory.toFixed(2)}:1`);
    assert.ok(paleOnOnyx >= WCAG_CONTRAST.textNormal, `pale champagne on onyx is ${paleOnOnyx.toFixed(2)}:1`);
    assert.doesNotMatch(css, /(?<!-)color:\s*var\(--at-accent-functional\)/);
    assert.doesNotMatch(css, /(?<!-)color:\s*var\(--at-champagne-functional\)/);
    assert.doesNotMatch(css, /(?<!-)color:\s*var\(--at-champagne\);/);
  });

  it("exposes matching CSS tokens for focus, selected tabs and checked controls", () => {
    const channels = hexChannels(ATELIER_TOKENS.color.champagneFunctional);
    assert.match(css, /--at-champagne:\s*#b89a62;/);
    assert.match(css, /--at-champagne-functional:\s*#8b6e38;/);
    assert.match(css, new RegExp(`--at-champagne-functional-rgb:\\s*${channels.r},\\s*${channels.g},\\s*${channels.b};`));
    assert.match(css, /--at-accent-functional:\s*var\(--at-champagne-functional\)/);
    assert.match(css, /--at-focus-light:\s*var\(--at-champagne-functional\)/);
    assert.match(css, /--at-focus-dark:\s*var\(--at-champagne\)/);
    assert.match(css, /\.at-scope :focus-visible \{[\s\S]*outline:\s*2px solid var\(--at-focus-light\)/);
    assert.match(
      css,
      /\.at-scope \.form input:focus-visible,[\s\S]*border-color:\s*var\(--at-focus-light\)/,
    );
    assert.match(
      css,
      /\.at-tabs a\[aria-current="page"\]::after,[\s\S]*background:\s*var\(--at-accent-functional\)/,
    );
    assert.match(
      css,
      /\.at-scope input\[type="checkbox"\]:not\(\.at-switch\):checked,[\s\S]*border-color:\s*var\(--at-accent-functional\)/,
    );
    assert.doesNotMatch(css, /\.at-scope :focus-visible \{[\s\S]*outline:\s*2px solid var\(--at-champagne\);/);
  });
});
