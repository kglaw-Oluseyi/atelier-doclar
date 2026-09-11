import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AppShell } from "../../../../components/shell";
import { ActionResultBanner } from "../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../components/protection-mutation-form";
import { loadPresentedActionResult } from "../../../../server/action-flash";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";
import { protectionPermissions } from "../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../server/operational-state";
import { resolveDiscoveryOrganisation } from "../../../../server/discovery-scope";
import { withdrawExactSelectionAction } from "../../../../server/risk-actions";
import {
  S060_SYNTHETIC_RULE_KEYS,
  S061_ADDITIONAL_QA_LINEAGE,
  S061_ADDITIONAL_QA_RULE_KEYS,
  type RiskAuthorityState,
} from "@maison-doclar/shared-platform";

const STATES: RiskAuthorityState[] = [
  "CURRENT_APPROVED",
  "STALE_APPROVED",
  "AUTHORITY_CONFLICT",
  "WITHDRAWN_NO_AUTHORITY",
  "NO_APPROVED_EDITION",
];

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

export default async function AuthorityQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open the authority queue.")} />
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const assignmentId = runtime.service.resolveActor(person.id).assignments[0]?.id ?? "";
  const authorityState = typeof query.state === "string" && STATES.includes(query.state as RiskAuthorityState) ? (query.state as RiskAuthorityState) : undefined;
  const ruleKey = typeof query.ruleKey === "string" ? query.ruleKey : undefined;
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined;
  const started = Date.now();
  const page = runtime.service.listRiskAuthorityQueue(actor, {
    organisationId: organisation.id,
    cursor,
    limit: 20,
    authorityState,
    ruleKey,
  });
  const elapsedMs = Date.now() - started;
  const presented = await loadPresentedActionResult({
    requestPath: "/app/protection/authority",
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
  });
  const isRiskReviewer = Boolean(permissions.ruleReview && permissions.ruleApprove && !permissions.catalogueManage);
  const s060Rows = page.items.filter((item) => item.isSyntheticFixture && item.governingEditionId && S060_SYNTHETIC_RULE_KEYS.includes(item.ruleKey as (typeof S060_SYNTHETIC_RULE_KEYS)[number]));
  const s061ExtraPreview = isRiskReviewer
    ? runtime.service.listRiskAuthorityQueue(actor, {
        organisationId: organisation.id,
        ruleKeys: [...S061_ADDITIONAL_QA_RULE_KEYS],
        limit: S061_ADDITIONAL_QA_RULE_KEYS.length,
      }).items
    : [];
  const s061ExtraRows = s061ExtraPreview.filter(
    (item) => item.isSyntheticFixture && item.governingEditionId && item.governingContentHash && S061_ADDITIONAL_QA_RULE_KEYS.includes(item.ruleKey as (typeof S061_ADDITIONAL_QA_RULE_KEYS)[number]),
  );
  const filterHref = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { state: authorityState, ruleKey, ...next };
    if (merged.state) params.set("state", merged.state);
    if (merged.ruleKey) params.set("ruleKey", merged.ruleKey);
    if (merged.cursor) params.set("cursor", merged.cursor);
    const q = params.toString();
    return q ? `/app/protection/authority?${q}` : "/app/protection/authority";
  };
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/protection/authority">
      <AtelierPageHeader
        eyebrow="Protection command"
        title="Governing authority queue"
        lede="Review one rule lineage at a time. Historic editions stay on the durable record and are not loaded into this queue."
      />
      <ActionResultBanner presented={presented} />
      <p>
        <a href="/app/protection#protection-authority">Return to Protection Command</a>
      </p>
      <section className="atelier-panel" data-testid="authority-queue" data-queue-ms={String(elapsedMs)}>
        <h2 tabIndex={-1}>Authority work queue</h2>
        <p data-testid="authority-queue-counts">
          {page.totalCount} visible lineages · {page.hiddenHistoryCount} historic editions remain on the record · loaded in {elapsedMs} ms
        </p>
        <form className="atelier-form protection-form" method="get" action="/app/protection/authority">
          <label>
            Authority state
            <select name="state" defaultValue={authorityState ?? ""}>
              <option value="">All states</option>
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rule key
            <input name="ruleKey" defaultValue={ruleKey ?? ""} />
          </label>
          <button type="submit" className="button secondary">
            Filter queue
          </button>
        </form>
        {page.items.length ? (
          <ul className="protection-queue authority-queue-list">
            {page.items.map((item) => (
              <li key={item.ruleKey} data-testid={`authority-queue-${item.ruleKey}`} data-authority-state={item.authorityState} data-synthetic={item.isSyntheticFixture ? "true" : "false"}>
                <a href={`/app/protection/authority/${item.governingEditionId ?? ""}`}>
                  {item.ruleKey}
                </a>
                <span className="md-status">{item.authorityState.replaceAll("_", " ").toLowerCase()}</span>
                <p>{item.propositionSummary}</p>
                {item.isSyntheticFixture ? <p>Classified synthetic fixture{item.syntheticLineage ? ` · ${item.syntheticLineage}` : ""}</p> : null}
                <p>{item.hiddenHistoryCount} historic editions hidden from this queue.</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No governing authority rows match this filter.</p>
        )}
        {page.nextCursor ? (
          <p>
            <a href={filterHref({ cursor: page.nextCursor })}>Next page</a>
          </p>
        ) : null}
        {isRiskReviewer && s060Rows.length && s060Rows.every((item) => item.governingContentHash) ? (
          <ProtectionMutationForm action={withdrawExactSelectionAction} className="atelier-form protection-form" testId="authority-exact-s060-batch">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: 0,
                selections: JSON.stringify(
                  s060Rows.map((item) => ({
                    editionId: item.governingEditionId,
                    expectedVersion: item.governingVersion,
                    contentHash: item.governingContentHash,
                  })),
                ),
              }}
            />
            <IdempotencyField />
            <p data-testid="authority-exact-s060-preview">
              Exact S060 synthetic authorities previewed: {s060Rows.map((item) => `${item.ruleKey} ${item.governingEditionId}`).join("; ")}.
              Withdrawal removes future governing authority and retains immutable history. This is not a wildcard cleanup.
            </p>
            <label>
              Reason
              <textarea name="reason" required rows={3} defaultValue="Obsolete S060 synthetic QA authority. These timestamp-named public-liability rules were created by S060 live maker/checker tests and are not continuing Maison Doclar governing policy." />
            </label>
            <button type="submit" className="button">
              Withdraw exact previewed S060 authorities
            </button>
          </ProtectionMutationForm>
        ) : null}
        {isRiskReviewer && s061ExtraRows.length === S061_ADDITIONAL_QA_RULE_KEYS.length ? (
          <ProtectionMutationForm action={withdrawExactSelectionAction} className="atelier-form protection-form" testId="authority-exact-s061-batch">
            <Envelope
              fields={{
                organisationId: organisation.id,
                assignmentId,
                expectedVersion: 0,
                selections: JSON.stringify(
                  s061ExtraRows.map((item) => ({
                    editionId: item.governingEditionId,
                    expectedVersion: item.governingVersion,
                    contentHash: item.governingContentHash,
                  })),
                ),
              }}
            />
            <IdempotencyField />
            <p data-testid="authority-exact-s061-preview">
              Exact S061 synthetic QA authorities previewed: {s061ExtraRows.map((item) => `${item.ruleKey} ${item.governingEditionId}`).join("; ")}.
              Withdrawal removes future governing authority and retains immutable history. This is not a wildcard cleanup.
            </p>
            <label>
              Reason
              <textarea name="reason" required rows={3} defaultValue={S061_ADDITIONAL_QA_LINEAGE} />
            </label>
            <button type="submit" className="button">
              Withdraw exact previewed S061 QA authorities
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>
    </AppShell>
  );
}
