import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { AudienceForm } from "../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function AudiencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgAudience) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Audiences" lede="Explainable recipient sets">
        <p className="empty">{loaded.denied ?? "Audience management is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const audiences = getRuntime().service.listAudiences(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Audiences"
      lede="Event-scoped, explainable, and frozen only at approval. Seating predicates return unavailable."
      error={(await searchParams).error}
    >
      <AudienceForm eventId={eventId} />
      {audiences.length === 0 ? <p className="empty">No saved audiences.</p> : null}
      <div className="card-list">
        {audiences.map((item) => (
          <article key={item.id}>
            <h2>
              <Link href={`/app/events/${eventId}/communications/audiences/${item.id}`}>{item.name}</Link>
            </h2>
            <p>{item.filters.map((filter) => `${filter.predicate}=${filter.value}`).join(" · ")}</p>
          </article>
        ))}
      </div>
    </CommunicationsFrame>
  );
}
