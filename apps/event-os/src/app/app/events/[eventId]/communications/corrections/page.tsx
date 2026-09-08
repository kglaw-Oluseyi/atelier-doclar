import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { CorrectionReviewCard } from "../../../../../../components/correction-review-card";
import {
  correctionDecisionStatusCopy,
  presentCorrectionReview,
} from "../../../../../../server/correction-review-display";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";
import type { ContactCorrectionReview } from "@maison-doclar/shared-platform";

export default async function CorrectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgCorrection) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Contact corrections" lede="Governed S02 amend only">
        <p className="empty">{loaded.denied ?? "Correction review is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const reviews: ContactCorrectionReview[] = getRuntime().service.listContactCorrectionReviews(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
  );
  const presented = reviews.map((review) => presentCorrectionReview(review));
  const statusCopy = correctionDecisionStatusCopy(query.status);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Contact corrections"
      lede="Inbound inference does not change canonical contact truth. Apply through guest amend is one governed action."
      error={query.error}
    >
      {statusCopy ? (
        <p className="alert" data-tone="ok" role="status">
          {statusCopy}
        </p>
      ) : null}
      {presented.length === 0 ? <p className="empty">No contact correction proposals.</p> : null}
      {presented.map((review) => (
        <CorrectionReviewCard key={review.id} eventId={eventId} review={review} />
      ))}
    </CommunicationsFrame>
  );
}
