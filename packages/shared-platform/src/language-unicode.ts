import { UNICODE_NORMALISATION_FORM } from "./constants.js";

export const UNICODE_POLICY = {
  storageForm: UNICODE_NORMALISATION_FORM,
  comparison: "NFC equality of authored display text",
  search: "accent-insensitive key derived from NFD minus combining marks",
  truncation: "grapheme clusters via Intl.Segmenter",
  never: [
    "strip Yorùbá diacritics from stored display text",
    "transliterate automatically",
    "correct tonal marks without an explicit human decision",
    "slice UTF-16 code units for display limits",
  ],
} as const;

export function canonicalDisplayText(input: string): string {
  return input.normalize(UNICODE_NORMALISATION_FORM);
}

export function accentInsensitiveSearchKey(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .normalize(UNICODE_NORMALISATION_FORM)
    .toLocaleLowerCase("en-GB");
}

export function authoredTextsEqual(left: string, right: string): boolean {
  return canonicalDisplayText(left) === canonicalDisplayText(right);
}

function graphemeSegments(input: string): Intl.SegmentData[] {
  return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(input)];
}

export function graphemeCount(input: string): number {
  return graphemeSegments(input).length;
}

export function graphemeSafeTruncate(input: string, maxGraphemes: number): string {
  if (maxGraphemes < 0) return "";
  const parts = graphemeSegments(input);
  if (parts.length <= maxGraphemes) return input;
  return parts
    .slice(0, maxGraphemes)
    .map((part) => part.segment)
    .join("");
}

export function preservesYorubaMarks(input: string): boolean {
  return /[ẸẹỌọṢṣǸǹ]|[\u0300-\u036f]/.test(input) || input === canonicalDisplayText(input);
}
