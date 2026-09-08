"use client";

import type { LayoutSetupWorkspace } from "@maison-doclar/shared-platform";
import {
  acknowledgeLayoutFindingAction,
  calibrateFloorPlanAction,
  createLayoutSnapshotAction,
  decideLayoutApprovalAction,
  overrideLayoutFindingAction,
  publishLayoutAction,
  recordFloorPlanIntentAction,
  recordOperationalCapacityAction,
  requestLayoutExportAction,
  restoreLayoutSnapshotAction,
  revokeLayoutOverrideAction,
  runLayoutValidationAction,
  submitLayoutApprovalAction,
  withdrawLayoutAssetAction,
  withdrawLayoutPublicationAction,
} from "../server/actions";
import { FloorPlanUploadForm } from "./floor-plan-upload";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

function CasFields({ workspace, eventId }: { workspace: LayoutSetupWorkspace; eventId: string }) {
  return (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="layoutId" value={workspace.layout.id} />
      <input type="hidden" name="expectedVersion" value={workspace.layout.version} />
      <input type="hidden" name="expectedRevisionNumber" value={workspace.layout.currentRevisionNumber} />
      <IdempotencyField />
    </>
  );
}

function productCard(label: string, quantity: number | undefined, present: boolean, explanation: string, extra?: string) {
  return (
    <article className="capacity-card">
      <h3>{label}</h3>
      <p>
        <span className="md-status" data-tone={present ? "ok" : "warn"}>
          {present ? "Recorded" : "Unknown"}
        </span>{" "}
        {present ? `Quantity ${quantity ?? "range"}` : "No inferred substitute"}
      </p>
      {extra ? <p>{extra}</p> : null}
      <p>{explanation}</p>
    </article>
  );
}

