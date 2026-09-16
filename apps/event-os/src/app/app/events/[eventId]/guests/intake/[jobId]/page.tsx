import Link from "next/link";
import { authorize, CANONICAL_CSV_COLUMNS } from "@maison-doclar/shared-platform";
import { AppShell } from "../../../../../../../components/shell";
import { AtelierOperationalState } from "../../../../../../../components/atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "../../../../../../../components/atelier-pending-submit";
import { HvIntakeProgress } from "../../../../../../../components/hv-intake-progress";
import {
  advanceHvIntakeAction,
  applyHvDecisionsAction,
  approveHvIntakeAction,
  cancelHvIntakeAction,
  confirmHvMappingAction,
  submitHvIntakeAction,
  uploadHvIntakeSourceAction,
} from "../../../../../../../server/hv-intake-actions";
import { guestPermissions, resolveScopedEvent } from "../../../../../../../server/guest-scope";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../../../server/operational-state";
import { guardedActor } from "../../../../../../../server/guard";
import { getRuntime } from "../../../../../../../server/runtime";

const TARGETS = [...CANONICAL_CSV_COLUMNS, "IGNORE", "UNMAPPED"] as const;

export default async function GuestIntakeJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; jobId: string }>;
  searchParams: Promise<{ error?: string; state?: string; ok?: string }>;
}) {
  const { eventId, jobId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest intake</h1>
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "Event not available.")} />
      </AppShell>
    );
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  const runtime = getRuntime();
  let bundle: ReturnType<typeof runtime.service.getGuestIntakeJob> | undefined;
  try {
    bundle = runtime.service.getGuestIntakeJob(actor, scoped.organisation.id, scoped.event.id, jobId);
  } catch {
    bundle = undefined;
  }
  if (!bundle) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest intake</h1>
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "Intake job not found.")} />
      </AppShell>
    );
  }
  const { job, mapping, candidates, receipt } = bundle;
  const state = operationalStateFromQuery({ error: query.error, state: query.state, ok: query.ok });
  const reviewRows = candidates.filter(
    (item) =>
      item.status === "INVALID" ||
      item.status === "WARNING" ||
      item.status === "DUPLICATE_REVIEW" ||
      item.status === "CONFLICT_REVIEW" ||
      item.issues.length > 0,
  );
  const canApprove =
    authorize({
      actor: runtime.service.resolveActor(person.id),
      permission: "guest.intake.approve",
      scope: { organisationId: scoped.organisation.id, eventId: scoped.event.id },
    }).allow && job.status === "SUBMITTED";

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      eventId={scoped.event.id}
      current="/app/events"
    >
      <div className="atelier-guestbook at-scope">
        <header className="atelier-masthead">
          <p className="eyebrow">
            <Link href={`/app/events/${scoped.event.id}/guests/intake`}>Intake command</Link> · {job.name}
          </p>
          <h1>{job.name}</h1>
          <p className="lede">
            Status <strong>{job.status.replaceAll("_", " ")}</strong> · edition {job.edition} · intake ID {job.id}
          </p>
        </header>
        {state ? <AtelierOperationalState state={state} /> : null}
        <HvIntakeProgress job={job} />
        {job.status === "PROMOTING" ? (
          <p className="lede" role="status" aria-live="polite">
            Promotion in progress. Guests may appear in the directory while this intake remains incomplete. You can
            leave and resume safely.
          </p>
        ) : null}

        {permissions.intake && ["UPLOADED", "MAPPING_REQUIRED", "FAILED", "PARSING"].includes(job.status) ? (
          <form className="form" action={uploadHvIntakeSourceAction} encType="multipart/form-data">
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <IdempotencyField />
            <fieldset>
              <legend>Upload guest list</legend>
              <p className="lede">CSV or XLSX. Max 8&nbsp;MB / 5,000 rows. Spreadsheet formulas are treated as values only.</p>
              <label>
                File
                <input name="file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
              </label>
              <PendingSubmit pendingLabel="Uploading…">Upload and stage</PendingSubmit>
            </fieldset>
          </form>
        ) : null}

        {permissions.intake && job.status === "MAPPING_REQUIRED" && mapping ? (
          <form className="form" action={confirmHvMappingAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <input type="hidden" name="headers" value={mapping.columns.map((column) => column.sourceHeader).join("\u0001")} />
            <IdempotencyField />
            <fieldset>
              <legend>Column mapping</legend>
              <p className="lede">Unmapped populated columns are retained as warnings — they are never silently discarded.</p>
              <table className="atelier-table">
                <thead>
                  <tr>
                    <th>Source header</th>
                    <th>Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.columns.map((column) => (
                    <tr key={column.sourceHeader}>
                      <td>{column.sourceHeader}</td>
                      <td>
                        <label className="sr-only" htmlFor={`map-${column.sourceHeader}`}>
                          Map {column.sourceHeader}
                        </label>
                        <select
                          id={`map-${column.sourceHeader}`}
                          name={`map:${column.sourceHeader}`}
                          defaultValue={column.targetField}
                        >
                          {TARGETS.map((target) => (
                            <option key={target} value={target}>
                              {target}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PendingSubmit pendingLabel="Validating…">Confirm mapping and validate</PendingSubmit>
            </fieldset>
          </form>
        ) : null}

        {permissions.intake && reviewRows.length > 0 && ["NEEDS_REVIEW", "READY_FOR_APPROVAL"].includes(job.status) ? (
          <form className="form" action={applyHvDecisionsAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <input type="hidden" name="candidateIds" value={reviewRows.map((item) => item.id).join(",")} />
            <IdempotencyField />
            <fieldset>
              <legend>Review and decisions</legend>
              <p className="lede">{reviewRows.length} rows need attention. Ambiguous duplicates are never resolved silently.</p>
              <div className="atelier-scroll" style={{ maxHeight: "28rem", overflow: "auto" }}>
                <table className="atelier-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Name / email</th>
                      <th>Issues</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.slice(0, 200).map((item) => (
                      <tr key={item.id}>
                        <td>{item.rowNumber}</td>
                        <td>
                          {[item.normalised.givenName, item.normalised.familyName].filter(Boolean).join(" ") || "—"}
                          <br />
                          <span className="muted">{item.normalised.email ?? ""}</span>
                        </td>
                        <td>
                          {item.issues.map((issue) => (
                            <div key={`${issue.code}-${issue.field}`}>
                              {issue.severity}: {issue.message}
                            </div>
                          ))}
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`decision-${item.id}`}>
                            Decision for row {item.rowNumber}
                          </label>
                          <select
                            id={`decision-${item.id}`}
                            name={`decision:${item.id}`}
                            defaultValue={item.decision ?? (item.proposedAction === "UPDATE" ? "UPDATE" : "CREATE")}
                          >
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update existing</option>
                            <option value="KEEP_SEPARATE">Keep separate</option>
                            <option value="EXCLUDE">Exclude</option>
                            <option value="SKIP">Skip</option>
                            <option value="DEFER">Defer</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PendingSubmit pendingLabel="Saving…">Save decisions</PendingSubmit>
            </fieldset>
          </form>
        ) : null}

        {permissions.intake && job.status === "READY_FOR_APPROVAL" ? (
          <form className="form" action={submitHvIntakeAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <IdempotencyField />
            <fieldset>
              <legend>Submit for approval</legend>
              <p className="lede">A different authorised checker must approve before promotion.</p>
              <label>
                Reason
                <input name="reason" defaultValue="Submit frozen intake edition for approval" required />
              </label>
              <PendingSubmit pendingLabel="Submitting…">Submit edition</PendingSubmit>
            </fieldset>
          </form>
        ) : null}

        {canApprove ? (
          <form className="form" action={approveHvIntakeAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <IdempotencyField />
            <fieldset>
              <legend>Checker approval</legend>
              <p className="lede">You cannot approve an intake you submitted.</p>
              <label>
                Reason
                <input name="reason" defaultValue="Approve promotion of frozen intake edition" required />
              </label>
              <PendingSubmit pendingLabel="Approving…">Approve promotion</PendingSubmit>
            </fieldset>
          </form>
        ) : null}

        {permissions.intake && ["APPROVED", "PROMOTING", "PAUSED"].includes(job.status) ? (
          <form className="form" action={advanceHvIntakeAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <IdempotencyField />
            <PendingSubmit pendingLabel="Promoting…">Promote / continue</PendingSubmit>
          </form>
        ) : null}

        {permissions.intakeCancel && !["COMPLETED", "COMPLETED_WITH_EXCEPTIONS", "CANCELLED", "SUPERSEDED"].includes(job.status) ? (
          <form className="form" action={cancelHvIntakeAction}>
            <input type="hidden" name="eventId" value={scoped.event.id} />
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="expectedVersion" value={job.version} />
            <IdempotencyField />
            <label>
              Cancellation reason
              <input name="reason" required defaultValue="Cancel intake at safe boundary" />
            </label>
            <PendingSubmit pendingLabel="Cancelling…">Cancel intake</PendingSubmit>
          </form>
        ) : null}

        {receipt ? (
          <section aria-labelledby="receipt-title">
            <h2 id="receipt-title">Reconciliation receipt</h2>
            <ul>
              <li>Source rows: {receipt.totals.sourceRows}</li>
              <li>Created: {receipt.totals.createdGuests}</li>
              <li>Updated: {receipt.totals.updatedGuests}</li>
              <li>Unchanged: {receipt.totals.unchangedGuests}</li>
              <li>Excluded: {receipt.totals.excludedRows}</li>
              <li>Rejected: {receipt.totals.rejectedRows}</li>
              <li>Skipped: {receipt.totals.skippedRows}</li>
              <li>Failed: {receipt.totals.failedRows}</li>
              <li>
                Guest total: {receipt.totals.guestTotalBefore} → {receipt.totals.guestTotalAfter}
              </li>
              <li>Machine time: {receipt.timings.machineMs} ms</li>
            </ul>
          </section>
        ) : null}

        {permissions.intakeExport ? (
          <p>
            <a href={`/api/events/${scoped.event.id}/guests/intake/${job.id}/correction`}>Download correction CSV</a>
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
