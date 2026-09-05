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
  searchParams: Promise<{ q?: string; attention?: string; error?: string; importError?: string }>;
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
  });
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  const attentionCount = guests.filter((item) => item.attentionRequired).length;

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      current="/app/events"
    >
      <div className="page-header">
        <h1>Guest directory</h1>
        <p className="lede">
          Operational records for {scoped.event.name}. A guest record is not a user, membership, or admission
          decision.
        </p>
      </div>
      <p>
        <span className="md-status" data-tone="brass">
          {guests.length} records
        </span>{" "}
        <span className="md-status" data-tone={attentionCount ? "warn" : "ok"}>
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
          <input type="checkbox" name="attention" value="1" defaultChecked={query.attention === "1"} />
          Attention only
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
                <th scope="col">Source</th>
                <th scope="col">State</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <Link href={`/app/events/${scoped.event.id}/guests/${guest.id}`}>
                      {operationalDisplayName(guest)}
                    </Link>
                  </td>
                  <td>
                    <span className="md-status" data-tone={guest.identityResolution === "DUPLICATE_RISK" ? "warn" : undefined}>
                      {guest.identityResolution.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span className="md-status" data-tone={qualityTone(guest.email.quality)}>
                      {guest.email.quality.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{guest.intakeSource.replaceAll("_", " ")}</td>
                  <td>{guest.lifecycle}</td>
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
    </AppShell>
  );
}
