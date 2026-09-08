"use client";

import type { LayoutSetupWorkspace } from "@maison-doclar/shared-platform";
import { updateLayoutSetupAction } from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

function displaySize(mm: number, unit: "METRE" | "FOOT"): string {
  if (unit === "FOOT") return `${(mm / 304.8).toFixed(2)} ft`;
  return `${(mm / 1000).toFixed(2)} m`;
}

export function LayoutSetupWorkspaceView({
  workspace,
  eventId,
  mutationLocked,
}: {
  workspace: LayoutSetupWorkspace;
  eventId: string;
  mutationLocked: boolean;
}) {
  const { layout, coordinateSystem } = workspace;
  return (
    <section className="venue-atelier" data-testid="layout-setup">
      <section className="atelier-panel" id="layout-geometry">
        <h2>Canonical geometry</h2>
        <p>
          Origin {coordinateSystem.origin.replaceAll("_", " ").toLowerCase()}, X {coordinateSystem.axisX.toLowerCase()}, Y{" "}
          {coordinateSystem.axisY.toLowerCase()}. Canonical unit is millimetres. Display is{" "}
          {layout.displayLengthUnit === "FOOT" ? "feet" : "metres"} and does not change stored truth.
        </p>
        <p>
          Floor {layout.widthMm} × {layout.heightMm} mm ({displaySize(layout.widthMm, layout.displayLengthUnit)} ×{" "}
          {displaySize(layout.heightMm, layout.displayLengthUnit)}). Revision {layout.currentRevisionNumber}.
        </p>
        <p>
          Content hash <code data-testid="layout-hash">{layout.contentHash}</code>
        </p>
        <p>
          <span className="md-status" data-tone="ok">
            One editor lease
          </span>{" "}
          Collaborators remain read-only. Screen pixels are not persisted.
        </p>
      </section>
      {workspace.capabilities.canUpdateLayout ? (
        <section className="atelier-panel" id="layout-edit">
          <h2>Update setup</h2>
          <form action={updateLayoutSetupAction} className="form programme-form">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="layoutId" value={layout.id} />
            <input type="hidden" name="expectedVersion" value={layout.version} />
            <input type="hidden" name="expectedRevisionNumber" value={layout.currentRevisionNumber} />
            <IdempotencyField />
            <label>
              Layout name
              <input name="name" required maxLength={160} defaultValue={layout.name} />
            </label>
            <label>
              Width (mm)
              <input name="widthMm" required inputMode="numeric" defaultValue={layout.widthMm} />
            </label>
            <label>
              Height (mm)
              <input name="heightMm" required inputMode="numeric" defaultValue={layout.heightMm} />
            </label>
            <label>
              Display unit
              <select name="displayLengthUnit" defaultValue={layout.displayLengthUnit}>
                <option value="METRE">Metres</option>
                <option value="FOOT">Feet</option>
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required maxLength={400} defaultValue="Update blank layout setup" />
            </label>
            <PendingSubmit locked={mutationLocked}>Save layout</PendingSubmit>
          </form>
        </section>
      ) : (
        <p className="empty">This assignment can review the layout but cannot edit it.</p>
      )}
    </section>
  );
}
