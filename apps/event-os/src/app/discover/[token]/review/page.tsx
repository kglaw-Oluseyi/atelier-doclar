import { GuestFrame } from "../../../../components/guest-frame";
import { ClientSessionNav } from "../../../../components/client-session-nav";
import { PlatformError } from "@maison-doclar/shared-platform";
import { IdempotencyField, PendingSubmit } from "../../../../components/atelier-pending-submit";
import { recordClientReviewAction } from "../../../../server/actions";
import { getRuntime, ensureRuntime } from "../../../../server/runtime";

export default async function ClientReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  await ensureRuntime();
  let projection;
  try {
    projection = getRuntime().service.getClientDiscoveryProjection(token);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "This review link is not available.";
    return (
      <GuestFrame host="Maison Doclar" eventName="Client review">
        <p>{message}</p>
      </GuestFrame>
    );
  }
  const review = projection.review;
  return (
    <GuestFrame host="Maison Doclar" eventName={projection.clientSafeHeading ?? "Your Maison Doclar consultation"}>
      <ClientSessionNav token={token} current="review" />
      <p className="lede">Your event as we understand it. Confirming this edition does not approve the internal brief and does not create a staff role.</p>
      {query.ok === "1" ? <p data-testid="client-review-receipt">Your review was recorded.</p> : null}
      {query.error === "1" ? <p>That review could not be recorded. Nothing else changed.</p> : null}
      {!review ? (
        <p className="empty" data-testid="client-review">No review edition has been issued yet.</p>
      ) : (
        <section className="form programme-form" data-testid="client-review">
          <h2>Review edition</h2>
          <p>Status: {review.status.replaceAll("_", " ").toLowerCase()}</p>
          {review.stale ? <p>This confirmation is stale because later client-visible substance changed.</p> : null}
          <p>Open questions: {review.openQuestions.join(", ") || "none"}</p>
          <p>Conflicts needing clarification: {review.conflicts.join(", ") || "none"}</p>
          <p>{review.investmentFraming}</p>
          <p>{review.roadmapSummary}</p>
          <ul className="atelier-queue" data-testid="client-review-items">
            {projection.assertions.map((assertion) => (
              <li key={assertion.id} className="discovery-card">
                <p>
                  <strong>{assertion.topicKey.replaceAll(".", " ")}</strong> · {assertion.origin}
                </p>
                <p>{assertion.narrative}</p>
                <form action={recordClientReviewAction}>
                  <IdempotencyField />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="expectedHash" value={review.contentHash} />
                  <input type="hidden" name="itemKey" value={assertion.id} />
                  <label>
                    This item
                    <select name="kind" defaultValue="CONFIRM_ITEM">
                      <option value="CONFIRM_ITEM">This is correct</option>
                      <option value="CORRECT">Correct this</option>
                      <option value="DISPUTE">This conflicts with what I said</option>
                      <option value="DEFER">Defer</option>
                      <option value="PREFER_NOT">Prefer not to answer</option>
                      <option value="CLARIFY">Add a clarification</option>
                    </select>
                  </label>
                  <label>
                    Note
                    <input name="narrative" maxLength={400} />
                  </label>
                  <PendingSubmit>Save this item</PendingSubmit>
                </form>
              </li>
            ))}
          </ul>
          {projection.permittedActions.includes("REVIEW") || projection.permittedActions.includes("CONFIRM") ? (
            <form action={recordClientReviewAction}>
              <IdempotencyField />
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="expectedHash" value={review.contentHash} />
              <input type="hidden" name="kind" value="CONFIRM_EDITION" />
              <PendingSubmit>Confirm this complete review</PendingSubmit>
            </form>
          ) : null}
        </section>
      )}
    </GuestFrame>
  );
}
