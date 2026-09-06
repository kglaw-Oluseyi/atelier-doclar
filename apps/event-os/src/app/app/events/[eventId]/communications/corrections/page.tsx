import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { CorrectionDecisionForm } from "../../../../../../components/communications-forms";
import { eventGuestOptions, staffDisplayName } from "../../../../../../server/comms-display";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function CorrectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgCorrection) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Contact corrections" lede="Governed S02 amend only">
        <p className="empty">{loaded.denied ?? "Correction review is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const runtime = getRuntime();
  const corrections = runtime.service.listContactCorrections(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
  );
  const guestOptions = eventGuestOptions(runtime.service, loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  const guestNameById = new Map(guestOptions.map((item) => [item.id, item.displayName]));
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Contact corrections"
      lede="Inbound inference does not change canonical contact truth. Approval applies S02 amend semantics."
      error={(await searchParams).error}
    >
      {corrections.length === 0 ? <p className="empty">No contact correction proposals.</p> : null}
      {corrections.map((item) => (
        <article key={item.id} className="card-list">
          <h2>{item.status}</h2>
          <dl className="meta-list">
            <div>
              <dt>Guest</dt>
              <dd>{guestNameById.get(item.guestId) ?? "Guest unavailable"}</dd>
            </div>
            <div>
              <dt>Channel</dt>
              <dd>{item.channel}</dd>
            </div>
            <div>
              <dt>Existing value</dt>
              <dd>{item.existingValue ?? "none"}</dd>
            </div>
            <div>
              <dt>Proposed value</dt>
              <dd>{item.proposedValue}</dd>
            </div>
            <div>
              <dt>Source evidence</dt>
              <dd>{item.sourceMessageId ? "Linked inbound message" : "No source message linked"}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{item.reason}</dd>
            </div>
            {item.decidedByPersonId ? (
              <div>
                <dt>Reviewed by</dt>
                <dd>{staffDisplayName(runtime.service, item.decidedByPersonId)}</dd>
              </div>
            ) : null}
          </dl>
          {item.status === "PROPOSED" ? (
            <CorrectionDecisionForm eventId={eventId} correctionId={item.id} expectedVersion={item.version} />
          ) : null}
        </article>
      ))}
    </CommunicationsFrame>
  );
}
