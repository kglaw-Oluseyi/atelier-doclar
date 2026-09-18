import Link from "next/link";
import { listClients } from "@maison-doclar/foundation";
import { requireActor } from "@/server/session";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const clients = await listClients(actor, {
    query: searchParams?.q,
    status: searchParams?.status,
    includeArchived: searchParams?.status === "ARCHIVED",
  });
  return (
    <main className="page">
      <div className="crumbs">
        <Link href="/app">Home</Link> / Clients
      </div>
      <h1>Clients</h1>
      <p className="lede">Houses and organisations Maison Doclar is engaged to serve.</p>
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      <form className="filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={searchParams?.q ?? ""} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={searchParams?.status ?? ""}>
            <option value="">Open records</option>
            <option>PROSPECT</option>
            <option>ACTIVE</option>
            <option>PAUSED</option>
            <option>CLOSED</option>
            <option>ARCHIVED</option>
          </select>
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
        <Link className="button" href="/app/clients/new">
          Create client
        </Link>
      </form>
      {clients.length === 0 ? (
        <p className="empty panel">
          No clients match this view. Create a client if you are authorised.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Code</th>
              <th>Status</th>
              <th>Active events</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={String(client.id)}>
                <td>
                  <Link href={`/app/clients/${String(client.id)}`}>
                    {String(client.display_name)}
                  </Link>
                </td>
                <td>{String(client.code)}</td>
                <td>
                  <span className="status">{String(client.status)}</span>
                </td>
                <td>{String(client.active_event_count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
