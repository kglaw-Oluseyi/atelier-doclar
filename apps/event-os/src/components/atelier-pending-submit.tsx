"use client";

import { useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmit({
  children,
  className,
  name,
  value,
  pendingLabel = "Saving…",
  locked = false,
  lockedLabel = "Reload before retrying",
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  pendingLabel?: string;
  locked?: boolean;
  lockedLabel?: string;
}) {
  const { pending } = useFormStatus();
  const disabled = pending || locked;
  return (
    <button
      type="submit"
      className={className}
      name={name}
      value={value}
      disabled={disabled}
      aria-busy={pending}
      aria-disabled={disabled}
    >
      {pending ? pendingLabel : locked ? lockedLabel : children}
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
