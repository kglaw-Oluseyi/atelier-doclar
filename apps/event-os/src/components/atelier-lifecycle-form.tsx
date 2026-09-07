"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function LifecycleForm({
  action,
  children,
  className,
  testId,
  locked: mutationLocked = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  testId?: string;
  locked?: boolean;
}) {
  const lockedRef = useRef(mutationLocked);
  const [locked, setLocked] = useState(mutationLocked);
  useEffect(() => {
    lockedRef.current = mutationLocked;
    setLocked(mutationLocked);
  }, [mutationLocked]);
  return (
    <form
      className={className}
      action={action}
      data-testid={testId}
      aria-busy={locked || undefined}
      onSubmit={(event) => {
        if (lockedRef.current || mutationLocked) {
          event.preventDefault();
          return;
        }
        lockedRef.current = true;
        setLocked(true);
      }}
    >
      <fieldset disabled={locked} className="lifecycle-fieldset">
        {locked && !mutationLocked ? (
          <p className="lifecycle-progress" role="status">
            Recording access…
          </p>
        ) : null}
        {children}
      </fieldset>
    </form>
  );
}
