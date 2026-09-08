import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { AppShell } from "../../../components/shell";
import { discoveryPermissions, resolveDiscoveryOrganisation } from "../../../server/discovery-scope";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";
import { operationalStateFromCode } from "../../../server/operational-state";

function moneyLabel(minor?: string) {
  if (!minor) return "Not declared";
  const value = Number(minor) / 100;
  return Number.isFinite(value) ? `NGN ${value.toLocaleString("en-NG")}` : `NGN ${minor}`;
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
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/command">
      <AtelierPageHeader
        eyebrow="Executive Event Command"
        title="What needs a decision"
        lede="This is a CEO decision environment. It is not a decorative dashboard and it does not invent confidence."
      />
      <div className="atelier-brief at-scope" data-testid="executive-command">
        <section className="form programme-form">
          <h2>What we know</h2>
          <p>
            Known {command.known} · unknown {command.unknown} · conflicted {command.conflicted} · stale {command.stale}
          </p>
          <p data-testid="command-blocking">{command.blocking}</p>
        </section>
        <section className="form programme-form">
          <h2>What must be decided</h2>
          <p data-testid="command-next-decision">{command.nextDecision}</p>
          <p>Client confirmed {command.clientConfirmed} · staff reviewed {command.staffReviewed} · AI proposed only {command.aiProposed}</p>
        </section>
        <section className="form programme-form">
          <h2>Investment assumptions</h2>
          <p>Envelope {moneyLabel(command.envelopeMinor)} · forecast {moneyLabel(command.forecastMinor)}</p>
          <p className="lede">An available envelope is not an instruction to spend it. No payment or booking is authorised here.</p>
        </section>
        <section className="form programme-form">
          <h2>Critical path</h2>
          {command.criticalPath.length === 0 ? (
            <p className="empty">No published roadmap is driving a critical path yet.</p>
          ) : (
            <p>{command.criticalPath.length} milestone identities sit on the current critical path.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
