import Link from "next/link";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { ForecastStrip } from "../../../../components/forecast-workspace";
import { AppShell } from "../../../../components/shell";
import { forecastPermissions } from "../../../../server/forecast-scope";
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
  const canViewForecast = forecastPermissions(person, organisation.id, event.id).view;
  const forecastStrip = canViewForecast
    ? runtime.service.getForecastOverviewStrip(actor, organisation.id, event.id)
    : undefined;

  return (
    <AppShell
      person={person}
      organisationName={organisation.displayName}
      eventName={event.name}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`Event brief · ${client.displayName}`}
        title={event.name}
        lede="Operational event overview. Guest intake, RSVP, programme routing, merchandise, forecasting, language and the private Atelier are available for this event."
      />
      <p>
        <span className="md-status" data-tone="brass">
          {event.phase}
        </span>{" "}
        <span className="md-status">{event.status}</span> · {client.displayName} · {event.timezone}
      </p>
        <p className="actions">
        <Link className="button" href={`/app/events/${event.id}/guests`}>
          Guest directory
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/programme`}>
          Programme and arrival
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/merchandise`}>
          Merchandise
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/forecast`}>
          Attendance forecast
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/atelier`}>
          Private Atelier
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/language`}>
          Language and editions
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/rsvp`}>
          RSVP
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/communications`}>
          Communications
        </Link>
        <Link className="button secondary" href={`/app/events/${event.id}/settings`}>
          Event settings
        </Link>
      </p>
      {forecastStrip ? <ForecastStrip eventId={event.id} strip={forecastStrip} /> : null}
      <section className="atelier-panel">
        <h2>Master Event File</h2>
        <p>
          Foundation completeness {composed} of {mef.slots.length} doctrine slots. Uncomposed slots remain unverified
          and are not operational truth.
        </p>
      </section>
    </AppShell>
  );
}
