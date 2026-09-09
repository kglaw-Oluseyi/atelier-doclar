import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { runS05AEvaluationAction } from "../server/eec-evaluation-actions";

export type EvaluationPanelModel = {
  status: string;
  blocked: boolean;
  releaseReady: boolean;
  blockingReasons: string[];
  currentCorpusEdition: string;
  currentOrchestratorVersion: string;
  currentProviderVersion: string;
  currentProjectionPolicyVersion: string;
  lastRunId?: string;
  lastRunAt?: string;
  passedCount?: number;
  failedCount?: number;
  zeroToleranceFailed?: boolean;
  corpusHash?: string;
  correlationId?: string;
  diagnostics?: Array<{
    caseId: string;
    title?: string;
    code: string;
    expectedSummary: string;
    observedSummary: string;
    category?: string;
  }>;
};

function headline(model: EvaluationPanelModel): string {
  if (model.status === "RUNNING") return "Evaluation running";
  if (model.status === "FAILED") return "Evaluation failed — release readiness is blocked";
  if (model.status === "STALE" || model.status === "INCOMPATIBLE") return "Evaluation stale/incompatible — rerun required";
  if (model.status === "PASSED" && !model.blocked) return "Evaluation passed — current fixture assurance gate satisfied";
  return "Evaluation not run — EOS-S05A release readiness is blocked";
}

export function EecEvaluationPanel({
  organisationId,
  canRun,
  model,
}: {
  organisationId: string;
  canRun: boolean;
  model: EvaluationPanelModel;
}) {
  return (
    <section className="form programme-form eec-evaluation-panel" data-testid="eec-evaluation-panel">
      <h2>Fixture assurance</h2>
      <p data-testid="eec-evaluation-headline">{headline(model)}</p>
      <p className="lede">
        An evaluation pass is fixture assurance only. It is not production authorisation and it is not slice
        acceptance.
      </p>
      <p data-testid="eec-evaluation-meta">
        Corpus {model.currentCorpusEdition} · orchestrator {model.currentOrchestratorVersion} · provider Deterministic
        fixture · projection {model.currentProjectionPolicyVersion}
      </p>
      <p>
        Last run {model.lastRunAt ?? "never"} · cases passed {model.passedCount ?? 0} / failed {model.failedCount ?? 0} ·
        zero-tolerance {model.zeroToleranceFailed ? "failed" : "clear"}
      </p>
      {model.blockingReasons.length ? (
        <ul data-testid="eec-evaluation-blocking">
          {model.blockingReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {canRun ? (
        <form action={runS05AEvaluationAction} data-testid="eec-evaluation-run-form">
          <input type="hidden" name="organisationId" value={organisationId} />
          <input type="hidden" name="reason" value="Run fixture assurance" />
          <IdempotencyField />
          <PendingSubmit pendingLabel="Running fixture assurance…">Run fixture assurance</PendingSubmit>
        </form>
      ) : (
        <p data-testid="eec-evaluation-no-run">This assignment cannot run fixture assurance.</p>
      )}
      {model.diagnostics?.length ? (
        <div data-testid="eec-evaluation-diagnostics">
          <h3>Failed observations</h3>
          <ul>
            {model.diagnostics.map((item) => (
              <li key={`${item.caseId}-${item.code}`}>
                {item.title ?? item.caseId}: {item.code}. Expected {item.expectedSummary}. Observed {item.observedSummary}
                {item.category ? ` · ${item.category}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <details>
        <summary>Technical identifiers</summary>
        <p>Corpus hash {model.corpusHash ?? "none"}</p>
        <p>Correlation {model.correlationId ?? "none"}</p>
        <p>Last run {model.lastRunId ?? "none"}</p>
      </details>
    </section>
  );
}
