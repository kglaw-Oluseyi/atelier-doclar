import Link from "next/link";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AppShell } from "../../../components/shell";
import { eventPermissions } from "../../../server/event-scope";
import { filterEventsByQuery, isSyntheticQualificationEvent } from "../../../server/event-search";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q : "";
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  let events: Awaited<ReturnType<typeof runtime.service.listEvents>> = [];
  let clients: Awaited<ReturnType<typeof runtime.service.listClients>> = [];
  try {
    events = organisation ? runtime.service.listEvents(actor, organisation.id) : [];
  } catch {
    events = [];
  }
  try {
    clients = organisation ? runtime.service.listClients(actor, organisation.id) : [];
  } catch {
    clients = [];
  }
  const canCreate = organisation ? eventPermissions(person, organisation.id).create : false;
  const visible = filterEventsByQuery(events, query);

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Event book · ${organisation?.displayName ?? "Organisation"}`}
        title="Events"
        lede="Permitted events only. Search filters the events you may already open — it never expands access."
      />
      {canCreate ? (
        <p className="actions">
          <Link className="button" href="/app/events/new">
            Create event
          </Link>
        </p>
      ) : null}
      <form className="event-search-form" method="get" action="/app/events" role="search" data-testid="event-search-form">
        <label htmlFor="event-search-q">
          Search events
          <input
            id="event-search-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Name, code, or event ID"
            autoComplete="off"
            data-testid="event-search-input"
          />
        </label>
        <button className="button" type="submit" data-testid="event-search-submit">
          Search
        </button>
        {query ? (
          <Link className="button secondary" href="/app/events" data-testid="event-search-clear">
            Clear
          </Link>
        ) : null}
      </form>
      {visible.length === 0 ? (
        <p className="empty" data-testid="event-search-empty">
          {events.length === 0 ? "No permitted events." : "No permitted events match this search."}
        </p>
      ) : (
        <section className="atelier-folio" aria-label="Permitted events" data-testid="event-search-results">
          {visible.map((event) => (
            <article
              key={event.id}
              className="event-open-card"
              data-testid={`event-card-${event.code ?? event.id}`}
              data-synthetic-qualification={isSyntheticQualificationEvent(event) ? "true" : "false"}
            >
              <h2>
                <Link className="event-open-target" href={`/app/events/${event.id}`}>
                  {event.name}
                </Link>
              </h2>
              {isSyntheticQualificationEvent(event) ? (
                <p className="md-status" data-tone="brass" data-testid="synthetic-qualification-badge">
                  Synthetic qualification fixture{event.code ? ` · ${event.code}` : ""}
                </p>
              ) : null}
              <p>
                <span className="md-status event-phase-pill" data-tone="brass">
                  {event.phase}
                </span>{" "}
                {event.code ? <code>{event.code}</code> : null}{" "}
                {clients.find((item) => item.id === event.clientId)?.displayName ?? "Client not provided"} · {event.timezone}
              </p>
              <p className="actions">
                <Link className="button" href={`/app/events/${event.id}`}>
                  Open event
                </Link>
              </p>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
