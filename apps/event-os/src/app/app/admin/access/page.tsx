import { AssignmentForm } from "../../../../components/assignment-form";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/admin/access">
        <h1>Access</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }
  const assignments = runtime.service.listAssignments(actor, organisation.id);
  const events = runtime.service.listEvents(actor, organisation.id);
  let people: Array<{ id: string; displayName: string }> = [];
  try {
    people = runtime.service.listPersons(actor, organisation.id);
  } catch {
    people = [];
  }

  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/admin/access">
      <AtelierPageHeader
        eyebrow="Governance"
        title="Access administration"
        lede="Technical administration is not CEO or Event Director business authority."
      />
      <ul className="atelier-ledger">
        {assignments.map((item) => (
          <li key={item.id}>
            {item.personId} · {item.status} · {item.eventId ?? "organisation"}
          </li>
        ))}
      </ul>
      {people.length > 0 ? (
        <AssignmentForm people={people} events={events} error={error} />
      ) : (
        <p className="empty">Assignment administration is not available for this role.</p>
      )}
    </AppShell>
  );
}
