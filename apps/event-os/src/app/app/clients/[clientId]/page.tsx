import Link from "next/link";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
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
      <p className="actions">
        <Link className="button" href={`/app/events/new?clientId=${client.id}`}>
          Create event
        </Link>
      </p>
      {events.length === 0 ? (
        <p className="empty">No events are visible for this client.</p>
      ) : (
        <section className="atelier-folio" aria-label="Client events">
          {events.map((event) => (
            <article key={event.id}>
              <h2>
                <Link href={`/app/events/${event.id}`}>{event.name}</Link>
              </h2>
              <p>
                <span className="md-status" data-tone="brass">
                  {event.phase}
                </span>
              </p>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
