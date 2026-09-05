import Link from "next/link";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  const events = organisations.flatMap((item) => runtime.service.listEvents(actor, item.id));
  const event = events.find((item) => item.id === eventId);
  const organisation = organisations.find((item) => item.id === event?.organisationId);
  if (!organisation || !event) {
    return (
      <AppShell person={person} organisationName={organisations[0]?.displayName} current="/app/events">
        <h1>Event</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
      </AppShell>
    );
  }
  const client = runtime.service.getClient(actor, organisation.id, event.clientId);
  const mef = runtime.service.getMasterEventFile(actor, organisation.id, event.id);
  const composed = mef.slots.filter((slot) => slot.status !== "NOT_COMPOSED").length;

  return (
    <AppShell
      person={person}
      organisationName={organisation.displayName}
      eventName={event.name}
      current="/app/events"
    >
      <div className="page-header">
        <h1>{event.name}</h1>
        <p className="lede">Operational event overview. Later Event OS domains appear only when built.</p>
      </div>
      <p>
        <span className="md-status" data-tone="brass">
          {event.phase}
        </span>{" "}
        <span className="md-status">{event.status}</span> · {client.displayName} · {event.timezone}
      </p>
      <p>
        <Link href={`/app/events/${event.id}/settings`}>Event settings</Link>
      </p>
      <section>
        <h2>Master Event File</h2>
        <p>
          Foundation completeness {composed} of {mef.slots.length} doctrine slots. Uncomposed slots remain unverified
          and are not operational truth.
        </p>
      </section>
    </AppShell>
  );
}
