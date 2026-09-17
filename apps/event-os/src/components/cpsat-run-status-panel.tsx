"use client";

import type { CpsatRunUiModel } from "@maison-doclar/shared-platform";

/**
 * CP-SAT run status panel — Checkpoint 2 accessibility preparation.
 * Forbidden: percent complete, ETA to optimality, "almost done", "best possible" without OPTIMAL.
 */
export function CpsatRunStatusPanel({
  model,
  shortReasons,
}: {
  model: CpsatRunUiModel;
  shortReasons?: Array<{ guestToken: string; text: string }>;
}) {
  return (
    <section
      aria-labelledby="cpsat-run-status-heading"
      className="cpsat-run-status"
      style={{
        display: "grid",
        gap: "0.75rem",
        padding: "1rem 0",
        borderTop: "1px solid currentColor",
      }}
    >
      <h2 id="cpsat-run-status-heading" style={{ fontSize: "1.125rem", margin: 0 }}>
        Solver run
      </h2>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(8rem, 12rem) 1fr",
          gap: "0.35rem 1rem",
          margin: 0,
        }}
      >
        <dt>Engine</dt>
        <dd style={{ margin: 0 }}>{model.engineLabel}</dd>
        <dt>Phase</dt>
        <dd style={{ margin: 0 }} role="status" aria-live="polite">
          {model.phase}
        </dd>
        <dt>Elapsed</dt>
        <dd style={{ margin: 0 }}>{(model.elapsedMs / 1000).toFixed(1)}s</dd>
        <dt>Deterministic budget</dt>
        <dd style={{ margin: 0 }}>
          {model.deterministicBudgetSeconds == null ? "—" : `${model.deterministicBudgetSeconds}s consumed as limit`}
        </dd>
        <dt>First solution</dt>
        <dd style={{ margin: 0 }}>{model.firstSolutionFound ? "Found" : "Not yet"}</dd>
        <dt>Objective / bound</dt>
        <dd style={{ margin: 0 }}>
          {model.currentObjective ?? "—"}
          {model.currentBound != null ? ` · bound ${model.currentBound}` : ""}
        </dd>
        <dt>Proof</dt>
        <dd style={{ margin: 0 }}>{model.proofStatus}</dd>
        <dt>Guests</dt>
        <dd style={{ margin: 0 }}>
          {model.guestTotals.seated}/{model.guestTotals.eligible} seated
        </dd>
        <dt>Tables</dt>
        <dd style={{ margin: 0 }}>
          {model.tableTotals.occupied} occupied · {model.tableTotals.capacity} capacity seats
        </dd>
        <dt>HARD result</dt>
        <dd style={{ margin: 0 }}>{model.hardResult}</dd>
        <dt>Movement</dt>
        <dd style={{ margin: 0 }}>{model.movementResult ?? "—"}</dd>
        <dt>Preferences</dt>
        <dd style={{ margin: 0 }}>{model.preferenceResult ?? "—"}</dd>
        <dt>Product result</dt>
        <dd style={{ margin: 0 }} role="status" aria-live="polite">
          <strong>{model.productResult}</strong>
          {model.freshness === "STALE" ? " · stale authority" : ""}
        </dd>
        {model.faultCode ? (
          <>
            <dt>Fault</dt>
            <dd style={{ margin: 0 }} role="alert" aria-live="assertive">
              {model.faultCode}
            </dd>
          </>
        ) : null}
      </dl>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>
        {model.safeToLeaveAndReturn
          ? "Safe to leave and return — progress is durable on the run record."
          : "Remain on this page until the run settles."}
      </p>
      {shortReasons && shortReasons.length > 0 ? (
        <div>
          <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Guest reasons</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", maxHeight: "16rem", overflow: "auto" }}>
            {shortReasons.map((row) => (
              <li key={row.guestToken}>
                <span className="sr-only">Guest </span>
                {row.guestToken}: {row.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <style>{`
        @media (max-width: 360px) {
          .cpsat-run-status dl { grid-template-columns: 1fr; }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          border: 0;
        }
        .cpsat-run-status :focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
      `}</style>
    </section>
  );
}
