import type { CorrectionReviewPresentation } from "../server/correction-review-display";
import { CorrectionDecisionForm } from "./communications-forms";

function SourceEvidence({ evidence }: { evidence: CorrectionReviewPresentation["evidence"] }) {
  switch (evidence.state) {
    case "AVAILABLE":
      return (
        <dd>
          <a href={evidence.href}>{evidence.linkLabel}</a>
        </dd>
      );
    case "NOT_LINKED":
    case "UNAVAILABLE":
    case "REDACTED":
      return <dd>{evidence.message}</dd>;
    default: {
      const _exhaustive: never = evidence;
      return _exhaustive;
    }
  }
}

function ProposalProvenance({ maker }: { maker: CorrectionReviewPresentation["maker"] }) {
  switch (maker.state) {
    case "AVAILABLE":
      return (
        <>
          <div>
            <dt>Proposed by</dt>
            <dd className="correction-value">{maker.displayName}</dd>
          </div>
          <div>
            <dt>Role at proposal</dt>
            <dd>{maker.roleLabel}</dd>
          </div>
          <div>
            <dt>Proposed</dt>
            <dd>{maker.proposedAtLabel}</dd>
          </div>
          <div>
            <dt>Review rule</dt>
            <dd>{maker.explanation}</dd>
          </div>
        </>
      );
    case "UNAVAILABLE":
      return (
        <div>
          <dt>Proposed by</dt>
          <dd>{maker.message}</dd>
        </div>
      );
    default: {
      const _exhaustive: never = maker;
      return _exhaustive;
    }
  }
}

export function CorrectionReviewCard({
  eventId,
  review,
}: {
  eventId: string;
  review: CorrectionReviewPresentation;
}) {
  return (
    <article className="card-list correction-review">
      <header>
        <h2>
          {review.statusLabel} · {review.guestDisplayName}
        </h2>
      </header>

      <section>
        <h3>Proposed change</h3>
        <dl className="meta-list">
          <div>
            <dt>Channel</dt>
            <dd>{review.channelLabel}</dd>
          </div>
          <div>
            <dt>Current verified value</dt>
            <dd>
              <span className="correction-value correction-value-current">{review.existingValue}</span>
            </dd>
          </div>
          <div>
            <dt>Proposed replacement</dt>
            <dd>
              <span className="correction-value correction-value-proposed">{review.proposedValue}</span>
            </dd>
          </div>
          <div>
            <dt>Proposal reason</dt>
            <dd className="correction-value">{review.reason}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>Proposal provenance</h3>
        <dl className="meta-list">
          <ProposalProvenance maker={review.maker} />
        </dl>
      </section>

      <section>
        <h3>Source evidence</h3>
        <dl className="meta-list">
          <div>
            <dt>Linked source</dt>
            <SourceEvidence evidence={review.evidence} />
          </div>
        </dl>
      </section>

      <section>
        <h3>Governed decision</h3>
        {review.decision.state === "RECORDED" ? (
          <dl className="meta-list">
            <div>
              <dt>Reviewed by</dt>
              <dd className="correction-value">{review.decision.displayName}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{review.decision.decidedAtLabel}</dd>
            </div>
          </dl>
        ) : null}
        {review.decidable ? (
          <CorrectionDecisionForm eventId={eventId} correctionId={review.id} expectedVersion={review.expectedVersion} />
        ) : (
          <p className="correction-decision-note">
            {review.maker.state === "UNAVAILABLE"
              ? review.maker.message
              : (review.decisionClosedCopy ?? "This correction cannot be decided from this page.")}
          </p>
        )}
      </section>
    </article>
  );
}
