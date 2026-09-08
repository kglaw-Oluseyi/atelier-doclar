import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { EventForm } from "../../../../components/event-form";
import { AppShell } from "../../../../components/shell";
import { eventPermissions } from "../../../../server/event-scope";
import { guardedActor } from "../../../../server/guard";
import { operationalStateFromCode } from "../../../../server/operational-state";
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
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Create event</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }
  const permissions = eventPermissions(person, organisation.id, { clientId: selected });
  if (!permissions.create) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot create events.")}
        />
      </AppShell>
    );
  }
  const listed = runtime.service.listClients(actor, organisation.id);
  const clients = selected ? [...listed].sort((left, right) => Number(right.id === selected) - Number(left.id === selected)) : listed;
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/events">
      <AtelierPageHeader
        eyebrow="Event intake"
        title="Create event"
        lede="Events start in Discover. Client lineage is verified on the server."
      />
      {clients.length === 0 ? (
        <p className="empty">Create a client before creating an event.</p>
      ) : (
        <EventForm clients={clients} error={params.error} />
      )}
    </AppShell>
  );
}
