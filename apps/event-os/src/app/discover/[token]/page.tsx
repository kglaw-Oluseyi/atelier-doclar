import { GuestFrame } from "../../../components/guest-frame";
import { PlatformError } from "@maison-doclar/shared-platform";
import { IdempotencyField, PendingSubmit } from "../../../components/atelier-pending-submit";
import { recordClientBriefDecisionAction } from "../../../server/actions";
import { getRuntime, ensureRuntime } from "../../../server/runtime";

export default async function DiscoveryClientPage({
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
  return (
    <GuestFrame host="Maison Doclar" eventName={projection.engagementReference}>
      <p className="lede">
        Confirm what we already captured. We will not ask again unless something is conflicted, stale, or you asked to revisit it.
      </p>
      {query.ok === "1" ? <p>Your decision was recorded.</p> : null}
      {query.error === "1" ? <p>That decision could not be recorded. Nothing else changed.</p> : null}
      {projection.nextQuestion ? <p>If we continue the conversation: {projection.nextQuestion.question}</p> : null}
      {projection.assertions.length === 0 ? (
        <p className="empty">There is nothing to confirm yet.</p>
      ) : (
        <ul className="atelier-queue" data-testid="client-brief-list">
          {projection.assertions.map((assertion) => (
            <li key={assertion.id} className="discovery-card">
              <p>
                <strong>{assertion.topicKey.replaceAll(".", " ")}</strong> · {assertion.origin}
              </p>
              <p>{assertion.narrative}</p>
              {projection.permittedActions.includes("CONFIRM") ? (
                <form action={recordClientBriefDecisionAction}>
                  <IdempotencyField />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="assertionId" value={assertion.id} />
                  <input type="hidden" name="participantLabel" value="Client" />
                  <label>
                    Decision
                    <select name="decision" defaultValue="CONFIRM">
                      <option value="CONFIRM">This is correct</option>
                      <option value="CORRECT">This needs a correction</option>
                      <option value="DISPUTE">This conflicts with what I said</option>
                      <option value="DEFER">Not yet</option>
                      <option value="PREFER_NOT">I prefer not to answer</option>
                    </select>
                  </label>
                  <label>
                    Correction or note
                    <input name="narrative" maxLength={400} />
                  </label>
                  <PendingSubmit>Save my answer</PendingSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </GuestFrame>
  );
}
