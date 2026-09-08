import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../components/shell";
import { TransitionForm } from "../../../../../components/transition-form";
import { eventPermissions } from "../../../../../server/event-scope";
import { guardedActor } from "../../../../../server/guard";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { getRuntime } from "../../../../../server/runtime";

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const error = (await searchParams).error;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Event settings</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }
  const event = runtime.service.getEvent(actor, organisation.id, eventId);
  const permissions = eventPermissions(person, organisation.id, { eventId: event.id, clientId: event.clientId });
  return (
    <AppShell
      person={person}
      organisationName={organisation.displayName}
      eventName={event.name} eventId={event.id}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`Configuration · ${event.name}`}
        title="Event settings"
        lede="Phase changes require a reason. Ready and Live remain scaffolded until a later authorised slice."
      />
      <p>
        Current phase <span className="md-status event-phase-pill" data-tone="brass">{event.phase}</span> · version {event.version}
      </p>
      {permissions.transition ? (
        <TransitionForm eventId={event.id} expectedVersion={event.version} currentPhase={event.phase} error={error} />
      ) : (
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot change event phase.")}
        />
      )}
    </AppShell>
  );
}
