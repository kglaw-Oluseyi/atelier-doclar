import Link from "next/link";
import { listAssignments } from "@maison-doclar/foundation";
import { requireActor } from "@/server/session";

export default async function MyWorkPage() {
  const { actor } = await requireActor();
  const assignments = (await listAssignments(actor)).filter(
    (item) => item.user_id === actor.userId,
  );
  return (
    <main className="page">
      <h1>My Work</h1>
      <p className="lede">
        Active assignments. This page does not pretend that task alerts exist yet.
      </p>
      {assignments.length === 0 ? (
        <p className="empty panel">No active assignment. Ask an administrator to grant access.</p>
      ) : (
        <ul>
          {assignments.map((item) => (
            <li key={String(item.id)}>
              {String(item.role_name)} · {String(item.status)}
              {item.event_id ? (
                <>
                  {" "}
                  · <Link href={`/app/events/${String(item.event_id)}`}>Open event</Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="callout">Attention remains unavailable in this release.</p>
    </main>
  );
}
