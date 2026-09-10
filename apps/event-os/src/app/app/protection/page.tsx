import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../components/atelier-section-tabs";
import { AppShell } from "../../../components/shell";
import { ActionResultBanner } from "../../../components/action-result-banner";
import { IdempotencyField } from "../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../components/protection-mutation-form";
import { ProtectionReleaseEvidence } from "../../../components/protection-release-evidence";
import { loadPresentedActionResult } from "../../../server/action-flash";
import { deployedSha, productionAuthorised } from "../../../server/config";
import { guardedActor } from "../../../server/guard";
import { getRuntime, persistenceLabel } from "../../../server/runtime";
import { protectionPermissions } from "../../../server/protection-scope";
import {
  approveRiskSourceAction,
  createRiskClauseTemplateAction,
  createRiskEvidenceAction,
  completeRiskEvidenceUploadAction,
  createRiskPolicyAction,
  createRiskPolicyEditionAction,
  createRiskRuleAction,
  createRiskSourceAction,
  reviewRiskClauseAction,
  recordAuthorityReviewAction,
  reviewRiskRuleAction,
  runS05BEvaluationAction,
  verifyRiskPolicyAction,
  assessRiskVendorAction,
  decideRiskVendorAction,
} from "../../../server/risk-actions";
import { operationalStateFromCode } from "../../../server/operational-state";
import { resolveDiscoveryOrganisation } from "../../../server/discovery-scope";

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

