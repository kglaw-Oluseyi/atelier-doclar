import Link from "next/link";
import { AppShell } from "../../../../../../components/shell";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "../../../../../../components/atelier-pending-submit";
import { createHvIntakeJobAction } from "../../../../../../server/hv-intake-actions";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../../server/operational-state";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";

export default async function GuestIntakeCommandPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; state?: string; ok?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest intake</h1>
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "Event not available.")} />
      </AppShell>
    );
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  const runtime = getRuntime();
  const jobs = permissions.intake
    ? runtime.service.listGuestIntakeJobs(actor, scoped.organisation.id, scoped.event.id)
    : [];
  const state = operationalStateFromQuery({ error: query.error, state: query.state, ok: query.ok });

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      eventId={scoped.event.id}
      current="/app/events"
    >
      <div className="atelier-guestbook at-scope">
        <header className="atelier-masthead">
          <p className="eyebrow">Guest intake command · {scoped.event.name}</p>
          <h1>High-volume guest list intake</h1>
          <p className="lede">
            Upload CSV or XLSX, map columns, review issues, approve with a second person, then promote in bounded
            chunks. The guest directory does not change until approved promotion settles.
          </p>
          <p>
            <Link href={`/app/events/${scoped.event.id}/guests`}>Back to directory</Link>
            {" · "}
            <a href={`/api/events/${scoped.event.id}/guests/intake/template`}>Download CSV template</a>
          </p>
        </header>
        {state ? <AtelierOperationalState state={state} /> : null}
        {!permissions.intake ? (
          <AtelierOperationalState
            state={operationalStateFromCode("FORBIDDEN", "You do not have guest intake permission for this event.")}
          />
        ) : (
          <form className="form atelier-intake" action={createHvIntakeJobAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <IdempotencyField />
            <fieldset>
              <legend>Start an intake</legend>
              <p className="lede">Accepted formats: CSV and XLSX. Maximum 8&nbsp;MB / 5,000 rows. Formula cells are not executed.</p>
              <label>
                Intake name
                <input name="name" required maxLength={120} placeholder="Client list — edition 1" />
              </label>
              <label>
                Reason
                <input name="reason" required maxLength={240} placeholder="Governed synthetic or authorised list intake" />
              </label>
              <label>
                Client / source reference (optional)
                <input name="clientSourceRef" maxLength={120} placeholder="Do not paste real guest identifiers in qualification" />
              </label>
              <label>
                Expected scale (optional)
                <input name="expectedScale" type="number" min={1} max={5000} placeholder="1000" />
              </label>
              <PendingSubmit pendingLabel="Creating…">Create intake</PendingSubmit>
            </fieldset>
          </form>
        )}
        <section aria-labelledby="intake-history-title">
          <h2 id="intake-history-title">Intake jobs</h2>
          {jobs.length === 0 ? (
            <p className="lede">No high-volume intake jobs yet for this event.</p>
          ) : (
            <ul className="atelier-list">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/app/events/${scoped.event.id}/guests/intake/${job.id}`}>
                    {job.name} · {job.status.replaceAll("_", " ")} · edition {job.edition}
                  </Link>
                  <span className="muted"> · {job.progress.rowsTotal} rows · {job.progress.phase}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
