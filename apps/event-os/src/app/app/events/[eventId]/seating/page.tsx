import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { AppShell } from "../../../../../components/shell";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../components/protection-mutation-form";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { preferredSeatingAssignment, seatingPermissions } from "../../../../../server/seating-scope";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import {
  adoptSeatingRunAction,
  applySeatingChangeAction,
  cancelSeatingRunAction,
  createReservationBlockAction,
  createSeatingConstraintAction,
  decideSeatingApprovalAction,
  decideSeatingReviewAction,
  freezeSeatingInputsAction,
  launchSeatingRunAction,
  publishSeatingPlanAction,
  releaseReservationBlockAction,
  requestSeatingExportAction,
  runS06EvaluationAction,
  submitSeatingPlanAction,
} from "../../../../../server/seating-actions";
import { switchSeatingVerifyAsAction } from "../../../../../server/seating-verify-as-action";
import { eventOsVerifyAsAvailable } from "../../../../../server/seating-verify-as";
import { PlatformError } from "@maison-doclar/shared-platform";

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
  try {
    workspace = await runtime.service.seatingCommands().projectWorkspace(actor, event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage ?? error.message : "This assignment cannot perform this seating action.";
    return (
      <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", message)} />
      </AppShell>
    );
  }
  const assignmentId = preferredSeatingAssignment(person.id, organisation.id, event.id)?.id ?? "";
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${event.id}/seating`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
    eventId: event.id,
  });
  const envelopeFields = { organisationId: organisation.id, eventId: event.id, assignmentId };
  const working = workspace.workingEdition as { id?: string; contentHash?: string; status?: string; version?: number } | undefined;
  const input = workspace.inputEdition as { id?: string; contentHash?: string } | undefined;
  const publication = workspace.currentPublication as { id?: string; publicationNumber?: number; editionHash?: string } | undefined;
  const verifyAs = eventOsVerifyAsAvailable();
  return (
    <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow="Seating Command"
        title={`${event.name} seating`}
        lede="The solver recommends. Authorised people decide. Published seating does not send messages, issue credentials or change check-in."
      />
      <p data-testid="seating-publication-badge">
        Current publication: {publication ? `Publication ${publication.publicationNumber}` : "None"}
      </p>
      <p data-testid="seating-freshness-badge">{workspace.freshnessCopy}</p>
      <ActionResultBanner presented={presented} />
      <div className="seating-tabs">
        <AtelierSectionTabs label="Seating Command views" items={[...TABS]} />
      </div>

      <section id="overview" className="atelier-panel" data-testid="seating-overview">
        <h2>Overview</h2>
        <ul className="seating-metric-cards">
          <li><a href="#inputs">Input readiness · {workspace.inputFreshness}</a></li>
          <li><a href="#studio">Eligible guests · {workspace.counts.eligibleGuests}</a></li>
          <li><a href="#studio">Seated · {workspace.counts.seated}</a></li>
          <li><a href="#studio">Unseated · {workspace.counts.unseated}</a></li>
          <li><a href="#rules">Hard blockers · {workspace.counts.hardBlockers}</a></li>
          <li><a href="#publication">Current publication · {publication ? `No. ${publication.publicationNumber}` : "None"}</a></li>
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
          <ProtectionMutationForm action={runS06EvaluationAction} className="actions" testId="seating-evaluate">
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
            <ProtectionMutationForm action={switchSeatingVerifyAsAction} className="atelier-form" testId="seating-verify-as-form">
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
        <article>
          <h3>Layout publication</h3>
          <p>{workspace.tables.length ? `${workspace.tables.length} published tables` : "No current layout is published."}</p>
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
          <ProtectionMutationForm action={freezeSeatingInputsAction} className="actions" testId="seating-freeze">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
            <button type="submit" className="button">
              Freeze new input edition
            </button>
          </ProtectionMutationForm>
        ) : null}
        {input ? (
          <details>
            <summary>Input provenance</summary>
            <p>Hash {input.contentHash}</p>
          </details>
        ) : null}
      </section>

      <section id="rules" className="atelier-panel" data-testid="seating-rules">
        <h2>Rules</h2>
        <div>
          <h3>Hard rules</h3>
          <ul>{workspace.constraints.filter((item) => item.kind === "HARD").map((item) => <li key={item.id}>{item.preview} · {item.status}</li>)}</ul>
          <h3>Weighted preferences</h3>
          <ul>{workspace.constraints.filter((item) => item.kind === "WEIGHTED").map((item) => <li key={item.id}>{item.preview} · {item.status}</li>)}</ul>
          <h3>Information only</h3>
          <ul>{workspace.constraints.filter((item) => item.kind === "INFORMATION").map((item) => <li key={item.id}>{item.preview} · {item.status}</li>)}</ul>
        </div>
        {permissions.constraintManage ? (
          <ProtectionMutationForm action={createSeatingConstraintAction} className="atelier-form" testId="seating-constraint-form">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
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
            <label>
              Predicate
              <select name="predicateType" required>
                <option value="KEEP_TOGETHER">Keep together</option>
                <option value="KEEP_APART">Keep apart</option>
                <option value="REQUIRE_TABLE">Require table</option>
                <option value="PREFER_TOGETHER">Prefer together</option>
              </select>
            </label>
            <label>
              First guest
              <select name="guestIdA" required>
                {workspace.guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>{guest.label}</option>
                ))}
              </select>
            </label>
            <label>
              Second guest
              <select name="guestIdB" required>
                {workspace.guests.map((guest) => (
                  <option key={`b-${guest.id}`} value={guest.id}>{guest.label}</option>
                ))}
              </select>
            </label>
            <label>
              Table
              <select name="tableId">
                <option value="">Any</option>
                {workspace.tables.map((table) => (
                  <option key={table.id} value={table.id}>{table.label}</option>
                ))}
              </select>
            </label>
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
            <li key={item.id}>
              {item.setCode} · {item.releaseState}. Reserved does not mean seated.
              {permissions.reservationManage && item.releaseState === "ACTIVE" ? (
                <ProtectionMutationForm action={releaseReservationBlockAction} className="actions">
                  <Envelope fields={{ ...envelopeFields, blockId: item.id, expectedVersion: 0 }} />
                  <IdempotencyField />
                  <button type="submit" className="button secondary">Release reservation</button>
                </ProtectionMutationForm>
              ) : null}
            </li>
          ))}
        </ul>
        {permissions.reservationManage ? (
          <ProtectionMutationForm action={createReservationBlockAction} className="atelier-form" testId="seating-reservation-form">
            <Envelope fields={envelopeFields} />
            <IdempotencyField />
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
          <ProtectionMutationForm action={launchSeatingRunAction} className="atelier-form" testId="seating-run-form">
            <Envelope fields={{ ...envelopeFields, inputEditionId: input.id ?? "" }} />
            <IdempotencyField />
            <label>
              Deterministic seed
              <input name="seed" defaultValue={`s06-${event.id.slice(-4)}`} readOnly />
            </label>
            <button type="submit" className="button">
              Launch seating run
            </button>
          </ProtectionMutationForm>
        ) : null}
        <ul>
          {workspace.runs.map((run) => (
            <li key={run.id} data-testid={`seating-run-${run.status}`}>
              {run.status} · seated {run.seated ?? 0} · unseated {run.unseated ?? 0}
              {run.stale ? " · Upstream event information changed. Review and run again." : ""}
              {run.status === "INFEASIBLE" ? " · No safe seating plan satisfies every hard rule." : ""}
              {permissions.edit && (run.status === "FEASIBLE" || run.status === "INFEASIBLE") ? (
                <ProtectionMutationForm action={adoptSeatingRunAction} className="actions">
                  <Envelope fields={{ ...envelopeFields, runId: run.id }} />
                  <IdempotencyField />
                  <button type="submit" className="button secondary">Adopt run</button>
                </ProtectionMutationForm>
              ) : null}
              {permissions.run && (run.status === "QUEUED" || run.status === "RUNNING") ? (
                <ProtectionMutationForm action={cancelSeatingRunAction} className="actions">
                  <Envelope fields={{ ...envelopeFields, runId: run.id, expectedVersion: 0 }} />
                  <IdempotencyField />
                  <button type="submit" className="button secondary">Cancel run</button>
                </ProtectionMutationForm>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section id="studio" className="atelier-panel" data-testid="seating-studio">
        <h2>Studio</h2>
        <div className="seating-studio-grid">
          <div>
            <h3>Tables</h3>
            <ul>
              {workspace.tables.map((table) => (
                <li key={table.id}>{table.label} · {table.seated}/{table.capacity}</li>
              ))}
            </ul>
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
        {permissions.edit && working?.status === "DRAFT" ? (
          <ProtectionMutationForm action={applySeatingChangeAction} className="atelier-form" testId="seating-edit-form">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", expectedVersion: working.version ?? 0 }} />
            <IdempotencyField />
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
                {workspace.positions.map((position) => (
                  <option key={position.id} value={position.id}>{position.positionToken}</option>
                ))}
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
            <input type="hidden" name="reasonCode" value="MANUAL" />
            <button type="submit" className="button">
              Apply seating change
            </button>
          </ProtectionMutationForm>
        ) : (
          <p>Adopt a run before editing seats.</p>
        )}
      </section>

      <section id="review" className="atelier-panel" data-testid="seating-review">
        <h2>Review</h2>
        <p data-testid="seating-review-event">{event.name} · {working ? `${working.status} working edition` : "No working edition"}</p>
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
        {permissions.submit && working?.status === "DRAFT" ? (
          <ProtectionMutationForm action={submitSeatingPlanAction} className="actions">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "" }} />
            <IdempotencyField />
            <button type="submit" className="button">Submit seating plan</button>
          </ProtectionMutationForm>
        ) : null}
        {(permissions.reviewProtocol || permissions.reviewAccessibility || permissions.reviewSecurity) && working?.status === "SUBMITTED" && workspace.implicatedReviewDomains.length ? (
          <ProtectionMutationForm action={decideSeatingReviewAction} className="atelier-form" testId="seating-review-form">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", editionHash: working.contentHash ?? "", expectedVersion: working.version ?? 0 }} />
            <IdempotencyField />
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
            <button type="submit" className="button">Record review</button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.approve && working?.status === "SUBMITTED" ? (
          <ProtectionMutationForm action={decideSeatingApprovalAction} className="actions" testId="seating-approve">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", editionHash: working.contentHash ?? "", expectedVersion: working.version ?? 0 }} />
            <IdempotencyField />
            <input type="hidden" name="decision" value="APPROVED" />
            <button type="submit" className="button">Approve seating plan</button>
          </ProtectionMutationForm>
        ) : null}
      </section>

      <section id="publication" className="atelier-panel" data-testid="seating-publication">
        <h2>Publication</h2>
        <p>Published without sending messages, issuing credentials or changing check-in.</p>
        <article>
          <h3>Working edition</h3>
          <p>{working ? `${working.status} · ${working.contentHash}` : "No working edition."}</p>
        </article>
        <article>
          <h3>Operational approval</h3>
          <ul>{workspace.approvals.map((item) => <li key={item.id}>{item.decision}</li>)}</ul>
        </article>
        <article>
          <h3>Current publication</h3>
          <p>{publication ? `Publication ${publication.publicationNumber} remains the operational seating.` : "No current publication."}</p>
        </article>
        <article>
          <h3>History</h3>
          <ul>{workspace.publications.map((item) => <li key={item.id}>{item.status} · {item.publicationNumber} · {item.editionHash}</li>)}</ul>
        </article>
        {permissions.publish && working?.status === "APPROVED" ? (
          <ProtectionMutationForm action={publishSeatingPlanAction} className="actions" testId="seating-publish">
            <Envelope fields={{ ...envelopeFields, editionId: working.id ?? "", editionHash: working.contentHash ?? "" }} />
            <IdempotencyField />
            <p>Published without sending messages, issuing credentials or changing check-in.</p>
            <button type="submit" className="button">Publish seating plan</button>
          </ProtectionMutationForm>
        ) : null}
        {permissions.exportJob ? (
          <ProtectionMutationForm action={requestSeatingExportAction} className="atelier-form" testId="seating-export">
            <Envelope fields={{ ...envelopeFields, publicationId: publication?.id ?? "", editionId: working?.id ?? "" }} />
            <IdempotencyField />
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
            <button type="submit" className="button">Request export</button>
          </ProtectionMutationForm>
        ) : null}
        <ul>{workspace.exports.map((item) => <li key={item.id}>{item.format} · {item.status} · {item.projectionClass}</li>)}</ul>
      </section>
    </AppShell>
  );
}
