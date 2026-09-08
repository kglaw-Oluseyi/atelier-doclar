import Link from "next/link";
import { AppShell } from "../../components/shell";
import { guardedActor } from "../../server/guard";
import { getRuntime } from "../../server/runtime";

export default async function HomeAppPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  const organisation = organisations[0];
  const events = organisation ? runtime.service.listEvents(actor, organisation.id) : [];
  const clients = organisation ? runtime.service.listClients(actor, organisation.id) : [];
  const briefs = events.map((event) => {
    let guestCount = 0;
    let attention = 0;
    try {
      const guests = runtime.service.listGuests(actor, {
        organisationId: organisation?.id ?? event.organisationId,
        eventId: event.id,
      });
      guestCount = guests.length;
      attention = guests.filter((item) => item.attentionRequired).length;
    } catch {
      guestCount = 0;
      attention = 0;
    }
    return {
      event,
      client: clients.find((item) => item.id === event.clientId)?.displayName ?? "Client not provided",
      guestCount,
      attention,
    };
  });
  const featured = briefs[0];
  const attentionTotal = briefs.reduce((sum, item) => sum + item.attention, 0);

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app">
      <div className="atelier-brief at-scope">
        <header className="atelier-masthead">
          <p className="eyebrow">Command Atelier · {organisation?.displayName ?? "Organisation not provided"}</p>
          <span className="at-thread" aria-hidden="true" />
          <h1>Home</h1>
          <p className="lede">Assigned work only. Open an event to use the operational guest directory.</p>
        </header>
        {featured ? (
          <div className="atelier-brief-grid">
            <article className="atelier-featured">
              <p className="eyebrow">Current brief</p>
              <h2>
                <Link href={`/app/events/${featured.event.id}`}>{featured.event.name}</Link>
              </h2>
              <p>
                <span className="at-seal md-status" data-tone="brass">
                  {featured.event.phase}
                </span>{" "}
                {featured.client} · {featured.guestCount} operational records
              </p>
              <p className="actions">
                <Link className="button" href={`/app/events/${featured.event.id}/guests`}>
                  Open guest directory
                </Link>
                <Link className="button secondary" href={`/app/events/${featured.event.id}`}>
                  Event overview
                </Link>
                <Link className="button secondary" href="/app/academy/ACA-S04A">
                  ACA-S04A training
                </Link>
                <Link className="button secondary" href="/app/academy/ACA-S04D">
                  ACA-S04D training
                </Link>
                <Link className="button secondary" href="/app/academy/ACA-S04E">
                  ACA-S04E training
                </Link>
                <Link className="button secondary" href="/app/academy/ACA-S04F">
                  ACA-S04F training
                </Link>
              </p>
            </article>
            <div className="atelier-side-stack">
              <aside className="atelier-attention" aria-label="Attention required">
                <p className="eyebrow">Attention</p>
                {attentionTotal === 0 ? (
                  <p className="empty">No attention flags are recorded on assigned events.</p>
                ) : (
                  <ul className="atelier-queue">
                    {briefs
                      .filter((item) => item.attention > 0)
                      .map((item) => (
                        <li key={item.event.id}>
                          <Link href={`/app/events/${item.event.id}/guests?attention=1`}>
                            {item.event.name}: {item.attention} need attention
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
              </aside>
              <aside className="atelier-count" aria-label="Assigned events">
                <p className="eyebrow">Assigned events</p>
                <p className="atelier-numeral">{events.length}</p>
              </aside>
            </div>
          </div>
        ) : (
          <p className="empty">No assigned events yet. Create a client or event if you are authorised.</p>
        )}
        {briefs.length > 1 ? (
          <section className="atelier-folio" aria-label="Further assigned events">
            {briefs.slice(1).map((item) => (
              <article key={item.event.id}>
                <h3>
                  <Link href={`/app/events/${item.event.id}`}>{item.event.name}</Link>
                </h3>
                <p>
                  <span className="at-seal md-status" data-tone="brass">
                    {item.event.phase}
                  </span>{" "}
                  {item.client}
                </p>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
