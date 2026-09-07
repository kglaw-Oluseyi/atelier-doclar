import { PlatformError } from "./errors.js";

/**
 * Placeholder policy (EOS-S04F):
 * - A placeholder is `{{Name}}` where Name is `[A-Za-z][A-Za-z0-9_]*`.
 * - Identity is the exact name. Grammatical order may change by language.
 * - Occurrence counts must match the source multiset. Extra copies of a name
 *   that appears once in the source are duplicated placeholders.
 * - A literal that looks like a placeholder is written `\{\{Name\}\}` and is
 *   not counted, not substituted, and renders as `{{Name}}`.
 * - Values are HTML-escaped and never executed as markup or script.
 */
const PLACEHOLDER_OR_ESCAPE = /\\\{\{([A-Za-z][A-Za-z0-9_]*)\}\}|\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;

export interface PlaceholderSetComparison {
  expected: string[];
  detected: string[];
  missing: string[];
  unknown: string[];
  duplicated: string[];
  valid: boolean;
  explanation: string;
}

function counts(names: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const name of names) map.set(name, (map.get(name) ?? 0) + 1);
  return map;
}

export function extractPlaceholderOccurrences(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_OR_ESCAPE)) {
    if (match[1]) continue;
    if (match[2]) names.push(match[2]);
  }
  return names;
}

export function extractPlaceholderNames(text: string): string[] {
  return [...new Set(extractPlaceholderOccurrences(text))];
}

export function comparePlaceholderSets(sourceText: string, targetText: string): PlaceholderSetComparison {
  const expected = extractPlaceholderOccurrences(sourceText);
  const detected = extractPlaceholderOccurrences(targetText);
  const sourceCounts = counts(expected);
  const targetCounts = counts(detected);
  const missing: string[] = [];
  const unknown: string[] = [];
  const duplicated: string[] = [];
  for (const [name, sourceCount] of sourceCounts) {
    const targetCount = targetCounts.get(name) ?? 0;
    if (targetCount === 0) missing.push(name);
    else if (targetCount > sourceCount) duplicated.push(name);
    else if (targetCount < sourceCount) missing.push(name);
  }
  for (const [name] of targetCounts) {
    if (!sourceCounts.has(name)) unknown.push(name);
  }
  const valid = missing.length === 0 && unknown.length === 0 && duplicated.length === 0;
  const parts = [
    missing.length ? `missing ${missing.join(", ")}` : "",
    unknown.length ? `unknown ${unknown.join(", ")}` : "",
    duplicated.length ? `duplicated ${duplicated.join(", ")}` : "",
  ].filter(Boolean);
  return {
    expected,
    detected,
    missing,
    unknown,
    duplicated,
    valid,
    explanation: valid
      ? "Source and target placeholder multisets match. Reordering is permitted."
      : `Placeholder set is not valid: ${parts.join("; ")}. Data was not changed.`,
  };
}

export function assertPlaceholderSetsMatch(sourceText: string, targetText: string): string[] {
  const comparison = comparePlaceholderSets(sourceText, targetText);
  if (!comparison.valid) {
    throw new PlatformError("VALIDATION_FAILED", comparison.explanation, {
      details: [
        ...comparison.missing.map((name) => `missing:${name}`),
        ...comparison.unknown.map((name) => `unknown:${name}`),
        ...comparison.duplicated.map((name) => `duplicated:${name}`),
      ],
    });
  }
  return comparison.expected;
}

export function escapePlaceholderValue(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPlaceholders(text: string, values: Record<string, string>, allowed: readonly string[]): string {
  return text.replace(PLACEHOLDER_OR_ESCAPE, (full, escaped: string | undefined, name: string | undefined) => {
    if (escaped) return `{{${escaped}}}`;
    if (!name) return full;
    if (!allowed.includes(name)) {
      throw new PlatformError("VALIDATION_FAILED", "unknown placeholders rejected", { field: name });
    }
    const value = values[name];
    if (value === undefined) {
      throw new PlatformError("VALIDATION_FAILED", "missing placeholders rejected", { field: name });
    }
    return escapePlaceholderValue(value);
  });
}

export const PLACEHOLDER_POLICY = {
  token: "{{Name}}",
  namePattern: "[A-Za-z][A-Za-z0-9_]*",
  escape: "\\{{Name}} renders as a literal {{Name}} and is not a placeholder",
  comparison: "multiset equality; order may vary; counts must match",
} as const;
