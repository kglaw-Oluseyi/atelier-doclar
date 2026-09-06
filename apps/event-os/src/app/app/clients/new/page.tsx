import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { ClientForm } from "../../../../components/client-form";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { actor, person } = await guardedActor();
  const error = (await searchParams).error;
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/clients">
        <h1>Create client</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/clients">
      <AtelierPageHeader
        eyebrow="Client intake"
        title="Create client"
        lede="Create a client inside the current organisation. Scope is resolved on the server."
      />
      <ClientForm error={error} />
    </AppShell>
  );
}
