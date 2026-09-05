import Link from "next/link";
import { AppShell } from "../../components/shell";
import { guardedActor } from "../../server/guard";
import { getRuntime } from "../../server/runtime";

export default async function HomeAppPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  const organisation = organisations[0];
  const events = organisation ? runtime.service.listEvents(actor, organisation.id) : [];
  const clients = organisation ? runtime.service.listClients(actor, organisation.id) : [];

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app">
      <div className="page-header">
        <h1>Home</h1>
        <p className="lede">Assigned work only. Open an event to use the operational guest directory.</p>
      </div>
      {events.length === 0 ? (
        <p className="empty">No assigned events yet. Create a client or event if you are authorised.</p>
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
                {clients.find((item) => item.id === event.clientId)?.displayName ?? "Client not provided"}
              </p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
