import type { DiscoveryWorkspace } from "@maison-doclar/shared-platform";
import { CanonicalHash, CanonicalId, HistoryDisclosure } from "./canonical-evidence";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import {
  addDiscoveryParticipantAction,
  changeDiscoverySessionAction,
  extractDiscoveryAssertionsAction,
  recordDiscoveryConsentAction,
  recordDiscoverySourceAction,
  resolveDiscoveryConflictAction,
  reviewDiscoveryAssertionAction,
} from "../server/actions";

const CONSENT_DIMENSIONS = [
  ["PARTICIPATION", "Participation"],
  ["AUDIO_RECORDING", "Audio recording"],
  ["TRANSCRIPTION", "Transcription"],
  ["AI_ANALYSIS", "AI analysis"],
  ["SOURCE_RETENTION", "Source retention"],
  ["DEIDENTIFIED_BENCHMARKING", "De-identified benchmarking"],
] as const;

const COVERAGE_LABELS: Record<string, string> = {
  UNASSESSED: "Unanswered",
  UNKNOWN: "Unknown",
  NOT_APPLICABLE: "Not applicable",
  CONFLICTED: "Conflicted",
  STALE: "Stale",
  NOT_YET_RELEVANT: "Not yet relevant",
  PARTIAL: "Partial",
  ANSWERED_UNCONFIRMED: "Answered, unconfirmed",
  CONFIRMED: "Confirmed",
};

function latestConsent(workspace: DiscoveryWorkspace, dimension: string) {
  return [...workspace.consents].reverse().find((item) => item.dimension === dimension);
}

function topicLabel(topicKey: string) {
  return topicKey.replaceAll(".", " ").replaceAll("_", " ");
}

function originLabel(origin: string, confirmation: string) {
  if (origin === "AI_FIXTURE" && (confirmation === "PROPOSED" || confirmation === "EXTRACTED")) return "AI proposal";
  if (confirmation === "STAFF_REVIEWED") return "Staff-reviewed fact";
  if (confirmation === "CLIENT_CONFIRMED" || confirmation === "GOVERNING") return "Confirmed fact";
  if (confirmation === "REJECTED") return "Rejected proposal";
  return origin === "HUMAN" ? "Source evidence" : "Proposal";
}

function isReviewableProposal(confirmation: string) {
  return confirmation === "PROPOSED" || confirmation === "EXTRACTED";
}

function valueText(value: unknown) {
  if (value && typeof value === "object" && "redacted" in value) return "Restricted in this projection";
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(String).join(" · ");
  return String(value ?? "Not provided");
}

