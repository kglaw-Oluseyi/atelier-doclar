"use client";

/**
 * Fail-closed operator experience when no compatible READY worker can admit a launch.
 * Offers only check-again and return-to-overview — never alternate solvers.
 */
export function CpsatWorkerUnavailablePanel({
  reason = "unavailable",
  onCheckAgain,
  overviewHref,
}: {
  reason?: "unavailable" | "queue_busy";
  onCheckAgain?: () => void;
  overviewHref: string;
}) {
  const title =
    reason === "queue_busy"
      ? "Seating generation is busy"
      : "Seating generation temporarily unavailable";
  const body =
    reason === "queue_busy"
      ? "Seating generation is busy. No run was started. Please try again shortly."
      : "The solver service is not ready. Your event data and current operational seating plan have not changed.";

  return (
    <aside
      className="atelier-panel"
      data-testid="cpsat-worker-unavailable"
      data-reason={reason}
      role="status"
      aria-live="polite"
    >
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="atelier-actions" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" className="button" onClick={() => (onCheckAgain ? onCheckAgain() : window.location.reload())}>
          Check again
        </button>
        <a className="button" href={overviewHref}>
          Return to seating overview
        </a>
      </div>
    </aside>
  );
}
