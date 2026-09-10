import Link from "next/link";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { eventPermissions } from "../../../../server/event-scope";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/clients">
        <h1>Client</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }
  const client = runtime.service.getClient(actor, organisation.id, clientId);
  const events = runtime.service.listEvents(actor, organisation.id).filter((item) => item.clientId === client.id);

  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/clients">
      <AtelierPageHeader
        eyebrow="Client dossier"
        title={client.displayName}
        lede="Client scope is fixed. Events below belong to this client only."
      />
      <p>
        <span className="md-status">{client.status}</span> Code {client.code}
      </p>
      {eventPermissions(person, organisation.id, { clientId: client.id }).create ? (
        <p className="actions">
          <Link className="button" href={`/app/events/new?clientId=${client.id}`}>
            Create event
          </Link>
        </p>
      ) : null}
      {events.length === 0 ? (
        <p className="empty">No events are visible for this client.</p>
      ) : (
        <section className="atelier-folio" aria-label="Client events">
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
                </span>
              </p>
              <p className="actions">
                <Link className="button" href={`/app/events/${event.id}`}>
                  Open event
                </Link>
                <Link className="button secondary" href={`/app/events/${event.id}/protection/client`}>
                  Published protection dossier
                </Link>
              </p>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