export default async function ProtectionCommandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const organisation = resolveDiscoveryOrganisation(actor);
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/protection">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "No organisation assignment is available.")} />
      </AppShell>
    );
  }
  const permissions = protectionPermissions(person, organisation.id);
  if (!permissions.catalogueView && !permissions.eventView) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/protection">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open Protection Command.")} />
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const overview = runtime.service.getOrganisationProtection(actor, organisation.id);
  const evaluation = runtime.service.getS05BReadiness(organisation.id);
  const s05a = runtime.service.getS05AReadiness(organisation.id);
  const assignmentId = runtime.service.resolveActor(person.id).assignments[0]?.id ?? "";
  const isRiskReviewer = Boolean(permissions.ruleReview && permissions.ruleApprove && !permissions.catalogueManage);
  const presented = await loadPresentedActionResult({
    requestPath: "/app/protection",
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
  });
  const envelope = { organisationId: organisation.id, assignmentId };
  const now = process.env.EVENT_OS_TEST_NOW?.trim() || new Date().toISOString();
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/protection">
      <AtelierPageHeader
        eyebrow="Organisation command"
        title="Protection Command"
        lede="What protection applies, what evidence supports it, what remains exposed, and which decision is due. This is not insurer confirmation or legal advice."
      />
      <ActionResultBanner presented={presented} />
      <AtelierSectionTabs
        label="Protection Command sections"
        items={[
          { href: "#protection-overview", label: "Overview" },
          { href: "#protection-policies", label: "Policies" },
          { href: "#protection-authority", label: "Authority review" },
          { href: "#protection-rules", label: "Rules and Sources" },
          { href: "#protection-clauses", label: "Clause Templates" },
          { href: "#protection-vendors", label: "Vendors" },
          { href: "#protection-renewals", label: "Renewals" },
          { href: "#protection-portfolio", label: "Portfolio Insights" },
        ]}
      />
      <section id="protection-overview" className="atelier-panel" data-testid="protection-command">
        <h2>No-blind-spots</h2>
        <ul className="protection-headline-list">
          <li>
            <a href={overview.headlineLinks.highConsequenceUnknowns}>{overview.highConsequenceUnknowns} high-consequence unknowns</a>
          </li>
          <li>
            <a href={overview.headlineLinks.decisionsWaiting}>{overview.decisionsWaiting} decisions waiting</a>
          </li>
          <li>
            <a href={overview.headlineLinks.openIncidents}>{overview.openIncidents} open incidents</a>
          </li>
          <li>
            <a href={overview.headlineLinks.untestedFallbacks}>{overview.untestedFallbacks} untested fallbacks</a>
          </li>
        </ul>
        <ul className="protection-queue">
          {overview.events.map((event) => (
            <li key={event.id}>
              <a href={`/app/events/${event.id}/protection`}>{event.name}</a>
              <span className="md-status">{event.readiness}</span>
              {event.readiness !== "READY" ? <span> — not ready until unknowns and gaps are resolved.</span> : null}
            </li>
          ))}
        </ul>
        <h3>Decision queue</h3>
        {overview.decisionQueue.length ? (
          <ul className="protection-decision-queue">
            {overview.decisionQueue.map((item) => (
              <li key={item.id}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No organisation decisions are waiting.</p>
        )}
      </section>
      <section id="protection-policies" className="atelier-panel">
        <h2>Policies</h2>
        <p>
          {overview.policyCount} organisation or event policies on file. A certificate is evidence, not coverage certainty.
        </p>
        <div className="protection-matrix">
          {overview.policyEditions.map((item) => (
            <article key={item.id} className="protection-card">
              <h3>{item.policyType}</h3>
              <p>{item.insurerLabel}</p>
              <p>
                {item.period.startOn} – {item.period.endOn} · {item.verificationState}
              </p>
              {permissions.policyVerify ? (
                <ProtectionMutationForm action={verifyRiskPolicyAction} className="protection-form">
                  <Envelope fields={{ ...envelope, expectedVersion: item.version, editionId: item.id }} />
                  <IdempotencyField />
                  <label>
                    Verification decision
                    <select name="decision" required>
                      <option value="">Select</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </label>
                  <button type="submit" className="button secondary">
                    Record verification
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </article>
          ))}
        </div>
        {permissions.policyManage ? (
          <>
            <ProtectionMutationForm action={createRiskPolicyAction} className="atelier-form protection-form" testId="protection-create-policy">
              <Envelope fields={{ ...envelope, expectedVersion: 0 }} />
              <IdempotencyField />
              <label htmlFor="policyType">
                Policy type
                <select id="policyType" name="policyType" required>
                  <option value="">Select type</option>
                  <option value="PUBLIC_LIABILITY">Public liability</option>
                  <option value="EVENT_CANCELLATION">Event cancellation</option>
                  <option value="EMPLOYEE_COMPENSATION">Employee compensation</option>
                </select>
              </label>
              <label htmlFor="insurerPartyId">
                Insurer
                <select id="insurerPartyId" name="insurerPartyId" required={overview.insurers.length > 0}>
                  <option value="">Select insurer</option>
                  {overview.insurers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — {item.disambiguation}
                    </option>
                  ))}
                </select>
              </label>
              {overview.insurers.length ? null : (
                <p data-testid="insurer-empty">No eligible insurer is on the governed party register for this organisation.</p>
              )}
              <button type="submit" className="button">
                Create policy
              </button>
            </ProtectionMutationForm>
            <ProtectionMutationForm action={createRiskEvidenceAction} className="atelier-form protection-form">
              <Envelope fields={{ ...envelope, expectedVersion: 0 }} />
              <IdempotencyField />
              <label>
                Evidence title
                <input name="title" required />
              </label>
              <label>
                Classification
                <select name="classification" required>
                  <option value="">Select</option>
                  <option value="POLICY_IDENTIFIER">Policy identifier</option>
                  <option value="LIMIT_DEDUCTIBLE">Limit or deductible</option>
                  <option value="OPERATIONAL">Operational</option>
                </select>
              </label>
              <label>
                Original filename
                <input name="originalFilename" required />
              </label>
              <button type="submit" className="button secondary">
                Register evidence document
              </button>
            </ProtectionMutationForm>
            <ProtectionMutationForm action={completeRiskEvidenceUploadAction} className="atelier-form protection-form">
              <Envelope fields={envelope} />
              <IdempotencyField />
              <label>
                Current document version
                <input name="expectedVersion" type="number" min={1} required />
              </label>
              <label>
                Document
                <select name="documentId" required>
                  <option value="">Select document</option>
                  {overview.evidence.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.state}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Object key
                <input name="objectKey" required placeholder="risk/organisation/document" />
              </label>
              <label>
                SHA-256 checksum
                <input name="byteChecksum" required minLength={64} maxLength={64} />
              </label>
              <label>
                Byte length
                <input name="byteLength" type="number" min={1} required />
              </label>
              <label>
                Content type
                <input name="contentType" required placeholder="application/pdf" />
              </label>
              <button type="submit" className="button secondary">
                Complete evidence upload
              </button>
            </ProtectionMutationForm>
            <ProtectionMutationForm action={createRiskPolicyEditionAction} className="atelier-form protection-form" testId="protection-create-edition">
              <Envelope fields={envelope} />
              <IdempotencyField />
              <label>
                Current policy version
                <input name="expectedVersion" type="number" min={1} required />
              </label>
              <label>
                Policy
                <select name="policyId" required>
                  <option value="">Select policy</option>
                  {overview.policies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.policyType} · {item.insurerLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Policy number
                <input name="policyNumber" required autoComplete="off" />
              </label>
              <label>
                Currency
                <input name="currency" required />
              </label>
              <label>
                Cover start
                <input name="startOn" type="date" required />
              </label>
              <label>
                Cover end
                <input name="endOn" type="date" required />
              </label>
              <label>
                Coverage key
                <input name="coverageKey" required />
              </label>
              <label>
                Limit (minor units)
                <input name="limitMinor" required inputMode="numeric" />
              </label>
              <label>
                Limit basis
                <input name="limitBasis" required />
              </label>
              <label>
                Deductible (minor units)
                <input name="deductibleMinor" inputMode="numeric" />
              </label>
              <label>
                Insured parties
                <input name="insuredPartyLabels" required placeholder="Comma-separated labels" />
              </label>
              <label>
                Territorial scope
                <input name="territorialScope" />
              </label>
              <label>
                Activity scope
                <input name="activityScope" />
              </label>
              <label>
                Endorsements
                <textarea name="endorsementNotes" rows={3} />
              </label>
              <label>
                Exclusions
                <textarea name="exclusionNotes" rows={3} />
              </label>
              <label>
                Evidence document
                <select name="documentEditionId" required>
                  <option value="">Select evidence</option>
                  {overview.evidence.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="button">
                Save policy edition
              </button>
            </ProtectionMutationForm>
          </>
        ) : null}
      </section>
      <section id="protection-authority" className="atelier-panel" data-testid="protection-authority-review">
        <h2>Governing authority review</h2>
        <p>Historic drafts remain visible as history. Only one approved exact-hash edition per rule key governs applicability.</p>
        <ul>
          {(overview.effectiveAuthorities ?? []).map((item) => (
            <li key={item.ruleId} data-testid={`authority-${item.ruleKey}`} data-authority-state={item.authorityState}>
              <strong>{item.ruleKey}</strong> · {item.authorityState.replaceAll("_", " ").toLowerCase()}
              {item.governing ? " · governing edition" : " · not governing"}
              <p>
                Edition {item.ruleId} · Review again by {item.nextReviewAt}
              </p>
              {item.reasons.length ? <p>{item.reasons.join("; ")}</p> : null}
              {item.sources.map((source) => (
                <p key={source.id}>
                  Cited source {source.title} · {source.status} · Review again by {source.nextReviewAt}
                </p>
              ))}
              {isRiskReviewer && (item.authorityState === "STALE_APPROVED" || item.authorityState === "AUTHORITY_CONFLICT") ? (
                <>
                  <ProtectionMutationForm action={recordAuthorityReviewAction} className="atelier-form protection-form" testId={`authority-record-review-${item.ruleKey}`}>
                    <Envelope fields={{ ...envelope, expectedVersion: item.version, editionId: item.ruleId, targetKind: "RULE", reviewAction: "RECORD_CURRENT_REVIEW", confirmedHash: item.contentHash }} />
                    <IdempotencyField />
                    <label>
                      Review reason
                      <textarea name="reason" required rows={2} />
                    </label>
                    <label>
                      Review again by
                      <input type="date" name="nextReviewOn" required />
                    </label>
                    <button type="submit" className="button">
                      Record current review
                    </button>
                  </ProtectionMutationForm>
                  <ProtectionMutationForm action={recordAuthorityReviewAction} className="atelier-form protection-form" testId={`authority-create-successor-${item.ruleKey}`}>
                    <Envelope fields={{ ...envelope, expectedVersion: item.version, editionId: item.ruleId, targetKind: "RULE", reviewAction: "CREATE_REVIEW_SUCCESSOR", confirmedHash: item.contentHash }} />
                    <IdempotencyField />
                    <label>
                      Review reason
                      <textarea name="reason" required rows={2} />
                    </label>
                    <label>
                      Review again by
                      <input type="date" name="nextReviewOn" required />
                    </label>
                    <button type="submit" className="button secondary">
                      Create review successor
                    </button>
                  </ProtectionMutationForm>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        {(overview.sources ?? [])
          .filter((source) => source.status === "APPROVED" && Boolean(source.nextReviewAt) && source.nextReviewAt <= now)
          .map((source) =>
            isRiskReviewer ? (
              <ProtectionMutationForm key={source.id} action={recordAuthorityReviewAction} className="atelier-form protection-form" testId={`source-record-review-${source.id}`}>
                <Envelope
                  fields={{
                    ...envelope,
                    expectedVersion: source.version,
                    editionId: source.id,
                    targetKind: "SOURCE",
                    reviewAction: "RECORD_CURRENT_REVIEW",
                    confirmedHash: source.contentHash ?? "",
                  }}
                />
                <IdempotencyField />
                <p>
                  Source {source.title} · Review again by {source.nextReviewAt}
                </p>
                <label>
                  Review reason
                  <textarea name="reason" required rows={2} />
                </label>
                <label>
                  Review again by
                  <input type="date" name="nextReviewOn" required />
                </label>
                <button type="submit" className="button secondary">
                  Record current source review
                </button>
              </ProtectionMutationForm>
            ) : null,
          )}
      </section>
      <section id="protection-rules" className="atelier-panel">
        <h2>Rules and sources</h2>
        <p>Discovery sources can generate questions. Only approved rules participate in readiness. Unapproved and superseded editions stay as history.</p>
        <ul>
          {overview.sources.map((source) => (
            <li key={source.id}>
              {source.title} · {source.status} · {source.jurisdiction}
              {source.historyOnly ? " · history" : source.governing ? " · governing source" : ""}
              {permissions.ruleApprove && source.status !== "APPROVED" && source.status !== "SUPERSEDED" ? (
                <ProtectionMutationForm action={approveRiskSourceAction}>
                  <Envelope fields={{ ...envelope, expectedVersion: source.version, sourceId: source.id }} />
                  <IdempotencyField />
                  <button type="submit" className="button secondary">
                    Approve source
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </li>
          ))}
        </ul>
        <ul>
          {overview.ruleLibrary.map((rule) => (
            <li key={rule.id}>
              {rule.ruleKey} · {rule.status} · {rule.jurisdiction} · {rule.proposition}
              {rule.historyOnly ? " · history" : rule.governing ? " · governing" : ""}
              {permissions.ruleApprove && rule.status !== "APPROVED" && rule.status !== "SUPERSEDED" ? (
                <ProtectionMutationForm action={reviewRiskRuleAction}>
                  <Envelope fields={{ ...envelope, expectedVersion: rule.version, ruleId: rule.id }} />
                  <label>
                    Review
                    <select name="status" required>
                      <option value="">Select</option>
                      <option value="COUNSEL_REVIEWED">Counsel reviewed</option>
                      <option value="APPROVED">Approved</option>
                      <option value="WITHDRAWN">Withdrawn</option>
                    </select>
                  </label>
                  <button type="submit" className="button secondary">
                    Record rule review
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </li>
          ))}
        </ul>
        {permissions.catalogueManage ? (
          <>
            <ProtectionMutationForm action={createRiskSourceAction} className="atelier-form protection-form" testId="protection-create-source">
              <Envelope fields={{ ...envelope, expectedVersion: 0 }} />
              <IdempotencyField />
              <label>
                Source title
                <input name="title" required />
              </label>
              <label>
                Publisher
                <input name="publisher" required />
              </label>
              <label>
                Locator
                <input name="locator" required />
              </label>
              <label>
                Authority
                <select name="authority" required>
                  <option value="">Select</option>
                  <option value="REGULATOR">Regulator</option>
                  <option value="LEGISLATION">Legislation</option>
                  <option value="INTERNAL_POLICY">Internal policy</option>
                </select>
              </label>
              <label>
                Jurisdiction
                <input name="jurisdiction" required />
              </label>
              <label>
                Summary
                <textarea name="summary" required rows={3} />
              </label>
              <label>
                Review again by
                <input type="date" name="nextReviewOn" required />
              </label>
              <button type="submit" className="button">
                Record discovery source
              </button>
            </ProtectionMutationForm>
            <ProtectionMutationForm action={createRiskRuleAction} className="atelier-form protection-form">
              <Envelope fields={{ ...envelope, expectedVersion: 0 }} />
              <IdempotencyField />
              <label>
                Rule key
                <input name="ruleKey" required />
              </label>
              <label>
                Jurisdiction
                <input name="jurisdiction" required />
              </label>
              <label>
                Cited proposition
                <textarea name="proposition" required rows={3} />
              </label>
              <label htmlFor="sourceEditionIds">
                Source editions
                <select id="sourceEditionIds" name="sourceEditionIds" multiple required size={Math.min(6, Math.max(3, overview.sources.length + 1))}>
                  {overview.sources.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.jurisdiction}
                    </option>
                  ))}
                </select>
              </label>
              {overview.sources.length ? null : <p>Record a discovery source before drafting a rule.</p>}
              <label>
                Requirement key
                <input name="requirementKey" required />
              </label>
              <label>
                Policy type
                <select name="policyType">
                  <option value="">None</option>
                  <option value="PUBLIC_LIABILITY">Public liability</option>
                  <option value="EVENT_CANCELLATION">Event cancellation</option>
                </select>
              </label>
              <label>
                Mandatory
                <select name="mandatory" required>
                  <option value="">Select</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label>
                Review again by
                <input type="date" name="nextReviewOn" required />
              </label>
              <button type="submit" className="button">
                Draft rule
              </button>
            </ProtectionMutationForm>
          </>
        ) : null}
      </section>
      <section id="protection-clauses" className="atelier-panel">
        <h2>Clause templates</h2>
        <div className="protection-matrix">
          {overview.clauses.map((item) => (
            <article key={item.id} className="protection-card">
              <h3>{item.title}</h3>
              <p>
                {item.family} · {item.status} · {item.jurisdiction}
              </p>
            </article>
          ))}
          {overview.clauseEditions.map((item) => (
            <article key={item.id} className="protection-card">
              <h3>{item.family}</h3>
              <p>
                Legal {item.legalReviewStatus} · Commercial {item.commercialApprovalStatus}
              </p>
              <p>{item.enforceabilityClaimed ? "Enforceability claimed" : "Not claimed as enforceable"}</p>
              {"renderedBody" in item && item.renderedBody ? (
                <pre data-testid="clause-rendered-body" className="clause-body">
                  {String(item.renderedBody)}
                </pre>
              ) : null}
              {permissions.clauseLegal || permissions.clauseCommercial ? (
                <ProtectionMutationForm action={reviewRiskClauseAction} className="protection-form">
                  <Envelope fields={{ ...envelope, expectedVersion: item.version, editionId: item.id }} />
                  <IdempotencyField />
                  <label>
                    Gate
                    <select name="gate" required>
                      <option value="">Select</option>
                      {permissions.clauseLegal ? <option value="LEGAL">Legal</option> : null}
                      {permissions.clauseCommercial ? <option value="COMMERCIAL">Commercial</option> : null}
                    </select>
                  </label>
                  <label>
                    Decision
                    <select name="decision" required>
                      <option value="">Select</option>
                      <option value="APPROVED">Approved</option>
                      <option value="CHANGES_REQUESTED">Changes requested</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </label>
                  <button type="submit" className="button secondary">
                    Record clause decision
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </article>
          ))}
        </div>
        {permissions.clauseDraft ? (
          <ProtectionMutationForm action={createRiskClauseTemplateAction} className="atelier-form protection-form" testId="protection-create-clause">
            <Envelope fields={{ ...envelope, expectedVersion: 0 }} />
            <IdempotencyField />
            <label>
              Family
              <select name="family" required>
                <option value="">Select</option>
                <option value="RETENTION">Retention</option>
                <option value="LIQUIDATED_DAMAGES">Liquidated damages</option>
                <option value="INDEMNITY">Indemnity</option>
              </select>
            </label>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Jurisdiction
              <input name="jurisdiction" required />
            </label>
            <label>
              Body
              <textarea name="body" required rows={4} placeholder="Use {{PLACEHOLDER}} variables." />
            </label>
            <label>
              Variable keys
              <input name="variableKeys" placeholder="Comma-separated PLACEHOLDER keys" />
            </label>
            <button type="submit" className="button">
              Save clause template
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
      <section id="protection-vendors" className="atelier-panel">
        <h2>Vendors</h2>
        <div className="protection-matrix">
          {overview.vendors.map((item) => {
            const party = overview.vendorParties.find((row) => row.id === item.vendorId);
            return (
            <article key={item.id} className="protection-card" data-testid="vendor-assessment-card">
              <h3>{party?.label ?? "Governed vendor"}</h3>
              <p>{party?.disambiguation ?? "Organisation vendor register"}</p>
              {permissions.catalogueManage ? <p className="technical-provenance">Technical provenance {item.vendorId}</p> : null}
              <p>
                Band {item.band} · {item.humanDecision ?? "no human decision"}
              </p>
              {item.indicators?.map((indicator) => (
                <p key={indicator.key}>
                  {indicator.key}: {indicator.explanation}
                </p>
              ))}
              {permissions.vendorDecide ? (
                <ProtectionMutationForm action={decideRiskVendorAction} className="protection-form">
                  <Envelope fields={{ ...envelope, expectedVersion: "version" in item ? Number(item.version) : 1, assessmentId: item.id }} />
                  <IdempotencyField />
                  <label>
                    Decision
                    <select name="decision" required>
                      <option value="">Select</option>
                      <option value="APPROVED">Approved</option>
                      <option value="RESTRICTED">Restricted</option>
                      <option value="DECLINED">Declined</option>
                    </select>
                  </label>
                  <label>
                    Reason
                    <textarea name="reason" required rows={2} />
                  </label>
                  <button type="submit" className="button secondary">
                    Record vendor decision
                  </button>
                </ProtectionMutationForm>
              ) : null}
            </article>
            );
          })}
        </div>
        {permissions.vendorAssess ? (
          <ProtectionMutationForm action={assessRiskVendorAction} className="atelier-form protection-form" testId="protection-assess-vendor">
            <Envelope fields={{ ...envelope, expectedVersion: 0 }} />
            <IdempotencyField />
            <label htmlFor="vendorId">
              Vendor
              <select id="vendorId" name="vendorId" required={overview.vendorParties.length > 0}>
                <option value="">Select vendor</option>
                {overview.vendorParties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.disambiguation}
                  </option>
                ))}
              </select>
            </label>
            {overview.vendorParties.length ? null : (
              <p data-testid="vendor-empty">No eligible vendor is on the governed party register for this organisation.</p>
            )}
            <button type="submit" className="button">
              Run vendor assessment
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
      <section id="protection-renewals" className="atelier-panel">
        <h2>Renewals</h2>
        {overview.renewals.length ? (
          <ul>
            {overview.renewals.map((item) => (
              <li key={item.id}>
                <a href="#protection-policies">
                  {item.policyType} · {item.insurerLabel} · ends {item.endOn}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No current editions are on the renewal list.</p>
        )}
        {overview.expiringEvidence.length ? (
          <ul>
            {overview.expiringEvidence.map((item) => (
              <li key={item.id}>
                {item.policyType} · {item.insurerLabel} · {item.period.endOn} · identifier {item.policyIdentifierAvailable ? "held privately" : "withheld"}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section id="protection-portfolio" className="atelier-panel" data-testid="s05b-evaluation-panel">
        <h2>Portfolio insights</h2>
        <p>
          Dossier currency: {overview.dossierCurrency.map((item) => item.status).join(", ") || "no current dossiers"}. High-consequence unknowns, expiring evidence, untested fallbacks and incidents are listed without a reassuring score.
        </p>
        <p>
          S05B evaluation is {evaluation.evaluationStatus}. {evaluation.evaluationBlocked ? "Release is blocked." : "Current complete pass is fixture-release-ready."} Corpus {evaluation.corpusEdition} · {evaluation.caseCount} cases.
        </p>
        <ProtectionReleaseEvidence
          deployedSha={deployedSha()}
          persistence={persistenceLabel()}
          migrationStatus={runtime.migrationStatus}
          productionAuthorised={productionAuthorised()}
          s05aStatus={s05a.evaluationStatus}
          s05aEdition={s05a.evaluationCorpusEdition}
          evaluation={evaluation}
        />
        {permissions.auditView ? (
          <ProtectionMutationForm action={runS05BEvaluationAction}>
            <input type="hidden" name="organisationId" value={organisation.id} />
            <IdempotencyField />
            <button type="submit" className="button">
              Run S05B fixture assurance
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
    </AppShell>
  );
}
