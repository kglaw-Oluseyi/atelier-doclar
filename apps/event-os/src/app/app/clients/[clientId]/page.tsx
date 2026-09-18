import Link from "next/link";
import { getClient, rows, withTx } from "@maison-doclar/foundation";
import { archiveClientAction, createProgrammeAction, restoreClientAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams?: { notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const client = await getClient(actor, params.clientId);
  const programmes = await withTx((db) =>
    rows<{ id: string; name: string; status: string }>(
      db,
      `SELECT id, name, status FROM event_programmes WHERE client_id = $1 AND organisation_id = $2`,
      [params.clientId, actor.organisationId],
    ),
  );
  const events = await withTx((db) =>
    rows<{ id: string; name: string; phase: string }>(
      db,
      `SELECT id, name, phase FROM events WHERE client_id = $1 AND organisation_id = $2`,
      [params.clientId, actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <div className="crumbs">
        <Link href="/app/clients">Clients</Link> / {String(client.display_name)}
      </div>
      <h1>{String(client.display_name)}</h1>
      <p className="lede">
        Client record {String(client.code)}. Status {String(client.status)}.
      </p>
      {searchParams?.notice ? (
        <p className="success" role="status">
          {searchParams.notice}
        </p>
      ) : null}
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      <div className="actions">
        <Link className="button" href={`/app/clients/${params.clientId}/edit`}>
          Edit client
        </Link>
        <Link className="button secondary" href={`/app/events/new?clientId=${params.clientId}`}>
          Create event
        </Link>
      </div>
      <section className="panel">
        <h2>Programmes</h2>
        {programmes.length === 0 ? (
          <p className="empty">
            No programme grouping yet. A programme never replaces event scope.
          </p>
        ) : (
          programmes.map((item) => (
            <p key={item.id}>
              {item.name} · {item.status}
            </p>
          ))
        )}
        <form action={createProgrammeAction} className="form-grid">
          <input type="hidden" name="clientId" value={params.clientId} />
          <label>
            New programme name
            <input name="name" required />
          </label>
          <button type="submit">Create programme</button>
        </form>
      </section>
      <section className="panel">
        <h2>Events</h2>
        {events.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          events.map((event) => (
            <p key={event.id}>
              <Link href={`/app/events/${event.id}`}>{event.name}</Link> · {event.phase}
            </p>
          ))
        )}
      </section>
      <section className="panel">
        <h2>{client.status === "ARCHIVED" ? "Restore client" : "Archive client"}</h2>
        <form
          action={client.status === "ARCHIVED" ? restoreClientAction : archiveClientAction}
          className="form-grid"
        >
          <input type="hidden" name="id" value={params.clientId} />
          <input type="hidden" name="version" value={String(client.version)} />
          <label>
            Reason
            <textarea name="reason" required />
          </label>
          <label>
            <input type="checkbox" required /> I understand this changes the client record.
          </label>
          <button className="danger" type="submit">
            {client.status === "ARCHIVED" ? "Restore" : "Archive"}
          </button>
        </form>
      </section>
    </main>
  );
}
