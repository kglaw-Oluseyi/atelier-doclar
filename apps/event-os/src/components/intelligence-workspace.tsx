import { formatMoneyMinor } from "@maison-doclar/shared-platform";
import { CanonicalHash } from "./canonical-evidence";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import {
  assessChangeImpactAction,
  calculateBudgetScenarioAction,
  compareBudgetScenariosAction,
  convertDiscoveryEngagementAction,
  createBriefDraftAction,
  createChangeProposalAction,
  decideBriefEditionAction,
  decideBudgetScenarioAction,
  decideChangeProposalAction,
  instantiateRoadmapAction,
  issueDiscoveryClientAccessAction,
  publishBriefEditionAction,
  revokeDiscoveryClientAccessAction,
  recordDiscoveryObjectAction,
  submitBriefEditionAction,
  submitBudgetScenarioAction,
} from "../server/actions";

type Intelligence = ReturnType<
  import("@maison-doclar/shared-platform").PlatformService["getIntelligenceWorkspace"]
>;

function moneyLabel(minor: string, currency = "NGN") {
  return formatMoneyMinor(minor, currency);
}

export function IntelligenceWorkspaceView({
  organisationId,
  engagementId,
  engagementVersion,
  publishedHash,
  intelligence,
  mutationLocked,
  canAuthorBrief,
  canSubmitBrief,
  canDecideBrief,
  canPublishBrief,
  canConvert,
  canCalculateBudget,
  canDecideBudget,
  canAuthorRoadmap,
  canTriageChange,
  canDecideChange,
  canManageSource,
}: {
  organisationId: string;
  engagementId: string;
  engagementVersion: number;
  publishedHash?: string;
  intelligence: Intelligence;
  mutationLocked: boolean;
  canAuthorBrief: boolean;
  canSubmitBrief: boolean;
  canDecideBrief: boolean;
  canPublishBrief: boolean;
  canConvert: boolean;
  canCalculateBudget: boolean;
  canDecideBudget: boolean;
  canAuthorRoadmap: boolean;
  canTriageChange: boolean;
  canDecideChange: boolean;
  canManageSource: boolean;
}) {
  const currentEdition = intelligence.editions.find((item) => item.current);
  return (
    <div className="discovery-workspace" data-testid="intelligence-workspace">
      <section id="brief-review" className="form programme-form">
        <h2>Brief review</h2>
        <p className="lede">
          The working brief is governed event intelligence. It is not a long editable document and it is not yet a Client or Event.
        </p>
        {intelligence.nextQuestion ? (
          <p data-testid="interview-next-question">
            Next conversation: {intelligence.nextQuestion.question}
            {intelligence.nextQuestion.revisit ? " This is being asked again because the earlier answer is conflicted or stale." : ""}
          </p>
        ) : (
          <p>No outstanding interview topic is ranked above settled answers.</p>
        )}
        {intelligence.draft ? (
          <p>
            Working brief · {intelligence.draft.gate.toLowerCase()} · {intelligence.draft.assertionIds.length} reviewed facts ·{" "}
            {intelligence.draft.unknownTopics.length} unknown topics
          </p>
        ) : (
          <p className="empty">No working brief yet. Create one after staff review.</p>
        )}
        {currentEdition ? (
          <p>
            Current edition {currentEdition.status.toLowerCase()} · <CanonicalHash value={currentEdition.contentHash} />
          </p>
        ) : null}
        {canAuthorBrief && !intelligence.draft ? (
          <form action={createBriefDraftAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="reason" value="Create working brief" />
            <PendingSubmit locked={mutationLocked}>Create working brief</PendingSubmit>
          </form>
        ) : null}
        {canSubmitBrief && intelligence.draft ? (
          <form action={submitBriefEditionAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="expectedVersion" value={intelligence.draft.version} />
            <label>
              Gate
              <select name="gate" defaultValue="WORKING">
                <option value="INDICATIVE">Indicative</option>
                <option value="WORKING">Working</option>
                <option value="APPROVED">Approved</option>
              </select>
            </label>
            <PendingSubmit locked={mutationLocked}>Submit brief edition</PendingSubmit>
          </form>
        ) : null}
        {canDecideBrief && currentEdition && currentEdition.status === "SUBMITTED" ? (
          <form action={decideBriefEditionAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="editionId" value={currentEdition.id} />
            <input type="hidden" name="expectedVersion" value={currentEdition.version} />
            <label>
              Decision
              <select name="decision" defaultValue="APPROVE">
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
              </select>
            </label>
            <PendingSubmit locked={mutationLocked}>Decide brief</PendingSubmit>
          </form>
        ) : null}
        {canPublishBrief && currentEdition && currentEdition.status === "APPROVED" ? (
          <form action={publishBriefEditionAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="editionId" value={currentEdition.id} />
            <input type="hidden" name="expectedVersion" value={currentEdition.version} />
            <PendingSubmit locked={mutationLocked}>Publish brief</PendingSubmit>
          </form>
        ) : null}
        {canAuthorBrief ? (
          <form action={issueDiscoveryClientAccessAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <PendingSubmit className="secondary" locked={mutationLocked}>
              Issue client review access
            </PendingSubmit>
          </form>
        ) : null}
        {(intelligence.clientAccess ?? []).length > 0 ? (
          <ul className="atelier-queue" data-testid="client-access-list">
            {intelligence.clientAccess.map((access) => (
              <li key={access.id}>
                <p>
                  Client conversation access is {access.revokedAt ? "revoked" : "active"}. The link is one-time and staff-cookie separate.
                </p>
                {!access.revokedAt && canAuthorBrief ? (
                  <form action={revokeDiscoveryClientAccessAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="engagementId" value={engagementId} />
                    <input type="hidden" name="accessId" value={access.id} />
                    <PendingSubmit className="secondary" locked={mutationLocked}>
                      Revoke client conversation access
                    </PendingSubmit>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="conversion" className="form programme-form">
        <h2>Client and Event conversion</h2>
        <p className="lede">Conversion is explicit. It does not merge records and it does not create guests, invitations or venues.</p>
        {intelligence.conversion ? (
          <p data-testid="conversion-receipt">
            Converted. Client and Event exist. Source brief hash is retained.
            <CanonicalHash value={intelligence.conversion.sourceBriefHash} />
          </p>
        ) : canConvert && publishedHash ? (
          <form action={convertDiscoveryEngagementAction} data-testid="conversion-form">
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="sourceBriefHash" value={publishedHash} />
            <input type="hidden" name="expectedVersion" value={engagementVersion} />
            <label>
              Client code
              <input name="clientCode" required maxLength={40} defaultValue="ADEWALE" />
            </label>
            <label>
              Client name
              <input name="clientDisplayName" required maxLength={160} defaultValue="Adéwálé family" />
            </label>
            <label>
              Event code
              <input name="eventCode" required maxLength={40} defaultValue="WED-01" />
            </label>
            <label>
              Event name
              <input name="eventName" required maxLength={160} defaultValue="Adéwálé celebration" />
            </label>
            <label>
              Starts
              <input name="startsAt" required defaultValue="2026-12-12T10:00:00.000Z" />
            </label>
            <label>
              Ends
              <input name="endsAt" required defaultValue="2026-12-13T02:00:00.000Z" />
            </label>
            <label>
              Timezone
              <input name="timezone" required defaultValue="Africa/Lagos" />
            </label>
            <PendingSubmit locked={mutationLocked}>Convert to Client and Event</PendingSubmit>
          </form>
        ) : (
          <p className="lede">A published brief is required before conversion. This assignment may also lack convert authority.</p>
        )}
      </section>

      <section id="budget-studio" className="form programme-form">
        <h2>Planner Budget Studio</h2>
        <p className="lede">
          Figures are deterministic forecasts, not payments. A missing or synthetic price stays partial or blocked. Lower-spend scenarios stay first-class. Protected lines cannot be dropped to force a total.
        </p>
        {intelligence.priceEvidence?.some((item) => item.synthetic) ? (
          <p data-testid="budget-synthetic-warning">
            Seeded amounts are labelled synthetic, non-production, provisional and unsupported for real-client reliance. They are not current vendor prices.
          </p>
        ) : null}
        {intelligence.scenarios.length === 0 ? (
          <p className="empty">No budget scenario yet. Instantiate a template to review the bill of materials.</p>
        ) : (
          <ul className="atelier-queue" data-testid="budget-scenario-list">
            {intelligence.scenarios.map((scenario) => (
              <li key={scenario.id} className="discovery-card">
                <p>
                  <strong>{scenario.purpose.replaceAll("_", " ").toLowerCase()}</strong>{" "}
                  <span className="md-status">{scenario.status.toLowerCase()}</span>{" "}
                  <span className="md-status">{scenario.alignment.toLowerCase()}</span>{" "}
                  <span className="md-status">{scenario.calculationStatus.toLowerCase()}</span>
                </p>
                <p>
                  Expected {moneyLabel(scenario.expectedMinor, scenario.currency)} · low {moneyLabel(scenario.lowMinor, scenario.currency)} ·
                  high {moneyLabel(scenario.highMinor, scenario.currency)}
                </p>
                {scenario.contingencyBasis ? (
                  <p>Contingency {moneyLabel(scenario.contingencyMinor ?? "0", scenario.currency)} · {scenario.contingencyBasis}</p>
                ) : null}
                {scenario.warnings?.length ? <p>{scenario.warnings[0]}</p> : null}
                {intelligence.lines
                  ?.filter((line) => line.scenarioId === scenario.id)
                  .map((line) => (
                    <p key={line.id}>
                      {line.itemCode.replaceAll("_", " ").toLowerCase()} · {line.inclusionReason} · {moneyLabel(line.expectedMinor, line.currency)} · {line.priceSource.toLowerCase().replaceAll("_", " ")}
                      {line.synthetic ? " · synthetic evidence" : ""}
                      {line.stale ? " · stale" : ""}
                    </p>
                  ))}
                {scenario.trace.length > 0 ? (
                  <details>
                    <summary>Calculation trace</summary>
                    <ul>
                      {scenario.trace.slice(0, 24).map((step, index) => (
                        <li key={`${scenario.id}-${index}`}>
                          {step.op}: {step.detail} = {step.value}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {intelligence.sensitivity
                  ?.filter((item) => item.scenarioId === scenario.id)
                  .map((run) => (
                    <p key={run.id}>Principal drivers: {run.drivers.map((item) => item.key.replaceAll("_", " ").toLowerCase()).join(", ")}</p>
                  ))}
                {canCalculateBudget && scenario.status === "DRAFT" ? (
                  <form action={submitBudgetScenarioAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="engagementId" value={engagementId} />
                    <input type="hidden" name="scenarioId" value={scenario.id} />
                    <input type="hidden" name="expectedVersion" value={scenario.version} />
                    <input type="hidden" name="expectedHash" value={scenario.resultHash} />
                    <PendingSubmit className="secondary" locked={mutationLocked}>
                      Submit immutable scenario
                    </PendingSubmit>
                  </form>
                ) : null}
                {canDecideBudget && (scenario.status === "DRAFT" || scenario.status === "SUBMITTED") ? (
                  <form action={decideBudgetScenarioAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="engagementId" value={engagementId} />
                    <input type="hidden" name="scenarioId" value={scenario.id} />
                    <input type="hidden" name="expectedVersion" value={scenario.version} />
                    <PendingSubmit locked={mutationLocked}>Approve this scenario</PendingSubmit>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {intelligence.comparisons?.length ? (
          <div data-testid="budget-comparison">
            {intelligence.comparisons.map((item) => (
              <p key={item.id}>
                Scenario movement {moneyLabel(item.totalMovementMinor)} · {item.clientExperienceConsequence} The lower-spend path is not inferior.
              </p>
            ))}
          </div>
        ) : null}
        {canCalculateBudget && intelligence.scenarios.length >= 2 ? (
          <form action={compareBudgetScenariosAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="leftScenarioId" value={intelligence.scenarios[0]!.id} />
            <input type="hidden" name="rightScenarioId" value={intelligence.scenarios[1]!.id} />
            <PendingSubmit className="secondary" locked={mutationLocked}>
              Compare scenarios
            </PendingSubmit>
          </form>
        ) : null}
        {canCalculateBudget ? (
          <form action={calculateBudgetScenarioAction} data-testid="budget-calculate-form">
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <label>
              Purpose
              <select name="purpose" defaultValue="PROTECT_PRIORITIES">
                <option value="PROTECT_INVESTMENT">Protect investment</option>
                <option value="PROTECT_PRIORITIES">Protect priorities</option>
                <option value="PROTECT_FULL_BRIEF">Protect full brief</option>
                <option value="MAISON_RECOMMENDED">Maison recommended</option>
                <option value="CLIENT_ALTERNATIVE">Lower-spend alternative</option>
              </select>
            </label>
            <label>
              Template
              <select name="archetype" defaultValue="WEDDING">
                {intelligence.templates.map((item) => (
                  <option key={item.id} value={item.archetype}>
                    {item.archetype.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Guest count
              <input name="guests" required defaultValue="180" />
            </label>
            <PendingSubmit locked={mutationLocked}>Calculate scenario</PendingSubmit>
          </form>
        ) : (
          <p className="lede">Budget calculation is blocked for this assignment.</p>
        )}
      </section>

      <section id="roadmap-studio" className="form programme-form">
        <h2>Planner Roadmap Studio</h2>
        <p className="lede">Milestones are achieved-state outcomes. Cycles are rejected. Critical path uses earliest and latest dates and float, not a duration count.</p>
        {intelligence.schedule?.[0] ? (
          <p data-testid="roadmap-critical-path">
            Critical path: {intelligence.schedule[0].critical.map((item) => item.title).join(" → ") || "insufficient information"}
            {intelligence.schedule[0].compressionClass ? ` · ${intelligence.schedule[0].compressionClass.toLowerCase().replaceAll("_", " ")}` : ""}
          </p>
        ) : null}
        {intelligence.milestones.length === 0 ? (
          <p className="empty">No roadmap yet. Instantiating binds the current brief and budget hashes without rewriting earlier editions.</p>
        ) : (
          <ul className="atelier-queue" data-testid="roadmap-list">
            {intelligence.milestones.map((item) => (
              <li key={item.id}>
                {item.title} · {item.layer.replaceAll("_", " ").toLowerCase()} · {item.durationDays} days
                {item.purpose ? ` · ${item.purpose}` : ""}
                {item.delayConsequence ? ` · delay: ${item.delayConsequence}` : ""}
                {item.clientVisible ? "" : " · internal"}
              </li>
            ))}
          </ul>
        )}
        {canAuthorRoadmap ? (
          <form action={instantiateRoadmapAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <PendingSubmit locked={mutationLocked}>Instantiate roadmap</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section id="change-impact" className="form programme-form">
        <h2>Change impact</h2>
        {intelligence.changes.length === 0 ? (
          <p className="empty">No change proposal yet.</p>
        ) : (
          <ul className="atelier-queue" data-testid="change-list">
            {intelligence.changes.map((change) => (
              <li key={change.id} className="discovery-card">
                <p>
                  {change.summary} <span className="md-status">{change.status.replaceAll("_", " ").toLowerCase()}</span>
                </p>
                {intelligence.impacts
                  .filter((item) => item.changeProposalId === change.id)
                  .map((impact) => (
                    <p key={impact.id}>
                      {impact.impacts.map((entry) => `${entry.target}: ${entry.kind.toLowerCase()}`).join(" · ")}
                    </p>
                  ))}
                {canTriageChange && change.status === "DETECTED" ? (
                  <form action={assessChangeImpactAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="engagementId" value={engagementId} />
                    <input type="hidden" name="changeProposalId" value={change.id} />
                    <PendingSubmit className="secondary" locked={mutationLocked}>
                      Assess impact
                    </PendingSubmit>
                  </form>
                ) : null}
                {canDecideChange && change.status === "IMPACT_ASSESSED" ? (
                  <form action={decideChangeProposalAction}>
                    <IdempotencyField />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <input type="hidden" name="engagementId" value={engagementId} />
                    <input type="hidden" name="changeProposalId" value={change.id} />
                    <input type="hidden" name="expectedVersion" value={change.version} />
                    <label>
                      Decision
                      <select name="decision" defaultValue="APPROVE">
                        <option value="APPROVE">Approve and mark assumptions stale</option>
                        <option value="REJECT">Reject</option>
                      </select>
                    </label>
                    <PendingSubmit locked={mutationLocked}>Decide change</PendingSubmit>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canTriageChange ? (
          <form action={createChangeProposalAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <label>
              What changed
              <input name="summary" required maxLength={400} placeholder="Guest count may move from 180 to 220" />
            </label>
            <PendingSubmit locked={mutationLocked}>Record change</PendingSubmit>
          </form>
        ) : null}
      </section>

      {canManageSource ? (
        <section id="private-source-object" className="form programme-form">
          <h2>Private source object</h2>
          <p className="lede">
            Files stay private. There is no public URL, no executable rendering and no antivirus claim. Only synthetic files.
          </p>
          <form action={recordDiscoveryObjectAction}>
            <IdempotencyField />
            <input type="hidden" name="organisationId" value={organisationId} />
            <input type="hidden" name="engagementId" value={engagementId} />
            <label>
              Title
              <input name="title" required maxLength={200} defaultValue="Synthetic source object" />
            </label>
            <label>
              File
              <input name="file" type="file" required accept=".txt,.pdf,.png,.jpg,.jpeg" />
            </label>
            <PendingSubmit className="secondary" locked={mutationLocked}>
              Store private object
            </PendingSubmit>
          </form>
        </section>
      ) : null}
    </div>
  );
}
