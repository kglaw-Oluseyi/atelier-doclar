"use client";

import { useEffect } from "react";

export default function SeatingErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("seating-surface-error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="atelier-panel" data-testid="seating-error-boundary" role="alert">
      <h1>Seating could not finish rendering</h1>
      <p>The last action may still have been recorded. Reload this seating surface to continue without losing durable state.</p>
      <button type="button" className="button" onClick={() => reset()}>
        Retry seating surface
      </button>
    </div>
  );
}
