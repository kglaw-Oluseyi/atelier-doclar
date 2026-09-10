import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../components/shell";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../components/protection-mutation-form";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { protectionPermissions } from "../../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { resolveDiscoveryOrganisation } from "../../../../../server/discovery-scope";
import {
  classifyFixtureAuthorityAction,
  recordAuthorityReviewAction,
  reviewRiskRuleAction,
  withdrawRiskAuthorityAction,
} from "../../../../../server/risk-actions";
import { S062_AUTHORITY_PROMPT_ID } from "@maison-doclar/shared-platform";

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

export default async function AuthorityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ruleEditionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { ruleEditionId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const organisation = resolveDiscoveryOrganisation(actor);
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/protection/authority">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "No organisation assignment is available.")} />
      </AppShell>
    );
  }
  const permissions = protectionPermissions(person, organisation.id);
  if (!permissions.catalogueView && !permissions.eventView) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/protection/authority">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open authority detail.")} />
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const assignmentId = runtime.service.resolveActor(person.id).assignments[0]?.id ?? "";
  const started = Date.now();
  let detail;
  try {
    detail = runtime.service.getRiskAuthorityDetail(actor, organisation.id, ruleEditionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authority detail is unavailable.";
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/protection/authority">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", message)} />
      </AppShell>
    );
  }
  const elapsedMs = Date.now() - started;
  const presented = await loadPresentedActionResult({
    requestPath: `/app/protection/authority/${ruleEditionId}`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
  });
  const isRiskReviewer = Boolean(permissions.ruleReview && permissions.ruleApprove && !permissions.catalogueManage);
  const item = detail.item;
  const draft = detail.history.find((row) => row.id === ruleEditionId && (row.status === "DISCOVERY" || row.status === "COUNSEL_REVIEWED"));
  const editionId = item.governingEditionId ?? ruleEditionId;
  const hash = detail.history.find((row) => row.id === editionId)?.contentHash ?? "";
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/protection/authority">
      <AtelierPageHeader
        eyebrow="Focused authority"
        title={item.ruleKey}
        lede="One rule lineage. Withdrawal removes future governing authority and retains immutable history."
      />
      <ActionResultBanner presented={presented} />
      <p>
        <a href="/app/protection/authority">Back to authority queue</a>
      </p>
      <section className="atelier-panel" data-testid="authority-detail" data-authority-state={item.authorityState} data-detail-ms={String(elapsedMs)}>
        <h2 tabIndex={-1}>Governing edition</h2>
        <p>
          Edition {editionId} · version {item.governingVersion ?? "n/a"} · {item.authorityState.replaceAll("_", " ").toLowerCase()}
        </p>
        <p>{item.propositionSummary}</p>
        {hash ? <p data-testid="authority-detail-hash">Content hash {hash}</p> : null}
        <p>{item.hiddenHistoryCount} historic editions remain available below.</p>
        {item.isSyntheticFixture ? <p data-testid="authority-detail-fixture">Classified synthetic fixture · {item.syntheticLineage}</p> : null}
        <h3>Cited sources</h3>
        <ul>
          {detail.sources.map((source) => (
            <li key={source.id}>
              <a href={`/app/protection/authority/source/${source.id}`}>{source.title}</a> · {source.status}
              {source.expired ? " · review expired" : ""}
            </li>
          ))}
        </ul>
        <h3>Immutable history</h3>
        <ol data-testid="authority-detail-history">
          {detail.history.map((row) => (
            <li key={row.id}>
              {row.id} · {row.status} · v{row.version} · {row.proposition}
            </li>
          ))}
        </ol>
        {isRiskReviewer && draft ? (
          <ProtectionMutationForm action={reviewRiskRuleAction} className="atelier-form protection-form" testId="authority-approve-draft">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: draft.version,
                ruleId: draft.id,
                status: "APPROVED",
                returnPath: `/app/protection/authority/${draft.id}`,
              }}
            />
            <IdempotencyField />
            <p>Exact draft {draft.id} · version {draft.version}. Approval creates governing authority for this lineage only.</p>
            <button type="submit" className="button">
              Approve this draft authority
            </button>
          </ProtectionMutationForm>
        ) : null}
        {isRiskReviewer && item.permittedActions.includes("WITHDRAW") ? (
          <ProtectionMutationForm action={withdrawRiskAuthorityAction} className="atelier-form protection-form" testId="authority-withdraw">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: item.governingVersion ?? 1,
                ruleId: editionId,
                confirmedHash: hash,
              }}
            />
            <IdempotencyField />
            <p>Exact edition {editionId} · version {item.governingVersion} · hash {hash}</p>
            <p>Consequence: removes future governing authority; retains immutable history. This is not a bulk action.</p>
            <label>
              Reason
              <textarea name="reason" required rows={3} />
            </label>
            <button type="submit" className="button">
              Withdraw this authority
            </button>
          </ProtectionMutationForm>
        ) : null}
        {isRiskReviewer && item.permittedActions.includes("REVIEW_SUCCESSOR") ? (
          <ProtectionMutationForm action={recordAuthorityReviewAction} className="atelier-form protection-form" testId="authority-record-review">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: item.governingVersion ?? 1,
                editionId,
                targetKind: "RULE",
                reviewAction: "RECORD_CURRENT_REVIEW",
                confirmedHash: hash,
              }}
            />
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
              Record current review
            </button>
          </ProtectionMutationForm>
        ) : null}
        {isRiskReviewer && !item.isSyntheticFixture && item.authorityState !== "NO_APPROVED_EDITION" ? (
          <ProtectionMutationForm action={classifyFixtureAuthorityAction} className="atelier-form protection-form" testId="authority-classify-fixture">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: item.governingVersion ?? 1,
                editionId,
                confirmedHash: hash,
                authorityPromptId: S062_AUTHORITY_PROMPT_ID,
                createdByAutomation: "true",
              }}
            />
            <IdempotencyField />
            <label>
              Test run identity
              <input name="testRunId" required defaultValue={`s062-${editionId.slice(0, 8)}`} />
            </label>
            <label>
              Synthetic lineage
              <textarea name="lineage" required rows={2} defaultValue="Obsolete S060 synthetic QA authority created by S060 live maker/checker tests. Not continuing Maison Doclar governing policy." />
            </label>
            <button type="submit" className="button secondary">
              Record fixture classification
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
    </AppShell>
  );
}
