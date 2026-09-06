import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AppShell } from "../../../../../components/shell";
import { TransitionForm } from "../../../../../components/transition-form";
import { guardedActor } from "../../../../../server/guard";
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
  return (
    <AppShell
      person={person}
      organisationName={organisation.displayName}
      eventName={event.name}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`Configuration · ${event.name}`}
        title="Event settings"
        lede="Phase changes require a reason. Ready and Live remain scaffolded."
      />
      <p>
        Current phase <span className="md-status" data-tone="brass">{event.phase}</span> · version {event.version}
      </p>
      <TransitionForm eventId={event.id} expectedVersion={event.version} error={error} />
    </AppShell>
  );
}
