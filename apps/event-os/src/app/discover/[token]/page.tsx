import { GuestFrame } from "../../../components/guest-frame";
import { ClientSessionNav } from "../../../components/client-session-nav";
import { PlatformError } from "@maison-doclar/shared-platform";
import { IdempotencyField, PendingSubmit } from "../../../components/atelier-pending-submit";
import {
  extractClientDiscoveryAssertionsAction,
  recordClientBriefDecisionAction,
  recordClientDiscoveryConsentAction,
  recordClientInterviewTurnAction,
} from "../../../server/actions";
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
    <GuestFrame host="Maison Doclar" eventName={projection.clientSafeHeading ?? "Your Maison Doclar consultation"}>
      <ClientSessionNav token={token} current="conversation" />
      <p className="lede">
        This is a Maison Doclar consultation, not a form. A human planner may continue the conversation; a deterministic fixture is used for extraction when you permit AI analysis. Declining optional processing will not end the relationship. You may pause or ask for a human at any time.
      </p>
      <details>
        <summary>Internal reference</summary>
        <p>{projection.engagementReference}</p>
      </details>
      {query.ok === "1" || query.ok === "extract" ? (
        <p data-testid="client-consent-receipt">Your choice was saved. You can continue or stop here.</p>
      ) : null}
      {query.error === "1" ? <p>That answer could not be recorded. Nothing else changed.</p> : null}
      {query.error === "ai-consent" ? (
        <p data-testid="client-ai-blocked">AI analysis is blocked until you grant that specific consent.</p>
      ) : null}
      <ClientConsentPanel token={token} consents={projection.consents ?? []} query={query} />
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
      ) : projection.interviewBlockedReason === "PARTICIPATION_CONSENT_REQUIRED" ? (
        <p data-testid="client-interview-blocked">The conversation continues after you decide participation. Declining optional processing will not end the relationship.</p>
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

const CLIENT_CONSENT_COPY = [
  {
    dimension: "PARTICIPATION",
    label: "Participation",
    required: true,
    why: "So we know you are willing to continue this planning conversation.",
  },
  {
    dimension: "AUDIO_RECORDING",
    label: "Audio recording",
    required: false,
    why: "Only if a recording is made. You can participate without it.",
  },
  {
    dimension: "TRANSCRIPTION",
    label: "Transcription",
    required: false,
    why: "Lets us keep a written record of what was said.",
  },
  {
    dimension: "AI_ANALYSIS",
    label: "AI analysis",
    required: false,
    why: "Lets a deterministic fixture propose facts from your words. It never becomes governing truth on its own.",
  },
  {
    dimension: "SOURCE_RETENTION",
    label: "Source retention",
    required: false,
    why: "Keeps the source notes for this engagement according to the recorded policy.",
  },
  {
    dimension: "DEIDENTIFIED_BENCHMARKING",
    label: "De-identified learning",
    required: false,
    why: "Optional use of de-identified data for later benchmark intelligence. Independent of planning this event.",
  },
] as const;

function ClientConsentPanel({
  token,
  consents,
  query,
}: {
  token: string;
  consents: Array<{ dimension: string; decision: string }>;
  query: Record<string, string | string[] | undefined>;
}) {
  const savedDimension = typeof query.consent === "string" ? query.consent : undefined;
  return (
    <section id="client-consent" className="form programme-form" data-testid="client-consent">
      <h2>Your consent choices</h2>
      <p className="lede">
        Each choice is saved on its own. Required versus optional is marked. Select all optional is not preselected and still
        leaves every dimension editable.
      </p>
      <ul className="atelier-queue" data-testid="client-consent-list">
        {CLIENT_CONSENT_COPY.map((item) => {
          const current = consents.find((row) => row.dimension === item.dimension);
          const decision = current?.decision ?? "UNDECIDED";
          return (
            <li key={item.dimension} className="discovery-card" data-testid={`client-consent-${item.dimension}`}>
              <p>
                <strong>{item.label}</strong>{" "}
                <span className="md-status">{item.required ? "Required to continue" : "Optional"}</span>{" "}
                <span className="md-status" data-tone={decision === "GRANTED" ? "ok" : decision === "DECLINED" || decision === "WITHDRAWN" ? "warn" : undefined}>
                  {decision === "UNDECIDED" ? "Not yet decided" : decision.toLowerCase()}
                </span>
              </p>
              <p className="lede">Why we ask: {item.why}</p>
              {savedDimension === item.dimension ? <p data-testid="client-consent-dimension-receipt">Saved for {item.label}.</p> : null}
              <form action={recordClientDiscoveryConsentAction}>
                <IdempotencyField />
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="dimension" value={item.dimension} />
                <label>
                  Decision
                  <select name="decision" defaultValue={decision === "GRANTED" ? "WITHDRAWN" : "GRANTED"}>
                    <option value="GRANTED">Grant</option>
                    <option value="DECLINED">Decline</option>
                    <option value="WITHDRAWN">Withdraw</option>
                    {!item.required ? <option value="NOT_APPLICABLE">Not applicable</option> : null}
                  </select>
                </label>
                <PendingSubmit className="secondary">Save {item.label.toLowerCase()}</PendingSubmit>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={extractClientDiscoveryAssertionsAction} data-testid="client-ai-extract">
        <IdempotencyField />
        <input type="hidden" name="token" value={token} />
        <PendingSubmit className="secondary">Ask Maison to extract proposals</PendingSubmit>
      </form>
    </section>
  );
}
