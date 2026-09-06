import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { ProposeCorrectionForm } from "../../../../../../components/propose-correction-form";
import { UnmatchedResolutionForm } from "../../../../../../components/unmatched-resolution-form";
import { eventGuestOptions } from "../../../../../../server/comms-display";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function UnmatchedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgView) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Unmatched inbound" lede="Human resolution only">
        <p className="empty">{loaded.denied ?? "Unmatched inbox is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const runtime = getRuntime();
  const unmatched = runtime.service.listUnmatchedInbound(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  const guestOptions = loaded.permissions.view
    ? eventGuestOptions(runtime.service, loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id)
    : [];
  const query = await searchParams;
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Unmatched inbound"
      lede="Ambiguous messages stay unmatched. They are not silently attached to a guest."
      error={query.error}
    >
      {query.status === "correction-proposed" ? (
        <p className="alert" data-tone="ok" role="status">
          Contact correction proposal recorded for review.
        </p>
      ) : null}
      {unmatched.length === 0 ? <p className="empty">No unmatched inbound messages.</p> : null}
      {unmatched.map((item) => (
        <article key={item.id} className="card-list">
          <p>
            {item.matchStatus} · {item.channel} · sender held
          </p>
          <p>{item.body}</p>
          {loaded.permissions.msgUnmatched ? (
            <UnmatchedResolutionForm
              eventId={eventId}
              inboundId={item.id}
              expectedVersion={item.version}
              guests={guestOptions}
            />
          ) : null}
          {loaded.permissions.msgRespond ? (
            <ProposeCorrectionForm
              eventId={eventId}
              inboundId={item.id}
              sourceMessageId={item.id}
              guests={guestOptions}
              defaultChannel={item.channel}
            />
          ) : null}
        </article>
      ))}
    </CommunicationsFrame>
  );
}
