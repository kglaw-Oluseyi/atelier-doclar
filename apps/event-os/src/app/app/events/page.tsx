import Link from "next/link";
import { AppShell } from "../../../components/shell";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";

export default async function EventsPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const events = organisation ? runtime.service.listEvents(actor, organisation.id) : [];
  const clients = organisation ? runtime.service.listClients(actor, organisation.id) : [];

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/events">
      <div className="page-header">
        <h1>Events</h1>
        <p className="lede">Permitted events only. Switching context opens a different event record.</p>
      </div>
      <p className="actions">
        <Link className="button" href="/app/events/new">
          Create event
        </Link>
      </p>
      {events.length === 0 ? (
        <p className="empty">No permitted events.</p>
      ) : (
        <div className="card-list">
          {events.map((event) => (
            <article key={event.id}>
              <h2>
                <Link href={`/app/events/${event.id}`}>{event.name}</Link>
              </h2>
              <p>
                <span className="md-status" data-tone="brass">
                  {event.phase}
                </span>{" "}
                {clients.find((item) => item.id === event.clientId)?.displayName ?? "Client not provided"} · {event.timezone}
              </p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
