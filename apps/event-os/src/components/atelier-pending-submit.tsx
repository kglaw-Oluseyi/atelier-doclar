"use client";

import { useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmit({
  children,
  className,
  name,
  value,
  pendingLabel = "Saving…",
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} name={name} value={value} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function IdempotencyField({ name = "idempotencyKey" }: { name?: string }) {
  const reactId = useId();
  const [key] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `idem-${reactId.replace(/:/g, "")}-${Date.now()}`;
  });
  return <input type="hidden" name={name} value={key} />;
}
