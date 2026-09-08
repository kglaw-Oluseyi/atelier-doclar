import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { getRuntime } from "../../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../../server/communications-page";

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; messageId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId, messageId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgCampaign) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Message" lede="Delivery record">
        <p className="empty">{loaded.denied ?? "Message detail is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const failures = getRuntime().service.listFailures(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  const message = failures.find((item) => item.id === messageId);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Message"
      lede="Provider references are synthetic. No live sender identity is stored."
      error={(await searchParams).error}
    >
      {!message ? <p className="empty">This message is not in the failure set for this event.</p> : null}
      {message ? (
        <section>
          <p>
            {message.status} · {message.channel} · {message.purpose}
          </p>
          <p>{message.testWatermark ? "Synthetic test watermark present." : "Operational synthetic message."}</p>
        </section>
      ) : null}
    </CommunicationsFrame>
  );
}
