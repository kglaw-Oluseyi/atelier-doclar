import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { CorrectionDecisionForm } from "../../../../../../components/communications-forms";
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
  const corrections = getRuntime().service.listContactCorrections(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
  );
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
          <p>
            {item.channel}: {item.existingValue ?? "none"} → {item.proposedValue}
          </p>
          {item.status === "PROPOSED" ? (
            <CorrectionDecisionForm eventId={eventId} correctionId={item.id} expectedVersion={item.version} />
          ) : null}
        </article>
      ))}
    </CommunicationsFrame>
  );
}
