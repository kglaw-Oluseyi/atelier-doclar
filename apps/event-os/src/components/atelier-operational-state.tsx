import type { ReactNode } from "react";
import type { OperationalStateView } from "../server/operational-state";

export function AtelierOperationalState({
  state,
  id = "operational-state",
  reloadHref,
  reloadAction,
  reloadFields,
}: {
  state: OperationalStateView;
  id?: string;
  reloadHref?: string;
  reloadAction?: (formData: FormData) => void | Promise<void>;
  reloadFields?: Record<string, string>;
}) {
  const role = state.live === "assertive" ? "alert" : state.live === "polite" ? "status" : undefined;
  return (
    <section
      className="atelier-state"
      data-kind={state.kind}
      data-tone={state.tone}
      data-retry-safe={state.retrySafe ? "true" : "false"}
      data-testid={state.correlationId ? "action-result-banner" : undefined}
      aria-labelledby={`${id}-title`}
      tabIndex={state.kind === "conflict" || state.kind === "success" ? -1 : undefined}
      id={id}
      {...(role ? { role } : {})}
    >
      <h2 id={`${id}-title`}>{state.title}</h2>
      <dl>
        <div>
          <dt>What happened</dt>
          <dd>{state.whatHappened}</dd>
        </div>
        {state.message ? (
          <div>
            <dt>Server detail</dt>
            <dd>{state.message}</dd>
          </div>
        ) : null}
        {state.actionLabel ? (
          <div>
            <dt>Action</dt>
            <dd data-testid="action-result-name">{state.actionLabel}</dd>
          </div>
        ) : null}
        {state.resultStatus ? (
          <div>
            <dt>Result</dt>
            <dd data-testid="action-result-status">{state.resultStatus === "SUCCESS" ? "Succeeded" : "Not applied"}</dd>
          </div>
        ) : null}
        {state.correlationId ? (
          <div>
            <dt>Correlation</dt>
            <dd data-testid="action-result-correlation">{state.correlationId}</dd>
          </div>
        ) : null}
        <div>
          <dt>Did data change</dt>
          <dd>{dataChangedLabel(state.dataChanged)}</dd>
        </div>
        <div>
          <dt>What you may do next</dt>
          <dd>{state.nextStep}</dd>
        </div>
        <div>
          <dt>Is retry safe</dt>
          <dd>{state.retrySafe ? "Yes — retry will not invent a second success." : "No — reload or choose another action first."}</dd>
        </div>
      </dl>
      {state.reloadRequired && reloadAction ? (
        <form className="actions" action={reloadAction}>
          {Object.entries(reloadFields ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button className="button" type="submit" data-testid="conflict-reload">
            Reload the current record
          </button>
        </form>
      ) : state.reloadRequired && reloadHref ? (
        <p className="actions">
          <a className="button" href={reloadHref} data-testid="conflict-reload">
            Reload the current record
          </a>
        </p>
      ) : null}
    </section>
  );
}

export function AtelierLoadingState({ label = "Loading the approved record" }: { label?: string }) {
  return (
    <section className="atelier-state atelier-state-loading" data-kind="loading" role="status" aria-live="polite">
      <p className="atelier-loading-mark" aria-hidden="true" />
      <h2>Loading</h2>
      <p>{label}. Nothing has been saved. Wait for the record before submitting.</p>
    </section>
  );
}

export function AtelierEmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="atelier-state" data-kind="empty" data-tone="brass">
      <h2>{title}</h2>
      <div className="lede">{children}</div>
    </section>
  );
}

function dataChangedLabel(value: OperationalStateView["dataChanged"]): string {
  switch (value) {
    case "yes":
      return "Yes — the durable record now shows the saved projection.";
    case "no":
      return "No — the durable record was left unchanged.";
    case "unknown":
      return "Unknown until you reload the current projection.";
    default:
      return "Not applicable — no write was attempted.";
  }
}
