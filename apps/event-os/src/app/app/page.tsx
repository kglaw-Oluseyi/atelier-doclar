import Link from "next/link";
import { listEvents, one, withTx } from "@maison-doclar/foundation";
import { requireActor } from "@/server/session";

export default async function HomePage({ searchParams }: { searchParams?: { notice?: string } }) {
  const { actor } = await requireActor();
  const events = await listEvents(actor, {});
  const organisation = await withTx((db) =>
    one<{ display_name: string; status: string }>(
      db,
      `SELECT display_name, status FROM organisations WHERE id = $1`,
      [actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <h1>{organisation?.display_name ?? "Home"}</h1>
      <p className="lede">Your assigned work, without guest or sensitive operational detail.</p>
      {searchParams?.notice ? (
        <p className="success" role="status">
          {searchParams.notice}
        </p>
      ) : null}
      <div className="cards">
        <article className="card">
          <h2>Organisation</h2>
          <p className="status">{organisation?.status}</p>
        </article>
        <article className="card">
          <h2>Upcoming events</h2>
          {events.length === 0 ? (
            <p className="empty">No events are assigned yet.</p>
          ) : (
            events.slice(0, 4).map((event) => (
              <p key={String(event.id)}>
                <Link href={`/app/events/${String(event.id)}`}>{String(event.name)}</Link>
              </p>
            ))
          )}
        </article>
        <article className="card">
          <h2>Attention</h2>
          <p className="callout">
            Attention and alerts are not part of this release. Assignments are listed in My Work.
          </p>
        </article>
      </div>
    </main>
  );
}
