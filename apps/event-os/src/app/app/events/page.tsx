import Link from "next/link";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AppShell } from "../../../components/shell";
import { eventPermissions } from "../../../server/event-scope";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";

export default async function EventsPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const events = organisation ? runtime.service.listEvents(actor, organisation.id) : [];
  const clients = organisation ? runtime.service.listClients(actor, organisation.id) : [];
  const canCreate = organisation ? eventPermissions(person, organisation.id).create : false;

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Event book · ${organisation?.displayName ?? "Organisation"}`}
        title="Events"
        lede="Permitted events only. Switching context opens a different event record."
      />
      {canCreate ? (
        <p className="actions">
          <Link className="button" href="/app/events/new">
            Create event
          </Link>
        </p>
      ) : null}
      {events.length === 0 ? (
        <p className="empty">No permitted events.</p>
      ) : (
        <section className="atelier-folio" aria-label="Permitted events">
          {events.map((event) => (
            <article key={event.id} className="event-open-card">
              <h2>
                <Link className="event-open-target" href={`/app/events/${event.id}`}>
                  {event.name}
                </Link>
              </h2>
              <p>
                <span className="md-status event-phase-pill" data-tone="brass">
                  {event.phase}
                </span>{" "}
                {clients.find((item) => item.id === event.clientId)?.displayName ?? "Client not provided"} · {event.timezone}
              </p>
              <p className="actions">
                <Link className="button" href={`/app/events/${event.id}`}>
                  Open event
                </Link>
              </p>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
