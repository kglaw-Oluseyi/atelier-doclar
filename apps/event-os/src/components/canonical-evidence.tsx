"use client";

import { useEffect, useState, type ReactNode } from "react";

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

function coerceIso(iso: string | Date): string {
  if (typeof iso === "string") return iso;
  if (iso instanceof Date && !Number.isNaN(iso.getTime())) return iso.toISOString();
  return String(iso ?? "");
}

export function CanonicalTime({
  iso,
  testId,
}: {
  iso: string | Date;
  testId?: string;
}) {
  const exact = coerceIso(iso);
  // Defer locale formatting until after mount so Node ICU and browser ICU cannot
  // diverge during hydration (React #418). First paint shows the exact ISO stamp.
  const [label, setLabel] = useState(exact);
  useEffect(() => {
    const parsed = new Date(exact);
    if (Number.isNaN(parsed.getTime())) {
      setLabel("Time unavailable");
      return;
    }
    setLabel(
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Lagos",
      }).format(parsed),
    );
  }, [exact]);
  return (
    <span className="canonical-evidence" data-testid={testId}>
      <time dateTime={exact}>{label}</time>
      <details>
        <summary>Exact time</summary>
        <code>{exact}</code>
        <CopyExact value={exact} />
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
