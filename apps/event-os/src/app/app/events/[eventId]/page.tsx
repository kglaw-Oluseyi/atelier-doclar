import Link from "next/link";
import { getEvent, phaseHistory } from "@maison-doclar/foundation";
import { requireActor } from "@/server/session";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { notice?: string; switched?: string };
}) {
  const { actor } = await requireActor();
  const event = await getEvent(actor, params.eventId);
  const history = await phaseHistory(actor, params.eventId);
  return (
    <main className="page">
      <div className="crumbs">
        <Link href="/app/events">Events</Link> / {String(event.name)}
      </div>
      <h1>{String(event.name)}</h1>
      <p className="lede">
        {String(event.client_name)} · {String(event.phase)} · {String(event.status)}. This is not an
        operational readiness claim.
      </p>
      {searchParams?.switched ? (
        <p className="success" role="status" aria-live="polite">
          Now operating {String(event.name)}.
        </p>
      ) : null}
      {searchParams?.notice ? (
        <p className="success" role="status">
          {searchParams.notice}
        </p>
      ) : null}
      <div className="actions">
        <Link className="button" href={`/app/events/${params.eventId}/settings`}>
          Event settings
        </Link>
        <Link className="button secondary" href={`/app/events/${params.eventId}/mef`}>
          Master Event File
        </Link>
        <Link className="button secondary" href={`/app/events/${params.eventId}/workstreams`}>
          Workstreams
        </Link>
      </div>
      <section className="panel">
        <h2>Facts</h2>
        <p>Code {String(event.code)}</p>
        <p>Timezone {String(event.timezone)}</p>
        <p>Venue {String(event.venue_summary ?? "Not provided")}</p>
      </section>
      <section className="panel">
        <h2>Phase history</h2>
        {history.length === 0 ? (
          <p>No transitions yet.</p>
        ) : (
          history.map((item) => (
            <p key={String(item.id)}>
              {String(item.from_phase ?? "—")} → {String(item.to_phase)} ·{" "}
              {String(item.display_name)}
            </p>
          ))
        )}
      </section>
    </main>
  );
}
