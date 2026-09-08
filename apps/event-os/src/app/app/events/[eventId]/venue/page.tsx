import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { EventVenueWorkspaceView } from "../../../../../components/event-venue-workspace";
import { AppShell } from "../../../../../components/shell";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { refreshEventVenueRecordAction } from "../../../../../server/actions";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { resolveVenueEvent, venuePermissions } from "../../../../../server/venue-scope";

export default async function EventVenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveVenueEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = venuePermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view event venue setup.")}
        />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventVenueWorkspace(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Event venue workspace could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${scoped.event.id}/venue`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: scoped.event.id,
  });
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Event venue · ${scoped.event.name}`}
        title="Venue adoption and spatial setup"
        lede="Adopt a reusable venue into this event, record event-only overrides, and open blank layout setup. Seating allocation is not available."
      />
      <AtelierSectionTabs
        label="Event venue sections"
        items={[
          { href: "#event-venue-adopted", label: "Adopted venue" },
          { href: "#event-venue-facts", label: "Facts" },
          { href: "#event-venue-layouts", label: "Layouts" },
          { href: "#event-venue-attendance", label: "Attendance boundary" },
        ]}
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshEventVenueRecordAction}
        reloadFields={{ eventId }}
      />
      <EventVenueWorkspaceView workspace={workspace} mutationLocked={presented.mutationLocked} />
    </AppShell>
  );
}
