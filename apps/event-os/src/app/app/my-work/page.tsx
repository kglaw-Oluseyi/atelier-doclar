import Link from "next/link";
import { AppShell } from "../../../components/shell";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";

export default async function MyWorkPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const assignments = organisation ? runtime.service.listAssignments(actor, organisation.id) : [];

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/my-work">
      <div className="page-header">
        <h1>My Work</h1>
        <p className="lede">Active assignments only. This is not a task or alert product.</p>
      </div>
      {assignments.length === 0 ? (
        <p className="empty">No active assignments.</p>
      ) : (
        <ul>
          {assignments.map((item) => (
            <li key={item.id}>
              {item.eventId ? <Link href={`/app/events/${item.eventId}`}>Open assigned event</Link> : "Organisation assignment"}{" "}
              · {item.status}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
