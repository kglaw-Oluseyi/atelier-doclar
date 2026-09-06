import Link from "next/link";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AppShell } from "../../../components/shell";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";

export default async function ClientsPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const clients = organisation ? runtime.service.listClients(actor, organisation.id) : [];

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/clients">
      <AtelierPageHeader
        eyebrow={`Client register · ${organisation?.displayName ?? "Organisation"}`}
        title="Clients"
        lede="Clients you are permitted to see in the current organisation."
      />
      <p className="actions">
        <Link className="button" href="/app/clients/new">
          Create client
        </Link>
      </p>
      {clients.length === 0 ? (
        <p className="empty">No clients are visible in this assignment.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Permitted clients</caption>
            <thead>
              <tr>
                <th>Client</th>
                <th>Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td data-label="Client">
                    <Link href={`/app/clients/${client.id}`}>{client.displayName}</Link>
                  </td>
                  <td data-label="Code">{client.code}</td>
                  <td data-label="Status">
                    <span className="md-status">{client.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
