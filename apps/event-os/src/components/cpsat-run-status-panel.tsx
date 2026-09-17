"use client";

import type { CpsatRunUiModel } from "@maison-doclar/shared-platform";

/**
 * CP-SAT run status panel — durable lifecycle (Milestone 1).
 * Forbidden: percent-complete UI, ETA to optimality, "almost done", "best possible" without OPTIMAL.
 */
export function CpsatRunStatusPanel({
  model,
  shortReasons,
  onCancel,
  cancelDisabled,
  launching,
}: {
  model: CpsatRunUiModel;
  shortReasons?: Array<{ guestToken: string; text: string }>;
  onCancel?: () => void;
  cancelDisabled?: boolean;
  launching?: boolean;
}) {
  const lifecycleLabel =
    model.operatorLifecycle === "CANCELLATION_REQUESTED"
      ? "Cancellation requested"
      : model.operatorLifecycle === "QUEUED"
        ? "Queued"
        : model.operatorLifecycle === "LAUNCHING"
          ? "Launching"
          : model.operatorLifecycle === "NONE"
            ? "No run"
            : model.lifecycle;

  const assertiveFailure =
    model.operatorLifecycle === "VALIDATION_FAILED" || Boolean(model.faultCode) || model.operatorLifecycle === "ACCESS_DENIED";

  return (
    <section
      aria-labelledby="cpsat-run-status-heading"
      className="cpsat-run-status"
      data-testid="cpsat-run-status-panel"
      data-operator-lifecycle={model.operatorLifecycle}
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
      <p
        data-testid="cpsat-run-primary-message"
        role={assertiveFailure ? "alert" : "status"}
        aria-live={assertiveFailure ? "assertive" : "polite"}
        style={{ margin: 0, fontWeight: 600 }}
      >
        {launching ? "Preparing the governed seating request…" : model.primaryMessage}
      </p>
      <p data-testid="cpsat-run-supporting-message" style={{ margin: 0, fontSize: "0.95rem" }}>
        {launching
          ? "Authority is being frozen. Solving has not started."
          : model.supportingMessage}
      </p>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(8rem, 12rem) 1fr",
          gap: "0.35rem 1rem",
          margin: 0,
        }}
      >
        <dt>Lifecycle</dt>
        <dd style={{ margin: 0 }} data-testid="cpsat-run-lifecycle">
          <span aria-hidden="true">● </span>
          {lifecycleLabel}
        </dd>
        <dt>Result status</dt>
        <dd style={{ margin: 0 }} data-testid="cpsat-run-result-status">
          {model.resultStatus && model.resultStatus.length > 0 ? model.resultStatus : "None yet"}
        </dd>
        <dt>Freshness</dt>
        <dd style={{ margin: 0 }} data-testid="cpsat-run-freshness">
          {model.freshness === "STALE" ? "Stale authority" : "Current"}
        </dd>
        <dt>Evidence grade</dt>
        <dd style={{ margin: 0 }} data-testid="cpsat-run-evidence">
          {model.evidenceGrade ?? "Not applicable"}
        </dd>
        <dt>Purpose / mode</dt>
        <dd style={{ margin: 0 }}>
          {model.purposeLabel} · {model.modeLabel}
        </dd>
        <dt>Created</dt>
        <dd style={{ margin: 0 }}>{model.createdAtLabel ?? "—"}</dd>
        <dt>Engine</dt>
        <dd style={{ margin: 0 }}>{model.engineLabel}</dd>
        {model.operatorLifecycle === "SETTLED" || model.operatorLifecycle === "RUNNING" ? (
          <>
            <dt>Phase</dt>
            <dd style={{ margin: 0 }} role="status" aria-live="polite">
              {model.phase}
            </dd>
            <dt>Elapsed</dt>
            <dd style={{ margin: 0 }}>{(model.elapsedMs / 1000).toFixed(1)}s</dd>
            <dt>Guests</dt>
            <dd style={{ margin: 0 }}>
              {model.guestTotals.seated}/{model.guestTotals.eligible} seated
            </dd>
            <dt>Product result</dt>
            <dd style={{ margin: 0 }} role="status" aria-live="polite">
              <strong>{model.productResult || "—"}</strong>
            </dd>
          </>
        ) : null}
        {model.faultCode ? (
          <>
            <dt>Fault</dt>
            <dd style={{ margin: 0 }} role="alert" aria-live="assertive">
              {model.faultCode}
            </dd>
          </>
        ) : null}
        {model.validationMessage ? (
          <>
            <dt>Next step</dt>
            <dd style={{ margin: 0 }} role="alert" aria-live="assertive">
              {model.validationMessage}
            </dd>
          </>
        ) : null}
      </dl>
      {/* showPercentComplete is always false — no fake completion meter */}
      {model.showPercentComplete ? null : null}
      <p style={{ margin: 0, fontSize: "0.9rem" }} data-testid="cpsat-run-leave-return">
        {model.safeToLeaveAndReturn
          ? "Safe to leave and return — this run is durable in PostgreSQL."
          : "Remain on this page until the run settles."}
      </p>
      {model.cancelAllowed && onCancel && !model.cancelRequested ? (
        <button
          type="button"
          className="button secondary cpsat-interactive"
          data-testid="cpsat-cancel-run"
          disabled={cancelDisabled || launching}
          aria-disabled={cancelDisabled || launching}
          onClick={onCancel}
          style={{ cursor: cancelDisabled || launching ? "not-allowed" : "pointer" }}
        >
          Cancel run
        </button>
      ) : null}
      {model.cancelRequested ? (
        <p data-testid="cpsat-cancel-requested" style={{ margin: 0, fontSize: "0.9rem" }}>
          Cancellation request is recorded. Do not treat the run as cancelled until the worker acknowledges it.
        </p>
      ) : null}
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
        @media (max-width: 390px) {
          .cpsat-run-status dl { grid-template-columns: 1fr; }
        }
        @media (min-width: 768px) {
          .cpsat-run-status { max-width: 48rem; }
        }
        @media (min-width: 1440px) {
          .cpsat-run-status { max-width: 56rem; }
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
        .cpsat-interactive,
        .cpsat-run-status button {
          cursor: pointer;
        }
        .cpsat-run-status button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }
      `}</style>
    </section>
  );
}