export function LayoutAssuranceWorkspace({
  workspace,
  eventId,
  mutationLocked,
  diffSummary,
  comparisonDirection,
  comparisonNoChange,
}: {
  workspace: LayoutSetupWorkspace;
  eventId: string;
  mutationLocked: boolean;
  diffSummary?: Array<{ kind: string; summary: string }>;
  comparisonDirection?: string;
  comparisonNoChange?: boolean;
}) {
  const { assurance, layout } = workspace;
  const currentPublication = assurance.publications.find((item) => item.status === "CURRENT");
  const submitted = [...assurance.approvals].reverse().find((item) => item.status === "SUBMITTED");
  return (
    <section className="venue-atelier layout-assurance" data-testid="layout-assurance">
      <section className="atelier-panel" data-testid="validation-centre">
        <h2>Validation centre</h2>
        <p>
          Engine {assurance.latestRun?.engineId ?? "not run"} {assurance.latestRun?.engineVersion ?? ""}. Findings bind to revision{" "}
          {assurance.latestRun?.revisionNumber ?? "—"} hash {assurance.latestRun?.contentHash ?? "—"}. Software does not certify fire,
          engineering, accessibility or crowd safety.
        </p>
        {assurance.publicationBlocked ? (
          <p className="studio-conflict" role="status" data-testid="validation-summary">
            Publication blocked: {assurance.unresolvedBlockingCount} unresolved effective blocker
            {assurance.unresolvedBlockingCount === 1 ? "" : "s"} on this hash.
            Raw blocking findings: {assurance.rawBlockingCount}. Validly overridden: {assurance.overriddenBlockingCount}.
          </p>
        ) : (
          <p role="status" data-testid="validation-summary">
            Publication is not blocked by an unresolved effective blocker.
            Raw blocking findings: {assurance.rawBlockingCount}. Validly overridden: {assurance.overriddenBlockingCount}.
            {assurance.rawBlockingCount > 0 && assurance.overriddenBlockingCount > 0
              ? " Publication is permitted because blocking findings are validly overridden."
              : ""}
          </p>
        )}
        {assurance.latestRun && assurance.latestRun.contentHash !== layout.contentHash ? (
          <p className="studio-conflict" role="status">
            Stale validation: findings belong to a previous hash. Run validation again.
          </p>
        ) : null}
        {assurance.capabilities.canRunValidation ? (
          <form action={runLayoutValidationAction} className="form programme-form">
            <CasFields workspace={workspace} eventId={eventId} />
            <input type="hidden" name="reason" value="Run layout validation engine" />
            <PendingSubmit locked={mutationLocked}>Run validation</PendingSubmit>
          </form>
        ) : null}
        {assurance.findings.length === 0 ? <p className="empty">No current findings. Run validation to evaluate this revision.</p> : null}
        <ul className="atelier-folio finding-list">
          {assurance.findings.map((finding) => (
            <li key={finding.id} data-testid={`finding-${finding.severity.toLowerCase()}`}>
              <article>
                <p>
                  <span className="md-status" data-tone={finding.severity === "BLOCKING" ? "danger" : finding.severity === "WARNING" ? "warn" : "ok"}>
                    {finding.severity}
                  </span>{" "}
                  {finding.status} · {finding.ruleId} v{finding.ruleVersion}
                  {finding.overrideRecognised ? " · existing governed override recognised" : ""}
                </p>
                <p>{finding.explanation}</p>
                <p>Evidence: {finding.evidence}</p>
                <p>Recommended action: {finding.recommendedAction}</p>
                <p>
                  Source {finding.sourceKind} · applicability {finding.applicability} · owner {finding.ownerLabel} · authority{" "}
                  {finding.requiredAuthority}
                </p>
                {finding.objectIds.length > 0 ? (
                  <p>
                    <a href={`?focusObjects=${finding.objectIds.join(",")}`}>Select affected objects in studio and navigator</a>
                  </p>
                ) : null}
                {finding.severity === "RECOMMENDATION" ? (
                  <p>This recommendation advises only. It cannot approve, publish or override.</p>
                ) : null}
                {assurance.capabilities.canRunValidation && finding.severity !== "BLOCKING" && finding.status === "OPEN" ? (
                  <form action={acknowledgeLayoutFindingAction} className="form programme-form">
                    <CasFields workspace={workspace} eventId={eventId} />
                    <input type="hidden" name="findingId" value={finding.id} />
                    <input type="hidden" name="reason" value="Acknowledge finding" />
                    <PendingSubmit locked={mutationLocked}>Acknowledge</PendingSubmit>
                  </form>
                ) : null}
                {assurance.capabilities.canOverrideConstraint && finding.status === "OVERRIDDEN" && finding.overrideId ? (
                  <form action={revokeLayoutOverrideAction} className="form programme-form">
                    <CasFields workspace={workspace} eventId={eventId} />
                    <input type="hidden" name="overrideId" value={finding.overrideId} />
                    <input type="hidden" name="reason" value="Revoke authorised finding override" />
                    <PendingSubmit locked={mutationLocked}>Revoke override</PendingSubmit>
                  </form>
                ) : null}
                {assurance.capabilities.canOverrideConstraint && finding.status === "OPEN" ? (
                  <form action={overrideLayoutFindingAction} className="form programme-form">
                    <CasFields workspace={workspace} eventId={eventId} />
                    <input type="hidden" name="findingId" value={finding.id} />
                    <label>
                      Authority
                      <select name="authorityKind" defaultValue="EVENT_DIRECTOR">
                        <option value="EVENT_DIRECTOR">Event director</option>
                        <option value="QUALIFIED_AUTHORITY">Qualified authority</option>
                      </select>
                    </label>
                    <label>
                      Evidence
                      <input name="evidenceLabel" required maxLength={240} />
                    </label>
                    <label>
                      Expires
                      <input name="expiresAt" required type="datetime-local" />
                    </label>
                    <input type="hidden" name="reason" value="Authorised finding override" />
                    <PendingSubmit locked={mutationLocked}>Record authorised override</PendingSubmit>
                  </form>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="atelier-panel" data-testid="capacity-report">
        <h2>Capacity report</h2>
        <p>Products are kept separate. Phase occupancy must not be summed as whole-event people. No universal reduction percentage is applied.</p>
        <div className="capacity-grid">
          {productCard("Declared venue capacity", assurance.capacity.declaredVenueCapacity.quantity, assurance.capacity.declaredVenueCapacity.present, assurance.capacity.declaredVenueCapacity.explanation)}
          {productCard("Geometric capacity", assurance.capacity.geometricCapacity.quantity, assurance.capacity.geometricCapacity.present, assurance.capacity.geometricCapacity.explanation)}
          {productCard(
            "Operational capacity",
            assurance.capacity.operationalCapacity.quantity,
            assurance.capacity.operationalCapacity.present,
            assurance.capacity.operationalCapacity.explanation,
            assurance.capacity.operationalCapacity.ownerLabel,
          )}
          {productCard("Expected attendance", assurance.capacity.expectedAttendance.quantity, assurance.capacity.expectedAttendance.present, assurance.capacity.expectedAttendance.explanation)}
          {productCard("Observed RSVP", assurance.capacity.observedRsvp.quantity, assurance.capacity.observedRsvp.present, assurance.capacity.observedRsvp.explanation)}
          {productCard("Forecast range", assurance.capacity.forecastRange.quantity, assurance.capacity.forecastRange.present, assurance.capacity.forecastRange.explanation, `Low ${assurance.capacity.forecastRange.low ?? "unknown"} · high ${assurance.capacity.forecastRange.high ?? "unknown"}`)}
          {productCard("Operational provision", assurance.capacity.operationalProvision.quantity, assurance.capacity.operationalProvision.present, assurance.capacity.operationalProvision.explanation)}
          {productCard("Observed attendance", assurance.capacity.observedAttendance.quantity, assurance.capacity.observedAttendance.present, assurance.capacity.observedAttendance.explanation)}
        </div>
        {assurance.capacity.phaseOccupancy.length > 0 ? (
          <div className="capacity-cards" data-testid="phase-occupancy">
            {assurance.capacity.phaseOccupancy.map((item, index) => (
              <article key={`${item.quantity}-${index}`} className="capacity-card">
                <h3>Phase occupancy</h3>
                <p>Not whole-event people · quantity {item.quantity ?? "unknown"}</p>
                <p>{item.explanation}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>No phase occupancy slices. Missing facts remain visible.</p>
        )}
        <ul className="atelier-folio capacity-tables">
          {assurance.capacity.tableBreakdown.map((table) => (
            <li key={table.objectId}>
              <span data-label="Table">{table.label}</span>
              <span data-label="Declared capacity">{table.declaredCapacity}</span>
              <span data-label="Physical seats">{table.physicalSeatCount}</span>
            </li>
          ))}
        </ul>
        {assurance.capabilities.canRecordCapacity ? (
          <form action={recordOperationalCapacityAction} className="form programme-form">
            <CasFields workspace={workspace} eventId={eventId} />
            <label>
              Operational quantity
              <input name="quantity" required inputMode="numeric" />
            </label>
            <label>
              Owner label
              <input name="ownerLabel" required maxLength={160} defaultValue="Event director" />
            </label>
            <label>
              Source kind
              <select name="sourceKind" defaultValue="STAFF_OBSERVED">
                <option value="VENUE_SUPPLIED">Venue supplied</option>
                <option value="QUALIFIED_AUTHORITY">Qualified authority</option>
                <option value="STAFF_OBSERVED">Staff observed</option>
                <option value="UNVERIFIED_REPORT">Unverified report</option>
              </select>
            </label>
            <label>
              Source label
              <input name="sourceLabel" required maxLength={160} />
            </label>
            <label>
              Verification
              <select name="verificationState" defaultValue="UNVERIFIED">
                <option value="UNKNOWN">Unknown</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="VERIFIED">Verified</option>
                <option value="CONFLICTING">Conflicting</option>
                <option value="STALE">Stale</option>
              </select>
            </label>
            <label>
              Rationale
              <input name="rationale" required maxLength={400} />
            </label>
            <input type="hidden" name="reason" value="Record operational capacity" />
            <PendingSubmit locked={mutationLocked}>Record operational capacity</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section className="atelier-panel" data-testid="floor-plan-assets">
        <h2>Floor-plan assets</h2>
        <p>
          {assurance.assetProviderConfigured
            ? "Private storage is bound. Files are scanned in-process, quarantined before use, and never treated as spatially authoritative until verified calibration."
            : "Live binary upload is unavailable because private storage is not bound. Intents are metadata-only."}{" "}
          SVG scripts and active external references are rejected. Provider configured: {String(assurance.assetProviderConfigured)}.
        </p>
        {assurance.capabilities.canManageAsset && assurance.assetProviderConfigured ? (
          <FloorPlanUploadForm
            organisationId={layout.organisationId}
            eventId={eventId}
            layoutId={layout.id}
            expectedVersion={layout.version}
            expectedRevisionNumber={layout.currentRevisionNumber}
            locked={mutationLocked}
          />
        ) : null}
        {assurance.capabilities.canManageAsset && !assurance.assetProviderConfigured ? (
          <form action={recordFloorPlanIntentAction} className="form programme-form">
            <CasFields workspace={workspace} eventId={eventId} />
            <label>
              File name
              <input name="originalFileName" required maxLength={240} defaultValue="floor-plan.pdf" />
            </label>
            <label>
              Declared MIME
              <input name="declaredMime" required defaultValue="application/pdf" />
            </label>
            <label>
              Kind
              <select name="detectedKind" defaultValue="PDF">
                <option value="PDF">PDF</option>
                <option value="SVG">SVG</option>
                <option value="PNG">PNG</option>
                <option value="JPEG">JPEG</option>
              </select>
            </label>
            <label>
              Byte size
              <input name="byteSize" required inputMode="numeric" defaultValue="1024" />
            </label>
            <label>
              SHA-256 checksum
              <input name="checksumSha256" required minLength={64} maxLength={64} />
            </label>
            <label>
              Optional SVG text
              <textarea name="svgText" rows={3} />
            </label>
            <input type="hidden" name="reason" value="Record floor-plan upload intent" />
            <PendingSubmit locked={mutationLocked}>Record upload intent</PendingSubmit>
          </form>
        ) : null}
        <ul className="atelier-folio">
          {assurance.assets.map((asset) => (
            <li key={asset.id}>
              <span>
                {asset.originalFileName} · {asset.storageState} · scan {asset.scanStatus} · {asset.calibrated ? "calibrated" : "not spatially authoritative"}
              </span>
              {asset.uploadAvailable && asset.storageState === "AVAILABLE" && asset.retentionState === "ACTIVE" ? (
                <p>
                  <a href={`/api/events/${eventId}/layouts/${layout.id}/assets/${asset.id}?organisationId=${layout.organisationId}`}>
                    Download stored floor-plan
                  </a>
                </p>
              ) : null}
              {assurance.capabilities.canManageAsset && asset.retentionState === "ACTIVE" ? (
                <form action={calibrateFloorPlanAction} className="form programme-form">
                  <CasFields workspace={workspace} eventId={eventId} />
                  <input type="hidden" name="assetId" value={asset.id} />
                  <label>
                    Measurement (mm)
                    <input name="measurementMm" required inputMode="numeric" />
                  </label>
                  <label>
                    Source kind
                    <select name="sourceKind" defaultValue="STAFF_OBSERVED">
                      <option value="VENUE_SUPPLIED">Venue supplied</option>
                      <option value="QUALIFIED_AUTHORITY">Qualified authority</option>
                      <option value="STAFF_OBSERVED">Staff observed</option>
                      <option value="UNVERIFIED_REPORT">Unverified report</option>
                    </select>
                  </label>
                  <label>
                    Source label
                    <input name="sourceLabel" required maxLength={160} />
                  </label>
                  <label>
                    Verification
                    <select name="verificationState" defaultValue="UNVERIFIED">
                      <option value="UNVERIFIED">Unverified</option>
                      <option value="VERIFIED">Verified</option>
                    </select>
                  </label>
                  <input type="hidden" name="reason" value="Calibrate floor-plan asset" />
                  <PendingSubmit locked={mutationLocked}>Calibrate</PendingSubmit>
                </form>
              ) : null}
              {assurance.capabilities.canManageAsset && asset.retentionState === "ACTIVE" ? (
                <form action={withdrawLayoutAssetAction} className="form programme-form">
                  <CasFields workspace={workspace} eventId={eventId} />
                  <input type="hidden" name="assetId" value={asset.id} />
                  <input type="hidden" name="reason" value="Remove floor-plan from active layout use" />
                  <PendingSubmit locked={mutationLocked}>Remove from layout</PendingSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="atelier-panel" data-testid="layout-snapshots">
        <h2>Snapshots, comparison and restore</h2>
        <p>Snapshots are immutable named hashes of canonical layout state. Restore creates a new draft version. It does not rewrite history or change the current publication.</p>
        {assurance.capabilities.canManageSnapshot ? (
          <form action={createLayoutSnapshotAction} className="form programme-form">
            <CasFields workspace={workspace} eventId={eventId} />
            <label>
              Snapshot name
              <input name="name" required maxLength={160} />
            </label>
            <input type="hidden" name="reason" value="Create immutable layout snapshot" />
            <PendingSubmit locked={mutationLocked}>Create snapshot</PendingSubmit>
          </form>
        ) : null}
        <form method="get" className="form programme-form" data-testid="snapshot-compare-form">
          <label>
            Base snapshot
            <select name="baseSnapshot" required defaultValue="">
              <option value="" disabled>
                Select base
              </option>
              {assurance.snapshots.map((item) => (
                <option key={`base-${item.id}`} value={item.id}>
                  {item.name} · r{item.revisionNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Comparison source
            <select name="compareSnapshot" required defaultValue="">
              <option value="" disabled>
                Select comparison
              </option>
              <option value="CURRENT">Current draft</option>
              {assurance.snapshots.map((item) => (
                <option key={`compare-${item.id}`} value={item.id}>
                  {item.name} · r{item.revisionNumber}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            Compare snapshots
          </button>
          <p className="lede">Comparison is listed as text, not colour alone. Snapshots are not mutated. Auditor review remains read-only.</p>
        </form>
        <ul className="atelier-folio">
          {assurance.snapshots.map((snapshot) => (
            <li key={snapshot.id}>
              <span>
                {snapshot.name} · rev {snapshot.revisionNumber} · {snapshot.contentHash.slice(0, 12)}
              </span>
              {assurance.capabilities.canManageSnapshot ? (
                <form action={restoreLayoutSnapshotAction} className="form programme-form">
                  <CasFields workspace={workspace} eventId={eventId} />
                  <input type="hidden" name="snapshotId" value={snapshot.id} />
                  <input type="hidden" name="reason" value="Restore snapshot as a new draft version" />
                  <p>Restoring creates a new revision from this hash. The snapshot and any current publication stay unchanged. Confirm before continuing.</p>
                  <label className="studio-check">
                    <input type="checkbox" name="confirmNewVersion" value="true" required /> I understand this creates a new version
                  </label>
                  <PendingSubmit locked={mutationLocked}>Restore as new version</PendingSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {comparisonDirection ? <p data-testid="layout-diff-direction">Direction: {comparisonDirection}</p> : null}
        {comparisonNoChange ? (
          <p data-testid="layout-diff">No material spatial or semantic changes.</p>
        ) : diffSummary && diffSummary.length > 0 ? (
          <ul className="atelier-folio" data-testid="layout-diff">
            {diffSummary.map((entry, index) => (
              <li key={`${entry.kind}-${index}`}>
                {entry.kind}: {entry.summary}
              </li>
            ))}
          </ul>
        ) : (
          <p data-testid="layout-diff">No comparison selected. Comparison is listed as text, not colour alone.</p>
        )}
      </section>

      <section className="atelier-panel" data-testid="layout-approval">
        <h2>Maker/checker approval</h2>
        <p>The author of a submitted hash cannot approve it. System administration does not grant operational approval. A material change invalidates approval.</p>
        {assurance.capabilities.canSubmitApproval ? (
          <form action={submitLayoutApprovalAction} className="form programme-form">
            <CasFields workspace={workspace} eventId={eventId} />
            <input type="hidden" name="reason" value="Submit layout hash for approval" />
            <PendingSubmit locked={mutationLocked}>Submit for approval</PendingSubmit>
          </form>
        ) : null}
        <ul className="atelier-folio">
          {assurance.approvals.map((approval) => (
            <li key={approval.id} data-testid={`layout-approval-${approval.status}`}>
              <span>
                {approval.status} · hash {approval.contentHash.slice(0, 12)} · {approval.capacityBasis}
              </span>
              <p>{approval.materialDiffSummary}</p>
              <p>{approval.downstreamImpact}</p>
              {assurance.capabilities.canDecideApproval && approval.status === "SUBMITTED" ? (
                <form action={decideLayoutApprovalAction} className="form programme-form">
                  <CasFields workspace={workspace} eventId={eventId} />
                  <input type="hidden" name="approvalId" value={approval.id} />
                  <label>
                    Decision
                    <select name="decision" defaultValue="APPROVED">
                      <option value="APPROVED">Approve</option>
                      <option value="REJECTED">Reject</option>
                      <option value="REVOKED">Revoke</option>
                    </select>
                  </label>
                  <input type="hidden" name="reason" value="Maker/checker decision" />
                  <PendingSubmit locked={mutationLocked}>Record decision</PendingSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {submitted ? <p>Submitted hash awaiting a different checker.</p> : null}
      </section>

      <section className="atelier-panel" data-testid="layout-publication">
        <h2>Publication</h2>
        <p>Publication is a server-authorised decision over an approved hash. It does not send communications, create credentials, allocate guests or sign a protected gate.</p>
        {currentPublication ? (
          <p data-testid="publication-status">
            {currentPublication.status} publication {currentPublication.publicationNumber} · hash {currentPublication.contentHash} ·{" "}
            {currentPublication.publishedAt}
          </p>
        ) : (
          <p data-testid="publication-status">No current publication. Drafts are not published.</p>
        )}
        {assurance.publications.map((item) => (
          <p key={item.id}>
            {item.status} #{item.publicationNumber} {item.contentHash.slice(0, 12)}
            {assurance.capabilities.canPublish && item.status === "CURRENT" ? (
              <form action={withdrawLayoutPublicationAction} className="form programme-form">
                <CasFields workspace={workspace} eventId={eventId} />
                <input type="hidden" name="publicationId" value={item.id} />
                <input type="hidden" name="reason" value="Withdraw current publication" />
                <PendingSubmit locked={mutationLocked}>Withdraw</PendingSubmit>
              </form>
            ) : null}
          </p>
        ))}
        {assurance.capabilities.canPublish ? (
          <form action={publishLayoutAction} className="form programme-form">
            <CasFields workspace={workspace} eventId={eventId} />
            <input type="hidden" name="reason" value="Publish approved layout hash" />
            <PendingSubmit locked={mutationLocked}>Publish approved hash</PendingSubmit>
          </form>
        ) : null}
        <form action={requestLayoutExportAction} className="form programme-form">
          <CasFields workspace={workspace} eventId={eventId} />
          <label>
            Format
            <select name="format" defaultValue="PDF">
              <option value="PDF">PDF</option>
              <option value="PNG">PNG</option>
            </select>
          </label>
          <input type="hidden" name="reason" value="Request status-marked export" />
          <PendingSubmit locked={mutationLocked}>Request export</PendingSubmit>
        </form>
        <p>
          {assurance.pdfExportAvailable
            ? "PDF and PNG export is generated from the current publication hash when one exists, otherwise the approved or draft hash. Completion is recorded only after a private object exists."
            : "PDF/PNG generation is disabled. Files are not fabricated."}
        </p>
        <ul className="atelier-folio">
          {assurance.exportJobs.map((job) => (
            <li key={job.id} data-testid={`export-job-${job.marking}`}>
              <span>
                {job.marking} · {job.format} · {job.status} · hash {job.contentHash}
                {job.publicationNumber ? ` · publication ${job.publicationNumber}` : ""}
                {job.generatedAt ? ` · generated ${job.generatedAt}` : ""}
              </span>
              <p>{job.notes}</p>
              {job.status === "COMPLETED" ? (
                <p>
                  <a href={`/api/events/${eventId}/layouts/${layout.id}/exports/${job.id}?organisationId=${layout.organisationId}`}>
                    Download {job.format}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
