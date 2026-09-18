import Link from "next/link";
import { listEvents } from "@maison-doclar/foundation";
import { requireActor } from "@/server/session";

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: { q?: string; phase?: string };
}) {
  const { actor } = await requireActor();
  const events = await listEvents(actor, {
    query: searchParams?.q,
    phase: searchParams?.phase,
    includeArchived: true,
  });
  return (
    <main className="page">
      <div className="crumbs">
        <Link href="/app">Home</Link> / Events
      </div>
      <h1>Events</h1>
      <p className="lede">Permitted events, with dates shown in each event timezone.</p>
      <form className="filters">
        <label>
          Search
          <input name="q" defaultValue={searchParams?.q ?? ""} />
        </label>
        <label>
          Phase
          <select name="phase" defaultValue={searchParams?.phase ?? ""}>
            <option value="">All phases</option>
            {["DISCOVER", "DESIGN", "PREPARE", "READY", "LIVE", "CLOSE", "LEARN"].map((phase) => (
              <option key={phase}>{phase}</option>
            ))}
          </select>
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
        <Link className="button" href="/app/events/new">
          Create event
        </Link>
      </form>
      {events.length === 0 ? (
        <p className="empty panel">
          No events match. Create one from an assigned client, or ask for an assignment.
        </p>
      ) : (
        <div className="cards">
          {events.map((event) => (
            <article className="card" key={String(event.id)}>
              <h2>
                <Link href={`/app/events/${String(event.id)}`}>{String(event.name)}</Link>
              </h2>
              <p>{String(event.client_name)}</p>
              <p className="status">
                {String(event.phase)} · {String(event.status)}
              </p>
              <p>
                {new Date(String(event.starts_at)).toLocaleString("en-GB", {
                  timeZone: String(event.timezone),
                })}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
