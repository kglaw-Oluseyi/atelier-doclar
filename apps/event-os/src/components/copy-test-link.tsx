"use client";

import { useState } from "react";

export function CopyTestLink({
  href,
  label = "Copy test link",
  testId,
}: {
  href: string;
  label?: string;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="secondary"
      data-testid={testId}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(href);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
