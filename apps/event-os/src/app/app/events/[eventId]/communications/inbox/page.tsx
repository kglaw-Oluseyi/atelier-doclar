import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { SyntheticInboundForm } from "../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgView) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Inbox" lede="Two-way concierge">
        <p className="empty">{loaded.denied ?? "Inbox is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const threads = getRuntime().service.listInbox(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Inbox"
      lede="Matched conversations only. Ambiguous inbound stays unmatched until a human decides."
      error={(await searchParams).error}
    >
      {loaded.permissions.msgRespond ? <SyntheticInboundForm eventId={eventId} /> : null}
      {threads.length === 0 ? <p className="empty">No conversations yet.</p> : null}
      <div className="card-list">
        {threads.map((item) => (
          <article key={item.id}>
            <h2>
              <Link href={`/app/events/${eventId}/communications/inbox/${item.id}`}>{item.channel} conversation</Link>
            </h2>
            <p>
              {item.status}
              {item.slaDueAt ? ` · due ${item.slaDueAt}` : " · SLA not configured"}
            </p>
          </article>
        ))}
      </div>
    </CommunicationsFrame>
  );
}
