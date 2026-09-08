"use client";

import { useState, type ReactNode } from "react";

function CopyExact({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="secondary canonical-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : "Copy exact value"}
    </button>
  );
}

export function CanonicalTime({
  iso,
  testId,
}: {
  iso: string;
  testId?: string;
}) {
  const parsed = new Date(iso);
  const label = Number.isNaN(parsed.getTime())
    ? "Time unavailable"
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Lagos",
      }).format(parsed);
  return (
    <span className="canonical-evidence" data-testid={testId}>
      <time dateTime={iso}>{label}</time>
      <details>
        <summary>Exact time</summary>
        <code>{iso}</code>
        <CopyExact value={iso} />
      </details>
    </span>
  );
}

export function CanonicalHash({ value, testId }: { value: string; testId?: string }) {
  return (
    <span className="canonical-evidence" data-testid={testId}>
      <code>{value.slice(0, 12)}</code>
      <details>
        <summary>Full hash</summary>
        <code>{value}</code>
        <CopyExact value={value} />
      </details>
    </span>
  );
}

export function CanonicalId({
  id,
  label = "Immutable ID",
  testId,
}: {
  id: string;
  label?: string;
  testId?: string;
}) {
  return (
    <details className="canonical-id" data-testid={testId}>
      <summary>{label}</summary>
      <code>{id}</code>
      <CopyExact value={id} />
    </details>
  );
}

export function HistoryDisclosure({
  summary,
  count,
  children,
  testId,
}: {
  summary: string;
  count: number;
  children: ReactNode;
  testId?: string;
}) {
  if (count === 0) return null;
  return (
    <details className="history-disclosure" data-testid={testId}>
      <summary>
        {summary} ({count})
      </summary>
      {children}
    </details>
  );
}
