import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function CommunicationsAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgAnalytics) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Attention" lede="Notifications and intelligence">
        <p className="empty">{loaded.denied ?? "Attention surface is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const runtime = getRuntime();
  const notifications = runtime.service.listCommsNotifications(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
  );
  const alerts = runtime.service.listCommsIntelligence(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Attention"
      lede="Explainable attention only. Intelligence cannot send, approve, or invent RSVP-amendment alerts."
      error={(await searchParams).error}
    >
      <section>
        <h2>Notifications</h2>
        {notifications.length === 0 ? <p className="empty">No operational notifications.</p> : null}
        {notifications.map((item) => (
          <article key={item.id}>
            <p>
              {item.kind}: {item.title}
            </p>
            <p className="lede">{item.body}</p>
          </article>
        ))}
      </section>
      <section>
        <h2>Intelligence</h2>
        {alerts.length === 0 ? <p className="empty">No open intelligence alerts.</p> : null}
        {alerts.map((item) => (
          <article key={item.id}>
            <p>
              {item.ruleId} v{item.ruleVersion} · {item.severity}
            </p>
            <p>{item.summary}</p>
            <p className="lede">
              {item.evidence}. {item.recommendedAction}
            </p>
          </article>
        ))}
      </section>
    </CommunicationsFrame>
  );
}
