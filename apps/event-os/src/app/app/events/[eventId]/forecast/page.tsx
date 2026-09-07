import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { ForecastWorkspace } from "../../../../../components/forecast-workspace";
import { AppShell } from "../../../../../components/shell";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { refreshForecastRecordAction } from "../../../../../server/actions";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { guardedActor } from "../../../../../server/guard";
import { forecastPermissions, resolveForecastEvent } from "../../../../../server/forecast-scope";
import { getRuntime } from "../../../../../server/runtime";

export default async function ForecastPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveForecastEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = forecastPermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view attendance forecasting.")}
        />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventForecastWorkspace(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Forecasting could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${scoped.event.id}/forecast`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: scoped.event.id,
  });
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Planning intelligence · ${scoped.event.name}`}
        title="Attendance forecasting"
        lede="Explainable people counts, ranges and separately governed provision. A forecast never changes RSVP, invitation or attendance truth."
      />
      <AtelierSectionTabs
        label="Forecasting sections"
        items={[
          { href: `#forecast-products`, label: "Products" },
          { href: `#forecast-range-heading`, label: "Range" },
          { href: `#forecast-phases`, label: "Phases" },
          { href: `#forecast-provision`, label: "Provision" },
          { href: `#forecast-parameters`, label: "Parameters" },
          { href: `/app/events/${scoped.event.id}/forecast/host`, label: "Host projection" },
        ]}
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshForecastRecordAction}
        reloadFields={{ eventId }}
      />
      <ForecastWorkspace workspace={workspace} mutationLocked={presented.mutationLocked} />
    </AppShell>
  );
}
