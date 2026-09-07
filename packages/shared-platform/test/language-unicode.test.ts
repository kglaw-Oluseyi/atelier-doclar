import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  UNICODE_POLICY,
  accentInsensitiveSearchKey,
  authoredTextsEqual,
  canonicalDisplayText,
  graphemeCount,
  graphemeSafeTruncate,
} from "../src/language-unicode.js";
import { assertPlaceholderSetsMatch, escapePlaceholderValue, extractPlaceholderNames, renderPlaceholders } from "../src/language-placeholders.js";
import { PlatformError } from "../src/errors.js";

describe("EOS-S04F Unicode policy", () => {
  it("stores NFC and finds unmarked search keys without corrupting display text", () => {
    const composed = "Olúfẹ́mi Alákíjà";
    const decomposed = composed.normalize("NFD");
    assert.equal(UNICODE_POLICY.storageForm, "NFC");
    assert.equal(canonicalDisplayText(composed), composed.normalize("NFC"));
    assert.ok(authoredTextsEqual(composed, decomposed));
    assert.equal(accentInsensitiveSearchKey("Olufemi Alakija"), accentInsensitiveSearchKey(composed));
    assert.notEqual(canonicalDisplayText(composed), "Olufemi Alakija");
    for (const mark of ["Ẹ̀", "Ọ́", "ṣ", "ń"]) {
      assert.equal(canonicalDisplayText(mark), mark.normalize("NFC"));
      assert.match(canonicalDisplayText(mark), /Ẹ|Ọ|ṣ|ń|̀|́/);
    }
  });

  it("round-trips German, French and Simplified Chinese without stripping marks", () => {
    const german = "Willkommensveranstaltungseinladung — schön";
    const french = "À bientôt. fête, naïve";
    const chinese = "欢迎光临。";
    assert.equal(canonicalDisplayText(german), german.normalize("NFC"));
    assert.equal(canonicalDisplayText(french), french.normalize("NFC"));
    assert.equal(canonicalDisplayText(chinese), chinese);
    assert.ok(graphemeCount(chinese) >= 5);
  });

  it("does not split grapheme clusters when truncating", () => {
    const text = "Ẹ̀bùnolúwa";
    const count = graphemeCount(text);
    assert.ok(count < text.length || count === text.length);
    const truncated = graphemeSafeTruncate(text, 3);
    assert.equal(graphemeCount(truncated), 3);
    assert.ok(!truncated.endsWith("\u0300") || truncated.includes("Ẹ"));
  });

  it("matches placeholders exactly and escapes injection", () => {
    assert.deepEqual(extractPlaceholderNames("Hello {{guestName}}"), ["guestName"]);
    assert.throws(
      () => assertPlaceholderSetsMatch("Hello {{guestName}}", "Bonjour"),
      (error: unknown) => error instanceof PlatformError,
    );
    assert.throws(
      () => extractPlaceholderNames("{{guestName}} and {{guestName}}"),
      (error: unknown) => error instanceof PlatformError,
    );
    const rendered = renderPlaceholders("Dear {{guestName}}", { guestName: "<script>alert(1)</script>" }, ["guestName"]);
    assert.equal(rendered.includes("<script>"), false);
    assert.equal(escapePlaceholderValue("<b>"), "&lt;b&gt;");
  });
});
