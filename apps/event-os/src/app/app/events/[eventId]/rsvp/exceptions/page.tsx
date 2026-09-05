import Link from "next/link";
import { acknowledgeAssistanceAction, reviewRsvpExceptionAction } from "../../../../../../server/actions";
import { AppShell } from "../../../../../../components/shell";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";

export default async function RsvpExceptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const error = (await searchParams).error;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>RSVP review</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
      </AppShell>
    );
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  if (!permissions.rsvpView) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <h1>RSVP review</h1>
        <p className="empty">Your assignment does not include RSVP visibility.</p>
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const exceptions = runtime.service.listRsvpExceptions(actor, scoped.organisation.id, scoped.event.id);
  const assistance = runtime.service.listRsvpAssistance(actor, scoped.organisation.id, scoped.event.id);

  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <div className="page-header">
        <h1>RSVP review queue</h1>
        <p className="lede">Conflicts and assistance requests that need a named operator.</p>
      </div>
      <p>
        <Link href={`/app/events/${scoped.event.id}/rsvp`}>Back to RSVP</Link>
      </p>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <section>
        <h2>Conflicts</h2>
        {exceptions.length === 0 ? (
          <p className="empty">No RSVP conflicts.</p>
        ) : (
          exceptions.map((item) => (
            <article key={item.id} className="card-list">
              <p>
                <span className="md-status" data-tone={item.status === "OPEN" ? "warn" : "ok"}>
                  {item.kind.replaceAll("_", " ")}
                </span>{" "}
                {item.status}
              </p>
              <p>
                Existing {item.existingValue ?? "—"} · Submitted {item.submittedValue ?? "—"}
              </p>
              {permissions.rsvpReview && item.status === "OPEN" ? (
                <form className="form" action={reviewRsvpExceptionAction}>
                  <input type="hidden" name="eventId" value={scoped.event.id} />
                  <input type="hidden" name="exceptionId" value={item.id} />
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <label>
                    Decision
                    <select name="decision" defaultValue="REVIEWED">
                      <option value="REVIEWED">Reviewed</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="DISMISSED">Dismissed</option>
                    </select>
                  </label>
                  <label>
                    Reason
                    <input name="reason" required />
                  </label>
                  <button type="submit">Update conflict</button>
                </form>
              ) : null}
            </article>
          ))
        )}
      </section>
      <section>
        <h2>Assistance</h2>
        {assistance.length === 0 ? (
          <p className="empty">No assistance requests.</p>
        ) : (
          assistance.map((item) => (
            <article key={item.id} className="card-list">
              <p>
                <span className="md-status" data-tone={item.status === "OPEN" ? "warn" : "ok"}>
                  {item.status}
                </span>{" "}
                {item.note}
              </p>
              {permissions.rsvpReview && item.status === "OPEN" ? (
                <form className="form" action={acknowledgeAssistanceAction}>
                  <input type="hidden" name="eventId" value={scoped.event.id} />
                  <input type="hidden" name="assistanceId" value={item.id} />
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <input type="hidden" name="status" value="ACKNOWLEDGED" />
                  <label>
                    Reason
                    <input name="reason" required defaultValue="Acknowledged by operator" />
                  </label>
                  <button type="submit">Acknowledge</button>
                </form>
              ) : null}
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