export function DiscoveryWorkspaceView({
  workspace,
  mutationLocked,
}: {
  workspace: DiscoveryWorkspace;
  mutationLocked: boolean;
}) {
  const { capabilities } = workspace;
  const participationGranted = latestConsent(workspace, "PARTICIPATION")?.decision === "GRANTED";
  const activeSession = workspace.sessions.find((item) => item.status === "ACTIVE" || item.status === "PAUSED" || item.status === "READY" || item.status === "DRAFT");
  const draftSession = workspace.sessions[0];

  return (
    <div className="discovery-workspace" data-testid="discovery-workspace">
      <p className="lede" data-testid="discovery-next-action">
        Next: {workspace.nextAction}
      </p>
      <p>
        <span className="md-status">{workspace.engagement.status}</span>{" "}
        <span className="md-status" data-tone="brass">{workspace.opportunity.stage}</span>{" "}
        {workspace.opportunity.knownEventType ?? "Event type not yet known"}
      </p>

      <section id="discovery-consent" className="form programme-form">
        <h2>Consent</h2>
        <p className="lede">
          Recording and analysis stay off until the specific grant is present. Manual notes can still be taken without audio consent.
        </p>
        <ul className="atelier-queue" data-testid="discovery-consent-list">
          {CONSENT_DIMENSIONS.map(([dimension, label]) => {
            const current = latestConsent(workspace, dimension);
            return (
              <li key={dimension} className="discovery-card">
                <p>
                  <strong>{label}</strong>{" "}
                  <span className="md-status" data-tone={current?.decision === "GRANTED" ? "ok" : current?.decision === "DECLINED" ? "warn" : undefined}>
                    {current?.decision ?? "Not asked"}
                  </span>
                </p>
                {capabilities.canManageSession ? (
                  <form action={recordDiscoveryConsentAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
                    <input type="hidden" name="engagementId" value={workspace.engagement.id} />
                    <input type="hidden" name="dimension" value={dimension} />
                    <input type="hidden" name="reason" value={`Record ${label.toLowerCase()} consent`} />
                    <label>
                      Decision
                      <select name="decision" defaultValue={current?.decision === "GRANTED" ? "WITHDRAWN" : "GRANTED"}>
                        <option value="GRANTED">Grant</option>
                        <option value="DECLINED">Decline</option>
                        <option value="WITHDRAWN">Withdraw</option>
                      </select>
                    </label>
                    <PendingSubmit className="secondary" locked={mutationLocked}>
                      Save {label.toLowerCase()}
                    </PendingSubmit>
                  </form>
                ) : (
                  <p className="lede">Recording consent is read-only for this assignment.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section id="discovery-session" className="form programme-form">
        <h2>Interview session</h2>
        {workspace.sessions.length === 0 ? (
          <p className="empty">No session has been opened. Create a staff-led draft when you are ready.</p>
        ) : (
          <ul className="atelier-queue" data-testid="discovery-session-list">
            {workspace.sessions.map((session) => (
              <li key={session.id} className="discovery-card">
                <p>
                  <span className="md-status">{session.status}</span> {session.mode.replaceAll("_", " ").toLowerCase()} · provider{" "}
                  {session.providerState === "UNAVAILABLE" ? "unavailable" : session.providerState.toLowerCase()}
                </p>
                <CanonicalId id={session.id} label="Session identity" />
              </li>
            ))}
          </ul>
        )}
        {capabilities.canManageSession ? (
          <form action={changeDiscoverySessionAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
            <input type="hidden" name="engagementId" value={workspace.engagement.id} />
            {draftSession ? <input type="hidden" name="sessionId" value={draftSession.id} /> : null}
            <input type="hidden" name="expectedVersion" value={draftSession?.version ?? 0} />
            {!draftSession ? (
              <label>
                Session mode
                <select name="mode" defaultValue="STAFF_LED">
                  <option value="STAFF_LED">Staff-led</option>
                  <option value="CLIENT_LED">Client-led</option>
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="OFFLINE_NOTES">Offline notes</option>
                </select>
              </label>
            ) : null}
            <label>
              Session action
              <select name="sessionAction" defaultValue={draftSession ? "START" : "CREATE"}>
                {!draftSession ? <option value="CREATE">Create draft</option> : null}
                <option value="READY">Mark ready</option>
                <option value="START">Start</option>
                <option value="PAUSE">Pause</option>
                <option value="RESUME">Resume</option>
                <option value="COMPLETE">Complete</option>
                <option value="CANCEL">Cancel</option>
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required maxLength={400} defaultValue="Update interview session" />
            </label>
            {!participationGranted && (activeSession || !draftSession) ? (
              <p className="lede" data-testid="discovery-session-blocked">
                Starting a live session is blocked until participation consent is granted. A draft can still be created.
              </p>
            ) : null}
            <PendingSubmit locked={mutationLocked}>Update session</PendingSubmit>
          </form>
        ) : (
          <p className="lede">Session changes are blocked for this assignment.</p>
        )}

        <h3>People in this conversation</h3>
        {workspace.participants.length === 0 ? (
          <p className="empty">No named participant yet. Add a person so later notes do not have to guess who spoke.</p>
        ) : (
          <ul className="atelier-queue">
            {workspace.participants.map((participant) => (
              <li key={participant.id}>
                <strong>{participant.displayName}</strong> · {participant.claimedRole} · {participant.authorityClaim.replaceAll("_", " ").toLowerCase()}
              </li>
            ))}
          </ul>
        )}
        {capabilities.canUpdateEngagement ? (
          <form action={addDiscoveryParticipantAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
            <input type="hidden" name="engagementId" value={workspace.engagement.id} />
            <label>
              Display name
              <input name="displayName" required maxLength={160} placeholder="Adéwálé" />
            </label>
            <label>
              Claimed role
              <input name="claimedRole" required maxLength={80} defaultValue="Principal" />
            </label>
            <label>
              Authority claim
              <select name="authorityClaim" defaultValue="PRINCIPAL">
                <option value="PRINCIPAL">Principal</option>
                <option value="AUTHORISED_DELEGATE">Authorised delegate</option>
                <option value="RELATIVE">Relative</option>
                <option value="UNAUTHORISED">Unauthorised</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required maxLength={400} defaultValue="Add conversation participant" />
            </label>
            <PendingSubmit className="secondary" locked={mutationLocked}>
              Add person
            </PendingSubmit>
          </form>
        ) : (
          <p className="lede">Adding a participant is blocked for this assignment.</p>
        )}
      </section>

      <section id="discovery-evidence" className="form programme-form">
        <h2>Evidence</h2>
        <p className="lede">Notes are source evidence. They are not confirmed facts and they are not executable content.</p>
        {workspace.artefacts.length === 0 ? (
          <p className="empty">No source notes yet.</p>
        ) : (
          <ul className="atelier-queue" data-testid="discovery-evidence-list">
            {workspace.artefacts.map((artefact) => {
              const segments = workspace.segments.filter((item) => item.artefactId === artefact.id);
              return (
                <li key={artefact.id} className="discovery-card">
                  <p>
                    <strong>{artefact.title}</strong>{" "}
                    <span className="md-status">Source evidence</span>{" "}
                    <span className="md-status">{artefact.kind.replaceAll("_", " ").toLowerCase()}</span>
                  </p>
                  {segments.map((segment) => (
                    <p key={segment.id}>{segment.text}</p>
                  ))}
                  {artefact.byteChecksum ? <CanonicalHash value={artefact.byteChecksum} /> : null}
                  {capabilities.canReviewAssertion ? (
                    <form action={extractDiscoveryAssertionsAction}>
                      <IdempotencyField />
                      <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
                      <input type="hidden" name="engagementId" value={workspace.engagement.id} />
                      <input type="hidden" name="artefactId" value={artefact.id} />
                      <input type="hidden" name="reason" value="Extract proposals from this note" />
                      <PendingSubmit className="secondary" locked={mutationLocked}>
                        Extract proposals
                      </PendingSubmit>
                    </form>
                  ) : (
                    <p className="lede">Proposal extraction is blocked for this assignment.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {capabilities.canManageSource ? (
          <form action={recordDiscoverySourceAction} data-testid="discovery-note-form">
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
            <input type="hidden" name="engagementId" value={workspace.engagement.id} />
            <label>
              Note title
              <input name="title" required maxLength={200} defaultValue="Staff note" />
            </label>
            <label>
              What was said
              <textarea name="text" required maxLength={8000} rows={4} placeholder="The family mentioned 320 guests." />
            </label>
            <label>
              Reason
              <input name="reason" required maxLength={400} defaultValue="Record a staff note" />
            </label>
            <PendingSubmit locked={mutationLocked}>Save note</PendingSubmit>
          </form>
        ) : (
          <p className="lede">Recording a note is blocked for this assignment.</p>
        )}
      </section>

      <section id="discovery-coverage" className="form programme-form">
        <h2>Coverage</h2>
        <p className="lede" data-testid="discovery-completeness">
          Known {workspace.completeness.known} · unknown {workspace.completeness.unknown} · conflicted{" "}
          {workspace.completeness.conflicted} · stale {workspace.completeness.stale} · deferred {workspace.completeness.deferred}.
          Completeness is never a single percentage.
        </p>
        {workspace.assessments.length === 0 ? (
          <p className="empty">Coverage has not been assessed yet.</p>
        ) : (
          <ul className="atelier-queue" data-testid="discovery-coverage-list">
            {workspace.assessments
              .slice()
              .sort((left, right) => Number(right.rankScore) - Number(left.rankScore))
              .map((assessment) => (
                <li key={assessment.id} className="discovery-card">
                  <p>
                    <strong>{topicLabel(assessment.topicKey)}</strong>{" "}
                    <span className="md-status">{COVERAGE_LABELS[assessment.state] ?? assessment.state}</span>
                  </p>
                  <p>{assessment.explanation}</p>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section id="discovery-assertions" className="form programme-form">
        <h2>Assertion review</h2>
        {workspace.conflicts.filter((item) => item.status !== "RESOLVED").length > 0 ? (
          <div data-testid="discovery-conflicts">
            <h3>Open contradictions</h3>
            {workspace.conflicts
              .filter((item) => item.status !== "RESOLVED")
              .map((conflict) => (
                <article key={conflict.id} className="discovery-card">
                  <p>
                    <span className="md-status" data-tone="warn">{conflict.severity} conflict</span>{" "}
                    {topicLabel(conflict.topicKey)}
                  </p>
                  <p>{conflict.explanation}</p>
                  {conflict.clarificationWording ? <p>{conflict.clarificationWording}</p> : null}
                  {capabilities.canReviewAssertion ? (
                    <form action={resolveDiscoveryConflictAction}>
                      <IdempotencyField />
                      <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
                      <input type="hidden" name="engagementId" value={workspace.engagement.id} />
                      <input type="hidden" name="conflictId" value={conflict.id} />
                      <input type="hidden" name="expectedVersion" value={conflict.version} />
                      <input type="hidden" name="selectedAssertionId" value={conflict.assertionIds[0] ?? ""} />
                      <label>
                        Resolution
                        <select name="resolution" defaultValue="REQUEST_CLARIFICATION">
                          <option value="REQUEST_CLARIFICATION">Ask for clarification</option>
                          <option value="SELECT">Select first recorded value</option>
                          <option value="COEXIST">Record as coexisting</option>
                          <option value="SCOPE_SEPARATE">Keep in separate scopes</option>
                          <option value="SUPERSEDE">Supersede earlier value</option>
                        </select>
                      </label>
                      <label>
                        Reason
                        <input name="reason" required maxLength={400} defaultValue="Resolve contradiction without silent overwrite" />
                      </label>
                      <PendingSubmit locked={mutationLocked}>Resolve contradiction</PendingSubmit>
                    </form>
                  ) : (
                    <p className="lede">Resolving a contradiction is blocked for this assignment.</p>
                  )}
                </article>
              ))}
          </div>
        ) : null}
        {workspace.assertions.length === 0 ? (
          <p className="empty">No candidate assertions yet. Extract proposals from a note when you are ready.</p>
        ) : (
          <ul className="atelier-queue" data-testid="discovery-assertion-list">
            {workspace.assertions.map((assertion) => (
              <li key={assertion.id} className="discovery-card">
                <p>
                  <strong>{topicLabel(assertion.topicKey)}</strong>{" "}
                  <span className="md-status">{originLabel(assertion.origin, assertion.confirmationState)}</span>{" "}
                  <span className="md-status">{assertion.confirmationState.replaceAll("_", " ").toLowerCase()}</span>
                </p>
                <p>{assertion.narrative === "Restricted" ? "Restricted in this projection" : valueText(assertion.structuredValue)}</p>
                {assertion.rationale && assertion.rationale !== "Restricted" ? <p className="lede">{assertion.rationale}</p> : null}
                <HistoryDisclosure summary="Provenance" count={assertion.sourceSegmentIds.length}>
                  <p>Origin {assertion.origin === "AI_FIXTURE" ? "deterministic fixture extraction" : "human capture"} · {assertion.directness.replaceAll("_", " ").toLowerCase()}</p>
                  <CanonicalHash value={assertion.contentHash} />
                </HistoryDisclosure>
                {capabilities.canReviewAssertion && isReviewableProposal(assertion.confirmationState) ? (
                  <form action={reviewDiscoveryAssertionAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={workspace.engagement.organisationId} />
                    <input type="hidden" name="engagementId" value={workspace.engagement.id} />
                    <input type="hidden" name="assertionId" value={assertion.id} />
                    <input type="hidden" name="expectedVersion" value={assertion.version} />
                    <label>
                      Decision
                      <select name="decision" defaultValue="ACCEPT_STAFF_REVIEWED">
                        <option value="ACCEPT_STAFF_REVIEWED">Accept as staff-reviewed</option>
                        <option value="REJECT">Reject</option>
                        <option value="REQUEST_CLARIFICATION">Ask for clarification</option>
                      </select>
                    </label>
                    <label>
                      Reason
                      <input name="reason" required maxLength={400} defaultValue="Staff review of extracted proposal" />
                    </label>
                    <PendingSubmit locked={mutationLocked}>Review proposal</PendingSubmit>
                  </form>
                ) : !capabilities.canReviewAssertion ? (
                  <p className="lede">Reviewing a proposal is blocked for this assignment.</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
