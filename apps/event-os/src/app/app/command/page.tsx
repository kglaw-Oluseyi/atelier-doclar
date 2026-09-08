import { formatMoneyMinor } from "@maison-doclar/shared-platform";
import { CanonicalHash } from "../../../components/canonical-evidence";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { AppShell } from "../../../components/shell";
import { discoveryPermissions, resolveDiscoveryOrganisation } from "../../../server/discovery-scope";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";
import { operationalStateFromCode } from "../../../server/operational-state";

function moneyLabel(minor?: string) {
  if (!minor) return "Not declared";
  return formatMoneyMinor(minor);
}

export default async function ExecutiveEventCommandPage() {
  const { actor, person } = await guardedActor();
  const organisation = resolveDiscoveryOrganisation(actor);
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/command">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "No organisation assignment is available.")} />
      </AppShell>
    );
  }
  const permissions = discoveryPermissions(person, organisation.id);
  if (!permissions.command) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/command">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open Executive Event Command.")}
        />
      </AppShell>
    );
  }
  const command = getRuntime().service.getExecutiveCommand(actor, organisation.id);
  const decision = command.decisions?.[0];
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/command">
      <AtelierPageHeader
        eyebrow="Executive Event Command"
        title="What needs a decision"
        lede="This is a CEO decision environment. Counts are orientation only. Every material indicator names a hash, a consequence and a next governed action."
      />
      <div className="atelier-brief at-scope" data-testid="executive-command">
        <section className="form programme-form">
          <h2>Orientation</h2>
          <p>{command.engagementLabel ?? "No active engagement"}</p>
          <p>
            Brief {command.briefHash ? <CanonicalHash value={command.briefHash} /> : "none"} · Budget{" "}
            {command.budgetHash ? <CanonicalHash value={command.budgetHash} /> : "none"} · Roadmap{" "}
            {command.roadmapHash ? <CanonicalHash value={command.roadmapHash} /> : "none"}
          </p>
          <p>Last material change: {command.lastMaterialChange}</p>
          <p>Readiness: {command.readiness}</p>
          <p>Evidence: {command.evidenceFreshness}</p>
          <p>{command.clientConfirmation}</p>
        </section>
        <section className="form programme-form">
          <h2>What we know</h2>
          <p>
            Known {command.known} · unknown {command.unknown} · conflicted {command.conflicted} · stale {command.stale}
          </p>
          <p data-testid="command-blocking">{command.blocking}</p>
        </section>
        <section className="form programme-form">
          <h2>Decisions requiring attention</h2>
          {decision ? (
            <div data-testid="command-next-decision">
              <p>{decision.what}</p>
              <p>Why now: {decision.whyNow}</p>
              <p>Latest safe: {decision.latestSafe}</p>
              <p>Delay: {decision.delayConsequence}</p>
              <p>Investment: {decision.investmentConsequence}</p>
              <p>Client experience: {decision.clientConsequence}</p>
              <p>Owner: {decision.owner}</p>
              <p>
                Hash being decided: <CanonicalHash value={decision.hash} />
              </p>
              <p>
                <a href="/app/discovery">Open the working surface</a>
              </p>
            </div>
          ) : (
            <p data-testid="command-next-decision">{command.nextDecision}</p>
          )}
          <p>Client confirmed {command.clientConfirmed} · staff reviewed {command.staffReviewed} · AI proposed only {command.aiProposed}</p>
        </section>
        <section className="form programme-form">
          <h2>Exceptions and blind spots</h2>
          <p>Unknown: {command.exceptions?.unknown.join(", ") || "none recorded"}</p>
          <p>Conflicts: {command.exceptions?.conflicts.join(", ") || "none recorded"}</p>
          <p>Stale prices: {command.exceptions?.stalePrices.join(", ") || "none marked"}</p>
          <p>Weak or synthetic evidence: {command.exceptions?.weakConfidence.join(", ") || "none marked"}</p>
          <p>Blocked budget: {command.exceptions?.blockedBudget ? "yes" : "no"} · Roadmap infeasible: {command.exceptions?.roadmapInfeasible ? "yes" : "no"}</p>
        </section>
        <section className="form programme-form">
          <h2>Investment intelligence</h2>
          <p>
            Envelope {moneyLabel(command.investment?.envelopeMinor ?? command.envelopeMinor)} · forecast{" "}
            {moneyLabel(command.investment?.forecastMinor ?? command.forecastMinor)}
            {command.investment?.forecastLowMinor
              ? ` · range ${moneyLabel(command.investment.forecastLowMinor)} to ${moneyLabel(command.investment.forecastHighMinor)}`
              : ""}
          </p>
          <p>
            Approved commitment {moneyLabel(command.investment?.approvedCommitmentMinor)} · contracted{" "}
            {moneyLabel(command.investment?.contractedCommitmentMinor)} · cash window {moneyLabel(command.investment?.cashWindowMinor)}
          </p>
          <p>
            Contingency {moneyLabel(command.investment?.contingencyMinor)} · {command.investment?.contingencyBasis ?? "no explicit rule bound"}
          </p>
          <p>Evidence maturity: {command.investment?.evidenceMaturity ?? "No scenario is bound."}</p>
          {command.investment?.spendNotRecommended ? <p>Do not spend unused envelope capacity. Surplus is not a target.</p> : null}
          <p className="lede">An available envelope is not an instruction to spend it. No payment or booking is authorised here.</p>
        </section>
        <section className="form programme-form">
          <h2>Roadmap intelligence</h2>
          {command.roadmap?.criticalMilestones?.length ? (
            <ul>
              {command.roadmap.criticalMilestones.map((item) => (
                <li key={item.milestoneId}>
                  {item.title} · {item.explanation}
                </li>
              ))}
            </ul>
          ) : command.criticalPath.length === 0 ? (
            <p className="empty">No published roadmap is driving a critical path yet.</p>
          ) : (
            <p>{command.criticalPath.length} milestone identities sit on the current critical path.</p>
          )}
          {command.roadmap?.compressionClass ? <p>Compression: {command.roadmap.compressionClass.toLowerCase().replaceAll("_", " ")}</p> : null}
        </section>
        <section className="form programme-form">
          <h2>Change intelligence</h2>
          {command.change ? (
            <p>
              {command.change.summary} · {command.change.status.toLowerCase().replaceAll("_", " ")} ·{" "}
              <CanonicalHash value={command.change.hash} />
            </p>
          ) : (
            <p className="empty">No change proposal is waiting.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
