import type { EventAtelierWorkspace } from "@maison-doclar/shared-platform";
import { S04E_FIXTURE_IDS } from "@maison-doclar/shared-platform";
import {
  issueAtelierAccessAction,
  issueAtelierStepUpAction,
  publishAtelierDecisionAction,
  publishAtelierNarrativeAction,
  publishEventAtelierAction,
  renewAtelierAccessAction,
  reviewAtelierDecisionAction,
  revokeAtelierAccessAction,
  startAtelierNarrativeRevisionAction,
} from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { CanonicalId, CanonicalTime, HistoryDisclosure } from "./canonical-evidence";
import { CopyTestLink } from "./copy-test-link";

function CanDecideRadios({
  defaultValue,
  name = "canDecide",
}: {
  defaultValue: boolean;
  name?: string;
}) {
  return (
    <fieldset className="stack">
      <legend>Decision authority</legend>
      <label>
        <input type="radio" name={name} value="true" defaultChecked={defaultValue} />
        May decide
      </label>
      <label>
        <input type="radio" name={name} value="false" defaultChecked={!defaultValue} />
        Cannot decide
      </label>
    </fieldset>
  );
}

export function EventAtelierWorkspaceView({
  workspace,
  issuedHref,
  authorLabels = {},
}: {
  workspace: EventAtelierWorkspace;
  issuedHref?: string;
  authorLabels?: Record<string, string>;
}) {
  const { atelier, capabilities, editor, narrative } = workspace;
  return (
    <div className="atelier-workspace" data-testid="staff-atelier-workspace">
      <p data-testid="atelier-publication-state">
        Publication: {atelier.publicationState}. Lifecycle: {atelier.lifecycleState}.
      </p>
      <p>{workspace.genesisIntent}</p>
      {narrative ? (
        <section className="atelier-panel" data-testid="atelier-current-edition">
          <h2>Current narrative edition</h2>
          <p data-testid="current-edition-id">
            Edition {narrative.editionId} · {narrative.publicationState} · v{narrative.version}
          </p>
          {narrative.publishedAt ? (
            <p>
              Published <CanonicalTime iso={narrative.publishedAt} />
            </p>
          ) : null}
          {narrative.supersedesEditionId ? (
            <p data-testid="current-supersedes">Supersedes {narrative.supersedesEditionId}</p>
          ) : (
            <p data-testid="current-first-publication">This is the current first published lineage head.</p>
          )}
          <p>{narrative.story}</p>
          <p data-testid="earlier-published-count">
            Earlier published editions: {narrative.earlierPublishedCount}
          </p>
        </section>
      ) : null}
      {workspace.history.length > 0 ? (
        <section className="atelier-panel" data-testid="atelier-edition-history">
          <h2>Edition history</h2>
          <ul>
            {workspace.history.slice(0, 1).map((item) => (
              <li key={item.id} data-testid={`edition-history-${item.publicationState.toLowerCase()}`}>
                <p>
                  {item.publicationState} · v{item.version}
                  {item.authorPersonId ? ` · ${authorLabels[item.authorPersonId] ?? "Identity unavailable"}` : ""}
                  {item.publishedAt ? (
                    <>
                      {" · "}
                      <CanonicalTime iso={item.publishedAt} />
                    </>
                  ) : null}
                </p>
                <CanonicalId id={item.id} label="Edition ID" />
                {item.supersedesEditionId ? <p>Prior edition {item.supersedesEditionId}</p> : <p>First published edition</p>}
                {item.changeSummary ? <p>{item.changeSummary}</p> : null}
                <p>{item.provenance}</p>
              </li>
            ))}
          </ul>
          <HistoryDisclosure summary="Earlier editions" count={Math.max(0, workspace.history.length - 1)} testId="atelier-history-earlier">
            <ul>
              {workspace.history.slice(1).map((item) => (
                <li key={item.id} data-testid={`edition-history-${item.publicationState.toLowerCase()}`}>
                  <p>
                    {item.publicationState} · v{item.version}
                    {item.authorPersonId ? ` · ${authorLabels[item.authorPersonId] ?? "Identity unavailable"}` : ""}
                  </p>
                  <CanonicalId id={item.id} label="Edition ID" />
                  <p>{item.provenance}</p>
                </li>
              ))}
            </ul>
          </HistoryDisclosure>
        </section>
      ) : null}
      {capabilities.canPublish && atelier.publicationState !== "PUBLISHED" ? (
        <form action={publishEventAtelierAction} className="stack">
          <input type="hidden" name="eventId" value={workspace.eventId} />
          <IdempotencyField />
          <PendingSubmit>Reveal the Atelier to hosts</PendingSubmit>
        </form>
      ) : null}
      {capabilities.canPublish && narrative?.publicationState === "PUBLISHED" && editor?.source !== "DRAFT" ? (
        <form action={startAtelierNarrativeRevisionAction} className="stack">
          <input type="hidden" name="eventId" value={workspace.eventId} />
          <IdempotencyField />
          <PendingSubmit>Start a revision from the current published edition</PendingSubmit>
        </form>
      ) : null}
      {capabilities.canPublish ? (
        <form action={publishAtelierNarrativeAction} className="stack" data-testid="atelier-narrative-editor">
          <input type="hidden" name="eventId" value={workspace.eventId} />
          <input type="hidden" name="expectedAtelierVersion" value={atelier.version} />
          <IdempotencyField />
          <p data-testid="editor-source">
            Editing {editor?.source ?? "UNAVAILABLE"} {editor?.editionId ?? "none"} · {editor?.publicationState ?? "none"} ·
            v{editor?.version ?? 0}
          </p>
          <label>
            Story
            <textarea name="story" required defaultValue={editor?.story ?? ""} />
          </label>
          <label>
            Atmosphere
            <textarea name="atmosphere" required defaultValue={editor?.atmosphere ?? ""} />
          </label>
          <label>
            Pillars
            <input name="pillars" required defaultValue={(editor?.pillars ?? []).join(" · ")} />
          </label>
          <label>
            Cultural intent
            <input name="culturalIntent" required defaultValue={editor?.culturalIntent ?? ""} />
          </label>
          <label>
            Design direction
            <input name="designDirection" required defaultValue={editor?.designDirection ?? ""} />
          </label>
          <label>
            Provenance
            <input name="provenance" required defaultValue={editor?.provenance ?? ""} />
          </label>
          <label>
            Change summary
            <input name="changeSummary" defaultValue="" />
          </label>
          <PendingSubmit>Publish a new narrative edition</PendingSubmit>
        </form>
      ) : null}
      {capabilities.canPublishDecision && atelier.publicationState === "PUBLISHED" ? (
        <section className="atelier-panel" data-testid="atelier-publish-decision">
          <h2>Publish a host decision</h2>
          <form action={publishAtelierDecisionAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="kind" value="REQUIRES_STAFF_REVIEW" />
            <IdempotencyField />
            <label>
              Title
              <input name="title" required defaultValue="Ceremony seating cloth" />
            </label>
            <label>
              Question
              <input name="question" required defaultValue="Which seating cloth should the family see first?" />
            </label>
            <label>
              Consequence
              <input
                name="consequence"
                required
                defaultValue="Maison Doclar will prepare the chosen cloth. RSVP, forecast and programme are unchanged."
              />
            </label>
            <label>
              Options
              <input name="options" required defaultValue="Ivory · Deep indigo · Talk this through" />
            </label>
            <label>
              Deadline
              <input name="deadlineAt" required defaultValue="2026-09-21T18:00:00.000Z" />
            </label>
            <label>
              <input type="checkbox" name="requiresReview" value="true" defaultChecked />
              Requires staff review
            </label>
            <label>
              <input type="checkbox" name="requiresStepUp" value="true" />
              Requires step-up confirmation
            </label>
            <PendingSubmit>Publish this decision request</PendingSubmit>
          </form>
        </section>
      ) : null}
      {capabilities.canManageAccess ? (
        <section className="atelier-panel" data-testid="atelier-access">
          <h2>Host access</h2>
          {issuedHref ? (
            <p>
              <a className="button" href={issuedHref} data-testid="atelier-access-link">
                Open issued host link
              </a>{" "}
              <CopyTestLink href={issuedHref} testId="atelier-copy-host-link" />
            </p>
          ) : null}
          <form action={issueAtelierAccessAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="personId" value={S04E_FIXTURE_IDS.personPrincipal} />
            <input type="hidden" name="hostRole" value="PRINCIPAL_HOST" />
            <input type="hidden" name="chapters" value="TODAY,VISION,JOURNEY,BLUEPRINT,ENSEMBLE,DECISIONS,ASSURANCE,EDITIONS,UPDATES" />
            <CanDecideRadios defaultValue />
            <IdempotencyField />
            <PendingSubmit>Issue principal host invitation</PendingSubmit>
          </form>
          <form action={issueAtelierAccessAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="personId" value={S04E_FIXTURE_IDS.personCoHost} />
            <input type="hidden" name="hostRole" value="CO_HOST" />
            <input type="hidden" name="chapters" value="TODAY,VISION,JOURNEY,DECISIONS,ASSURANCE" />
            <CanDecideRadios defaultValue />
            <IdempotencyField />
            <PendingSubmit>Issue co-host invitation</PendingSubmit>
          </form>
          <form action={issueAtelierAccessAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="personId" value={S04E_FIXTURE_IDS.personAssistant} />
            <input type="hidden" name="hostRole" value="EXECUTIVE_ASSISTANT" />
            <input type="hidden" name="chapters" value="TODAY,VISION,JOURNEY,ASSURANCE,UPDATES" />
            <input type="hidden" name="canDecide" value="false" />
            <IdempotencyField />
            <PendingSubmit>Issue executive assistant invitation</PendingSubmit>
          </form>
          <form action={issueAtelierAccessAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="personId" value={S04E_FIXTURE_IDS.personFamily} />
            <input type="hidden" name="hostRole" value="FAMILY_REPRESENTATIVE" />
            <input type="hidden" name="chapters" value="TODAY,VISION,JOURNEY,ASSURANCE" />
            <input type="hidden" name="canDecide" value="false" />
            <IdempotencyField />
            <PendingSubmit>Issue family representative invitation</PendingSubmit>
          </form>
          <form action={issueAtelierAccessAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="personId" value={S04E_FIXTURE_IDS.personReadOnly} />
            <input type="hidden" name="hostRole" value="READ_ONLY_HOST" />
            <input type="hidden" name="chapters" value="TODAY,VISION,JOURNEY,BLUEPRINT,ASSURANCE,EDITIONS,UPDATES" />
            <input type="hidden" name="canDecide" value="false" />
            <IdempotencyField />
            <PendingSubmit>Issue read-only invitation</PendingSubmit>
          </form>
          {workspace.grants.map((grant) => (
            <div key={grant.id} className="stack" data-testid={`atelier-grant-${grant.id}`}>
              <p data-testid="atelier-grant-authority">
                {grant.personName} · {grant.hostRole} · {grant.status} ·{" "}
                {grant.canDecide ? "May decide" : "Cannot decide"}
                {grant.tokenPrefix ? ` · ${grant.tokenPrefix}` : ""}
              </p>
              {grant.status === "ACTIVE" ? (
                <>
                  <form action={renewAtelierAccessAction} className="stack">
                    <input type="hidden" name="eventId" value={workspace.eventId} />
                    <input type="hidden" name="grantId" value={grant.id} />
                    <input type="hidden" name="expectedVersion" value={grant.version} />
                    <CanDecideRadios defaultValue={grant.canDecide} />
                    <IdempotencyField />
                    <PendingSubmit>Renew this access</PendingSubmit>
                  </form>
                  <form action={issueAtelierStepUpAction} className="stack">
                    <input type="hidden" name="eventId" value={workspace.eventId} />
                    <input type="hidden" name="grantId" value={grant.id} />
                    <input type="hidden" name="expectedVersion" value={grant.version} />
                    <PendingSubmit>Issue step-up confirmation</PendingSubmit>
                  </form>
                  <form action={revokeAtelierAccessAction} className="stack">
                    <input type="hidden" name="eventId" value={workspace.eventId} />
                    <input type="hidden" name="grantId" value={grant.id} />
                    <input type="hidden" name="expectedVersion" value={grant.version} />
                    <PendingSubmit>Revoke this access</PendingSubmit>
                  </form>
                </>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {capabilities.canReviewDecision ? (
        <section className="atelier-panel" data-testid="atelier-review">
          <h2>Decision review</h2>
          {workspace.receipts
            .filter((item) => item.reviewStatus === "PENDING")
            .map((receipt) => {
              const request = workspace.decisions.find((item) => item.id === receipt.requestId);
              return (
                <form key={receipt.id} action={reviewAtelierDecisionAction} className="stack">
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="requestId" value={receipt.requestId} />
                  <input type="hidden" name="receiptId" value={receipt.id} />
                  <input type="hidden" name="expectedVersion" value={request?.version ?? 1} />
                  <p>
                    {request?.title}: host chose {receipt.submittedChoice}. Canonical data unchanged.
                    {receipt.correlationId ? ` Correlation ${receipt.correlationId}.` : ""}
                  </p>
                  <button type="submit" name="approve" value="yes">
                    Accept
                  </button>
                  <button type="submit" name="approve" value="no" className="secondary">
                    Decline
                  </button>
                </form>
              );
            })}
        </section>
      ) : null}
    </div>
  );
}
