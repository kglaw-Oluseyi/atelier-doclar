import type { EventAtelierWorkspace } from "@maison-doclar/shared-platform";
import { S04E_FIXTURE_IDS } from "@maison-doclar/shared-platform";
import {
  issueAtelierAccessAction,
  publishAtelierNarrativeAction,
  publishEventAtelierAction,
  reviewAtelierDecisionAction,
  revokeAtelierAccessAction,
} from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { CopyTestLink } from "./copy-test-link";

export function EventAtelierWorkspaceView({
  workspace,
  issuedHref,
}: {
  workspace: EventAtelierWorkspace;
  issuedHref?: string;
}) {
  const { atelier, capabilities } = workspace;
  return (
    <div className="atelier-workspace" data-testid="staff-atelier-workspace">
      <p data-testid="atelier-publication-state">
        Publication: {atelier.publicationState}. Lifecycle: {atelier.lifecycleState}.
      </p>
      <p>{workspace.genesisIntent}</p>
      {workspace.narrative ? (
        <section className="atelier-panel">
          <h2>Current narrative edition</h2>
          <p>{workspace.narrative.story}</p>
          <p>{workspace.narrative.supersededCount} earlier edition{workspace.narrative.supersededCount === 1 ? "" : "s"} preserved.</p>
        </section>
      ) : null}
      {capabilities.canPublish && atelier.publicationState !== "PUBLISHED" ? (
        <form action={publishEventAtelierAction} className="stack">
          <input type="hidden" name="eventId" value={workspace.eventId} />
          <IdempotencyField />
          <PendingSubmit>Reveal the Atelier to hosts</PendingSubmit>
        </form>
      ) : null}
      {capabilities.canPublish ? (
        <form action={publishAtelierNarrativeAction} className="stack">
          <input type="hidden" name="eventId" value={workspace.eventId} />
          <IdempotencyField />
          <label>
            Story
            <textarea name="story" required defaultValue={workspace.narrative?.story} />
          </label>
          <label>
            Atmosphere
            <textarea name="atmosphere" required defaultValue="Warm ivory rooms and considered language." />
          </label>
          <label>
            Pillars
            <input name="pillars" required defaultValue={(workspace.narrative?.pillars ?? ["Family dignity"]).join(" · ")} />
          </label>
          <label>
            Cultural intent
            <input name="culturalIntent" required defaultValue="Yorùbá hospitality without spectacle." />
          </label>
          <label>
            Design direction
            <input name="designDirection" required defaultValue="Editorial stills and generous space." />
          </label>
          <label>
            Provenance
            <input name="provenance" required defaultValue="Staff-published narrative edition" />
          </label>
          <PendingSubmit>Publish a new narrative edition</PendingSubmit>
        </form>
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
            <label>
              <input type="checkbox" name="canDecide" defaultChecked />
              May decide
            </label>
            <IdempotencyField />
            <PendingSubmit>Issue principal host invitation</PendingSubmit>
          </form>
          <form action={issueAtelierAccessAction} className="stack">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="personId" value={S04E_FIXTURE_IDS.personReadOnly} />
            <input type="hidden" name="hostRole" value="READ_ONLY_HOST" />
            <input type="hidden" name="chapters" value="TODAY,VISION,JOURNEY,BLUEPRINT,ASSURANCE,EDITIONS,UPDATES" />
            <IdempotencyField />
            <PendingSubmit>Issue read-only invitation</PendingSubmit>
          </form>
          {workspace.grants.map((grant) => (
            <form key={grant.id} action={revokeAtelierAccessAction} className="stack">
              <input type="hidden" name="eventId" value={workspace.eventId} />
              <input type="hidden" name="grantId" value={grant.id} />
              <input type="hidden" name="expectedVersion" value={grant.version} />
              <p>
                {grant.personName} · {grant.hostRole} · {grant.status}
                {grant.tokenPrefix ? ` · ${grant.tokenPrefix}` : ""}
              </p>
              {grant.status === "ACTIVE" ? <PendingSubmit>Revoke this access</PendingSubmit> : null}
            </form>
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
