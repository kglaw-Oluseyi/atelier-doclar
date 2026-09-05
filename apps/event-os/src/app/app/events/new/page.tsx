import { EventForm } from "../../../../components/event-form";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; error?: string }>;
}) {
  const { actor, person } = await guardedActor();
  const params = await searchParams;
  const selected = params.clientId;
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const listed = organisation ? runtime.service.listClients(actor, organisation.id) : [];
  const clients = selected ? [...listed].sort((left, right) => Number(right.id === selected) - Number(left.id === selected)) : listed;
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Create event</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/events">
      <div className="page-header">
        <h1>Create event</h1>
        <p className="lede">Events start in Discover. Client lineage is verified on the server.</p>
      </div>
      {clients.length === 0 ? (
        <p className="empty">Create a client before creating an event.</p>
      ) : (
        <EventForm clients={clients} error={params.error} />
      )}
    </AppShell>
  );
}
