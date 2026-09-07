"use client";

import { useRef, useState, type ReactNode } from "react";

export function LifecycleForm({
  action,
  children,
  className,
  testId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);
  return (
    <form
      className={className}
      action={action}
      data-testid={testId}
      aria-busy={locked || undefined}
      onSubmit={(event) => {
        if (lockedRef.current) {
          event.preventDefault();
          return;
        }
        lockedRef.current = true;
        setLocked(true);
      }}
    >
      <fieldset disabled={locked} className="lifecycle-fieldset">
        {locked ? (
          <p className="lifecycle-progress" role="status">
            Recording access…
          </p>
        ) : null}
        {children}
      </fieldset>
    </form>
  );
}
