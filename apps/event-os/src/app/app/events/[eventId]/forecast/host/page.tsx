import { PlatformError } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { HostForecastView } from "../../../../../../components/forecast-workspace";
import { AppShell } from "../../../../../../components/shell";
import { operationalStateFromCode } from "../../../../../../server/operational-state";
import { guardedActor } from "../../../../../../server/guard";
import { forecastPermissions, resolveForecastEvent } from "../../../../../../server/forecast-scope";
import { getRuntime } from "../../../../../../server/runtime";

export default async function ForecastHostPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { actor, person } = await guardedActor();
  const scoped = resolveForecastEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierPageHeader eyebrow="Host projection" title="Calm planning range" />
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = forecastPermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.host) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierPageHeader eyebrow="Host projection" title="Calm planning range" />
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view the host projection.")}
        />
      </AppShell>
    );
  }
  let projection;
  try {
    projection = getRuntime().service.getHostForecastProjection(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "The host projection could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierPageHeader eyebrow="Host projection" title="Calm planning range" />
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Host projection · ${scoped.event.name}`}
        title="Calm planning range"
        lede="An approved host view. It does not expose model internals, guest probabilities or staff notes."
      />
      <p>
        <a className="button secondary" href={`/app/events/${scoped.event.id}/forecast`}>
          Return to forecasting workspace
        </a>
      </p>
      <HostForecastView projection={projection} />
    </AppShell>
  );
}
