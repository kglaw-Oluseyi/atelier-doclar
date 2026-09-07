import { PlatformError } from "./errors.js";

const PLACEHOLDER = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;

export function extractPlaceholderNames(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (!name) continue;
    if (seen.has(name)) duplicates.add(name);
    else {
      seen.add(name);
      names.push(name);
    }
  }
  if (duplicates.size > 0) {
    throw new PlatformError("VALIDATION_FAILED", "duplicated placeholders are not permitted", {
      details: [...duplicates],
    });
  }
  return names;
}

export function assertPlaceholderSetsMatch(sourceText: string, targetText: string): string[] {
  const source = extractPlaceholderNames(sourceText);
  const target = extractPlaceholderNames(targetText);
  const missing = source.filter((name) => !target.includes(name));
  const unknown = target.filter((name) => !source.includes(name));
  if (missing.length > 0 || unknown.length > 0) {
    throw new PlatformError("VALIDATION_FAILED", "source and target placeholder sets must match exactly", {
      details: [...missing.map((name) => `missing:${name}`), ...unknown.map((name) => `unknown:${name}`)],
    });
  }
  return source;
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
  return text.replace(PLACEHOLDER, (_full, name: string) => {
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
