import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../components/atelier-section-tabs";
import { AppShell } from "../../../components/shell";
import { ActionResultBanner } from "../../../components/action-result-banner";
import { IdempotencyField } from "../../../components/atelier-pending-submit";
import { loadPresentedActionResult } from "../../../server/action-flash";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";
import { protectionPermissions } from "../../../server/protection-scope";
import { createRiskPolicyAction, runS05BEvaluationAction } from "../../../server/risk-actions";
import { operationalStateFromCode } from "../../../server/operational-state";
import { resolveDiscoveryOrganisation } from "../../../server/discovery-scope";

export default async function ProtectionCommandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const organisation = resolveDiscoveryOrganisation(actor);
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/protection">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "No organisation assignment is available.")} />
      </AppShell>
    );
  }
  const permissions = protectionPermissions(person, organisation.id);
  if (!permissions.catalogueView && !permissions.eventView) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/protection">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open Protection Command.")} />
      </AppShell>
    );
  }
  const overview = getRuntime().service.getOrganisationProtection(actor, organisation.id);
  const evaluation = getRuntime().service.getS05BReadiness(organisation.id);
  const assignmentId = getRuntime().service.resolveActor(person.id).assignments[0]?.id ?? "";
  const presented = await loadPresentedActionResult({
    requestPath: "/app/protection",
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
  });
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/protection">
      <AtelierPageHeader
        eyebrow="Organisation command"
        title="Protection Command"
        lede="What protection applies, what evidence supports it, what remains exposed, and which decision is due. This is not insurer confirmation or legal advice."
      />
      <ActionResultBanner presented={presented} />
      <AtelierSectionTabs
        label="Protection Command sections"
        items={[
          { href: "#protection-overview", label: "Overview" },
          { href: "#protection-catalogue", label: "Catalogue" },
          { href: "#protection-rules", label: "Rules" },
          { href: "#protection-assurance", label: "Assurance" },
        ]}
      />
      <section id="protection-overview" className="atelier-panel" data-testid="protection-command">
        <h2>No-blind-spots</h2>
        <p className="lede">
          {overview.highConsequenceUnknowns} high-consequence unknowns. {overview.decisionsWaiting} decisions waiting. {overview.openIncidents} open incidents. {overview.untestedFallbacks} untested fallbacks.
        </p>
        <ul className="protection-queue">
          {overview.events.map((event) => (
            <li key={event.id}>
              <a href={`/app/events/${event.id}/protection`}>{event.name}</a>
              <span className="md-status">{event.readiness}</span>
              {event.readiness !== "READY" ? <span> — not ready until unknowns and gaps are resolved.</span> : null}
            </li>
          ))}
        </ul>
      </section>
      <section id="protection-catalogue" className="atelier-panel">
        <h2>Policy catalogue</h2>
        <p>{overview.policyCount} organisation or event policies on file. Expiring or expired evidence is listed without treating a certificate as coverage certainty.</p>
        {overview.expiringEvidence.length ? (
          <ul>
            {overview.expiringEvidence.map((item) => (
              <li key={item.id}>
                {item.policyType} · {item.insurerLabel} · {item.period.endOn} · identifier {item.policyIdentifierAvailable ? "held privately" : "withheld"}
              </li>
            ))}
          </ul>
        ) : (
          <p>No expired current editions in this organisation view.</p>
        )}
        {permissions.catalogueManage || permissions.policyManage ? (
          <form action={createRiskPolicyAction} className="atelier-form">
            <input type="hidden" name="organisationId" value={organisation.id} />
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <input type="hidden" name="expectedVersion" value="0" />
            <IdempotencyField />
            <label>
              Policy type
              <select name="policyType" defaultValue="PUBLIC_LIABILITY">
                <option value="PUBLIC_LIABILITY">Public liability</option>
                <option value="EVENT_CANCELLATION">Event cancellation</option>
                <option value="EMPLOYEE_COMPENSATION">Employee compensation</option>
              </select>
            </label>
            <label>
              Insurer label
              <input name="insurerLabel" defaultValue="Synthetic insurer" />
            </label>
            <button type="submit" className="button">
              Create organisation policy draft
            </button>
          </form>
        ) : null}
      </section>
      <section id="protection-rules" className="atelier-panel">
        <h2>Rule library</h2>
        <p>Discovery sources can generate questions. Only approved rules participate in readiness.</p>
        <ul>
          {overview.ruleLibrary.map((rule) => (
            <li key={rule.id}>
              {rule.ruleKey} · {rule.status} · {rule.jurisdiction} · next review {rule.nextReviewAt.slice(0, 10)}
            </li>
          ))}
        </ul>
      </section>
      <section id="protection-assurance" className="atelier-panel" data-testid="s05b-evaluation-panel">
        <h2>Fixture assurance</h2>
        <p>
          S05B evaluation is {evaluation.evaluationStatus}. {evaluation.evaluationBlocked ? "Release is blocked." : "Current complete pass is fixture-release-ready."} Corpus {evaluation.corpusEdition} · {evaluation.caseCount} cases.
        </p>
        {permissions.auditView ? (
          <form action={runS05BEvaluationAction}>
            <input type="hidden" name="organisationId" value={organisation.id} />
            <IdempotencyField />
            <button type="submit" className="button">
              Run S05B fixture assurance
            </button>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
