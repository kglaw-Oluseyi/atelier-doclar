import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { AppShell } from "../../../../../components/shell";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { CanonicalId, CanonicalTime, HistoryDisclosure } from "../../../../../components/canonical-evidence";
import { IdempotencyField, PendingSubmit } from "../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../components/protection-mutation-form";
import { SeatingRuleAuthoringFields } from "../../../../../components/seating-rule-authoring-fields";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { preferredSeatingAssignment, seatingPermissions } from "../../../../../server/seating-scope";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import {
  activateReservationBlockAction,
  adoptSeatingRunAction,
  applySeatingChangeAction,
  cancelSeatingRunAction,
  createReservationBlockAction,
  createSeatingConstraintAction,
  decideSeatingApprovalAction,
  decideSeatingReviewAction,
  activateSeatingLayoutBindingAction,
  freezeSeatingInputsAction,
  launchSeatingRunAction,
  proposeSeatingLayoutBindingAction,
  publishSeatingPlanAction,
  releaseReservationBlockAction,
  requestSeatingExportAction,
  recallSeatingPlanAction,
  runS06EvaluationAction,
  submitSeatingPlanAction,
  withdrawSeatingLayoutBindingAction,
  supersedeReservationBlockAction,
  withdrawReservationBlockAction,
} from "../../../../../server/seating-actions";
import { switchSeatingVerifyAsAction } from "../../../../../server/seating-verify-as-action";
import { eventOsVerifyAsAvailable } from "../../../../../server/seating-verify-as";
import { emitSettlementStage, LEGACY_S06_PUBLICATION_LABEL, PlatformError, retryLockApplies, seatingV2ReplacementEnabled } from "@maison-doclar/shared-platform";
import { activateSeatingRuleAction, withdrawSeatingRuleAction } from "../../../../../server/seating-actions";

function visibleSeatingRuns<T extends { id: string }>(runs: T[], currentRunId: string | undefined, limit = 12): T[] {
  if (runs.length <= limit) return runs;
  const current = currentRunId ? runs.find((run) => run.id === currentRunId) : undefined;
  if (!current) return runs.slice(-limit);
  return [...runs.filter((run) => run.id !== currentRunId).slice(-(limit - 1)), current];
}

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

const TABS = [
  { href: "#overview", label: "Overview" },
  { href: "#inputs", label: "Inputs" },
  { href: "#rules", label: "Rules" },
  { href: "#reservations", label: "Reservations" },
  { href: "#runs", label: "Runs" },
  { href: "#studio", label: "Studio" },
  { href: "#review", label: "Review" },
  { href: "#publication", label: "Publication" },
] as const;

export const maxDuration = 60;

