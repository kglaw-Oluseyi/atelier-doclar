import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../../components/shell";
import { ActionResultBanner } from "../../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../../components/protection-mutation-form";
import { loadPresentedActionResult } from "../../../../../../server/action-flash";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";
import { protectionPermissions } from "../../../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../../../server/operational-state";
import { resolveDiscoveryOrganisation } from "../../../../../../server/discovery-scope";
import { recordAuthorityReviewAction } from "../../../../../../server/risk-actions";

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

export default async function AuthoritySourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceEditionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sourceEditionId } = await params;
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
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open source authority detail.")} />
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const assignmentId = runtime.service.resolveActor(person.id).assignments[0]?.id ?? "";
  let detail;
  try {
    detail = runtime.service.getRiskAuthoritySourceDetail(actor, organisation.id, sourceEditionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source authority detail is unavailable.";
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/protection/authority">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/protection/authority/source/${sourceEditionId}`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
  });
  const isRiskReviewer = Boolean(permissions.ruleReview && permissions.ruleApprove && !permissions.catalogueManage);
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/protection/authority">
      <AtelierPageHeader
        eyebrow="Focused source"
        title={detail.source.title}
        lede="Cited source for a governing rule. Historic source editions remain on the durable record."
      />
      <ActionResultBanner presented={presented} />
      <p>
        <a href="/app/protection/authority">Back to authority queue</a>
      </p>
      <section className="atelier-panel" data-testid="authority-source-detail">
        <h2 tabIndex={-1}>Source edition</h2>
        <p>
          {detail.source.id} · {detail.source.status} · Review again by {detail.source.nextReviewAt}
          {detail.expired ? " · expired" : ""}
        </p>
        <p>{detail.source.summary}</p>
        <ol>
          {detail.history.map((item) => (
            <li key={item.id}>
              {item.id} · {item.status} · v{item.version}
            </li>
          ))}
        </ol>
        {isRiskReviewer && detail.expired ? (
          <ProtectionMutationForm action={recordAuthorityReviewAction} className="atelier-form protection-form" testId="source-record-review">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: detail.source.version,
                editionId: detail.source.id,
                targetKind: "SOURCE",
                reviewAction: "RECORD_CURRENT_REVIEW",
                confirmedHash: detail.source.contentHash,
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
            <button type="submit" className="button">
              Record current source review
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
    </AppShell>
  );
}
