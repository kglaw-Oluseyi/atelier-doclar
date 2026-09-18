import Link from "next/link";
import { PHASE_EDGES, S01_DISABLED_TARGETS, getEvent } from "@maison-doclar/foundation";
import { transitionEventAction, updateEventAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { error?: string; notice?: string };
}) {
  const { actor } = await requireActor();
  const event = await getEvent(actor, params.eventId);
  const next = PHASE_EDGES[String(event.phase)] ?? [];
  const starts = new Date(String(event.starts_at)).toISOString().slice(0, 16);
  const ends = new Date(String(event.ends_at)).toISOString().slice(0, 16);
  return (
    <main className="page">
      <div className="crumbs">
        <Link href={`/app/events/${params.eventId}`}>{String(event.name)}</Link> / Settings
      </div>
      <h1>Event settings</h1>
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams?.notice ? (
        <p className="success" role="status">
          {searchParams.notice}
        </p>
      ) : null}
      <form className="panel form-grid" action={updateEventAction}>
        <input type="hidden" name="id" value={params.eventId} />
        <input type="hidden" name="version" value={String(event.version)} />
        <label>
          Name
          <input name="name" defaultValue={String(event.name)} required />
        </label>
        <label>
          Starts
          <input type="datetime-local" name="startsAt" defaultValue={starts} required />
        </label>
        <label>
          Ends
          <input type="datetime-local" name="endsAt" defaultValue={ends} required />
        </label>
        <label>
          Timezone
          <input name="timezone" defaultValue={String(event.timezone)} required />
        </label>
        <label>
          Venue summary
          <input name="venueSummary" defaultValue={String(event.venue_summary ?? "")} />
        </label>
        <button type="submit">Save facts</button>
      </form>
      <section className="panel">
        <h2>Phase</h2>
        <p>Current phase {String(event.phase)}. Ready and Live remain disabled.</p>
        {next.map((target) => (
          <form key={target} action={transitionEventAction} className="form-grid">
            <input type="hidden" name="id" value={params.eventId} />
            <input type="hidden" name="version" value={String(event.version)} />
            <input type="hidden" name="to" value={target} />
            <input
              type="hidden"
              name="idempotencyKey"
              value={`${params.eventId}-${target}-${String(event.version)}`}
            />
            <label>
              Reason for {target}
              <input name="reason" />
            </label>
            <button
              type="submit"
              disabled={S01_DISABLED_TARGETS.has(target)}
              aria-describedby={S01_DISABLED_TARGETS.has(target) ? "not-enabled" : undefined}
            >
              Move to {target}
            </button>
            {S01_DISABLED_TARGETS.has(target) ? (
              <p id="not-enabled">Capability not yet enabled.</p>
            ) : null}
          </form>
        ))}
        <p>
          <Link href="/app/admin/approvals">Request archive through approval</Link>
        </p>
      </section>
    </main>
  );
}
