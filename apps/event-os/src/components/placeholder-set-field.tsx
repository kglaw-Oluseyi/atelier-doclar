"use client";

import { useMemo, useState } from "react";

const PLACEHOLDER_OR_ESCAPE = /\\\{\{([A-Za-z][A-Za-z0-9_]*)\}\}|\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/g;

function occurrences(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_OR_ESCAPE)) {
    if (match[1]) continue;
    if (match[2]) names.push(match[2]);
  }
  return names;
}

function counts(names: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const name of names) map.set(name, (map.get(name) ?? 0) + 1);
  return map;
}

export function compareVisiblePlaceholders(expected: readonly string[], targetText: string) {
  const detected = occurrences(targetText);
  const sourceCounts = counts(expected);
  const targetCounts = counts(detected);
  const missing: string[] = [];
  const unknown: string[] = [];
  const duplicated: string[] = [];
  for (const [name, sourceCount] of sourceCounts) {
    const targetCount = targetCounts.get(name) ?? 0;
    if (targetCount < sourceCount) missing.push(name);
    if (targetCount > sourceCount) duplicated.push(name);
  }
  for (const [name] of targetCounts) {
    if (!sourceCounts.has(name)) unknown.push(name);
  }
  return { detected, missing, unknown, duplicated, valid: missing.length + unknown.length + duplicated.length === 0 };
}

export function PlaceholderSetField({
  name = "exactText",
  expected,
  defaultValue,
  label = "Translation",
  lang,
  required = true,
}: {
  name?: string;
  expected: readonly string[];
  defaultValue?: string;
  label?: string;
  lang?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const comparison = useMemo(() => compareVisiblePlaceholders(expected, value), [expected, value]);
  return (
    <div className="placeholder-inspector" data-testid="placeholder-inspector">
      <p className="eyebrow" id="placeholder-expected-label">
        Expected placeholders
      </p>
      <p data-testid="placeholder-expected">{expected.length ? expected.map((item) => `{{${item}}}`).join(" ") : "None"}</p>
      <label>
        {label}
        <textarea
          name={name}
          required={required}
          rows={4}
          lang={lang}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby="placeholder-validation"
        />
      </label>
      <p className="eyebrow">Detected placeholders</p>
      <p data-testid="placeholder-detected">{comparison.detected.length ? comparison.detected.map((item) => `{{${item}}}`).join(" ") : "None"}</p>
      <div
        id="placeholder-validation"
        className="placeholder-validation"
        data-testid="placeholder-validation"
        data-valid={comparison.valid ? "true" : "false"}
        tabIndex={-1}
        role="status"
      >
        {comparison.valid ? (
          <p>Placeholder sets match. Reordering is permitted. Data has not changed yet.</p>
        ) : (
          <ul>
            {comparison.missing.length ? <li>Missing: {comparison.missing.join(", ")}</li> : null}
            {comparison.unknown.length ? <li>Unknown: {comparison.unknown.join(", ")}</li> : null}
            {comparison.duplicated.length ? <li>Duplicated: {comparison.duplicated.join(", ")}</li> : null}
            <li>Data was not changed. Correct the text before save, review or assembly.</li>
          </ul>
        )}
      </div>
    </div>
  );
}
