"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmit({
  children,
  className,
  name,
  value,
  pendingLabel = "Saving…",
  locked = false,
  lockedLabel = "Reload before retrying",
  lockOnceKey,
  blocked = false,
  blockedLabel,
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  pendingLabel?: string;
  locked?: boolean;
  lockedLabel?: string;
  lockOnceKey?: string;
  blocked?: boolean;
  blockedLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [lockFresh, setLockFresh] = useState(true);
  useEffect(() => {
    if (!locked || !lockOnceKey) return;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "reload") setLockFresh(false);
  }, [locked, lockOnceKey]);
  const effectiveLocked = locked && (lockOnceKey ? lockFresh : true);
  const disabled = pending || effectiveLocked || blocked;
  return (
    <button
      type="submit"
      className={className}
      name={name}
      value={value}
      disabled={disabled}
      aria-busy={pending}
      aria-disabled={disabled}
      title={effectiveLocked ? lockedLabel : undefined}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {pending ? pendingLabel : effectiveLocked ? lockedLabel : blocked ? blockedLabel ?? children : children}
    </button>
  );
}

export function IdempotencyField({ name = "idempotencyKey" }: { name?: string }) {
  const reactId = useId();
  // Defer UUID generation until after mount so SSR HTML matches the first client paint
  // (crypto.randomUUID in useState caused React hydration error #418 on seating forms).
  const [key, setKey] = useState("");
  useEffect(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      setKey(crypto.randomUUID());
      return;
    }
    setKey(`idem-${reactId.replace(/:/g, "")}-${Date.now()}`);
  }, [reactId]);
  return <input type="hidden" name={name} value={key} suppressHydrationWarning />;
}
