import Link from "next/link";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { AppShell } from "../../../../../components/shell";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../components/protection-mutation-form";
import { loadPresentedActionResult, readIssuedAccessFlash } from "../../../../../server/action-flash";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { protectionPermissions } from "../../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import {
  applyRiskClauseAction,
  assembleDossierAction,
  assignRiskRosterAction,
  authoriseFallbackAction,
  approveDossierAction,
  createContinuityPlanAction,
  evaluateRiskEventAction,
  exportDossierAction,
  generateCheckpointsAction,
  projectRiskBudgetAction,
  proposeFallbackAction,
  publishDossierAction,
  recordRiskFactAction,
  reportIncidentAction,
  submitDossierAction,
  submitResidualAction,
  decideResidualAction,
  recordCheckInAction,
  evaluateCheckpointEscalationsAction,
  addIncidentEntryAction,
  proposeLearningAction,
  decideLearningAction,
  issueDossierAccessAction,
  revokeDossierAccessAction,
} from "../../../../../server/risk-actions";
import { clientDossierCopy } from "@maison-doclar/shared-platform";

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

export default async function EventProtectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  const events = organisations.flatMap((item) => runtime.service.listEvents(actor, item.id));
  const event = events.find((item) => item.id === eventId);
  const organisation = organisations.find((item) => item.id === event?.organisationId);
  if (!organisation || !event) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")} />
      </AppShell>
    );
  }
  const permissions = protectionPermissions(person, organisation.id, event.id);
  if (!permissions.eventView) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open the event Protection workspace.")} />
      </AppShell>
    );
  }
  const workspace = runtime.service.getEventProtection(actor, organisation.id, event.id);
  const assignmentId = runtime.service.resolveActor(person.id).assignments.find((item) => item.eventId === event.id || !item.eventId)?.id ?? "";
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${event.id}/protection`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
    eventId: event.id,
  });
  const copy = clientDossierCopy();
  const currentDossier = workspace.workingDossier ?? workspace.dossiers.at(-1);
  const issuedAccess = await readIssuedAccessFlash();
  const envelopeFields = { organisationId: organisation.id, eventId: event.id, assignmentId };
  const createFields = { ...envelopeFields, expectedVersion: 0 };
  return (
    <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow="Event protection"
        title={`${event.name} protection`}
        lede="Lead with what is missing and what must happen next. Unknown is a designed state. Authorising a fallback plan does not book a vendor, move money or dispatch a message."
      />
      <ActionResultBanner presented={presented} />
      <AtelierSectionTabs
        label="Event protection views"
        items={[
          { href: "#protection-overview", label: "Overview" },
          { href: "#protection-coverage", label: "Coverage" },
          { href: "#protection-vendors", label: "Vendors" },
          { href: "#protection-continuity", label: "Continuity" },
          { href: "#protection-dossier", label: "Dossier" },
        ]}
      />
      <section id="protection-overview" className="atelier-panel" data-testid="event-protection-workspace">
        <h2>What must happen next</h2>
        <p className="lede" data-testid="protection-why-not-ready">
          Readiness {workspace.overall}. {workspace.whyNotReady}
        </p>
        <p data-testid="protection-readiness-change">{workspace.readinessChange}</p>
        <p>
          {workspace.openGapCount} unresolved gaps · {workspace.overriddenGapCount} authorised residual decisions · last change {workspace.lastChange}
        </p>
        <p>Changed since review: {workspace.changedSinceReview}.</p>
        {(workspace.effectiveAuthorities ?? []).length ? (
          <ul data-testid="protection-effective-authorities">
            {(workspace.effectiveAuthorities ?? []).map((item) => (
              <li key={item.ruleId} data-authority-state={item.authorityState}>
                {item.ruleKey} · {item.authorityState.replaceAll("_", " ").toLowerCase()}
                {item.governing ? " · governing" : " · history only"} · {item.ruleId}
                {item.reasons.length ? ` · ${item.reasons.join("; ")}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {permissions.eventManage ? (
          <ProtectionMutationForm action={evaluateRiskEventAction} className="actions">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <button type="submit" className="button">
              Evaluate protection now
            </button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.eventManage ? (
          <ProtectionMutationForm action={recordRiskFactAction} className="atelier-form protection-form" testId="protection-record-fact">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <label>
              Fact
              <select name="factKey" required>
                <option value="">Select fact</option>
                <option value="jurisdiction">Jurisdiction</option>
                <option value="event_dates">Event dates</option>
                <option value="venue">Venue</option>
              </select>
            </label>
            <label>
              Value
              <input name="value" required />
            </label>
            <label>
              Unknown
              <input type="checkbox" name="unknown" value="true" />
            </label>
            <button type="submit" className="button secondary">
              Record event fact
            </button>
          </ProtectionMutationForm>
        ) : null}
        {workspace.facts?.length ? (
          <ul>
            {workspace.facts.map((fact) => (
              <li key={fact.id}>
                {fact.factKey}: {fact.unknown ? "unknown" : fact.value}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section id="protection-coverage" className="atelier-panel">
        <h2>Coverage</h2>
        <p>A current policy is not a guaranteed claim payment. Filters cannot hide the aggregate warning.</p>
        {workspace.overall !== "READY" ? (
          <p className="md-status" data-tone="brass" data-testid="protection-readiness-warning">
            Protection is not ready.
          </p>
        ) : null}
        <div className="protection-matrix">
          {(workspace.gaps.length ? workspace.gaps : [{ id: "none", requirementKey: "No open requirement", taxonomy: "UNVERIFIED_DOCUMENT", explanation: "Evaluate to produce a matrix.", state: "OPEN" }]).map((gap) => (
            <article key={gap.id} className="protection-card">
              <h3>{gap.requirementKey}</h3>
              <p>{gap.explanation}</p>
              <p>
                {gap.taxonomy} · {gap.state}
              </p>
              {permissions.eventManage && gap.id !== "none" ? (
                <ProtectionMutationForm action={submitResidualAction} className="protection-form">
                  <Envelope fields={createFields} />
                  <IdempotencyField />
                  <input type="hidden" name="gapId" value={gap.id} />
                  <label>
                    Residual choice
                    <select name="choice" required>
                      <option value="">Select</option>
                      <option value="KEEP_UNRESOLVED">Keep unresolved</option>
                      <option value="ACCEPT_RESIDUAL_RISK">Accept residual risk</option>
                    </select>
                  </label>
                  <label>
                    Reason
                    <textarea name="reason" required rows={2} />
                  </label>
                  <button type="submit" className="button secondary">
                    Submit residual decision
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </article>
          ))}
        </div>
        {workspace.residuals?.map((item) => (
          <article key={item.id} className="protection-card">
            <h3>Residual {item.status}</h3>
            {permissions.eventDecide && item.status === "SUBMITTED" ? (
              <ProtectionMutationForm action={decideResidualAction} className="protection-form">
                <Envelope fields={{ ...envelopeFields, expectedVersion: item.version, decisionId: item.id }} />
                <IdempotencyField />
                <label>
                  Decision
                  <select name="decision" required>
                    <option value="">Select</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </label>
                <button type="submit" className="button">
                  Decide residual risk
                </button>
              </ProtectionMutationForm>
            ) : null}
          </article>
        ))}
      </section>
      <section id="protection-vendors" className="atelier-panel">
        <h2>Vendors</h2>
        <p>Primary, alternate and standby are event assignments. Standby does not mean engaged.</p>
        {workspace.roster.length ? (
          <ul>
            {workspace.roster.map((item) => (
              <li key={item.id}>
                {item.vendorLabel} · {item.role} · {item.commercialStatus} · {item.booked ? "booked under recorded authority" : "not booked"}
              </li>
            ))}
          </ul>
        ) : (
          <p>No protection roster assignments yet.</p>
        )}
        {permissions.eventManage ? (
          <ProtectionMutationForm action={assignRiskRosterAction} className="atelier-form protection-form" testId="protection-assign-roster">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <label htmlFor="event-vendorId">
              Vendor
              <select id="event-vendorId" name="vendorId" required={(workspace.vendorParties?.length ?? 0) > 0}>
                <option value="">Select vendor</option>
                {(workspace.vendorParties ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.disambiguation}
                  </option>
                ))}
              </select>
            </label>
            {(workspace.vendorParties ?? []).length ? null : (
              <p data-testid="event-vendor-empty">No eligible vendor is on the governed party register for this organisation.</p>
            )}
            <label>
              Role
              <select name="role" required>
                <option value="">Select</option>
                <option value="PRIMARY">Primary</option>
                <option value="ALTERNATE">Alternate</option>
                <option value="STANDBY">Standby</option>
              </select>
            </label>
            <label>
              Critical function
              <input name="criticalFunctionKey" required />
            </label>
            <label>
              Commercial status
              <select name="commercialStatus" required>
                <option value="">Select</option>
                <option value="UNCONFIRMED">Unconfirmed</option>
                <option value="NOT_ENGAGED">Not engaged</option>
                <option value="PROPOSED">Proposed</option>
                <option value="CONTRACTED">Contracted</option>
              </select>
            </label>
            <button type="submit" className="button">
              Assign roster
            </button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.clauseDraft ? (
          <ProtectionMutationForm action={applyRiskClauseAction} className="atelier-form protection-form">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <label>
              Family
              <select name="family" required>
                <option value="">Select</option>
                <option value="RETENTION">Retention</option>
                <option value="INDEMNITY">Indemnity</option>
              </select>
            </label>
            <label>
              Jurisdiction
              <input name="jurisdiction" required />
            </label>
            <label>
              Language
              <input name="language" required />
            </label>
            <label>
              Body
              <textarea name="body" required rows={3} />
            </label>
            <label>
              Variables
              <input name="variableValues" placeholder="KEY=value,KEY2=value" />
            </label>
            <button type="submit" className="button secondary">
              Apply clause edition
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
      <section id="protection-continuity" className="atelier-panel">
        <h2>Continuity and incidents</h2>
        {permissions.continuityManage ? (
          <ProtectionMutationForm action={createContinuityPlanAction} className="atelier-form protection-form" testId="protection-create-plan">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <label>
              Plan title
              <input name="title" required />
            </label>
            <label>
              Recovery objective (minutes)
              <input name="recoveryObjectiveMinutes" type="number" min={1} required />
            </label>
            <label>
              Maximum tolerable interruption (minutes)
              <input name="maximumTolerableInterruptionMinutes" type="number" min={1} required />
            </label>
            <label>
              Decision role
              <select name="decisionRole" required>
                <option value="">Select</option>
                <option value="EVENT_DIRECTOR">Event Director</option>
                <option value="CEO">CEO</option>
              </select>
            </label>
            <button type="submit" className="button">
              Prepare continuity plan
            </button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.continuityManage ? (
          <ProtectionMutationForm action={generateCheckpointsAction}>
            <Envelope fields={createFields} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Generate checkpoint instances
            </button>
          </ProtectionMutationForm>
        ) : null}
        <p>Communications are inactive. No external reminder was dispatched.</p>
        <ol className="checkpoint-command-list" data-testid="checkpoint-instances">
          {(workspace.checkpointInstances ?? []).length ? null : (
            <li>No checkpoint instances yet. Communications are inactive. No external reminder was dispatched.</li>
          )}
          {(workspace.checkpointInstances ?? []).map((item) => (
            <li key={item.id} className="protection-card">
              <h3>{item.label}</h3>
              <p>
                Horizon {item.horizon} · due {item.dueAtLagos} Lagos · {item.criticalFunctionLabel} · {item.vendorLabel} · owner {item.ownerRoleLabel}
              </p>
              <p>
                Status {item.status}
                {item.status === "MISSED" || item.status === "DUE" ? " — overdue or unknown" : ""}
              </p>
              <p>Required evidence: {item.requiredEvidence}</p>
              {item.latestCheckIn ? <p>Latest check-in {item.latestCheckIn.response} from {item.latestCheckIn.source}</p> : null}
              <p>Escalation {item.escalationState}. Next action: {item.nextAction}. No external reminder was dispatched.</p>
              {permissions.continuityManage ? (
                <ProtectionMutationForm action={recordCheckInAction}>
                  <Envelope fields={{ ...envelopeFields, expectedVersion: item.version, checkpointId: item.id }} />
                  <IdempotencyField />
                  <label>
                    Check-in
                    <select name="response" required>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="AT_RISK">At risk</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                    </select>
                  </label>
                  <button type="submit" className="button secondary">
                    Record check-in
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </li>
          ))}
        </ol>
        {permissions.continuityManage ? (
          <ProtectionMutationForm action={evaluateCheckpointEscalationsAction}>
            <Envelope fields={createFields} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Evaluate internal escalation
            </button>
          </ProtectionMutationForm>
        ) : null}
        <ul>
          {workspace.plans.map((plan) => (
            <li key={plan.id}>
              {plan.title} · {plan.status}
              {permissions.continuityManage ? (
                <ProtectionMutationForm action={proposeFallbackAction} className="protection-form">
                  <Envelope fields={createFields} />
                  <IdempotencyField />
                  <input type="hidden" name="planId" value={plan.id} />
                  <label>
                    Trigger evidence
                    <input name="triggerEvidence" required />
                  </label>
                  <label>
                    Impact
                    <input name="impact" required />
                  </label>
                  <button type="submit" className="button secondary">
                    Propose fallback plan
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </li>
          ))}
        </ul>
        {workspace.activations.map((activation) => (
          <article key={activation.id} className="protection-card" data-testid="fallback-workspace">
            <h3>Authorise fallback plan</h3>
            <p>{activation.triggerEvidence}</p>
            <p>{activation.impact}</p>
            <p>This records an authorised plan only. Booking, payment and dispatch remain unavailable.</p>
            {permissions.continuityAuthorise ? (
              <ProtectionMutationForm action={authoriseFallbackAction}>
                <Envelope fields={{ ...envelopeFields, expectedVersion: activation.version, activationId: activation.id }} />
                <IdempotencyField />
                <button type="submit" className="button" disabled={activation.status !== "PROPOSED"} aria-disabled={activation.status !== "PROPOSED"}>
                  Authorise fallback plan
                </button>
              </ProtectionMutationForm>
            ) : (
              <button type="button" className="button" disabled aria-disabled="true">
                Authorise fallback plan
              </button>
            )}
          </article>
        ))}
        {permissions.incidentReport ? (
          <ProtectionMutationForm action={reportIncidentAction} className="atelier-form protection-form" testId="protection-report-incident">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <label>
              Incident title
              <input name="title" required />
            </label>
            <label>
              Severity
              <select name="severity" required>
                <option value="">Select</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="LIFE_SAFETY">Life safety</option>
              </select>
            </label>
            <label>
              Life safety
              <input type="checkbox" name="lifeSafety" value="true" />
            </label>
            <button type="submit" className="button secondary">
              Report incident
            </button>
          </ProtectionMutationForm>
        ) : null}
        {workspace.incidents.map((incident) => (
          <article key={incident.id} className="protection-card" data-testid="incident-detail">
            <h3>{incident.title}</h3>
            <p>{incident.state} · {incident.phaseLabel ?? "phase unknown"} · {incident.lifeSafety ? "life safety" : "no life-safety flag"}</p>
            {incident.protocol ? <p data-testid="life-safety-protocol">{incident.protocol}</p> : null}
            <p>If anyone is in immediate danger, follow Maison Doclar emergency procedures and contact human emergency services. This platform has not dispatched help.</p>
            <ul>
              {(incident.notes ?? []).map((note) => (
                <li key={note.id}>
                  {note.kind}: {note.body}
                </li>
              ))}
            </ul>
            {permissions.incidentCommand ? (
              <ProtectionMutationForm action={addIncidentEntryAction}>
                <Envelope fields={createFields} />
                <IdempotencyField />
                <input type="hidden" name="incidentId" value={incident.id} />
                <label>
                  Entry kind
                  <select name="kind" required>
                    <option value="OBSERVED_FACT">Observed fact</option>
                    <option value="REPORTED_CLAIM">Reported claim</option>
                    <option value="HYPOTHESIS">Hypothesis</option>
                    <option value="DECISION">Decision</option>
                    <option value="ACTION_TAKEN">Action taken</option>
                  </select>
                </label>
                <label>
                  Entry
                  <textarea name="body" required rows={2} />
                </label>
                <button type="submit" className="button secondary">
                  Add structured entry
                </button>
              </ProtectionMutationForm>
            ) : null}
            {permissions.incidentCommand ? (
              <ProtectionMutationForm action={proposeLearningAction}>
                <Envelope fields={createFields} />
                <IdempotencyField />
                <input type="hidden" name="incidentId" value={incident.id} />
                <label>
                  Target
                  <select name="target" required>
                    <option value="RULE">Risk rule</option>
                    <option value="VENDOR_INDICATOR">Vendor indicator</option>
                    <option value="CONTINUITY_TEMPLATE">Continuity template</option>
                  </select>
                </label>
                <label>
                  Proposition
                  <textarea name="proposal" required rows={2} />
                </label>
                <button type="submit" className="button secondary">
                  Propose learning
                </button>
              </ProtectionMutationForm>
            ) : null}
          </article>
        ))}
        {(workspace.learnings ?? []).map((item) => (
          <article key={item.id} className="protection-card">
            <h3>Learning {item.status ?? "PROPOSED"}</h3>
            <p>{item.proposition ?? item.proposal}</p>
            <p>Approval authorises a separate governed successor. It does not rewrite the target.</p>
            {permissions.incidentCommand ? (
              <ProtectionMutationForm action={decideLearningAction}>
                <Envelope fields={{ ...envelopeFields, expectedVersion: item.version, proposalId: item.id }} />
                <IdempotencyField />
                <label>
                  Decision
                  <select name="status" required>
                    <option value="APPROVED">Approve</option>
                    <option value="REJECTED">Reject</option>
                  </select>
                </label>
                <button type="submit" className="button secondary">
                  Review learning
                </button>
              </ProtectionMutationForm>
            ) : null}
          </article>
        ))}
        {permissions.reserveRequest ? (
          <ProtectionMutationForm action={projectRiskBudgetAction} className="atelier-form protection-form" testId="protection-budget">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <input
              type="hidden"
              name="expectedScenarioVersion"
              data-testid="budget-expected-scenario-version"
              value={workspace.governingBudget?.version ?? ""}
            />
            <input
              type="hidden"
              name="governingScenarioHash"
              data-testid="budget-governing-hash"
              value={workspace.governingBudget?.resultHash ?? ""}
            />
            <label>
              Driver
              <select name="driverKind" required>
                <option value="">Select</option>
                <option value="UNQUANTIFIED_EXPOSURE">Unquantified exposure</option>
                <option value="INSURANCE_PREMIUM_ASSUMPTION">Sourced premium assumption</option>
                <option value="CONTINUITY_RESERVE">5% labelled reserve assumption</option>
              </select>
            </label>
            <label>
              Reason or assumption label
              <input name="reason" />
            </label>
            <label>
              Currency
              <input name="currency" />
            </label>
            <label>
              Minor units
              <input name="minor" inputMode="numeric" />
            </label>
            <button type="submit" className="button secondary">
              Request Budget Intelligence successor
            </button>
          </ProtectionMutationForm>
        ) : null}
        {workspace.budget ? (
          <p data-testid="protection-budget-result">
            Governing {workspace.budget.budgetScenarioEditionId ?? "none"} unchanged: {String(workspace.budget.governingScenarioUnchanged)}.
            Successor {workspace.budget.successorScenarioEditionId ?? "none"} · calculation {workspace.budget.calculationResultId ?? "none"} · quantified {workspace.budget.currency} {workspace.budget.quantifiedMinor} minor units.
            Model {workspace.budget.modelEdition}. Unknowns remain unquantified when no sourced driver exists.
          </p>
        ) : null}
      </section>
      <section id="protection-dossier" className="atelier-panel">
        <h2>Client assurance dossier</h2>
        <p>
          {copy.phrases.evidenceReviewed} {copy.phrases.knownGaps} {copy.phrases.contingencyPrepared} {copy.phrases.confirmationRequired}
        </p>
        <p>
          <Link href={`/app/events/${event.id}/protection/dossier`}>Open focused dossier review</Link>
          {" · "}
          <Link href={`/app/events/${event.id}/protection/client`}>Preview permission-safe client dossier</Link>
        </p>
        {permissions.dossierManageClientAccess ? (
          <ProtectionMutationForm action={issueDossierAccessAction}>
            <Envelope fields={createFields} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Issue client dossier access
            </button>
          </ProtectionMutationForm>
        ) : null}
        <p>Issuing access creates access. It does not send it.</p>
        {issuedAccess?.kind === "dossier" ? (
          <p data-testid="issued-dossier-token">
            One-time client path /client-dossier/{issuedAccess.token}
          </p>
        ) : null}
        {(workspace.accessGrants ?? []).filter((item) => item.status === "ACTIVE").map((grant) => (
          <p key={grant.id}>
            Active grant expires {grant.expiresAt}
            {permissions.dossierManageClientAccess ? (
              <ProtectionMutationForm action={revokeDossierAccessAction}>
                <Envelope fields={{ ...envelopeFields, expectedVersion: grant.version, grantId: grant.id }} />
                <IdempotencyField />
                <button type="submit" className="button secondary">
                  Revoke client access
                </button>
              </ProtectionMutationForm>
            ) : null}
          </p>
        ))}
        {permissions.dossierAssemble ? (
          <ProtectionMutationForm action={assembleDossierAction} testId="protection-assemble-dossier">
            <Envelope fields={createFields} />
            <IdempotencyField />
            <button type="submit" className="button">
              Assemble dossier edition
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierSubmit && currentDossier.status === "DRAFT" ? (
          <ProtectionMutationForm action={submitDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: "version" in currentDossier ? Number(currentDossier.version) : 1, dossierId: currentDossier.id }} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Submit dossier
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierApprove && currentDossier.status === "SUBMITTED" ? (
          <ProtectionMutationForm action={approveDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: "version" in currentDossier ? Number(currentDossier.version) : 1, dossierId: currentDossier.id }} />
            <IdempotencyField />
            <button type="submit" className="button">
              Approve dossier
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierPublish && currentDossier.status === "APPROVED" ? (
          <ProtectionMutationForm action={publishDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: "version" in currentDossier ? Number(currentDossier.version) : 1, dossierId: currentDossier.id }} />
            <IdempotencyField />
            <input type="hidden" name="approvedHash" value={currentDossier.contentHash ?? ""} />
            <button type="submit" className="button secondary">
              Publish dossier without sending
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierExport && (currentDossier.status === "APPROVED" || currentDossier.status === "PUBLISHED") && workspace.publications.some((item) => item.current || item.status === "CURRENT") ? (
          <ProtectionMutationForm action={exportDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: "version" in currentDossier ? Number(currentDossier.version) : 1, dossierId: currentDossier.id }} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Generate permission-safe export
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier ? (
          <p>
            Status {currentDossier.status} · hash {currentDossier.contentHash?.slice(0, 12)} · not dispatched.
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
