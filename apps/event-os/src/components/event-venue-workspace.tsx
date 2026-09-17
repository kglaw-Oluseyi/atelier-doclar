"use client";

import Link from "next/link";
import type { EventVenueWorkspace } from "@maison-doclar/shared-platform/client-types";
import { adoptVenueAction, recordEventVenueOverrideAction } from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function EventVenueWorkspaceView({
  workspace,
  mutationLocked,
}: {
  workspace: EventVenueWorkspace;
  mutationLocked: boolean;
}) {
  return (
    <section className="venue-atelier" data-testid="event-venue-setup">
      <section className="atelier-panel" id="event-venue-adopted">
        <h2>Adopted venue</h2>
        {workspace.adopted ? (
          <>
            <p>
              <Link href={`/app/venues/${workspace.adopted.venueId}`}>{workspace.adopted.venueName}</Link>
            </p>
            <p className="lede">
              Event-specific snapshot taken at venue version {workspace.adopted.sourceVenueVersion}. Hash{" "}
              <code>{workspace.adopted.sourceVenueHash.slice(0, 12)}</code>. The reusable venue is unchanged.
            </p>
          </>
        ) : (
          <section className="atelier-state" data-kind="empty" data-tone="brass" data-testid="no-event-venue">
            <h3>No venue adopted</h3>
            <p>Adopt an organisation venue to create an event-scoped snapshot. This does not edit the reusable source.</p>
          </section>
        )}
      </section>
      {workspace.capabilities.canAdoptVenue && !workspace.adopted ? (
        <section className="atelier-panel" id="event-venue-adopt">
          <h2>Adopt a venue</h2>
          {workspace.availableVenues.length === 0 ? (
            <p className="empty">
              No organisation venues are available.{" "}
              <Link href="/app/venues/new">Register a venue</Link> first.
            </p>
          ) : (
            <form action={adoptVenueAction} className="form programme-form">
              <input type="hidden" name="eventId" value={workspace.eventId} />
              <IdempotencyField />
              <label>
                Organisation venue
                <select name="venueId" required>
                  {workspace.availableVenues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason
                <input name="reason" required maxLength={400} defaultValue="Adopt venue into this event" />
              </label>
              <PendingSubmit locked={mutationLocked}>Adopt venue</PendingSubmit>
            </form>
          )}
        </section>
      ) : null}
      <section className="atelier-panel" id="event-venue-facts">
        <h2>Inherited and event-specific facts</h2>
        <div className="table-wrap">
          <table className="data-table">
            <caption>Event venue facts</caption>
            <thead>
              <tr>
                <th>Origin</th>
                <th>Fact</th>
                <th>Value</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {[...workspace.inheritedFacts, ...workspace.overrideFacts].map((fact) => (
                <tr key={fact.id}>
                  <td data-label="Origin">{fact.inherited ? "Inherited" : "Event override"}</td>
                  <td data-label="Fact">
                    {fact.factType.replaceAll("_", " ")} · {fact.subtype.replaceAll("_", " ")}
                  </td>
                  <td data-label="Value">{fact.valueLabel}</td>
                  <td data-label="Verification">
                    <span className="md-status">{fact.verificationState}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {workspace.inheritedFacts.length + workspace.overrideFacts.length === 0 ? (
          <p className="empty">No inherited or event-specific facts yet.</p>
        ) : null}
      </section>
      {workspace.capabilities.canOverrideFact && workspace.adopted ? (
        <section className="atelier-panel" id="event-venue-override">
          <h2>Event-only override</h2>
          <form action={recordEventVenueOverrideAction} className="form programme-form">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="eventVenueId" value={workspace.adopted.id} />
            <IdempotencyField />
            <label>
              Fact type
              <select name="factType" defaultValue="OTHER">
                <option value="OTHER">Other</option>
                <option value="ACCESS">Access</option>
                <option value="OPERATING_HOURS">Operating hours</option>
              </select>
            </label>
            <label>
              Subtype
              <select name="subtype" defaultValue="GENERAL">
                <option value="GENERAL">General</option>
                <option value="ENTRANCE">Entrance</option>
                <option value="STANDARD">Standard hours</option>
              </select>
            </label>
            <input type="hidden" name="unit" value="TEXT" />
            <label>
              Event-only value
              <input name="valueText" required maxLength={800} />
            </label>
            <label>
              Source
              <input name="sourceLabel" required maxLength={160} defaultValue="Event production note" />
            </label>
            <input type="hidden" name="sourceKind" value="STAFF_OBSERVED" />
            <label>
              Reason
              <input name="reason" required maxLength={400} defaultValue="Record event-only venue fact" />
            </label>
            <PendingSubmit locked={mutationLocked}>Save override</PendingSubmit>
          </form>
        </section>
      ) : null}
      <section className="atelier-panel" id="event-venue-layouts">
        <h2>Layouts</h2>
        <p className="actions">
          {workspace.capabilities.canCreateLayout && workspace.adopted ? (
            <Link className="button" href={`/app/events/${workspace.eventId}/layouts/new`}>
              Create blank layout
            </Link>
          ) : null}
          <Link className="button secondary" href={`/app/events/${workspace.eventId}/layouts`}>
            Layout list
          </Link>
        </p>
        {workspace.layouts.length === 0 ? (
          <p className="empty">No layouts yet. A blank layout is enough for Milestone 1.</p>
        ) : (
          <ul className="atelier-folio">
            {workspace.layouts.map((layout) => (
              <li key={layout.id}>
                <Link href={`/app/events/${workspace.eventId}/layouts/${layout.id}`}>{layout.name}</Link>
                <span className="md-status">{layout.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="atelier-panel" id="event-venue-attendance">
        <h2>Attendance boundary</h2>
        <p className="lede">
          Read-only adapter. EOS-S05 does not calculate capacity and must not sum phase counts as whole-event people.
        </p>
        <ul>
          <li>Observed RSVP: {workspace.attendanceProjection.observedRsvp.present ? workspace.attendanceProjection.observedRsvp.quantity ?? "present" : "unknown"}</li>
          <li>
            Whole-event forecast:{" "}
            {workspace.attendanceProjection.wholeEventDistinctPersonForecast.present
              ? `${workspace.attendanceProjection.wholeEventDistinctPersonForecast.low}–${workspace.attendanceProjection.wholeEventDistinctPersonForecast.high}`
              : "unknown"}
          </li>
          <li>Phase occupancy rows: {workspace.attendanceProjection.phaseOccupancy.length} (not whole-event people)</li>
          <li>Operational provision: {workspace.attendanceProjection.operationalProvision.present ? workspace.attendanceProjection.operationalProvision.quantity : "unknown"}</li>
          <li>Observed attendance: {workspace.attendanceProjection.observedAttendance.present ? workspace.attendanceProjection.observedAttendance.quantity : "unknown"}</li>
        </ul>
      </section>
    </section>
  );
}