export default async function EventSeatingPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  const events = organisations.flatMap((item) => {
    try {
      return runtime.service.listEvents(actor, item.id);
    } catch {
      return [];
    }
  });
  let event = events.find((item) => item.id === eventId);
  const organisation = organisations.find((item) => item.id === event?.organisationId) ?? organisations[0];
  if (!event && organisation) {
    try {
      event = runtime.service.getEvent(actor, organisation.id, eventId);
    } catch {
      event = undefined;
    }
  }
  if (!event || !organisation) {
    const denialOrg = organisations[0];
    const denied = denialOrg ? !seatingPermissions(person, denialOrg.id, eventId).view : true;
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode(
            denied ? "FORBIDDEN" : "NOT_FOUND",
            denied ? "This assignment cannot perform this seating action." : "The requested event is not available in this assignment.",
          )}
        />
      </AppShell>
    );
  }
  const permissions = seatingPermissions(person, organisation.id, event.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot perform this seating action.")} />
      </AppShell>
    );
  }
  let workspace;
  let publicationSource: "V2" | "LEGACY" | "NONE" = "NONE";
  const workspaceStarted = Date.now();
  try {
    if (seatingV2ReplacementEnabled()) {
      workspace = await runtime.service.seatingV2Commands().projectWorkspace(actor, event.id);
      if (workspace.currentPublication) {
        publicationSource = "V2";
      } else {
        try {
          const legacyPub = await runtime.service.seatingCommands().projectCurrentPublication(actor, event.id);
          if (legacyPub?.id && legacyPub.publicationNumber && legacyPub.editionHash) {
            workspace = {
              ...workspace,
              currentPublication: {
                id: legacyPub.id,
                publicationNumber: legacyPub.publicationNumber,
                editionHash: legacyPub.editionHash,
                status: "CURRENT",
              },
              publications: [
                {
                  id: legacyPub.id,
                  status: "CURRENT",
                  publicationNumber: legacyPub.publicationNumber,
                  editionHash: legacyPub.editionHash,
                  publishedAt: legacyPub.publishedAt,
                },
                ...workspace.publications,
              ],
            };
            publicationSource = "LEGACY";
          }
        } catch {
          publicationSource = "NONE";
        }
      }
    } else {
      workspace = await runtime.service.seatingCommands().projectWorkspace(actor, event.id);
      if (workspace.currentPublication) publicationSource = "V2";
    }
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage ?? error.message : "This assignment cannot perform this seating action.";
    return (
      <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", message)} />
      </AppShell>
    );
  }
  const workspaceMs = Date.now() - workspaceStarted;
  const assignmentId = preferredSeatingAssignment(person.id, organisation.id, event.id)?.id ?? "";
  const actionResultStarted = Date.now();
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${event.id}/seating`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
    eventId: event.id,
  });
  const actionResultMs = Date.now() - actionResultStarted;
  const resultId = typeof query.result === "string" ? query.result : undefined;
  emitSettlementStage({
    stage: presented.correlationId && resultId && presented.correlationId === resultId ? "RENDER_RESULT_FOUND" : "RENDER_RESULT_MISSING",
    commandId: resultId,
    resultId,
    eventId: event.id,
    durationMs: actionResultMs,
    reasonClass: presented.correlationId ? "PRESENTED" : "ABSENT",
  });
  const envelopeFields = { organisationId: organisation.id, eventId: event.id, assignmentId };
  const working = workspace.workingEdition as { id?: string; contentHash?: string; status?: string; version?: number } | undefined;
  const input = workspace.inputEdition as { id?: string; contentHash?: string; layoutContentHash?: string } | undefined;
  const publication = workspace.currentPublication as { id?: string; publicationNumber?: number; editionHash?: string } | undefined;
  const verifyAs = eventOsVerifyAsAvailable() && permissions.fixtureVerifyAs;
  return (
    <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow="Seating Command"
        title={`${event.name} seating`}
        lede="The solver recommends. Authorised people decide. Published seating does not send messages, issue credentials or change check-in."
      />
      <p data-testid="seating-publication-badge">
        {publication
          ? `Current operational publication: Publication ${publication.publicationNumber}`
          : "No current operational publication"}
        {publicationSource === "LEGACY" ? ` · ${LEGACY_S06_PUBLICATION_LABEL}` : ""}
        {publication && working && working.status !== "PUBLISHED"
          ? ` · Current working edition: ${working.status} / unpublished`
          : ""}
      </p>
      <p data-testid="seating-freshness-badge">{workspace.freshnessCopy}</p>
      <p
        data-testid="seating-settlement"
        data-workspace-ms={workspaceMs}
        data-action-result-ms={actionResultMs}
        data-result-id={typeof query.result === "string" ? query.result : ""}
      >
        Render {workspaceMs}ms · action result {actionResultMs}ms
      </p>
      <ActionResultBanner presented={presented} />
      <div className="seating-tabs">
        <AtelierSectionTabs label="Seating Command views" items={TABS} />
      </div>

      <section id="overview" className="atelier-panel" data-testid="seating-overview">
        <h2>Overview</h2>
        <ul className="seating-metric-cards">
          <li><a href="#inputs">Input readiness · {workspace.inputFreshness}</a></li>
          <li><a href="#studio">Eligible guests · {workspace.counts.eligibleGuests}</a></li>
          <li><a href="#studio">Seated · {workspace.counts.seated}</a></li>
          <li><a href="#studio">Unseated · {workspace.counts.unseated}</a></li>
          <li><a href="#rules">Hard blockers · {workspace.counts.hardBlockers}</a></li>
          <li>
            <a href="#publication">
              Current operational publication · {publication ? `No. ${publication.publicationNumber}` : "None"}
            </a>
          </li>
          <li>
            <a href="#publication">
              Working edition · {working ? `${working.status}${working.status === "PUBLISHED" ? "" : " / unpublished"}` : "None"}
            </a>
          </li>
        </ul>
        <h3>What needs attention</h3>
        {workspace.attention.length ? (
          <ol>
            {workspace.attention.map((item) => (
              <li key={`${item.kind}-${item.message}`}>
                <a href={item.href}>{item.message}</a>
              </li>
            ))}
          </ol>
        ) : (
          <p>No outstanding seating blockers.</p>
        )}
        <p data-testid="seating-next-action">Next authorised action: {workspace.nextAction}</p>
        {permissions.evaluate ? (
          <ProtectionMutationForm action={runS06EvaluationAction.bind(null, event.id)} className="actions" testId="seating-evaluate">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
            <button type="submit" className="button">
              Run seating evaluation
            </button>
          </ProtectionMutationForm>
        ) : null}
        {workspace.evaluation ? (
          <p data-testid="seating-evaluation-status">
            Last evaluation {workspace.evaluation.corpusEdition}: {workspace.evaluation.status} · {workspace.evaluation.caseCount} cases
          </p>
        ) : null}
        {verifyAs ? (
          <section className="atelier-panel" data-testid="seating-verify-as">
            <h3>Synthetic verification</h3>
            <p>This switches the signed-in fixture role. It is not Access Administration and cannot be used under production authorisation.</p>
            <ProtectionMutationForm action={switchSeatingVerifyAsAction.bind(null, event.id)} className="atelier-form" testId="seating-verify-as-form">
              <Envelope fields={envelopeFields} />
              <IdempotencyField />
              <label>
                Fixture role
                <select name="symbolicRole" required>
                  <option value="planner">Planner</option>
                  <option value="reviewer">Specialist reviewer</option>
                  <option value="director">Event Director</option>
                  <option value="ceo">CEO</option>
                  <option value="auditor">Auditor</option>
                </select>
              </label>
              <button type="submit" className="button">
                Switch fixture role
              </button>
            </ProtectionMutationForm>
          </section>
        ) : null}
      </section>

      <section id="inputs" className="atelier-panel" data-testid="seating-inputs">
        <h2>Inputs</h2>
        <article>
          <h3>Guest cohort</h3>
          <p>{workspace.guests.length} governed guests. Eligible {workspace.counts.eligibleGuests}.</p>
        </article>
        <article>
          <h3>RSVP truth</h3>
          <p>Attendance intent is RSVP truth. Forecast does not overwrite it.</p>
        </article>
        <article data-testid="seating-layout-publication">
          <h3>Venue layout tables</h3>
          <p>
            {workspace.tables.length
              ? `${workspace.tables.length} bound published tables available for seating${workspace.tables.some((table) => table.mismatch) ? " · physical and declared capacity disagree" : ""}`
              : workspace.seatingLayoutBinding?.status === "BOUND"
                ? "The bound layout publication has no usable tables yet."
                : "No venue layout tables are available for seating until a seating layout binding is active against a current layout publication. This is separate from the operational seating publication."}
          </p>
        </article>
        <article data-testid="seating-layout-binding">
          <h3>Seating layout binding</h3>
          <p
            data-testid="seating-layout-binding-status"
            data-binding-status={workspace.seatingLayoutBinding?.status ?? "ABSENT"}
            data-publication-number={workspace.seatingLayoutBinding?.publicationNumber ?? ""}
            data-content-hash-prefix={workspace.seatingLayoutBinding?.contentHashPrefix ?? ""}
            data-freeze-disabled={workspace.seatingLayoutBinding?.freezeDisabled ? "true" : "false"}
          >
            {workspace.seatingLayoutBinding?.status === "BOUND"
              ? `${workspace.seatingLayoutBinding.layoutLabel ?? "Bound layout"} · CURRENT publication ${workspace.seatingLayoutBinding.publicationNumber} · hash ${workspace.seatingLayoutBinding.contentHashPrefix} · ${workspace.seatingLayoutBinding.tableCount ?? 0} tables · ${workspace.seatingLayoutBinding.physicalCapacity ?? 0} physical / ${workspace.seatingLayoutBinding.declaredCapacity ?? 0} declared`
              : workspace.seatingLayoutBinding?.status === "AMBIGUOUS"
                ? "More than one seating layout binding is active for this event."
                : workspace.seatingLayoutBinding?.status === "STALE"
                  ? "The seating layout binding is stale."
                  : workspace.seatingLayoutBinding?.status === "MISMATCH"
                    ? "The seating layout binding could not be verified."
                    : "No active seating layout binding."}
          </p>
          {permissions.prepare && (workspace.seatingLayoutBindingCandidates?.length ?? 0) > 0 ? (
            <ProtectionMutationForm action={proposeSeatingLayoutBindingAction.bind(null, event.id)} className="atelier-form" testId="seating-layout-binding-propose">
              <Envelope fields={envelopeFields} />
              <IdempotencyField />
              <label>
                Current layout publication
                <select name="layoutPublicationId" required>
                  {workspace.seatingLayoutBindingCandidates?.map((candidate) => (
                    <option key={candidate.publicationId} value={candidate.publicationId}>
                      {candidate.layoutLabel} · CURRENT publication {candidate.publicationNumber} · hash {candidate.contentHash.slice(0, 12)} · {candidate.tableCount} tables
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="button">Propose seating layout binding</button>
            </ProtectionMutationForm>
          ) : null}
          {permissions.ruleActivate && workspace.seatingLayoutBinding?.draftId ? (
            <ProtectionMutationForm action={activateSeatingLayoutBindingAction.bind(null, event.id)} className="actions" testId="seating-layout-binding-activate">
              <Envelope fields={{ ...envelopeFields, bindingId: workspace.seatingLayoutBinding.draftId, expectedVersion: workspace.seatingLayoutBinding.draftVersion ?? 1 }} />
              <IdempotencyField />
              <p data-testid="seating-layout-binding-activate-identity">
                {workspace.seatingLayoutBinding.draftLayoutLabel ?? "Proposed layout"} · CURRENT publication {workspace.seatingLayoutBinding.draftPublicationNumber} · hash {workspace.seatingLayoutBinding.draftContentHashPrefix}
              </p>
              <button type="submit" className="button">Activate seating layout binding</button>
            </ProtectionMutationForm>
          ) : null}
          {permissions.prepare && workspace.seatingLayoutBinding?.draftId ? (
            <ProtectionMutationForm action={withdrawSeatingLayoutBindingAction.bind(null, event.id)} className="actions" testId="seating-layout-binding-withdraw-draft">
              <Envelope fields={{ ...envelopeFields, bindingId: workspace.seatingLayoutBinding.draftId, expectedVersion: workspace.seatingLayoutBinding.draftVersion ?? 1 }} />
              <IdempotencyField />
              <button type="submit" className="button">Withdraw draft binding</button>
            </ProtectionMutationForm>
          ) : null}
          {permissions.ruleActivate && workspace.seatingLayoutBinding?.status === "BOUND" && workspace.seatingLayoutBinding.activeId ? (
            <ProtectionMutationForm action={withdrawSeatingLayoutBindingAction.bind(null, event.id)} className="actions" testId="seating-layout-binding-withdraw">
              <Envelope fields={{ ...envelopeFields, bindingId: workspace.seatingLayoutBinding.activeId, expectedVersion: workspace.seatingLayoutBinding.activeVersion ?? 1 }} />
              <IdempotencyField />
              <button type="submit" className="button">Withdraw active binding</button>
            </ProtectionMutationForm>
          ) : null}
          <HistoryDisclosure
            summary="Earlier seating layout bindings"
            count={workspace.seatingLayoutBindingHistory?.length ?? 0}
            testId="seating-layout-binding-history"
          >
            {(workspace.seatingLayoutBindingHistory ?? []).map((item, index) => (
              <p key={`${item.state}-${item.contentHashPrefix ?? index}`}>
                {item.state}
                {item.publicationNumber != null ? ` · publication ${item.publicationNumber}` : ""}
                {item.contentHashPrefix ? ` · hash ${item.contentHashPrefix}` : ""}
              </p>
            ))}
          </HistoryDisclosure>
        </article>
        <article>
          <h3>Event Brief</h3>
          <p>Optional published brief facts only.</p>
        </article>
        <article>
          <h3>Protection snapshot</h3>
          <p>Optional coded protection constraints only.</p>
        </article>
        {permissions.prepare ? (
          <ProtectionMutationForm action={freezeSeatingInputsAction.bind(null, event.id)} className="actions" testId="seating-freeze">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
            <button
              type="submit"
              className="button"
              disabled={
                workspace.seatingLayoutBinding?.status !== "BOUND" || workspace.tables.some((table) => table.mismatch)
              }
            >
              Freeze new input edition
            </button>
          </ProtectionMutationForm>
        ) : null}
        {input ? (
          <details>
            <summary>Input provenance</summary>
            <p
              data-testid="seating-input-hash"
              data-hash={input.contentHash ?? ""}
              data-layout-hash={input.layoutContentHash ?? ""}
            >
              Hash {input.contentHash}
            </p>
          </details>
        ) : (
          <p data-testid="seating-input-hash" data-hash="" data-layout-hash="">
            No frozen input edition.
          </p>
        )}
        <HistoryDisclosure
          summary="Earlier frozen input packages"
          count={(workspace.inputPackageHistory ?? []).filter((item) => !item.current).length}
          testId="seating-package-history"
        >
          {(workspace.inputPackageHistory ?? [])
            .filter((item) => !item.current)
            .map((item) => (
              <p key={item.contentHash || item.layoutContentHash}>
                Hash {item.contentHash} · layout {item.layoutContentHash}
              </p>
            ))}
        </HistoryDisclosure>
      </section>

      <section id="rules" className="atelier-panel" data-testid="seating-rules">
        <h2>Rules</h2>
        {(["Governing", "Draft", "Historical"] as const).map((group) => {
          const items = workspace.constraints.filter((item) => {
            if (group === "Governing") return item.status === "ACTIVE" && item.duplicateRole !== "REDUNDANT_HISTORICAL";
            if (group === "Draft") return item.status === "DRAFT";
            return (
              (item.status !== "ACTIVE" && item.status !== "DRAFT") ||
              item.duplicateRole === "REDUNDANT_HISTORICAL"
            );
          }).slice(group === "Historical" ? -24 : undefined);
          return (
            <div key={group}>
              <h3>{group}</h3>
              <ul>
                {items.map((item) => {
                  const softDraft = item.status === "DRAFT" && item.kind !== "HARD";
                  const hardDraft = item.status === "DRAFT" && item.kind === "HARD";
                  const alreadyActiveDraft = item.duplicateRole === "ALREADY_ACTIVE_DRAFT";
                  const canActivate =
                    !alreadyActiveDraft && ((hardDraft && permissions.ruleActivate) || (softDraft && permissions.constraintManage));
                  const canWithdraw =
                    item.duplicateRole !== "REDUNDANT_HISTORICAL" &&
                    (item.status === "DRAFT" || item.status === "ACTIVE") &&
                    permissions.constraintManage;
                  return (
                    <li
                      key={item.id}
                      data-testid={
                        item.duplicateRole === "AUTHORITATIVE"
                          ? "seating-rule-authoritative"
                          : item.duplicateRole === "REDUNDANT_HISTORICAL"
                            ? "seating-rule-redundant-historical"
                            : item.duplicateRole === "ALREADY_ACTIVE_DRAFT"
                              ? "seating-rule-already-active-draft"
                              : "seating-rule-item"
                      }
                      data-duplicate-role={item.duplicateRole ?? ""}
                      data-authoritative-id={item.authoritativeEditionId ?? ""}
                    >
                      {item.preview}
                      {item.duplicateRole === "AUTHORITATIVE" && (item.redundantActiveCount ?? 0) > 0 ? (
                        <p data-testid="seating-rule-authoritative-note">
                          Authoritative governing rule for this semantic content. {item.redundantActiveCount} redundant ACTIVE
                          duplicate{item.redundantActiveCount === 1 ? "" : "s"} predate the uniqueness invariant and are listed under Historical.
                        </p>
                      ) : null}
                      {item.duplicateRole === "REDUNDANT_HISTORICAL" ? (
                        <p data-testid="seating-rule-redundant-note">
                          Redundant historical duplicate of authoritative rule {item.authoritativeEditionId?.slice(0, 8)}. Not separately governing.
                          Retained for audit/replay; predates semantic uniqueness enforcement.
                        </p>
                      ) : null}
                      {alreadyActiveDraft ? (
                        <p data-testid="seating-rule-already-active">
                          ALREADY ACTIVE — equivalent rule {item.authoritativeEditionId?.slice(0, 8)} already governs this scope. Activation would make no data change.
                        </p>
                      ) : null}
                      {canActivate ? (
                        <ProtectionMutationForm action={activateSeatingRuleAction.bind(null, event.id)} className="actions">
                          <Envelope
                            fields={{
                              ...envelopeFields,
                              editionId: item.id,
                              expectedVersion: item.editionNo ?? 1,
                              expectedContentHash: item.contentHash ?? "",
                            }}
                          />
                          <IdempotencyField />
                          <button type="submit" className="button secondary">Activate</button>
                        </ProtectionMutationForm>
                      ) : null}
                      {canWithdraw ? (
                        <ProtectionMutationForm action={withdrawSeatingRuleAction.bind(null, event.id)} className="actions">
                          <Envelope
                            fields={{
                              ...envelopeFields,
                              editionId: item.id,
                              expectedVersion: item.editionNo ?? 1,
                              expectedContentHash: item.contentHash ?? "",
                              reason: "Withdrawn from governing set",
                            }}
                          />
                          <IdempotencyField />
                          <button type="submit" className="button secondary">Withdraw</button>
                        </ProtectionMutationForm>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {permissions.constraintManage ? (
          <ProtectionMutationForm action={createSeatingConstraintAction.bind(null, event.id)} className="atelier-form seating-form" testId="seating-constraint-form">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
            <fieldset>
              <legend>Create a seating rule</legend>
              <label>
                Name
                <input name="name" required defaultValue="Keep these guests together" />
              </label>
              <label>
                Kind
                <select name="kind" required>
                  <option value="HARD">Hard rule</option>
                  <option value="WEIGHTED">Weighted preference</option>
                  <option value="INFORMATION">Information only</option>
                </select>
              </label>
              <SeatingRuleAuthoringFields guests={workspace.guests} tables={workspace.tables} />
              <label>
                Weight
                <input name="weight" type="number" min={1} defaultValue={1} />
              </label>
              <label>
                Evidence
                <input name="evidence" defaultValue="Planner note" />
              </label>
              <label>
                Review domain
                <select name="reviewDomain">
                  <option value="">None</option>
                  <option value="PROTOCOL">Protocol</option>
                  <option value="ACCESSIBILITY">Accessibility</option>
                  <option value="SECURITY">Security</option>
                </select>
              </label>
            </fieldset>
            <button type="submit" className="button">
              Save rule
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>

      <section id="reservations" className="atelier-panel" data-testid="seating-reservations">
        <h2>Reservations</h2>
        <p>Reserved does not mean seated.</p>
        <p data-testid="seating-capacity-ledger">
          Capacity {workspace.capacityLedger.total} · generally available {workspace.capacityLedger.generallyAvailable} · reserved minima {workspace.capacityLedger.reservedMin} · reserved maxima {workspace.capacityLedger.reservedMax}
          {workspace.capacityLedger.overbooked ? " · unresolved overbooking" : ""}
        </p>
        <ul>
          {workspace.reservations.map((item) => (
            <li key={item.id} data-testid={`seating-reservation-${item.releaseState}`}>
              {item.preview ?? `${item.setCode} · ${item.releaseState}`}. Reserved does not mean seated.
              {item.editionNo != null ? ` Edition ${item.editionNo}.` : ""}
              {permissions.ruleActivate && item.releaseState === "DRAFT" ? (
                <ProtectionMutationForm action={activateReservationBlockAction.bind(null, event.id)} className="actions">
                  <Envelope fields={{ ...envelopeFields, blockId: item.id, expectedVersion: item.editionNo ?? 1, expectedContentHash: item.contentHash ?? "" }} />
                  <IdempotencyField />
                  <button type="submit" className="button secondary">Activate reservation</button>
                </ProtectionMutationForm>
              ) : null}
              {permissions.reservationManage && (item.releaseState === "DRAFT" || item.releaseState === "ACTIVE") ? (
                <ProtectionMutationForm action={withdrawReservationBlockAction.bind(null, event.id)} className="actions">
                  <Envelope fields={{ ...envelopeFields, blockId: item.id, expectedVersion: item.editionNo ?? 1, expectedContentHash: item.contentHash ?? "", reason: "Withdrawn from governing set" }} />
                  <IdempotencyField />
                  <button type="submit" className="button secondary">Withdraw reservation</button>
                </ProtectionMutationForm>
              ) : null}
              {permissions.reservationManage && item.releaseState === "ACTIVE" ? (
                <>
                  <ProtectionMutationForm action={supersedeReservationBlockAction.bind(null, event.id)} className="actions" testId={`seating-reservation-successor-${item.id}`}>
                    <Envelope
                      fields={{
                        ...envelopeFields,
                        blockId: item.id,
                        expectedVersion: item.editionNo ?? 1,
                        expectedContentHash: item.contentHash ?? "",
                        eligibleGuestIds: workspace.guests.filter((guest) => guest.eligible).map((guest) => guest.id).join(","),
                        exactCount: item.exact ?? 2,
                      }}
                    />
                    <IdempotencyField />
                    <button type="submit" className="button secondary">Create successor reservation</button>
                  </ProtectionMutationForm>
                  <ProtectionMutationForm action={releaseReservationBlockAction.bind(null, event.id)} className="actions">
                    <Envelope fields={{ ...envelopeFields, blockId: item.id, expectedVersion: item.editionNo ?? 1, expectedContentHash: item.contentHash ?? "" }} />
                    <IdempotencyField />
                    <button type="submit" className="button secondary">Release reservation</button>
                  </ProtectionMutationForm>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        {permissions.reservationManage ? (
          <ProtectionMutationForm action={createReservationBlockAction.bind(null, event.id)} className="atelier-form seating-form" testId="seating-reservation-form">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
            <fieldset>
              <legend>Create a reservation</legend>
              <label>
                Guest set
                <select name="eligibleSetCode" required>
                  <option value="ELIGIBLE_ATTENDING">Eligible attending guests</option>
                  <option value="PROTOCOL_PRIORITY">Protocol priority guests</option>
                </select>
              </label>
              <input type="hidden" name="eligibleGuestIds" value={workspace.guests.filter((item) => item.eligible).map((item) => item.id).join(",")} />
              <label>
                Table
                <select name="tableId">
                  <option value="">Any published table</option>
                  {workspace.tables.map((table) => (
                    <option key={table.id} value={table.id}>{table.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Exact count
                <input name="exactCount" type="number" min={1} defaultValue={2} />
              </label>
              <label>
                Priority
                <input name="priority" type="number" min={1} defaultValue={10} />
              </label>
            </fieldset>
            <button type="submit" className="button">
              Save reservation
            </button>
          </ProtectionMutationForm>
        ) : null}
      </section>

      <section id="runs" className="atelier-panel" data-testid="seating-runs">
        <h2>Runs</h2>
        <p>The solver recommends. Authorised people decide. Cancellation asks the worker to stop; a running attempt is not instantly erased.</p>
        {permissions.run && input ? (
          <ProtectionMutationForm action={launchSeatingRunAction.bind(null, event.id)} className="atelier-form seating-form" testId="seating-run-form">
            <Envelope fields={{ ...envelopeFields, inputEditionId: input.id ?? "" }} />
            <IdempotencyField />
            <fieldset>
              <legend>Launch a seating run</legend>
              <label>
                Deterministic seed
                <input name="seed" defaultValue={`s06-${event.id.slice(-4)}`} readOnly />
              </label>
            </fieldset>
            <button type="submit" className="button">
              Launch seating run
            </button>
          </ProtectionMutationForm>
        ) : null}
        <ul>
          {visibleSeatingRuns(workspace.runs, workspace.currentRunId).map((run) => {
            const isCurrent = run.id === workspace.currentRunId || Boolean(run.current);
            const outcome = run.validatorVerdict ?? run.status;
            return (
              <li key={run.id} data-testid={`seating-run-${run.status}`}>
                <article
                  data-testid="seating-run-card"
                  data-run-id={run.id}
                  data-current={isCurrent ? "true" : "false"}
                  data-stale={run.stale ? "true" : "false"}
                  data-outcome={outcome}
                >
                  <p data-testid="seating-run-identity">
                    Run <code>{run.id.slice(0, 8)}</code>
                    {isCurrent ? " · Current" : " · Not current"}
                    {run.stale ? " · Stale" : " · Fresh"}
                    {" · "}
                    {outcome}
                  </p>
                  <CanonicalId id={run.id} label="Full immutable run ID" testId="seating-run-full-id" />
                  <p data-testid="seating-run-started">
                    Started{" "}
                    {run.startedAt ? <CanonicalTime iso={run.startedAt} /> : "unavailable"}
                    {" · Initiating actor: "}
                    {run.initiatingActorLabel ?? "unavailable"}
                  </p>
                  <p data-testid="seating-run-counts">
                    Seated {run.seated ?? 0} · Unseated {run.unseated ?? 0}
                  </p>
                  {isCurrent && run.stale ? (
                    <p data-testid="seating-run-current-stale">
                      This is the selected/current run, and it is also stale because upstream seating inputs changed after it was produced. Review and run again before treating it as fresh authority.
                    </p>
                  ) : null}
                  {run.stale && !isCurrent ? (
                    <p>Upstream event information changed after this run. Review and run again.</p>
                  ) : null}
                  {run.validatorVerdict === "INFEASIBLE" || run.status === "INFEASIBLE" ? (
                    <p>No safe seating plan satisfies every hard rule.</p>
                  ) : null}
                  {run.violatedSummary ? <p>Violated: {run.violatedSummary}</p> : null}
                  {permissions.edit && (seatingV2ReplacementEnabled() ? run.validatorVerdict === "FEASIBLE" : run.status === "FEASIBLE" || run.status === "INFEASIBLE") ? (
                    <ProtectionMutationForm action={adoptSeatingRunAction.bind(null, event.id)} className="actions">
                      <Envelope fields={{ ...envelopeFields, runId: run.id }} />
                      <IdempotencyField />
                      <button type="submit" className="button secondary">Adopt run</button>
                    </ProtectionMutationForm>
                  ) : null}
                  {permissions.run && (run.status === "QUEUED" || run.status === "RUNNING") ? (
                    <ProtectionMutationForm action={cancelSeatingRunAction.bind(null, event.id)} className="actions">
                      <Envelope fields={{ ...envelopeFields, runId: run.id, expectedVersion: 0 }} />
                      <IdempotencyField />
                      <button type="submit" className="button secondary">Cancel run</button>
                    </ProtectionMutationForm>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="studio" className="atelier-panel" data-testid="seating-studio">
        <h2>Studio</h2>
        <div className="seating-studio-grid">
          <div>
            <h3>Tables</h3>
            {workspace.tables.length ? (
              <ul>
                {workspace.tables.map((table) => (
                  <li key={table.id} data-testid="seating-table-capacity">
                    {table.label} · {table.seated}/{table.capacity}
                    {table.mismatch ? " · capacity mismatch" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <div data-testid="seating-tables-empty" className="atelier-empty">
                <p>No table layout is configured for seating placements.</p>
                <p>
                  Placements cannot be displayed until a current venue layout publication is bound for this event.
                  {permissions.prepare
                    ? " Propose and activate a seating layout binding under Inputs."
                    : " Ask an authorised planner or director to bind a current layout publication. This assignment cannot change the binding."}
                </p>
                <p>
                  <a href="#inputs">Open Inputs · seating layout binding</a>
                </p>
              </div>
            )}
          </div>
          <div>
            <h3>Guests</h3>
            <ul>
              {workspace.workingAssignments.length
                ? workspace.workingAssignments.map((item) => (
                    <li key={item.guestId}>
                      {item.guestLabel} · {item.state === "UNSEATED" ? "This guest remains unseated; the system did not invent a placement." : item.tableId} · {item.lockState}
                    </li>
                  ))
                : workspace.guests.map((guest) => (
                    <li key={guest.id}>{guest.label} · {guest.eligible ? "Eligible" : guest.eligibilityCode}</li>
                  ))}
            </ul>
          </div>
        </div>
        {permissions.edit && (working?.status === "DRAFT" || working?.status === "WORKING") ? (
          <ProtectionMutationForm action={applySeatingChangeAction.bind(null, event.id)} className="atelier-form seating-form" testId="seating-edit-form">
            <div
              hidden
              data-testid="seating-edit-identity"
              data-edition-id={working.id ?? ""}
              data-edition-version={String(working.version ?? 0)}
              data-edition-hash={working.contentHash ?? ""}
            />
            <Envelope
              fields={{
                ...envelopeFields,
                editionId: working.id ?? "",
                expectedVersion: working.version ?? 0,
                expectedContentHash: working.contentHash ?? "",
              }}
            />
            <IdempotencyField />
            <fieldset>
              <legend>Apply a seating change</legend>
              <label>
                Guest
                <select name="guestId" required>
                  {workspace.workingAssignments.map((item) => (
                    <option key={item.guestId} value={item.guestId}>{item.guestLabel}</option>
                  ))}
                </select>
              </label>
              <label>
                Action
                <select name="command" required>
                  <option value="ASSIGN_UNSEATED">Assign unseated</option>
                  <option value="MOVE">Move</option>
                  <option value="SWAP">Swap</option>
                  <option value="UNSEAT">Unseat</option>
                  <option value="LOCK">Lock</option>
                  <option value="UNLOCK">Unlock</option>
                </select>
              </label>
              <label>
                Target seat
                <select name="targetPositionId">
                  <option value="">Choose seat</option>
                  {workspace.positions.map((position) => {
                    const occupied = workspace.workingAssignments.some(
                      (item) => item.state === "SEATED" && item.positionId === position.positionToken,
                    );
                    return (
                      <option key={position.id} value={position.positionToken} data-occupied={occupied ? "true" : "false"}>
                        {position.positionToken}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                Other guest
                <select name="otherGuestId">
                  <option value="">None</option>
                  {workspace.workingAssignments.map((item) => (
                    <option key={`other-${item.guestId}`} value={item.guestId}>{item.guestLabel}</option>
                  ))}
                </select>
              </label>
            </fieldset>
            <label>
              Unseat reason
              <select name="reasonCode" defaultValue="MANUAL_UNSEAT">
                <option value="MANUAL_UNSEAT">Manual unseat</option>
                <option value="GOVERNED_UNSEATED">Governed exception</option>
              </select>
            </label>
            <PendingSubmit
              locked={
                Boolean(resultId) &&
                (presented.mutationLocked ||
                  presented.retryLock?.actionScope === "seating.plan.edit" ||
                  retryLockApplies(presented.retryLock, {
                    actionScope: "seating.plan.edit",
                    subjectId: working.id ?? "",
                    attemptedVersion: working.version,
                  }))
              }
            >
              Apply seating change
            </PendingSubmit>
          </ProtectionMutationForm>
        ) : (
          <p>Adopt a run before editing seats.</p>
        )}
      </section>

      <section id="review" className="atelier-panel" data-testid="seating-review">
        <h2>Review</h2>
        <p data-testid="seating-review-lineage">Package → Run → Validation → Plan edition</p>
        <p data-testid="seating-review-event">
          {event.name}
          {" · "}
          {publication
            ? `Current operational publication: Publication ${publication.publicationNumber}`
            : "No current operational publication"}
          {" · "}
          {working ? `Current working edition: ${working.status}${working.status === "PUBLISHED" ? "" : " / unpublished"}` : "No working edition"}
        </p>
        <p data-testid="seating-review-requirement">{workspace.reviewRequirementCopy}</p>
        <ul data-testid="seating-review-evidence">
          {workspace.constraints.filter((item) => item.reviewDomain && workspace.implicatedReviewDomains.includes(item.reviewDomain as "PROTOCOL" | "ACCESSIBILITY" | "SECURITY")).map((item) => (
            <li key={item.id}>{item.reviewDomain} · {item.preview} · {item.status}</li>
          ))}
        </ul>
        <details>
          <summary>Plan hash provenance</summary>
          <p data-testid="seating-plan-hash">Working edition hash: {working?.contentHash ?? "None"}</p>
        </details>
        <h3>Manual decisions</h3>
        <ul>{workspace.decisions.map((item) => <li key={item.id}>{item.command} · {item.reasonCode}</li>)}</ul>
        <h3>Specialist reviews</h3>
        <ul>{workspace.reviews.map((item) => <li key={item.id}>{item.domain} · {item.reviewerLabel} · {item.decision} · {item.reason}</li>)}</ul>
        {permissions.submit && (working?.status === "DRAFT" || working?.status === "WORKING") ? (
          <ProtectionMutationForm action={submitSeatingPlanAction.bind(null, event.id)} className="actions">
            <Envelope
              fields={{
                ...envelopeFields,
                editionId: working.id ?? "",
                expectedVersion: working.version ?? 0,
                expectedContentHash: working.contentHash ?? "",
              }}
            />
            <IdempotencyField />
            <button type="submit" className="button">Submit seating plan</button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.submit && working?.status === "SUBMITTED" ? (
          <ProtectionMutationForm action={recallSeatingPlanAction.bind(null, event.id)} className="actions" testId="seating-recall">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", expectedVersion: working.version ?? 0, expectedContentHash: working.contentHash ?? "" }} />
            <IdempotencyField />
            <button type="submit" className="button secondary">Recall submitted plan</button>
          </ProtectionMutationForm>
        ) : null}
        {(permissions.reviewProtocol || permissions.reviewAccessibility || permissions.reviewSecurity) && working?.status === "SUBMITTED" && workspace.implicatedReviewDomains.length ? (
          <ProtectionMutationForm action={decideSeatingReviewAction.bind(null, event.id)} className="atelier-form seating-form" testId="seating-review-form">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", editionHash: working.contentHash ?? "", expectedVersion: working.version ?? 0, expectedContentHash: working.contentHash ?? "" }} />
            <IdempotencyField />
            <fieldset>
              <legend>Record specialist review</legend>
              <label>
                Domain
                <select name="domain" required>
                  {workspace.implicatedReviewDomains.includes("PROTOCOL") && permissions.reviewProtocol ? <option value="PROTOCOL">Protocol</option> : null}
                  {workspace.implicatedReviewDomains.includes("ACCESSIBILITY") && permissions.reviewAccessibility ? <option value="ACCESSIBILITY">Accessibility</option> : null}
                  {workspace.implicatedReviewDomains.includes("SECURITY") && permissions.reviewSecurity ? <option value="SECURITY">Security</option> : null}
                </select>
              </label>
              <label>
                Decision
                <select name="decision" required>
                  <option value="APPROVED">Approve review</option>
                  <option value="REJECTED">Request correction</option>
                </select>
              </label>
              <label>
                Reason
                <input name="reason" required defaultValue="Reviewed against coded constraints" />
              </label>
            </fieldset>
            <button type="submit" className="button">Record review</button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.approve && working?.status === "SUBMITTED" ? (
          <ProtectionMutationForm action={decideSeatingApprovalAction.bind(null, event.id)} className="actions" testId="seating-approve">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", editionHash: working.contentHash ?? "", expectedVersion: working.version ?? 0, expectedContentHash: working.contentHash ?? "" }} />
            <IdempotencyField />
            <input type="hidden" name="decision" value="APPROVED" />
            <button type="submit" className="button">Approve seating plan</button>
          </ProtectionMutationForm>
        ) : null}
      </section>

      <section id="publication" className="atelier-panel" data-testid="seating-publication">
        <h2>Publication</h2>
        <p>Published without sending messages, issuing credentials or changing check-in.</p>
        <article data-testid="seating-current-publication">
          <h3>Current operational publication</h3>
          <p>
            {publication
              ? `Publication ${publication.publicationNumber} remains the operational seating until a successor is published.${publicationSource === "LEGACY" ? ` ${LEGACY_S06_PUBLICATION_LABEL}` : ""}`
              : "No current operational publication."}
          </p>
        </article>
        <article data-testid="seating-working-edition">
          <h3>Current working edition</h3>
          <p>
            {working
              ? working.status === "PUBLISHED"
                ? `PUBLISHED · ${working.contentHash}`
                : `${working.status} / unpublished · ${working.contentHash}`
              : "No working edition."}
          </p>
          {publication && working && working.status !== "PUBLISHED" ? (
            <p data-testid="seating-publication-dual-truth">
              Publication {publication.publicationNumber} remains operational while this working edition stays unpublished.
            </p>
          ) : null}
        </article>
        <article>
          <h3>Operational approval</h3>
          <ul>{workspace.approvals.map((item) => <li key={item.id}>{item.decision}</li>)}</ul>
        </article>
        <article>
          <h3>History</h3>
          <ul>{workspace.publications.map((item) => <li key={item.id}>{item.status} · {item.publicationNumber} · {item.editionHash}</li>)}</ul>
        </article>
        {permissions.publish && working?.status === "APPROVED" ? (
          <ProtectionMutationForm action={publishSeatingPlanAction.bind(null, event.id)} className="actions" testId="seating-publish">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", editionHash: working.contentHash ?? "", expectedVersion: working.version ?? 0, expectedContentHash: working.contentHash ?? "" }} />
            <IdempotencyField />
            <p>Published without sending messages, issuing credentials or changing check-in.</p>
            <button type="submit" className="button">Publish seating plan</button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.exportJob ? (
          <ProtectionMutationForm action={requestSeatingExportAction.bind(null, event.id)} className="atelier-form seating-form" testId="seating-export">
            <Envelope fields={{ ...envelopeFields, publicationId: publication?.id ?? "", editionId: working?.id ?? "" }} />
            <IdempotencyField />
            <fieldset>
              <legend>Request a seating export</legend>
              <label>
                Format
                <select name="format" required>
                  <option value="PDF">PDF</option>
                  <option value="PNG">PNG</option>
                  <option value="JSON">JSON</option>
                </select>
              </label>
              <label>
                Projection
                <select name="projectionClass" required>
                  <option value="PLANNER">Planner</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="CEO">CEO</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="DOWNSTREAM">Downstream</option>
                </select>
              </label>
            </fieldset>
            <button type="submit" className="button">Request export</button>
          </ProtectionMutationForm>
        ) : null}
        <ul data-testid="seating-export-list">
          {workspace.exports.map((item) => (
            <li key={item.id} data-testid="seating-export-item" data-export-id={item.id}>
              {item.format} · {item.status} · {item.projectionClass === "FULL" ? "CEO" : item.projectionClass}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
