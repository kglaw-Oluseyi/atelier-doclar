"use client";

import type { CpsatRunUiModel } from "@maison-doclar/shared-platform";
import {
  cancelConfirmCopy,
  keepBestConfirmCopy,
} from "@maison-doclar/shared-platform";

/**
 * CP-SAT run status panel — durable lifecycle (Milestone 2+) + stop-keep-best (Milestone 4).
 * Forbidden: percent meters, ETA to optimality, false impossibility claims, "best possible" without OPTIMAL,
 * and offering the retired seating engine as an alternative.
 */
export function CpsatRunStatusPanel({
  model,
  shortReasons,
  onCancel,
  onStopKeepBest,
  cancelDisabled,
  launching,
  onReview,
  infeasibility,
  auditorReadOnly,
}: {
  model: CpsatRunUiModel;
  shortReasons?: Array<{ guestToken: string; text: string }>;
  onCancel?: () => void;
  onStopKeepBest?: () => void;
  cancelDisabled?: boolean;
  launching?: boolean;
  onReview?: () => void;
  infeasibility?: {
    whatConflicts?: string;
    plainExplanation?: string;
    correctionOptions?: Array<{ ruleRef: string; kind: string; restricted: boolean }>;
    maximumSeating?: string | null;
    limitations?: string[];
  } | null;
  auditorReadOnly?: boolean;
}) {
  const lifecycleLabel =
    model.operatorLifecycle === "CANCELLATION_REQUESTED"
      ? "Cancellation requested"
      : model.operatorLifecycle === "QUEUED"
        ? "Queued"
        : model.operatorLifecycle === "CLAIMED"
          ? "Claimed"
          : model.operatorLifecycle === "LAUNCHING"
            ? "Launching"
            : model.operatorLifecycle === "READY_FOR_REVIEW"
              ? "Ready for review"
              : model.operatorLifecycle === "NONE"
                ? "No run"
                : model.operatorLifecycle === "VERIFYING"
                  ? "Verifying"
                  : model.operatorLifecycle === "EXPLAINING"
                    ? "Preparing reasons"
                    : model.lifecycle;

  const assertiveFailure =
    model.operatorLifecycle === "VALIDATION_FAILED" ||
    model.operatorLifecycle === "SOLVER_FAULT" ||
    model.operatorLifecycle === "ACCESS_DENIED" ||
    Boolean(model.faultCode);

  const showDetail =
    model.operatorLifecycle === "SETTLED" ||
    model.operatorLifecycle === "RUNNING" ||
    model.operatorLifecycle === "CLAIMED" ||
    model.operatorLifecycle === "VERIFYING" ||
    model.operatorLifecycle === "EXPLAINING" ||
    model.operatorLifecycle === "READY_FOR_REVIEW" ||
    model.operatorLifecycle === "INFEASIBLE" ||
    model.operatorLifecycle === "SEARCH_INCOMPLETE" ||
    model.operatorLifecycle === "TIMED_OUT" ||
    model.operatorLifecycle === "INVALID_INPUT" ||
    model.operatorLifecycle === "SOLVER_FAULT" ||
    model.operatorLifecycle === "CANCELLED";

  const showMutationControls = !auditorReadOnly;

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
        {model.completedAtLabel ? (
          <>
            <dt>Completed</dt>
            <dd style={{ margin: 0 }} data-testid="cpsat-run-completed">
              {model.completedAtLabel}
            </dd>
          </>
        ) : null}
        <dt>Engine</dt>
        <dd style={{ margin: 0 }}>{model.engineLabel}</dd>
        {showDetail ? (
          <>
            <dt>Phase</dt>
            <dd style={{ margin: 0 }} role="status" aria-live="polite" data-testid="cpsat-run-phase">
              {model.phase}
            </dd>
            <dt>Elapsed</dt>
            <dd style={{ margin: 0 }}>{(model.elapsedMs / 1000).toFixed(1)}s</dd>
            <dt>Guests</dt>
            <dd style={{ margin: 0 }} data-testid="cpsat-run-guests">
              {model.guestTotals.seated}/{model.guestTotals.eligible} seated
            </dd>
            <dt>HARD rules</dt>
            <dd style={{ margin: 0 }} data-testid="cpsat-run-hard-result">
              {model.hardResult}
            </dd>
            <dt>Product result</dt>
            <dd style={{ margin: 0 }} role="status" aria-live="polite">
              <strong>{model.productResult || "—"}</strong>
            </dd>
            {model.assignmentHashShort ? (
              <>
                <dt>Assignment hash</dt>
                <dd style={{ margin: 0 }} data-testid="cpsat-run-assignment-hash">
                  {model.assignmentHashShort}…
                </dd>
              </>
            ) : null}
          </>
        ) : null}
        {model.faultCode ? (
          <>
            <dt>Fault</dt>
            <dd style={{ margin: 0 }} role="alert" aria-live="assertive" data-testid="cpsat-run-fault">
              {model.faultCode}
            </dd>
            <dt>Retry</dt>
            <dd style={{ margin: 0 }} data-testid="cpsat-run-retry-safe">
              {model.retrySafe ? "Retry is safe after review" : "Retry is not recommended without authority changes"}
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
      {model.showPercentComplete ? null : null}
      {model.showHeuristicFallback ? null : null}
      <p style={{ margin: 0, fontSize: "0.9rem" }} data-testid="cpsat-run-leave-return">
        {model.safeToLeaveAndReturn
          ? "Safe to leave and return — this run is durable in PostgreSQL."
          : "Remain on this page until the run settles."}
      </p>

      {model.operatorLifecycle === "INFEASIBLE" && infeasibility ? (
        <section data-testid="cpsat-infeasibility-panel" className="cpsat-diag-panel" style={{ display: "grid", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "1rem", margin: 0 }}>Conflict guidance</h3>
          {infeasibility.whatConflicts ? (
            <p data-testid="cpsat-conflict-what" style={{ margin: 0 }}>
              {infeasibility.whatConflicts}
            </p>
          ) : null}
          {infeasibility.plainExplanation ? (
            <p data-testid="cpsat-conflict-plain" style={{ margin: 0 }}>
              {infeasibility.plainExplanation}
            </p>
          ) : null}
          {infeasibility.correctionOptions && infeasibility.correctionOptions.length > 0 ? (
            <div data-testid="cpsat-correction-options">
              <h4 style={{ fontSize: "0.95rem", margin: "0 0 0.25rem" }}>Correction options</h4>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {infeasibility.correctionOptions.map((opt) => (
                  <li key={opt.ruleRef}>
                    {opt.restricted ? "Restricted rule" : opt.kind} ({opt.ruleRef}…)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {infeasibility.maximumSeating ? (
            <p data-testid="cpsat-maxseat" style={{ margin: 0 }}>
              {infeasibility.maximumSeating}
            </p>
          ) : null}
          {infeasibility.limitations && infeasibility.limitations.length > 0 ? (
            <ul data-testid="cpsat-diag-limitations" style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {infeasibility.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          ) : null}
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            No automatic relaxation. No heuristic fallback. Start a new run after an authorised change.
          </p>
        </section>
      ) : null}

      {model.operatorLifecycle === "READY_FOR_REVIEW" && model.reviewActionLabel ? (
        <button
          type="button"
          className="button primary cpsat-interactive"
          data-testid="cpsat-review-seating-plan"
          onClick={onReview}
          style={{ cursor: "pointer" }}
        >
          {model.reviewActionLabel}
        </button>
      ) : null}
      {showMutationControls && model.cancelAllowed && onCancel && !model.cancelRequested ? (
        <button
          type="button"
          className="button secondary cpsat-interactive"
          data-testid="cpsat-cancel-run"
          disabled={cancelDisabled || launching}
          aria-disabled={cancelDisabled || launching}
          title={cancelConfirmCopy()}
          onClick={() => {
            if (typeof window !== "undefined" && !window.confirm(cancelConfirmCopy())) return;
            onCancel();
          }}
          style={{ cursor: cancelDisabled || launching ? "not-allowed" : "pointer" }}
        >
          Cancel run
        </button>
      ) : null}
      {showMutationControls && model.stopAndKeepBestAllowed && onStopKeepBest && !model.cancelRequested ? (
        <button
          type="button"
          className="button secondary cpsat-interactive"
          data-testid="cpsat-stop-keep-best"
          disabled={cancelDisabled || launching}
          title={keepBestConfirmCopy()}
          onClick={() => {
            if (typeof window !== "undefined" && !window.confirm(keepBestConfirmCopy())) return;
            onStopKeepBest();
          }}
          style={{ cursor: cancelDisabled || launching ? "not-allowed" : "pointer" }}
        >
          Stop and keep best plan
        </button>
      ) : null}
      {model.cancelRequested && model.operatorLifecycle !== "CANCELLED" ? (
        <p data-testid="cpsat-cancel-requested" style={{ margin: 0, fontSize: "0.9rem" }}>
          {model.primaryMessage.includes("Stopping safely")
            ? model.primaryMessage
            : "Cancellation request is recorded. Do not treat the run as cancelled until the worker acknowledges it."}
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
          .cpsat-diag-panel { max-width: 100%; }
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
