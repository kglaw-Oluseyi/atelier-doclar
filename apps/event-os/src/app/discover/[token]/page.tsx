import { GuestFrame } from "../../../components/guest-frame";
import { ClientSessionNav } from "../../../components/client-session-nav";
import { PlatformError } from "@maison-doclar/shared-platform";
import { IdempotencyField, PendingSubmit } from "../../../components/atelier-pending-submit";
import { recordClientBriefDecisionAction, recordClientInterviewTurnAction } from "../../../server/actions";
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
  const next = projection.nextQuestion;
  return (
    <GuestFrame host="Maison Doclar" eventName={projection.engagementReference}>
      <ClientSessionNav token={token} current="conversation" />
      <p className="lede">
        This is a Maison Doclar consultation, not a form. We keep your words distinct from any interpretation we propose. You may pause, say unknown, not yet, not applicable, or prefer not to answer.
      </p>
      {query.ok === "1" ? <p>Your answer was saved. You can continue or stop here.</p> : null}
      {query.error === "1" ? <p>That answer could not be recorded. Nothing else changed.</p> : null}
      {projection.turns?.length ? (
        <p data-testid="interview-progress">
          Saved progress: {projection.turns.length} answered turn{projection.turns.length === 1 ? "" : "s"}. We will not re-ask settled information unless it is conflicted or stale.
        </p>
      ) : (
        <p data-testid="interview-progress">No answers are saved yet. Your progress will appear here after the first reply.</p>
      )}
      {next ? (
        <section className="form programme-form" data-testid="client-interview">
          <h2>Current question</h2>
          <p>{next.question}</p>
          {next.revisit ? <p>We are revisiting this because the earlier answer is conflicted or stale. Your previous words remain.</p> : null}
          {"rationale" in next && next.rationale ? <p className="lede">{String(next.rationale)}</p> : null}
          {projection.permittedActions.includes("INTERVIEW") || projection.permittedActions.includes("CONFIRM") ? (
            <form action={recordClientInterviewTurnAction}>
              <IdempotencyField />
              <input type="hidden" name="token" value={token} />
              <label>
                Your words
                <textarea name="directClientText" maxLength={2000} rows={4} />
              </label>
              <label>
                Form of address
                <input name="formOfAddress" maxLength={80} />
              </label>
              <label>
                Language preference
                <input name="languagePreference" maxLength={32} placeholder="English or Yorùbá" />
              </label>
              <label>
                How should we treat this answer
                <select name="answerSource" defaultValue="CLIENT_DIRECT">
                  <option value="CLIENT_DIRECT">This is my answer</option>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="NOT_YET">Not yet</option>
                  <option value="NOT_APPLICABLE">Not applicable</option>
                  <option value="PREFER_NOT">I prefer not to answer</option>
                  <option value="CORRECTION">This corrects an earlier understanding</option>
                  <option value="PAUSE">Pause and resume later</option>
                </select>
              </label>
              <PendingSubmit>Save and continue</PendingSubmit>
            </form>
          ) : null}
        </section>
      ) : (
        <p>There is no outstanding interview question. You may still review what we understood.</p>
      )}
      {projection.overview ? (
        <section className="form programme-form" data-testid="client-overview">
          <h2>Your event as we understand it</h2>
          {projection.overview.vision ? <p>Your stated vision: {projection.overview.vision}</p> : null}
          <p>Known facts: {projection.overview.knownFacts.join(" · ") || "none yet"}</p>
          <p>Open questions: {projection.overview.openQuestions.join(", ") || "none"}</p>
          <p>{projection.overview.investmentFraming}</p>
          <p>{projection.overview.roadmapExpectation}</p>
        </section>
      ) : null}
      <h2>Review before you confirm</h2>
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
