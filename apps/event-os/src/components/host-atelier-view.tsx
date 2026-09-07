"use client";

import type { HostAtelierProjection } from "@maison-doclar/shared-platform";
import { submitHostAtelierDecisionAction } from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function HostAtelierView({
  view,
  state,
}: {
  view: HostAtelierProjection;
  state?: string;
}) {
  return (
    <article className="host-atelier-story" data-testid="host-atelier-story">
      <p className="host-atelier-status" data-testid="host-atelier-status">
        {view.statusSentence}
      </p>
      {state === "received" ? (
        <p className="md-status" data-tone="ok" role="status" data-testid="host-decision-receipt">
          Your response was received. Canonical Event OS records are unchanged.
        </p>
      ) : null}
      {state === "conflict" ? (
        <p className="alert" data-tone="danger" role="alert">
          This decision changed while you were responding. Nothing new was recorded. Reload before trying again.
        </p>
      ) : null}
      {state === "step-up" ? (
        <p className="alert" role="status">
          A fresh confirmation is required before this decision can be recorded.
        </p>
      ) : null}
      {view.chapters.map((chapter) => (
        <section key={chapter.type} className="host-atelier-chapter" data-testid={`host-chapter-${chapter.type.toLowerCase()}`}>
          <h2>{chapter.title}</h2>
          {chapter.type === "VISION" ? <div className="host-atelier-media" aria-hidden="true" /> : null}
          <p>{chapter.body}</p>
        </section>
      ))}
      {view.canDecide && view.decisions.length > 0 ? (
        <section className="host-atelier-chapter" data-testid="host-decisions">
          <h2>A reserved decision</h2>
          {view.decisions.map((decision) => (
            <form key={decision.id} action={submitHostAtelierDecisionAction} className="host-atelier-form">
              <input type="hidden" name="requestId" value={decision.id} />
              <input type="hidden" name="expectedVersion" value={decision.expectedVersion} />
              <IdempotencyField />
              <p>
                <strong>{decision.title}.</strong> {decision.question}
              </p>
              <p>{decision.consequence}</p>
              {decision.options.map((option) => (
                <label key={option} className="host-atelier-option">
                  <input type="radio" name="choice" value={option} required />
                  {option}
                </label>
              ))}
              <PendingSubmit>{decision.requiresStepUp ? "Confirm with care" : "Record this choice"}</PendingSubmit>
            </form>
          ))}
        </section>
      ) : null}
      {view.receipts.map((receipt) => (
        <section key={receipt.id} className="host-atelier-receipt" data-testid="host-receipt">
          <h2>Receipt</h2>
          <p>
            You chose {receipt.submittedChoice} for {receipt.requestTitle}.
          </p>
          <p data-testid="host-receipt-canonical">Canonical data changed: no.</p>
          <p>Review: {receipt.reviewStatus}.</p>
          <p>Next: {receipt.nextOwner}</p>
          <p>{receipt.finalOutcome}</p>
        </section>
      ))}
    </article>
  );
}
