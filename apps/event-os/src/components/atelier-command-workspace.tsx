import Link from "next/link";
import type { AtelierWorkspaceView } from "@maison-doclar/shared-platform";
import {
  approveAtelierPlanAction,
  confirmAtelierPlanAction,
  executeAtelierPlanAction,
  invokeAtelierTaskAction,
  submitAtelierInstructionAction,
} from "../server/atelier-command-actions";

function effectLabel(mode: string, risk: string): string {
  if (mode === "EXTERNAL_EFFECT" || risk === "R4" || risk === "R5") return "External effect";
  if (mode === "READ_ONLY" || risk === "R0") return "Read-only";
  if (mode === "DRAFT_ONLY" || risk === "R1") return "Preparatory / draft";
  if (mode === "MAKER_CHECKER" || risk === "R3") return "Maker-checker";
  if (mode === "CONFIRM_EACH" || risk === "R2") return "Confirm before act";
  return mode;
}

export function AtelierCommandWorkspace({
  organisationId,
  eventId,
  eventName,
  workspace,
  canInstruct,
  canExecute,
  canApprove,
  actorLabel,
  assignmentLabel,
  taskQuery,
  taskDomain,
}: {
  organisationId: string;
  eventId: string;
  eventName: string;
  workspace: AtelierWorkspaceView;
  canInstruct: boolean;
  canExecute: boolean;
  canApprove: boolean;
  actorLabel: string;
  assignmentLabel: string;
  taskQuery: string;
  taskDomain: string;
}) {
  const latestPlan = [...workspace.plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  const latestSteps = latestPlan
    ? workspace.planSteps.filter((step) => step.planId === latestPlan.id).sort((a, b) => a.ordinal - b.ordinal)
    : [];
  const latestInstruction = [...workspace.instructions].sort(
    (a, b) => b.sequence - a.sequence || b.createdAt.localeCompare(a.createdAt),
  )[0];
  const latestReceipt = [...workspace.receipts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .find((receipt) => !latestPlan || !receipt.planId || receipt.planId === latestPlan.id || receipt.instructionId === latestInstruction?.id)
    ?? [...workspace.receipts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  // Prefer the newest intelligence-bearing receipt so a later answer is never masked by an older one.
  const intelligenceReceipt = [...workspace.receipts]
    .filter((receipt) => receipt.intelligenceResult?.answer)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  const intelligence = intelligenceReceipt?.intelligenceResult ?? latestReceipt?.intelligenceResult;
  const settlements = [...workspace.receipts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, 12);

  return (
    <div className="atelier-command" data-testid="atelier-command-workspace">
      <section className="atelier-command-context" aria-label="Selected event context">
        <p>
          <span className="md-status" data-tone="brass">
            Event-scoped
          </span>{" "}
          <strong>{eventName}</strong>
          <span className="atelier-command-muted"> · {eventId}</span>
        </p>
        <p className="atelier-command-muted" data-testid="atelier-command-actor">
          Actor: {actorLabel} · Assignment: {assignmentLabel}
        </p>
        <p className="atelier-command-muted">
          Production authorised: {String(workspace.posture.productionAuthorised)} · Providers active:{" "}
          {String(workspace.posture.providersActive)} · Model posture: fixture / inactive
        </p>
      </section>

      <div className="atelier-command-grid">
        <section className="atelier-command-panel" aria-labelledby="atelier-command-composer-heading">
          <h2 id="atelier-command-composer-heading">Instruction</h2>
          {canInstruct ? (
            <form action={submitAtelierInstructionAction} className="atelier-command-form">
              <input type="hidden" name="organisationId" value={organisationId} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="sessionId" value={workspace.session.id} />
              <label htmlFor="atelier-command-raw">
                What do you need for this event?
                <textarea
                  id="atelier-command-raw"
                  name="rawText"
                  rows={5}
                  required
                  placeholder="Ask a question, request a plan, or prepare a governed action for this event only."
                />
              </label>
              <label className="atelier-command-check" htmlFor="atelier-command-dry">
                <input id="atelier-command-dry" type="checkbox" name="dryRun" value="1" />
                Dry run (validate without mutation)
              </label>
              <button type="submit" className="button">
                Interpret instruction
              </button>
            </form>
          ) : (
            <p className="empty">This role can review Atelier Command evidence but cannot issue instructions.</p>
          )}

          {latestInstruction ? (
            <div className="atelier-command-block" data-testid="atelier-command-interpretation">
              <h3>Latest instruction</h3>
              <p>{latestInstruction.rawText}</p>
              <p className="atelier-command-muted">Status: {latestInstruction.status}</p>
            </div>
          ) : null}

          {latestPlan ? (
            <div className="atelier-command-block" data-testid="atelier-command-plan">
              <h3>Plan preview</h3>
              <p>
                Version {latestPlan.planVersion} · Risk {latestPlan.riskSummary} · Status {latestPlan.status}
                {latestPlan.dryRun ? " · Dry run" : ""}
              </p>
              <ol>
                {latestSteps.map((step) => (
                  <li key={step.id}>
                    <strong>{step.toolName}</strong> · {step.executionRoute} · {step.riskTier}
                    {step.approvalRequirement ? " · maker-checker" : ""} · {step.status}
                  </li>
                ))}
              </ol>
              <div className="actions">
                {canExecute &&
                (latestPlan.status === "AWAITING_CONFIRMATION" || latestPlan.status === "READY") &&
                latestPlan.riskSummary !== "R3" ? (
                  <form action={confirmAtelierPlanAction}>
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="planId" value={latestPlan.id} />
                    <button type="submit" className="button secondary">
                      Confirm plan
                    </button>
                  </form>
                ) : null}
                {canApprove && latestPlan.status === "AWAITING_APPROVAL" ? (
                  <form action={approveAtelierPlanAction}>
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="planId" value={latestPlan.id} />
                    <button type="submit" className="button secondary">
                      Approve as checker
                    </button>
                  </form>
                ) : null}
                {canExecute &&
                (latestPlan.status === "APPROVED" ||
                  latestPlan.riskSummary === "R0" ||
                  latestPlan.riskSummary === "R1") ? (
                  <form action={executeAtelierPlanAction}>
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="planId" value={latestPlan.id} />
                    <button type="submit" className="button">
                      Execute plan
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}

          {intelligence ? (
            <div className="atelier-command-block" data-testid="atelier-command-intelligence">
              <h3>Intelligence answer</h3>
              <p data-testid="atelier-command-intelligence-answer">{intelligence.answer}</p>
              <p className="atelier-command-muted" data-testid="atelier-command-intelligence-meta">
                Event: {intelligence.eventName ?? intelligence.eventId}
                {" · "}Domain: {intelligence.domain ?? "unspecified"}
                {" · "}Intent: {intelligence.intent}
                {" · "}Business data changed:{" "}
                {String(Boolean(intelligence.businessDataChanged ?? intelligence.dataChanged))}
                {" · "}Command record saved: {String(intelligence.commandRecordSaved ?? true)}
                {" · "}Interpreter: {intelligence.interpreterPosture}
              </p>
              {intelligence.supportingFacts.length ? (
                <div>
                  <h4>Authoritative facts consulted</h4>
                  <ul>
                    {intelligence.supportingFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {intelligence.assumptions.length || intelligence.limitations.length ? (
                <div>
                  <h4>Gaps / assumptions / limitations</h4>
                  <ul>
                    {[...intelligence.assumptions, ...intelligence.limitations].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {intelligence.recommendations.length ? (
                <div>
                  <h4>Recommended next steps</h4>
                  <ul>
                    {intelligence.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {latestReceipt ? (
            <div className="atelier-command-block" data-testid="atelier-command-receipt">
              <h3>Receipt</h3>
              <p>{latestReceipt.summary}</p>
              <p className="atelier-command-muted">
                Correlation: {latestReceipt.correlationId}
                {latestReceipt.planId ? ` · Plan: ${latestReceipt.planId}` : ""}
                {latestReceipt.riskSummary ? ` · Risk: ${latestReceipt.riskSummary}` : ""}
                {latestReceipt.effectClass ? ` · Effect: ${latestReceipt.effectClass}` : ""}
                {` · Business data changed: ${String(Boolean(latestReceipt.dataChanged))}`}
                {latestReceipt.intelligenceResult
                  ? ` · Command record saved: ${String(latestReceipt.intelligenceResult.commandRecordSaved ?? true)}`
                  : ""}
              </p>
              {latestReceipt.taskDefinitionId ? (
                <p className="atelier-command-muted">
                  Task: {latestReceipt.taskDefinitionId} v{latestReceipt.taskVersion ?? 1}
                </p>
              ) : null}
              {latestReceipt.unchangedReasons.length ? (
                <ul>
                  {latestReceipt.unchangedReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="atelier-command-panel" aria-labelledby="atelier-command-taskbank-heading">
          <h2 id="atelier-command-taskbank-heading">Task Bank</h2>
          <p className="atelier-command-muted">
            {workspace.taskBank.count} canonical tasks · {workspace.taskBank.version}
          </p>
          <form method="get" className="atelier-command-form atelier-command-filter">
            <label htmlFor="atelier-command-q">
              Search tasks
              <input id="atelier-command-q" name="q" defaultValue={taskQuery} placeholder="Outcome, domain or phrase" />
            </label>
            <label htmlFor="atelier-command-domain">
              Domain
              <select id="atelier-command-domain" name="domain" defaultValue={taskDomain}>
                <option value="">All domains</option>
                {workspace.taskBank.domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="button secondary">
              Filter
            </button>
          </form>

          {workspace.taskBank.tasks.length === 0 ? (
            <p className="empty">No tasks match this filter for your role and the selected event.</p>
          ) : (
            <ul className="atelier-command-tasks" data-testid="atelier-command-task-list">
              {workspace.taskBank.tasks.map((task) => (
                <li key={task.id} data-testid={`atelier-task-${task.id}`}>
                  <article>
                    <h3>{task.name}</h3>
                    <p className="atelier-command-muted">
                      {task.domain} · {task.riskTier} · {effectLabel(task.executionMode, task.riskTier)}
                      {task.requiredApprovals.length ? " · approval required" : ""}
                    </p>
                    <p>{task.description}</p>
                    <p className="atelier-command-muted">
                      Expected outcome: {task.outcome}. Tool: {task.planTemplate[0]?.toolName}. Event context
                      required.
                    </p>
                    {canInstruct ? (
                      <form action={invokeAtelierTaskAction} className="atelier-command-form">
                        <input type="hidden" name="organisationId" value={organisationId} />
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="sessionId" value={workspace.session.id} />
                        <input type="hidden" name="taskId" value={task.id} />
                        <label htmlFor={`task-notes-${task.id}`}>
                          Optional edit before compile
                          <input id={`task-notes-${task.id}`} name="notes" placeholder="Adjust outcome or constraints" />
                        </label>
                        <label className="atelier-command-check" htmlFor={`task-dry-${task.id}`}>
                          <input id={`task-dry-${task.id}`} type="checkbox" name="dryRun" value="1" />
                          Dry run
                        </label>
                        <button type="submit" className="button secondary">
                          Use task
                        </button>
                      </form>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="atelier-command-panel" aria-labelledby="atelier-command-settlement-heading">
        <h2 id="atelier-command-settlement-heading">Event settlements</h2>
        <p className="atelier-command-muted">
          Durable Atelier Command receipts for this event. CEO/Auditor can also find matching correlations in the
          Executive Ledger filtered to Atelier Command.
        </p>
        {settlements.length === 0 ? (
          <p className="empty">No settlements yet for this event.</p>
        ) : (
          <ul data-testid="atelier-command-settlements">
            {settlements.map((receipt) => (
              <li key={receipt.id}>
                <strong>{receipt.kind}</strong> · {receipt.createdAt} · corr {receipt.correlationId}
                {receipt.planId ? ` · plan ${receipt.planId}` : ""}
                {receipt.riskSummary ? ` · ${receipt.riskSummary}` : ""}
                {receipt.taskDefinitionId ? ` · ${receipt.taskDefinitionId}` : ""} · dataChanged=
                {String(Boolean(receipt.dataChanged))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="atelier-command-panel" aria-labelledby="atelier-command-evidence-heading">
        <h2 id="atelier-command-evidence-heading">Event knowledge</h2>
        <ul>
          {workspace.context.knowledge.map((item, index) => (
            <li key={`${item.kind}-${index}`}>
              <strong>{item.epistemicClass}</strong>: {item.statement}
            </li>
          ))}
        </ul>
        <p>
          <Link className="button secondary" href={`/app/events/${eventId}`}>
            Return to event overview
          </Link>
          {" · "}
          <Link className="button secondary" href="/app/admin/audit?q=atelierCommand">
            Executive Ledger · Atelier Command
          </Link>
        </p>
      </section>
    </div>
  );
}
