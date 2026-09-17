"use client";

import { useState } from "react";
import type { VenueDetailWorkspace } from "@maison-doclar/shared-platform/client-types";
import { recordVenueFactAction, verifyVenueFactAction } from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function VenueDetailWorkspaceView({
  workspace,
  mutationLocked,
}: {
  workspace: VenueDetailWorkspace;
  mutationLocked: boolean;
}) {
  return (
    <section className="venue-atelier" data-testid="venue-detail">
      <section className="atelier-panel" id="venue-identity">
        <h2>Reusable venue</h2>
        <p>
          {workspace.venue.locality ?? "Locality unknown"} · {workspace.venue.countryCode ?? "Country unknown"} ·
          visibility {workspace.venue.visibilityPolicy.replaceAll("_", " ").toLowerCase()}
        </p>
        <p className="lede">
          Cross-client reuse is {workspace.venue.crossClientReuse === "DENIED" ? "denied by default" : "explicitly authorised"}.
          Adopting this venue into an event never rewrites this reusable record.
        </p>
      </section>
      <section className="atelier-panel" id="venue-facts">
        <h2>Facts and provenance</h2>
        {workspace.facts.length === 0 ? (
          <p className="empty">No facts have been recorded. Unknown remains a first-class state.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption>Venue facts</caption>
              <thead>
                <tr>
                  <th>Fact</th>
                  <th>Value</th>
                  <th>Source</th>
                  <th>Verification</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workspace.facts.map((fact) => (
                  <tr key={fact.id}>
                    <td data-label="Fact">
                      {fact.factType.replaceAll("_", " ")} · {fact.subtype.replaceAll("_", " ")}
                    </td>
                    <td data-label="Value">{fact.valueLabel}</td>
                    <td data-label="Source">
                      {fact.sourceKind.replaceAll("_", " ")} · {fact.sourceLabel}
                    </td>
                    <td data-label="Verification">
                      <span className="md-status" data-tone={fact.verificationState === "VERIFIED" ? "ok" : "brass"}>
                        {fact.verificationState}
                      </span>
                      {fact.mayBecomeLockedSafetyConstraint ? " · may become a locked safety constraint later" : ""}
                      {fact.evidence ? ` · evidence ${fact.evidence.storageState.toLowerCase()}` : ""}
                    </td>
                    <td data-label="Action">
                      {workspace.capabilities.canVerifyFact && fact.verificationState !== "VERIFIED" && !fact.superseded ? (
                        <form action={verifyVenueFactAction} className="language-inline-form">
                          <input type="hidden" name="venueId" value={workspace.venue.id} />
                          <input type="hidden" name="factId" value={fact.id} />
                          <input type="hidden" name="expectedVersion" value={fact.version} />
                          <IdempotencyField />
                          <label>
                            Reason
                            <input name="reason" required maxLength={400} defaultValue="Verify authorised venue fact" />
                          </label>
                          <PendingSubmit locked={mutationLocked}>Verify fact</PendingSubmit>
                        </form>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="atelier-panel" id="venue-evidence">
        <h2>Evidence</h2>
        <p className="lede">{workspace.assetGap}</p>
        <p>
          <span className="md-status" data-tone="warn">
            Binary upload unavailable
          </span>
        </p>
      </section>
      {workspace.capabilities.canRecordFact ? (
        <VenueFactForm venueId={workspace.venue.id} expectedVenueVersion={workspace.venue.version} mutationLocked={mutationLocked} />
      ) : null}
    </section>
  );
}

function VenueFactForm({
  venueId,
  expectedVenueVersion,
  mutationLocked,
}: {
  venueId: string;
  expectedVenueVersion: number;
  mutationLocked: boolean;
}) {
  const [subtype, setSubtype] = useState("VENUE_STATED");
  const [unit, setUnit] = useState("COUNT");
  const [countValue, setCountValue] = useState("");
  const unknownCapacity = subtype === "UNKNOWN_CAPACITY";
  const effectiveUnit = unknownCapacity ? "NONE" : unit;
  const countRequired = effectiveUnit === "COUNT";
  const countMissing = countRequired && countValue.trim() === "";
  return (
    <section className="atelier-panel" id="venue-record-fact">
      <h2>Record a fact</h2>
      <form action={recordVenueFactAction} className="form programme-form">
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="expectedVenueVersion" value={expectedVenueVersion} />
        <IdempotencyField />
        <label>
          Fact type
          <select name="factType" defaultValue="DECLARED_CAPACITY">
            <option value="ADDRESS">Address</option>
            <option value="DIMENSION">Dimension</option>
            <option value="DECLARED_CAPACITY">Declared capacity</option>
            <option value="ACCESS">Access</option>
            <option value="SAFETY_THRESHOLD">Safety threshold</option>
            <option value="OPERATING_HOURS">Operating hours</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>
          Subtype
          <select name="subtype" value={subtype} onChange={(event) => setSubtype(event.target.value)}>
            <option value="VENUE_STATED">Venue stated</option>
            <option value="FIRE_STATED">Fire stated</option>
            <option value="UNKNOWN_CAPACITY">Unknown capacity</option>
            <option value="STREET_LOCALITY">Street / locality</option>
            <option value="FLOOR_WIDTH">Floor width</option>
            <option value="MAX_OCCUPANCY">Max occupancy</option>
            <option value="STEP_FREE">Step free</option>
            <option value="GENERAL">General</option>
          </select>
        </label>
        <label>
          Unit
          <select
            name="unit"
            value={effectiveUnit}
            onChange={(event) => setUnit(event.target.value)}
            disabled={unknownCapacity}
          >
            <option value="COUNT">Count</option>
            <option value="MILLIMETRE">Millimetre</option>
            <option value="TEXT">Text</option>
            <option value="NONE">None</option>
          </select>
        </label>
        {unknownCapacity ? <input type="hidden" name="unit" value="NONE" /> : null}
        <p data-testid="count-fact-guidance">
          {unknownCapacity
            ? "Unknown capacity is recorded without a count. The unit is None."
            : "A count fact needs a whole number. If the count is unknown, choose Text or None instead of Count."}
        </p>
        <label>
          Text value
          <input name="valueText" maxLength={800} />
        </label>
        <label>
          Count
          <input
            name="valueInteger"
            inputMode="numeric"
            value={countValue}
            onChange={(event) => setCountValue(event.target.value)}
            required={countRequired}
            aria-invalid={countMissing}
          />
        </label>
        {countMissing ? (
          <p role="status">Enter a whole number, or change the unit to Text or None if the count is unknown.</p>
        ) : null}
        <label>
          Millimetres
          <input name="valueIntegerMm" inputMode="numeric" />
        </label>
        <label>
          Source kind
          <select name="sourceKind" defaultValue="UNVERIFIED_REPORT">
            <option value="VENUE_SUPPLIED">Venue supplied</option>
            <option value="QUALIFIED_AUTHORITY">Qualified authority</option>
            <option value="STAFF_OBSERVED">Staff observed</option>
            <option value="UNVERIFIED_REPORT">Unverified report</option>
          </select>
        </label>
        <label>
          Source label
          <input name="sourceLabel" required maxLength={160} defaultValue="Synthetic staff note" />
        </label>
        <label>
          Verification state
          <select name="verificationState" defaultValue="UNVERIFIED">
            <option value="UNKNOWN">Unknown</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="CONFLICTING">Conflicting</option>
            <option value="STALE">Stale</option>
          </select>
        </label>
        <label>
          Evidence file name
          <input name="evidenceFileName" maxLength={240} placeholder="Metadata only — upload unavailable" />
        </label>
        <label>
          Reason
          <input name="reason" required maxLength={400} defaultValue="Record synthetic venue fact" />
        </label>
        <PendingSubmit locked={mutationLocked || countMissing}>Save fact</PendingSubmit>
      </form>
    </section>
  );
}
