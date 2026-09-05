import Link from "next/link";
import { AppShell } from "../../../../../components/shell";
import { PrepareRsvpForm } from "../../../../../components/staff-rsvp-forms";
import { guestPermissions, resolveScopedEvent } from "../../../../../server/guest-scope";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";

function intentLabel(intent: string): string {
  if (intent === "ATTENDING") return "Attending";
  if (intent === "NOT_ATTENDING") return "Not attending";
  if (intent === "UNCERTAIN") return "Uncertain";
  return "Not yet supplied";
}

function intentTone(intent: string): "ok" | "warn" | "brass" | undefined {
  if (intent === "ATTENDING") return "ok";
  if (intent === "UNCERTAIN") return "warn";
  if (intent === "NOT_ATTENDING") return "brass";
  return undefined;
}

export default async function RsvpOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; attendance?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>RSVP</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
      </AppShell>
    );
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  if (!permissions.rsvpView) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <h1>RSVP</h1>
        <p className="empty">Your assignment does not include RSVP visibility.</p>
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const policy = runtime.service.getRsvpPolicy(actor, scoped.organisation.id, scoped.event.id);
  const overview = policy
    ? runtime.service.getRsvpOverview(actor, scoped.organisation.id, scoped.event.id)
    : undefined;
  const rows = policy
    ? runtime.service.listRsvpDirectory(actor, {
        organisationId: scoped.organisation.id,
        eventId: scoped.event.id,
        attendanceIntent:
          query.attendance === "ATTENDING" ||
          query.attendance === "NOT_ATTENDING" ||
          query.attendance === "UNCERTAIN" ||
          query.attendance === "NOT_SUPPLIED"
            ? query.attendance
            : undefined,
      })
    : [];

  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <div className="page-header">
        <h1>RSVP</h1>
        <p className="lede">
          Guest responses for {scoped.event.name}. An attending response is not admission, check-in, or a credential.
        </p>
      </div>
      {query.error ? (
        <p className="alert" data-tone="danger" role="alert">
          {query.error}
        </p>
      ) : null}
      <p>
        <Link href={`/app/events/${scoped.event.id}/guests`}>Guest directory</Link>
        {permissions.rsvpManage ? (
          <>
            {" · "}
            <Link href={`/app/events/${scoped.event.id}/rsvp/policy`}>Policy and form</Link>
          </>
        ) : null}
        {" · "}
        <Link href={`/app/events/${scoped.event.id}/rsvp/exceptions`}>Review queue</Link>
      </p>
      {!policy && permissions.rsvpManage ? (
        <section>
          <h2>Prepare this event</h2>
          <PrepareRsvpForm eventId={scoped.event.id} eventName={scoped.event.name} />
        </section>
      ) : null}
      {overview ? (
        <p>
          <span className="md-status" data-tone="ok">
            {overview.attending} attending
          </span>{" "}
          <span className="md-status" data-tone="brass">
            {overview.notAttending} not attending
          </span>{" "}
          <span className="md-status" data-tone="warn">
            {overview.uncertain} uncertain
          </span>{" "}
          <span className="md-status">{overview.notSupplied} not yet supplied</span>
        </p>
      ) : null}
      <form className="filter-bar" method="get">
        <label>
          Response
          <select name="attendance" defaultValue={query.attendance ?? ""}>
            <option value="">All</option>
            <option value="NOT_SUPPLIED">Not yet supplied</option>
            <option value="ATTENDING">Attending</option>
            <option value="NOT_ATTENDING">Not attending</option>
            <option value="UNCERTAIN">Uncertain</option>
          </select>
        </label>
        <button type="submit" className="secondary">
          Apply filters
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="empty">No guest responses match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>RSVP responses</caption>
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Response</th>
                <th scope="col">Source</th>
                <th scope="col">When</th>
                <th scope="col">Attention</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.guest.id}>
                  <td>
                    <Link href={`/app/events/${scoped.event.id}/guests/${row.guest.id}`}>
                      {runtime.service.guestDisplayName(row.guest)}
                    </Link>
                  </td>
                  <td>
                    <span className="md-status" data-tone={intentTone(row.attendanceIntent)}>
                      {intentLabel(row.attendanceIntent)}
                    </span>
                  </td>
                  <td>{row.provenance ? row.provenance.replaceAll("_", " ") : "—"}</td>
                  <td>{row.respondedAt ?? "—"}</td>
                  <td>
                    <span className="md-status" data-tone={row.attentionRequired ? "warn" : "ok"}>
                      {row.attentionRequired ? "Needs review" : "Clear"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
