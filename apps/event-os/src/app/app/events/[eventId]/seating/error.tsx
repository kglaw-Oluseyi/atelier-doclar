"use client";

import { useEffect, useRef } from "react";

export default function SeatingErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    console.error("seating-surface-error", error.digest ?? error.message);
    panelRef.current?.focus();
  }, [error]);

  return (
    <div className="atelier-panel" data-testid="seating-error-boundary" role="alert" tabIndex={-1} ref={panelRef}>
      <h1>Seating could not finish this step</h1>
      <p>
        The page stayed available so you can continue. The last action may already have been recorded — reload this
        seating surface to confirm before retrying, so a change is not submitted twice.
      </p>
      <div className="actions">
        <button type="button" className="button" onClick={() => reset()} data-testid="seating-error-boundary-retry">
          Retry seating surface
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => window.location.reload()}
          data-testid="seating-error-boundary-reload"
        >
          Reload seating
        </button>
      </div>
    </div>
  );
}
