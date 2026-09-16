import Link from "next/link";
import type { AtelierPlanSummary, AtelierWorkspaceView } from "@maison-doclar/shared-platform";
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

const QUEUE_ORDER: AtelierPlanSummary["queueGroup"][] = [
  "NEEDS_YOUR_ACTION",
  "PENDING_CONFIRMATION",
  "PENDING_APPROVAL",
  "APPROVED_READY",
  "EXECUTING",
  "HISTORY",
];

const QUEUE_LABEL: Record<AtelierPlanSummary["queueGroup"], string> = {
  NEEDS_YOUR_ACTION: "Needs your action",
  PENDING_CONFIRMATION: "Pending confirmation",
  PENDING_APPROVAL: "Pending approval",
  APPROVED_READY: "Approved / ready",
  EXECUTING: "Executing",
  HISTORY: "Recently settled / history",
};

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
  selectedPlanId,
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
  selectedPlanId: string | null;
}) {
  const activePlanId = selectedPlanId ?? workspace.selectedPlanId;
  const selectedPlan =
    workspace.plans.find((plan) => plan.id === activePlanId) ??
    [...workspace.plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const selectedSteps = selectedPlan
    ? workspace.planSteps.filter((step) => step.planId === selectedPlan.id).sort((a, b) => a.ordinal - b.ordinal)
    : [];
  const selectedInstruction =
    workspace.eventInstructions.find((item) => item.id === selectedPlan?.instructionId) ??
    workspace.instructions.find((item) => item.id === selectedPlan?.instructionId) ??
    [...workspace.instructions].sort((a, b) => b.sequence - a.sequence || b.createdAt.localeCompare(a.createdAt))[0];
  const selectedSummary = workspace.planSummaries.find((item) => item.planId === selectedPlan?.id);
  const latestReceipt = [...workspace.receipts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .find((receipt) => !selectedPlan || !receipt.planId || receipt.planId === selectedPlan.id)
    ?? [...workspace.receipts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  const intelligenceReceipt = [...workspace.receipts]
    .filter((receipt) => receipt.intelligenceResult?.answer)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0];
  const intelligence = intelligenceReceipt?.intelligenceResult ?? latestReceipt?.intelligenceResult;
  const settlements = [...workspace.receipts].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, 12);
  const planCount = workspace.planSummaries.length;
  const needsActionCount = workspace.planSummaries.filter((item) => item.queueGroup === "NEEDS_YOUR_ACTION").length;

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
        <p className="atelier-command-muted" data-testid="atelier-command-plan-counts">
          Plans on this event: {planCount} · Needs your action: {needsActionCount}
        </p>
      </section>

      <section
        className="atelier-command-panel"
        aria-labelledby="atelier-command-queue-heading"
        data-testid="atelier-command-plan-queue"
      >
        <h2 id="atelier-command-queue-heading">Plan queue and history</h2>
        <p className="atelier-command-muted">
          Multiple plans may coexist on this event. Compiling a new instruction does not remove earlier pending work.
        </p>
        {planCount === 0 ? (
          <p className="empty" data-testid="atelier-command-queue-empty">
            No plans yet for this event. Interpret an instruction or use a Task Bank entry to create the first plan.
          </p>
        ) : (
          QUEUE_ORDER.map((group) => {
            const items = workspace.planSummaries.filter((item) => item.queueGroup === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="atelier-command-queue-group" data-testid={`atelier-queue-${group}`}>
                <h3>
                  {QUEUE_LABEL[group]} <span className="atelier-command-muted">({items.length})</span>
                </h3>
                <ul className="atelier-command-queue-list">
                  {items.map((item) => {
                    const selected = item.planId === selectedPlan?.id;
                    return (
                      <li key={item.planId} data-testid={`atelier-plan-card-${item.planId}`}>
                        <article className={selected ? "atelier-plan-card is-selected" : "atelier-plan-card"}>
                          <p>
                            <Link
                              href={`/app/events/${eventId}/atelier-command?planId=${item.planId}`}
                              data-testid={`atelier-plan-open-${item.planId}`}
                            >
                              {item.taskDefinitionId ?? "Instruction plan"} · v{item.planVersion}
                            </Link>
                            {" · "}
                            <strong>{item.status}</strong> · {item.riskSummary} · {item.effectLabel}
                          </p>
                          <p className="atelier-command-muted">
                            Maker: {item.makerLabel}
                            {item.checkerLabel ? ` · Checker: ${item.checkerLabel}` : ""}
                            {" · "}
                            Created {item.createdAt}
                          </p>
                          <p>{item.intendedOutcome}</p>
                          <p className="atelier-command-muted">
                            Actions: {item.availableActions.join(", ")}
                            {item.approvalCorrelationId ? ` · Approval corr ${item.approvalCorrelationId}` : ""}
                            {item.settlementCorrelationId ? ` · Settlement ${item.settlementCorrelationId}` : ""}
                          </p>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
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

          {selectedInstruction ? (
            <div className="atelier-command-block" data-testid="atelier-command-interpretation">
              <h3>Selected instruction</h3>
              <p>{selectedInstruction.rawText}</p>
              <p className="atelier-command-muted">Status: {selectedInstruction.status}</p>
            </div>
          ) : null}

          {selectedPlan ? (
            <div className="atelier-command-block" data-testid="atelier-command-plan" data-plan-id={selectedPlan.id}>
              <h3>Plan detail</h3>
              <p>
                Plan {selectedPlan.id} · Version {selectedPlan.planVersion} · Risk {selectedPlan.riskSummary} · Status{" "}
                {selectedPlan.status}
                {selectedPlan.dryRun ? " · Dry run" : ""}
              </p>
              {selectedSummary ? (
                <p className="atelier-command-muted" data-testid="atelier-command-plan-maker">
                  Maker: {selectedSummary.makerLabel}
                  {selectedSummary.checkerLabel ? ` · Checker: ${selectedSummary.checkerLabel}` : ""}
                  {selectedSummary.taskDefinitionId
                    ? ` · Task: ${selectedSummary.taskDefinitionId} v${selectedSummary.taskVersion ?? 1}`
                    : ""}
                </p>
              ) : null}
              {selectedSteps.some((step) => step.executionRoute === "BROWSER") ? (
                <p data-testid="atelier-command-simulated-banner" className="atelier-command-simulated">
                  SIMULATED · effect class SIMULATED_BROWSER · no real browser, provider, or external system will change
                </p>
              ) : null}
              <ol>
                {selectedSteps.map((step) => (
                  <li key={step.id}>
                    <strong>{step.toolName}</strong> · {step.executionRoute} · {step.riskTier}
                    {step.executionRoute === "BROWSER" ? " · SIMULATED" : ""}
                    {step.approvalRequirement ? " · maker-checker" : ""} · {step.status}
                  </li>
                ))}
              </ol>
              <div className="actions">
                {canExecute &&
                selectedSummary?.availableActions.includes("CONFIRM") ? (
                  <form action={confirmAtelierPlanAction}>
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="planId" value={selectedPlan.id} />
                    <button type="submit" className="button secondary">
                      Confirm plan
                    </button>
                  </form>
                ) : null}
                {canApprove && selectedSummary?.availableActions.includes("APPROVE") ? (
                  <form action={approveAtelierPlanAction}>
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="planId" value={selectedPlan.id} />
                    <button type="submit" className="button secondary" data-testid="atelier-command-approve">
                      Approve as checker
                    </button>
                  </form>
                ) : null}
                {canExecute && selectedSummary?.availableActions.includes("EXECUTE") ? (
                  <form action={executeAtelierPlanAction}>
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="planId" value={selectedPlan.id} />
                    <button type="submit" className="button" data-testid="atelier-command-execute">
                      Execute plan
                    </button>
                  </form>
                ) : null}
                {selectedPlan.status === "COMPLETED" ||
                selectedPlan.status === "BLOCKED" ||
                selectedPlan.status === "REFUSED" ||
                selectedPlan.status === "CANCELLED" ||
                selectedPlan.status === "SUPERSEDED" ||
                selectedPlan.status === "FAILED" ||
                selectedPlan.status === "REJECTED" ||
                selectedPlan.status === "STALE" ? (
                  <p data-testid="atelier-command-settled-state" className="atelier-command-muted">
                    Settled · {selectedPlan.status}
                    {selectedPlan.settlementCorrelationId
                      ? ` · receipt ${selectedPlan.settlementCorrelationId}`
                      : ""}{" "}
                    · Execute is not available
                  </p>
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
              {latestReceipt.effectClass === "SIMULATED_BROWSER" || latestReceipt.simulated ? (
                <p data-testid="atelier-command-receipt-simulated" className="atelier-command-simulated">
                  SIMULATED · effect class SIMULATED_BROWSER · no real browser, provider, or external system changed
                </p>
              ) : null}
              {latestReceipt.kind === "UNSUPPORTED_INTENT_REFUSED" || latestReceipt.effectClass === "REFUSED" ? (
                <p data-testid="atelier-command-receipt-refused">
                  Refused — original request was not fulfilled; no substitute action was executed.
                </p>
              ) : null}
              {latestReceipt.kind === "ALREADY_SETTLED" || latestReceipt.settlementStatus === "ALREADY_SETTLED" ? (
                <p data-testid="atelier-command-receipt-replayed">
                  REPLAYED / ALREADY_SETTLED · original correlation {latestReceipt.originalCorrelationId ?? "n/a"}
                  {latestReceipt.originalSettlementAt ? ` · settled ${latestReceipt.originalSettlementAt}` : ""} · no
                  new effect
                </p>
              ) : null}
              {latestReceipt.kind === "PLAN_APPROVAL" ? (
                <p data-testid="atelier-command-receipt-approval">
                  Approval recorded · correlation {latestReceipt.correlationId} · business data unchanged
                </p>
              ) : null}
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
              {latestReceipt.originalRequestedIntent ? (
                <p className="atelier-command-muted" data-testid="atelier-command-receipt-intent">
                  Original intent: {latestReceipt.originalRequestedIntent}
                </p>
              ) : null}
              {latestReceipt.actualAction ? (
                <p className="atelier-command-muted" data-testid="atelier-command-receipt-action">
                  Actual action: {latestReceipt.actualAction}
                </p>
              ) : null}
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
            {activePlanId ? <input type="hidden" name="planId" value={activePlanId} /> : null}
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
