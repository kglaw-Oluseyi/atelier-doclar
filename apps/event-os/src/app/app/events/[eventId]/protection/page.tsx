import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { AppShell } from "../../../../../components/shell";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../components/atelier-pending-submit";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { protectionPermissions } from "../../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import {
  assembleDossierAction,
  authoriseFallbackAction,
  createContinuityPlanAction,
  evaluateRiskEventAction,
  generateCheckpointsAction,
  projectRiskBudgetAction,
  proposeFallbackAction,
  publishDossierAction,
  recordRiskFactAction,
  reportIncidentAction,
  submitResidualAction,
} from "../../../../../server/risk-actions";
import { clientDossierCopy } from "@maison-doclar/shared-platform";

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
    eventId: event.id,
  });
  const copy = clientDossierCopy();
  const currentDossier = workspace.dossiers.at(-1);
  const envelopeFields = {
    organisationId: organisation.id,
    eventId: event.id,
    assignmentId,
  };
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
        <p>
          {workspace.openGapCount} unresolved gaps · {workspace.overriddenGapCount} authorised residual decisions · last change {workspace.lastChange}
        </p>
        {permissions.eventManage ? (
          <form action={evaluateRiskEventAction} className="actions">
            {Object.entries(createFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <IdempotencyField />
            <button type="submit" className="button">
              Evaluate protection now
            </button>
          </form>
        ) : null}
        {permissions.eventManage ? (
          <form action={recordRiskFactAction} className="atelier-form">
            {Object.entries(createFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <IdempotencyField />
            <label>
              Fact
              <select name="factKey" defaultValue="jurisdiction">
                <option value="jurisdiction">Jurisdiction</option>
                <option value="event_dates">Event dates</option>
                <option value="venue">Venue</option>
              </select>
            </label>
            <label>
              Value
              <input name="value" defaultValue="NG" />
            </label>
            <label>
              Unknown
              <input type="checkbox" name="unknown" value="true" />
            </label>
            <button type="submit" className="button secondary">
              Record event fact
            </button>
          </form>
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
                <form action={submitResidualAction}>
                  {Object.entries(createFields).map(([name, value]) => (
                    <input key={name} type="hidden" name={name} value={String(value)} />
                  ))}
                  <IdempotencyField />
                  <input type="hidden" name="gapId" value={gap.id} />
                  <input type="hidden" name="choice" value="KEEP_UNRESOLVED" />
                  <button type="submit" className="button secondary">
                    Keep unresolved
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
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
      </section>
      <section id="protection-continuity" className="atelier-panel">
        <h2>Continuity and incidents</h2>
        {permissions.continuityManage ? (
          <div className="actions">
            <form action={createContinuityPlanAction}>
              {Object.entries(createFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={String(value)} />
              ))}
              <IdempotencyField />
              <input type="hidden" name="title" value="Critical services fallback" />
              <button type="submit" className="button">
                Prepare continuity plan
              </button>
            </form>
            <form action={generateCheckpointsAction}>
              {Object.entries(createFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={String(value)} />
              ))}
              <IdempotencyField />
              <button type="submit" className="button secondary">
                Generate checkpoint instances
              </button>
            </form>
          </div>
        ) : null}
        <ul>
          {workspace.plans.map((plan) => (
            <li key={plan.id}>
              {plan.title} · {plan.status}
              {permissions.continuityManage ? (
                <form action={proposeFallbackAction}>
                  {Object.entries(createFields).map(([name, value]) => (
                    <input key={`p-${name}`} type="hidden" name={name} value={String(value)} />
                  ))}
                  <IdempotencyField />
                  <input type="hidden" name="planId" value={plan.id} />
                  <button type="submit" className="button secondary" disabled={Boolean(workspace.activations.length)}>
                    Propose fallback plan
                  </button>
                </form>
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
              <form action={authoriseFallbackAction}>
                {Object.entries(envelopeFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={String(value)} />
                ))}
                <IdempotencyField />
                <input type="hidden" name="activationId" value={activation.id} />
                <input type="hidden" name="expectedVersion" value={String(activation.version)} />
                <button type="submit" className="button" disabled={activation.status !== "PROPOSED"} aria-disabled={activation.status !== "PROPOSED"}>
                  Authorise fallback plan
                </button>
              </form>
            ) : (
              <button type="button" className="button" disabled aria-disabled="true">
                Authorise fallback plan
              </button>
            )}
          </article>
        ))}
        {permissions.incidentReport ? (
          <form action={reportIncidentAction} className="atelier-form">
            {Object.entries(createFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <IdempotencyField />
            <label>
              Incident title
              <input name="title" defaultValue="Synthetic incident" />
            </label>
            <button type="submit" className="button secondary">
              Report incident
            </button>
          </form>
        ) : null}
        {workspace.incidents.map((incident) => (
          <article key={incident.id} className="protection-card">
            <h3>{incident.title}</h3>
            <p>{incident.state}</p>
            {incident.protocol ? <p data-testid="life-safety-protocol">{incident.protocol}</p> : null}
          </article>
        ))}
        {permissions.reserveRequest ? (
          <form action={projectRiskBudgetAction}>
            {Object.entries(createFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Request reserve allocation projection
            </button>
          </form>
        ) : null}
        {workspace.budget ? (
          <p>
            Risk projection {workspace.budget.currency} {workspace.budget.quantifiedMinor} minor units. Governing budget unchanged: {String(workspace.budget.governingScenarioUnchanged)}. Unknowns remain unquantified.
          </p>
        ) : null}
      </section>
      <section id="protection-dossier" className="atelier-panel">
        <h2>Client assurance dossier</h2>
        <p>{copy.phrases.evidenceReviewed} {copy.phrases.knownGaps} {copy.phrases.contingencyPrepared} {copy.phrases.confirmationRequired}</p>
        {permissions.dossierView ? (
          <form action={assembleDossierAction}>
            {Object.entries(createFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <IdempotencyField />
            <button type="submit" className="button">
              Assemble dossier edition
            </button>
          </form>
        ) : null}
        {currentDossier && permissions.dossierPublish ? (
          <form action={publishDossierAction}>
            {Object.entries(envelopeFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={String(value)} />
            ))}
            <IdempotencyField />
            <input type="hidden" name="dossierId" value={currentDossier.id} />
            <input type="hidden" name="expectedVersion" value={String("version" in currentDossier ? currentDossier.version : 1)} />
            <button type="submit" className="button secondary">
              Publish dossier without sending
            </button>
          </form>
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
