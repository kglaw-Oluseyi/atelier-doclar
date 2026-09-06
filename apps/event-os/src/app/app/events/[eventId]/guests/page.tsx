import Link from "next/link";
import { AppShell } from "../../../../../components/shell";
import { GuestImportForm } from "../../../../../components/guest-intake-form";
import { guestPermissions, resolveScopedEvent } from "../../../../../server/guest-scope";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { operationalDisplayName } from "@maison-doclar/shared-platform";

function qualityTone(quality: string): "ok" | "warn" | "danger" | "brass" | undefined {
  if (quality === "VERIFIED") return "ok";
  if (quality === "CONFLICTING") return "danger";
  if (quality === "PENDING_VERIFICATION" || quality === "DUPLICATE_RISK") return "warn";
  if (quality === "UNVERIFIED") return "brass";
  return undefined;
}

export default async function GuestDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ q?: string; attention?: string; rsvp?: string; error?: string; importError?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest directory</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const guests = runtime.service.listGuests(actor, {
    organisationId: scoped.organisation.id,
    eventId: scoped.event.id,
    query: query.q,
    attentionRequired: query.attention === "1" ? true : undefined,
    attendanceIntent:
      query.rsvp === "ATTENDING" ||
      query.rsvp === "NOT_ATTENDING" ||
      query.rsvp === "UNCERTAIN" ||
      query.rsvp === "NOT_SUPPLIED"
        ? query.rsvp
        : undefined,
  });
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  let rsvpRows: ReturnType<typeof runtime.service.listRsvpDirectory> = [];
  if (permissions.rsvpView) {
    try {
      rsvpRows = runtime.service.listRsvpDirectory(actor, {
        organisationId: scoped.organisation.id,
        eventId: scoped.event.id,
      });
    } catch {
      rsvpRows = [];
    }
  }
  const rsvpByGuest = new Map(rsvpRows.map((row) => [row.guest.id, row]));
  const attentionCount = guests.filter((item) => item.attentionRequired).length;

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      current="/app/events"
    >
      <div className="atelier-guestbook at-scope">
      <header className="atelier-masthead">
        <p className="eyebrow">Guest book · {scoped.event.name}</p>
        <span className="at-thread" aria-hidden="true" />
        <h1>Guest directory</h1>
        <p className="lede">
          Operational records for {scoped.event.name}. A guest record is not a user, membership, or admission
          decision.
        </p>
      </header>
      <p>
        <span className="at-seal md-status" data-tone="brass">
          {guests.length} records
        </span>{" "}
        <span className="at-seal md-status" data-tone={attentionCount ? "warn" : "ok"}>
          {attentionCount} need attention
        </span>
      </p>
      {query.error ? (
        <p className="alert" data-tone="danger" role="alert">
          {query.error}
        </p>
      ) : null}
      <form className="filter-bar" method="get">
        <label>
          Search
          <input name="q" defaultValue={query.q ?? ""} type="search" />
        </label>
        <label className="check">
          <input className="at-switch" type="checkbox" name="attention" value="1" defaultChecked={query.attention === "1"} />
          Attention only
        </label>
        <label>
          RSVP
          <select name="rsvp" defaultValue={query.rsvp ?? ""}>
            <option value="">All responses</option>
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
      <p className="actions">
        {permissions.intake ? (
          <Link className="button" href={`/app/events/${scoped.event.id}/guests/new`}>
            New guest intake
          </Link>
        ) : null}
        <Link className="button secondary" href={`/app/events/${scoped.event.id}/rsvp`}>
          RSVP workspace
        </Link>
        <Link className="button secondary" href={`/app/events/${scoped.event.id}`}>
          Event overview
        </Link>
      </p>
      {guests.length === 0 ? (
        <p className="empty">No guest records in this event yet. Intake creates an operational record only.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Event-scoped operational guest records</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Identity</th>
                <th scope="col">Email quality</th>
                <th scope="col">RSVP</th>
                <th scope="col">Source</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="atelier-guest-row">
                  <td data-label="Name">
                    <Link href={`/app/events/${scoped.event.id}/guests/${guest.id}`}>
                      {guest.addressing
                        ? [guest.addressing.honorific, operationalDisplayName(guest)].filter(Boolean).join(" ")
                        : operationalDisplayName(guest)}
                    </Link>
                  </td>
                  <td data-label="Identity">
                    <span className="md-status" data-tone={guest.identityResolution === "DUPLICATE_RISK" ? "warn" : undefined}>
                      {guest.identityResolution.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td data-label="Email quality">
                    <span className="md-status" data-tone={qualityTone(guest.email.quality)}>
                      {guest.email.quality.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td data-label="RSVP">
                    <span className="md-status">
                      {(rsvpByGuest.get(guest.id)?.attendanceIntent ?? "NOT_SUPPLIED").replaceAll("_", " ")}
                    </span>
                  </td>
                  <td data-label="Source">{guest.intakeSource.replaceAll("_", " ")}</td>
                  <td data-label="State">{guest.lifecycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {permissions.intake ? (
        <section>
          <h2>Canonical CSV import</h2>
          <p className="lede">Columns: givenName, familyName, preferredName, email, phone, householdKey, dietary, accessibility, note.</p>
          <GuestImportForm eventId={scoped.event.id} error={query.importError} />
        </section>
      ) : null}
      </div>
    </AppShell>
  );
}
