import {
  ARRIVAL_ROUTE_KINDS,
  CHECKPOINT_TYPES,
  PROGRAMME_PHASE_TYPES,
  VEHICLE_CLASSES,
  type EventProgrammeWorkspace,
} from "@maison-doclar/shared-platform";
import {
  assignPhaseEntitlementAction,
  consumeOfflinePackageAction,
  createArrivalRouteAction,
  createCheckpointAction,
  createProgrammePhaseAction,
  createVehicleAction,
  publishOfflinePackageAction,
  resolveCheckpointAction,
} from "../server/actions";
import { AtelierEmptyState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function ProgrammeWorkspace({
  workspace,
  outcome,
}: {
  workspace: EventProgrammeWorkspace;
  outcome?: string;
}) {
  const { capabilities } = workspace;
  return (
    <div className="programme-atelier">
      <section className="atelier-panel" aria-labelledby="programme-overview">
        <h2 id="programme-overview">{workspace.simpleMode ? "Single ceremony" : "Programme"}</h2>
        <p className="lede">
          {workspace.simpleMode
            ? "This event uses one default phase. Additional ceremonies appear only when you add a day, location or audience."
            : "Each ceremony has its own time, place, audience and checkpoints. One guest remains one person."}
        </p>
        <dl className="programme-attendance">
          <div>
            <dt>Distinct people</dt>
            <dd data-testid="distinct-attendance">{workspace.attendance.distinctGuests}</dd>
          </div>
          <div>
            <dt>Sum of phase counts</dt>
            <dd data-testid="summed-phase-counts">{workspace.attendance.summedPhaseCounts}</dd>
          </div>
        </dl>
        <p className="programme-law">
          Whole-event attendance is the distinct-person union, never the sum of phase counts.
        </p>
      </section>

      <ol className="programme-ribbon" aria-label="Chronological programme">
        {workspace.phases.map((phase) => (
          <li key={phase.id} className="programme-bead">
            <p className="eyebrow">{phase.isDefault ? "Default phase" : phase.type.replaceAll("_", " ")}</p>
            <h3>{phase.name}</h3>
            <p>
              {phase.locationGuestSafe ?? phase.locationLabel}
            </p>
            <p>
              <span className="md-status" data-tone="brass">
                {phase.status}
              </span>{" "}
              {phase.guestCount} entitled guests
            </p>
          </li>
        ))}
      </ol>

      <PerimeterDiagram workspace={workspace} />

      <section id="phases" className="atelier-panel" aria-labelledby="phase-heading">
        <h2 id="phase-heading">Day and phase workspace</h2>
        {workspace.phases.length === 0 ? (
          <AtelierEmptyState title="No phase is ready">A default phase should exist for every event.</AtelierEmptyState>
        ) : null}
        {capabilities.canManagePhase ? (
          <form className="form programme-form" action={createProgrammePhaseAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Ceremony name
              <input name="name" required maxLength={160} defaultValue="After-party" />
            </label>
            <label>
              Type
              <select name="type" defaultValue="AFTER_PARTY">
                {PROGRAMME_PHASE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starts
              <input name="startsAt" required defaultValue="2026-09-12T21:00:00.000Z" />
            </label>
            <label>
              Ends
              <input name="endsAt" required defaultValue="2026-09-13T01:00:00.000Z" />
            </label>
            <label>
              Location
              <input name="locationLabel" required maxLength={200} defaultValue="Private venue, Ikoyi" />
            </label>
            <label className="check">
              <input type="checkbox" name="overlapAcknowledged" /> Overlapping windows acknowledged
            </label>
            <label>
              Overlap reason
              <input name="overlapAcknowledgementReason" maxLength={240} placeholder="Assigned teams remain distinct" />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Add overlapping after-party with acknowledgement" />
            </label>
            <PendingSubmit>Add ceremony</PendingSubmit>
          </form>
        ) : (
          <p className="empty">Your assignment can view phases but cannot add ceremonies.</p>
        )}
      </section>

      <section id="entitlements" className="atelier-panel" aria-labelledby="entitle-heading">
        <h2 id="entitle-heading">Phase participation</h2>
        <p className="lede">Assigning a guest to a phase never duplicates the guest and never invents an invitation.</p>
        <ul className="atelier-member-cards">
          {workspace.entitlements.map((item) => (
            <li key={item.id}>
              <p className="guest-name">{item.displayName}</p>
              <p>
                {workspace.phases.find((phase) => phase.id === item.phaseId)?.name ?? "Phase"} ·{" "}
                {item.fastTrackRouting ? "Discreet route" : "General route"}
              </p>
            </li>
          ))}
        </ul>
        {capabilities.canManageEntitlement ? (
          <form className="form programme-form" action={assignPhaseEntitlementAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Guest
              <select name="guestId" required>
                {workspace.guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Phase
              <select name="phaseId" required>
                {workspace.phases.map((phase) => (
                  <option key={phase.id} value={`${phase.id}::${phase.version}`}>
                    {phase.name}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="hidden"
              name="expectedPhaseVersion"
              value={workspace.phases[0]?.version ?? 1}
            />
            <label>
              Route
              <select name="routeId">
                <option value="">None</option>
                {workspace.routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </label>
            {capabilities.canGrantProtectedAccess ? (
              <label className="check">
                <input type="checkbox" name="protectedAccess" /> Protected access
              </label>
            ) : (
              <p className="empty">Planner authority cannot grant protected access.</p>
            )}
            <label className="check">
              <input type="checkbox" name="fastTrackRouting" /> Discreet fast-track routing
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Assign selected phase without duplicating the guest" />
            </label>
            <PendingSubmit>Assign to phase</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section id="checkpoints" className="atelier-panel" aria-labelledby="check-heading">
        <h2 id="check-heading">Arrival routes and checkpoints</h2>
        {capabilities.canManageCheckpoint ? (
          <form className="form programme-form" action={createCheckpointAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Checkpoint name
              <input name="name" required defaultValue="Accessible entrance" />
            </label>
            <label>
              Type
              <select name="type" defaultValue="VENUE_ACCESSIBLE">
                {CHECKPOINT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Add accessible venue entrance" />
            </label>
            <PendingSubmit>Add checkpoint</PendingSubmit>
          </form>
        ) : null}
        {capabilities.canManageRoute ? (
          <form className="form programme-form" action={createArrivalRouteAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Route name
              <input name="name" required defaultValue="Accessible arrival" />
            </label>
            <label>
              Kind
              <select name="kind" defaultValue="ACCESSIBLE">
                {ARRIVAL_ROUTE_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Checkpoint ids
              <input
                name="checkpointIds"
                required
                defaultValue={workspace.checkpoints.map((item) => item.id).join(",")}
              />
            </label>
            <label>
              Discreet marker
              <input name="discreetMarker" maxLength={8} defaultValue="◇" />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Configure accessible routing" />
            </label>
            <PendingSubmit>Add route</PendingSubmit>
          </form>
        ) : null}
        <form className="form programme-form" action={resolveCheckpointAction}>
          <input type="hidden" name="eventId" value={workspace.eventId} />
          <label>
            Checkpoint
            <select name="checkpointId" required>
              {workspace.checkpoints.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Presentation reference
            <input name="presentationReference" required defaultValue="MD-EBUN01A" />
          </label>
          <PendingSubmit>Resolve credential</PendingSubmit>
        </form>
        {outcome ? (
          <p role="status" data-testid="resolve-outcome">
            Checkpoint outcome {outcome}. Attendance was not written.
          </p>
        ) : null}
      </section>

      <section id="vehicles" className="atelier-panel" aria-labelledby="vehicle-heading">
        <h2 id="vehicle-heading">Vehicles, drivers and entourage</h2>
        <ul className="atelier-member-cards">
          {workspace.vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <p className="guest-name">{vehicle.plate}</p>
              <p>
                {vehicle.vehicleClass} · {vehicle.status}
              </p>
              {vehicle.occupants.map((occupant) => (
                <p key={occupant.guestId}>
                  {occupant.role.replaceAll("_", " ")}: {occupant.displayName}
                </p>
              ))}
            </li>
          ))}
        </ul>
        {capabilities.canManageVehicle ? (
          <form className="form programme-form" action={createVehicleAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Plate
              <input name="plate" required defaultValue="LAG-221-MD" />
            </label>
            <label>
              Class
              <select name="vehicleClass" defaultValue="SALOON">
                {VEHICLE_CLASSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Driver
              <select name="driverGuestId">
                <option value="">None</option>
                {workspace.guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Register named vehicle and driver" />
            </label>
            <PendingSubmit>Register vehicle</PendingSubmit>
          </form>
        ) : (
          <p className="empty">Vehicle administration is not in this assignment.</p>
        )}
      </section>

      <section id="handoff" className="atelier-panel" aria-labelledby="handoff-heading">
        <h2 id="handoff-heading">Command handoff</h2>
        <p className="lede">
          Offline packages are signed projections for Slice 8. Consuming a package does not write attendance and does
          not become a second ledger.
        </p>
        <ul className="atelier-member-cards">
          {workspace.packages.map((item) => (
            <li key={item.id}>
              <p>
                Version {item.packageVersion} · {item.status} · {item.attendanceWriter.replaceAll("_", " ")}
              </p>
              {capabilities.canView && item.status === "ACTIVE" ? (
                <form action={consumeOfflinePackageAction}>
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="packageId" value={item.id} />
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <IdempotencyField />
                  <PendingSubmit>Consume projection</PendingSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {capabilities.canPublishAccessPlan ? (
          <form className="form programme-form" action={publishOfflinePackageAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Valid until
              <input name="validUntil" required defaultValue="2026-09-14T22:00:00.000Z" />
            </label>
            <label>
              Reason
              <input name="reason" required defaultValue="Publish superseding signed access plan" />
            </label>
            <PendingSubmit>Publish signed package</PendingSubmit>
          </form>
        ) : (
          <p className="empty">Publishing an access plan requires Event Director or CEO authority.</p>
        )}
      </section>
    </div>
  );
}

function PerimeterDiagram({ workspace }: { workspace: EventProgrammeWorkspace }) {
  const nodes = workspace.checkpoints;
  if (nodes.length === 0) {
    return (
      <section className="atelier-panel" aria-labelledby="perimeter-heading">
        <h2 id="perimeter-heading">Perimeter</h2>
        <AtelierEmptyState title="No checkpoints yet">Gate, parking and venue points appear here once configured.</AtelierEmptyState>
      </section>
    );
  }
  return (
    <section className="atelier-panel" aria-labelledby="perimeter-heading">
      <h2 id="perimeter-heading">Perimeter</h2>
      <figure className="programme-perimeter-figure">
        <svg
          className="programme-perimeter"
          viewBox="0 0 640 160"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Ordered perimeter checkpoints"
        >
          <rect x="8" y="24" width="624" height="112" rx="18" fill="#1c1916" />
          <line x1="40" y1="80" x2="600" y2="80" stroke="#d8c59c" strokeWidth="2" />
          {nodes.map((node, index) => {
            const x = 80 + (index * 480) / Math.max(nodes.length - 1, 1);
            return (
              <g key={node.id}>
                <circle cx={x} cy="80" r="16" fill="#f4efe6" stroke="#d8c59c" />
                <text x={x} y="124" textAnchor="middle" fill="#f4efe6" fontSize="11">
                  {index + 1}
                </text>
              </g>
            );
          })}
        </svg>
        <ol className="programme-perimeter-legend">
          {nodes.map((node, index) => (
            <li key={node.id}>
              <span className="programme-perimeter-index">{index + 1}</span>
              <span className="guest-name">{node.name}</span>
            </li>
          ))}
        </ol>
      </figure>
    </section>
  );
}
