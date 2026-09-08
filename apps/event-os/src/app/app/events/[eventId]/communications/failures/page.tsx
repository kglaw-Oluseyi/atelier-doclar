import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function FailuresPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgCampaign) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Failures" lede="Dead letter and failed delivery">
        <p className="empty">{loaded.denied ?? "Failure review is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const failures = getRuntime().service.listFailures(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Failures"
      lede="Permanent synthetic failures stay in dead letter until a human decides."
      error={(await searchParams).error}
    >
      {failures.length === 0 ? <p className="empty">No failed or dead-lettered messages.</p> : null}
      <div className="card-list">
        {failures.map((item) => (
          <article key={item.id}>
            <h2>
              <Link href={`/app/events/${eventId}/communications/messages/${item.id}`}>{item.status}</Link>
            </h2>
            <p>
              {item.channel} · {item.purpose}
              {item.blockedReason ? ` · ${item.blockedReason}` : ""}
            </p>
          </article>
        ))}
      </div>
    </CommunicationsFrame>
  );
}
