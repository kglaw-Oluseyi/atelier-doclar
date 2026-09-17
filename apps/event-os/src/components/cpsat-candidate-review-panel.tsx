"use client";

import { useMemo, useState } from "react";
import type { CpsatCandidateReviewModel } from "@maison-doclar/shared-platform/cpsat-client";

type FilterState = {
  query: string;
  tableToken: string;
  movement: string;
  warningsOnly: boolean;
  reasonCategory: string;
  changedOnly: boolean;
};

const EMPTY_FILTERS: FilterState = {
  query: "",
  tableToken: "",
  movement: "",
  warningsOnly: false,
  reasonCategory: "",
  changedOnly: false,
};

export function CpsatCandidateReviewPanel({
  review,
  runHref,
  showMutationControls,
}: {
  review: CpsatCandidateReviewModel;
  runHref: string;
  /** When false (e.g. Read-Only Auditor), mutation forms must not render. */
  showMutationControls: boolean;
}) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return review.placements.filter((p) => {
      if (filters.changedOnly && (p.movement === "RETAINED" || p.movement === "UNSEATED")) return false;
      if (filters.tableToken && p.tableToken !== filters.tableToken) return false;
      if (filters.movement && p.movement !== filters.movement) return false;
      if (filters.warningsOnly && !p.warning) return false;
      if (filters.reasonCategory && p.reasonCode !== filters.reasonCategory) return false;
      if (q) {
        const hay = `${p.displayName ?? ""} ${p.guestToken}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filters, review.placements]);

  const stale = review.freshness === "STALE";
  const adopted = review.lifecycle === "ADOPTED";

  return (
    <article
      className="cpsat-candidate-review atelier-panel"
      data-testid="cpsat-candidate-review"
      aria-labelledby="cpsat-review-heading"
    >
      <header className="cpsat-review-header">
        <h3 id="cpsat-review-heading">
          {adopted
            ? "Seating plan adopted"
            : review.lifecycle === "REJECTED"
              ? "Seating plan rejected"
              : review.lifecycle === "PENDING_APPROVAL"
                ? "Seating plan awaiting approval"
                : review.lifecycle === "APPROVED"
                  ? "Seating plan approved"
                  : "Seating plan ready for review"}
        </h3>
        <p role="status" aria-live="polite" data-testid="cpsat-review-lifecycle-announce">
          Lifecycle {review.lifecycle}. Result {review.resultStatus ?? "—"}. Freshness {review.freshness}. Evidence{" "}
          {review.evidenceGrade ?? "—"}.
        </p>
        <dl className="cpsat-review-meta" data-testid="cpsat-review-decision-header">
          <div>
            <dt>Result status</dt>
            <dd data-testid="cpsat-review-result">{review.resultStatus ?? "—"}</dd>
          </div>
          <div>
            <dt>Freshness</dt>
            <dd data-testid="cpsat-review-freshness">{review.freshness}</dd>
          </div>
          <div>
            <dt>Evidence grade</dt>
            <dd data-testid="cpsat-review-evidence">{review.evidenceGrade ?? "—"}</dd>
          </div>
          <div>
            <dt>Sealed assignment hash</dt>
            <dd data-testid="cpsat-review-assignment-hash">
              <code>{review.assignmentHash}</code>
            </dd>
          </div>
          <div>
            <dt>Engine / model</dt>
            <dd data-testid="cpsat-review-engine">
              {review.engineIdentity} · {review.modelVersion}
            </dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="cpsat-review-outcome-heading" data-testid="cpsat-review-outcome">
        <h4 id="cpsat-review-outcome-heading">Outcome summary</h4>
        <ul>
          <li>
            Guests seated: {review.seatedGuestCount} of {review.eligibleGuestCount}
          </li>
          <li>Unseated guests: {review.unseatedGuestCount}</li>
          <li>HARD-rule verification: {review.hardRuleVerification}</li>
          <li>
            Movement:{" "}
            {review.movementTier.required
              ? `${review.movementTier.value ?? "—"} (${review.movementTier.proofStatus})`
              : "Not applicable"}
          </li>
          <li>
            Preference:{" "}
            {review.preferenceTier.required
              ? `${review.preferenceTier.value ?? "—"} (${review.preferenceTier.proofStatus})`
              : "Not applicable"}
          </li>
          <li>Completed: {review.completedAt ?? review.sealedAt ?? "—"}</li>
        </ul>
      </section>

      {showMutationControls ? (
        <section
          aria-labelledby="cpsat-why-not-heading"
          data-testid="cpsat-counterfactual-panel"
          className="cpsat-diag-panel"
        >
          <h4 id="cpsat-why-not-heading">Why not this table?</h4>
          <p style={{ marginTop: 0 }}>
            Ask why a guest was not placed at a selected table. The answer is diagnostic only — it never changes this
            sealed candidate or governed rules.
          </p>
          <p data-testid="cpsat-counterfactual-states" style={{ fontSize: "0.9rem" }}>
            Possible outcomes: prohibited by a visible mandatory rule; prohibited by a restricted mandatory rule;
            would make complete seating impossible; feasible with tier deltas; search incomplete; candidate stale.
          </p>
        </section>
      ) : (
        <p data-testid="cpsat-counterfactual-auditor-blocked" style={{ fontSize: "0.9rem" }}>
          Counterfactual diagnostics are not available for read-only auditor roles.
        </p>
      )}

      <section aria-labelledby="cpsat-review-tables-heading" data-testid="cpsat-review-tables">
        <h4 id="cpsat-review-tables-heading">Table review</h4>
        <div className="cpsat-scroll-table" tabIndex={0} role="region" aria-label="Tables">
          <table>
            <thead>
              <tr>
                <th scope="col">Table</th>
                <th scope="col">Capacity</th>
                <th scope="col">Occupied</th>
                <th scope="col">Available</th>
                <th scope="col">Flags</th>
              </tr>
            </thead>
            <tbody>
              {review.tables.map((t) => (
                <tr key={t.tableToken}>
                  <td>
                    <code>{t.tableToken.slice(0, 12)}</code>
                  </td>
                  <td>{t.capacity}</td>
                  <td>{t.occupied}</td>
                  <td>{t.available}</td>
                  <td>
                    {t.reserved ? "Reserved " : ""}
                    {t.locked ? "Locked" : ""}
                    {!t.reserved && !t.locked ? "—" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cpsat-review-placements-heading" data-testid="cpsat-review-placements">
        <h4 id="cpsat-review-placements-heading">Guest placement review</h4>
        <div className="cpsat-review-filters" role="search">
          <label>
            Search guest
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              data-testid="cpsat-review-search"
              aria-label="Search by guest display name or identifier"
            />
          </label>
          <label>
            Table
            <select
              value={filters.tableToken}
              onChange={(e) => setFilters((f) => ({ ...f, tableToken: e.target.value }))}
              data-testid="cpsat-review-filter-table"
            >
              <option value="">All tables</option>
              {review.tables.map((t) => (
                <option key={t.tableToken} value={t.tableToken}>
                  {t.tableToken.slice(0, 12)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Movement
            <select
              value={filters.movement}
              onChange={(e) => setFilters((f) => ({ ...f, movement: e.target.value }))}
              data-testid="cpsat-review-filter-movement"
            >
              <option value="">All</option>
              <option value="MOVED">Moved</option>
              <option value="RETAINED">Retained</option>
              <option value="NEW">New</option>
              <option value="RELEASED">Released</option>
            </select>
          </label>
          <label>
            Reason category
            <select
              value={filters.reasonCategory}
              onChange={(e) => setFilters((f) => ({ ...f, reasonCategory: e.target.value }))}
              data-testid="cpsat-review-filter-reason"
            >
              <option value="">All reasons</option>
              {[...new Set(review.placements.map((p) => p.reasonCode))].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.warningsOnly}
              onChange={(e) => setFilters((f) => ({ ...f, warningsOnly: e.target.checked }))}
              data-testid="cpsat-review-filter-warnings"
            />{" "}
            Warnings / exceptions
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.changedOnly}
              onChange={(e) => setFilters((f) => ({ ...f, changedOnly: e.target.checked }))}
              data-testid="cpsat-review-filter-changed"
            />{" "}
            Show changed placements only
          </label>
          <button
            type="button"
            className="button secondary cpsat-interactive"
            onClick={() => setFilters(EMPTY_FILTERS)}
            data-testid="cpsat-review-clear-filters"
          >
            Clear all filters
          </button>
          <p data-testid="cpsat-review-result-count" aria-live="polite">
            Showing {filtered.length} of {review.placements.length} placements
          </p>
        </div>
        <div className="cpsat-scroll-table" tabIndex={0} role="region" aria-label="Guest placements">
          <table data-testid="cpsat-review-placement-table">
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Table</th>
                <th scope="col">Seat</th>
                <th scope="col">Reason</th>
                <th scope="col">Movement</th>
                <th scope="col">Warning</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.guestToken} data-testid="cpsat-review-placement-row">
                  <td>{p.displayName ?? p.guestToken.slice(0, 12)}</td>
                  <td>{p.tableToken ? p.tableToken.slice(0, 12) : "—"}</td>
                  <td>{p.seatToken ? p.seatToken.slice(0, 12) : "—"}</td>
                  <td>{p.reasonText}</td>
                  <td>{p.movement}</td>
                  <td>{p.warning ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="cpsat-review-changes-heading" data-testid="cpsat-review-changes">
        <h4 id="cpsat-review-changes-heading">Change comparison</h4>
        <ul>
          <li>Retained: {review.changeComparison.retained}</li>
          <li>Moved: {review.changeComparison.moved}</li>
          <li>Newly seated: {review.changeComparison.newlySeated}</li>
          <li>Released: {review.changeComparison.released}</li>
        </ul>
        <p>No placement is claimed as “best” unless independently proven optimal.</p>
      </section>

      <section aria-labelledby="cpsat-review-rules-heading" data-testid="cpsat-review-rules">
        <h4 id="cpsat-review-rules-heading">Rule assurance</h4>
        <p>
          HARD rules satisfied: {review.ruleAssurance.hardRulesSatisfied ? "Yes" : "No"} ({review.hardRuleVerification})
        </p>
        <ul>
          {review.ruleAssurance.categories.map((c) => (
            <li key={c.category}>
              {c.category}: {c.status}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cpsat-review-history-heading" data-testid="cpsat-review-history">
        <h4 id="cpsat-review-history-heading">Approval history</h4>
        {review.approvalHistory.submission ? (
          <p data-testid="cpsat-review-submission">
            Submitted by {review.approvalHistory.submission.makerActor.slice(0, 8)}… at{" "}
            {review.approvalHistory.submission.at}
          </p>
        ) : (
          <p>Not yet submitted.</p>
        )}
        {review.approvalHistory.decision ? (
          <p data-testid="cpsat-review-decision" role={review.approvalHistory.decision.decision === "REJECTED" ? "alert" : "status"}>
            Checker {review.approvalHistory.decision.decision.toLowerCase()}
            {review.approvalHistory.decision.reason ? `: ${review.approvalHistory.decision.reason}` : ""}
          </p>
        ) : null}
        {review.approvalHistory.adoption ? (
          <div data-testid="cpsat-review-adoption-result">
            <p>Adoption {review.approvalHistory.adoption.adoptionId}</p>
            <p>Version {review.approvalHistory.adoption.version}</p>
            <p>Status {review.approvalHistory.adoption.status}</p>
            {review.approvalHistory.adoption.supersedesAdoptionId ? (
              <p data-testid="cpsat-review-superseded">
                Supersedes {review.approvalHistory.adoption.supersedesAdoptionId}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <nav className="cpsat-review-nav" aria-label="Review navigation">
        <a className="button secondary cpsat-interactive" href={runHref} data-testid="cpsat-review-deep-link-run">
          Back to run
        </a>
        <a className="button secondary cpsat-interactive" href="#runs" data-testid="cpsat-review-return-runs">
          Return to Runs
        </a>
        <a className="button secondary cpsat-interactive" href="#review" data-testid="cpsat-review-return-review">
          Return to Review
        </a>
        {adopted ? (
          <>
            <a className="button primary cpsat-interactive" href="#studio" data-testid="cpsat-view-operational-plan">
              View operational plan
            </a>
            <a className="button secondary cpsat-interactive" href="#review" data-testid="cpsat-view-approval-history">
              View approval history
            </a>
            <a className="button secondary cpsat-interactive" href="#inputs" data-testid="cpsat-return-overview">
              Return to seating overview
            </a>
          </>
        ) : null}
      </nav>

      {showMutationControls ? (
        <div data-testid="cpsat-review-mutation-slot" hidden aria-hidden="true" />
      ) : (
        <p data-testid="cpsat-review-auditor-readonly" role="status">
          Read-only inspection. Submit, approve, reject and adopt controls are not available for this role.
        </p>
      )}

      {stale ? (
        <p role="alert" aria-live="assertive" data-testid="cpsat-review-stale-block">
          This candidate is stale against current seating authority. Submission and adoption are blocked. The previous
          operational plan remains active.
        </p>
      ) : null}

      <div
        data-testid="cpsat-review-action-flags"
        data-can-submit={String(showMutationControls && review.actions.canSubmit && !stale)}
        data-can-approve={String(showMutationControls && review.actions.canApprove && !stale)}
        data-can-reject={String(showMutationControls && review.actions.canReject)}
        data-can-adopt={String(showMutationControls && review.actions.canAdopt && !stale)}
        hidden
      />

      <style>{`
        .cpsat-candidate-review {
          display: grid;
          gap: 1.25rem;
          max-width: 100%;
          overflow-x: hidden;
        }
        .cpsat-review-meta {
          display: grid;
          gap: 0.5rem 1rem;
          grid-template-columns: 1fr;
        }
        .cpsat-review-meta div {
          display: grid;
          gap: 0.15rem;
        }
        .cpsat-review-meta dt {
          font-size: 0.8rem;
          opacity: 0.8;
        }
        .cpsat-review-meta dd {
          margin: 0;
          word-break: break-word;
        }
        .cpsat-review-filters {
          display: grid;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .cpsat-scroll-table {
          max-width: 100%;
          overflow-x: auto;
          border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
        }
        .cpsat-scroll-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .cpsat-scroll-table th,
        .cpsat-scroll-table td {
          text-align: left;
          padding: 0.4rem 0.55rem;
          border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
        }
        .cpsat-review-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .cpsat-interactive,
        .cpsat-candidate-review button,
        .cpsat-candidate-review a.button {
          cursor: pointer;
        }
        .cpsat-candidate-review :focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
        @media (max-width: 390px) {
          .cpsat-candidate-review { padding-inline: 0; }
        }
        @media (min-width: 768px) {
          .cpsat-review-meta { grid-template-columns: 1fr 1fr; }
          .cpsat-review-filters { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1440px) {
          .cpsat-review-meta { grid-template-columns: 1fr 1fr 1fr; }
        }
      `}</style>
    </article>
  );
}
