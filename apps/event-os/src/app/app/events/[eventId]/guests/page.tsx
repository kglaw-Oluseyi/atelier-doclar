import Link from "next/link";
import { AppShell } from "../../../../../components/shell";
import { AtelierOperationalState, AtelierEmptyState } from "../../../../../components/atelier-operational-state";
import { AtelierRecordRefresh } from "../../../../../components/atelier-record-refresh";
import { GuestImportForm } from "../../../../../components/guest-intake-form";
import { directoryNameLines } from "../../../../../server/guest-name-display";
import { guestPermissions, resolveScopedEvent } from "../../../../../server/guest-scope";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../server/operational-state";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";

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
  searchParams: Promise<{
    q?: string;
    attention?: string;
    rsvp?: string;
    error?: string;
    importError?: string;
    state?: string;
    ok?: string;
    demo?: string;
  }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest directory</h1>
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
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
  let rsvpPartial = false;
  if (permissions.rsvpView) {
    try {
      rsvpRows = runtime.service.listRsvpDirectory(actor, {
        organisationId: scoped.organisation.id,
        eventId: scoped.event.id,
      });
    } catch {
      rsvpPartial = true;
    }
  }
  const rsvpByGuest = new Map(rsvpRows.map((row) => [row.guest.id, row]));
  let merchBadges: ReturnType<typeof runtime.service.listGuestMerchandiseBadges> = [];
  try {
    merchBadges = runtime.service.listGuestMerchandiseBadges(actor, scoped.organisation.id, scoped.event.id);
  } catch {
    merchBadges = [];
  }
  const merchByGuest = new Map(merchBadges.map((row) => [row.guestId, row]));
  const attentionCount = guests.filter((item) => item.attentionRequired).length;
  const state = operationalStateFromQuery({
    error: query.error,
    state: query.state,
    ok: query.ok,
    demo: query.demo,
  });
  const importState = query.importError
    ? operationalStateFromCode("VALIDATION_FAILED", query.importError)
    : undefined;
  const filteredEmpty = Boolean(query.q || query.attention || query.rsvp) && guests.length === 0;

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name} eventId={scoped.event.id}
      current="/app/events"
    >
      <div className="atelier-guestbook at-scope">
        <header className="atelier-masthead">
          <p className="eyebrow">Guest book · {scoped.event.name}</p>
          <span className="at-thread" aria-hidden="true" />
          <h1>Guest directory</h1>
          <p className="lede">
            Operational records for {scoped.event.name}. Names use structured addressing. Titles are never guessed.
          </p>
          <AtelierRecordRefresh />
        </header>
        <p>
          <span className="at-seal md-status" data-tone="brass">
            {guests.length} records
          </span>{" "}
          {attentionCount ? (
            <Link className="at-seal md-status" data-tone="warn" href={`/app/events/${scoped.event.id}/guests?attention=1`}>
              {attentionCount} need attention
            </Link>
          ) : (
            <span className="at-seal md-status" data-tone="ok">
              {attentionCount} need attention
            </span>
          )}{" "}
          <span className="at-seal md-status" data-tone={runtime.persistence === "POSTGRES" ? "ok" : "brass"}>
            {runtime.persistence.replaceAll("_", " ")}
          </span>
        </p>
        {state ? <AtelierOperationalState state={state} /> : null}
        {rsvpPartial ? (
          <AtelierOperationalState
            state={operationalStateFromCode("PARTIAL", "RSVP columns could not be loaded. Guest identity remains visible.")}
          />
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
          <Link className="button secondary" href={`/app/events/${scoped.event.id}/merchandise`}>
            Merchandise
          </Link>
          <Link className="button secondary" href={`/app/events/${scoped.event.id}`}>
            Event overview
          </Link>
        </p>
        {guests.length === 0 ? (
          <AtelierEmptyState title={filteredEmpty ? "No matching guests" : "No guest records yet"}>
            {filteredEmpty
              ? "The current filters exclude every record. Clear search or filters and try again. Retry is safe."
              : "No guest records in this event yet. Intake creates an operational record only."}
          </AtelierEmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption>Event-scoped operational guest records</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Formal addressing</th>
                  <th scope="col">Identity</th>
                  <th scope="col">Attention</th>
                  <th scope="col">Email quality</th>
                  <th scope="col">RSVP</th>
                  <th scope="col">Merchandise</th>
                  <th scope="col">Source</th>
                  <th scope="col">State</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => {
                  const names = directoryNameLines(guest);
                  return (
                    <tr key={guest.id} className="atelier-guest-row">
                      <td data-label="Name">
                        <Link className="guest-name" href={`/app/events/${scoped.event.id}/guests/${guest.id}`}>
                          {names.primary}
                        </Link>
                      </td>
                      <td data-label="Formal addressing">
                        <span className="guest-name">
                          {names.showFormal ? names.formal : names.formalKind === "SAFE_FALLBACK" ? names.formal : "Safe fallback"}
                        </span>
                      </td>
                      <td data-label="Identity">
                        <span className="md-status" data-tone={guest.identityResolution === "DUPLICATE_RISK" ? "warn" : undefined}>
                          {guest.identityResolution.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td data-label="Attention">
                        <span
                          className="md-status"
                          data-tone={guest.attentionRequired ? "warn" : "ok"}
                          data-testid="directory-attention"
                        >
                          {guest.attentionRequired ? "Attention required" : "No attention flag"}
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
                      <td data-label="Merchandise">
                        <span className="md-status" data-tone={merchByGuest.get(guest.id)?.risk ? "warn" : undefined}>
                          {merchByGuest.get(guest.id)?.offerCount
                            ? `${merchByGuest.get(guest.id)?.offerCount} offer${merchByGuest.get(guest.id)?.offerCount === 1 ? "" : "s"}`
                            : "No offer"}
                        </span>
                      </td>
                      <td data-label="Source">{guest.intakeSource.replaceAll("_", " ")}</td>
                      <td data-label="State">{guest.lifecycle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {permissions.intake ? (
          <section>
            <h2>Canonical CSV import</h2>
            <p className="lede">
              Columns: givenName, familyName, preferredName, email, phone, householdKey, dietary, accessibility, note.
            </p>
            <GuestImportForm eventId={scoped.event.id} state={importState} />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
