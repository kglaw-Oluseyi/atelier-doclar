import Link from "next/link";
import { PlatformError } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { CanonicalTime } from "../../../../../components/canonical-evidence";
import { AtelierOperationalState, AtelierEmptyState } from "../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../components/shell";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { resolveVenueEvent, venuePermissions } from "../../../../../server/venue-scope";

export default async function LayoutListPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { actor, person } = await guardedActor();
  const scoped = resolveVenueEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = venuePermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.viewLayout) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view layouts.")} />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventVenueWorkspace(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Layouts could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Layouts · ${scoped.event.name}`}
        title="Spatial layouts"
        lede="Event-scoped layouts. Milestone 1 provides blank-layout setup. The canvas is a future projection of this typed record."
      />
      <p className="actions">
        {workspace.capabilities.canCreateLayout && workspace.adopted ? (
          <Link className="button" href={`/app/events/${eventId}/layouts/new`}>
            Create blank layout
          </Link>
        ) : null}
        <Link className="button secondary" href={`/app/events/${eventId}/venue`}>
          Event venue
        </Link>
      </p>
      <section className="venue-atelier" data-testid="layout-list">
        {workspace.layouts.length === 0 ? (
          <AtelierEmptyState title="No layouts">
            <p>Create a blank layout after a venue is adopted. Geometry is stored in millimetres, not screen pixels.</p>
          </AtelierEmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption>Event layouts</caption>
              <thead>
                <tr>
                  <th>Layout</th>
                  <th>Status</th>
                  <th>Venue</th>
                  <th>Updated</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {workspace.layouts.map((layout) => (
                  <tr key={layout.id}>
                    <td data-label="Layout">
                      <Link href={`/app/events/${eventId}/layouts/${layout.id}`}>{layout.name}</Link>
                      <p className="lede">
                        v{layout.currentRevisionNumber} · {layout.status}
                        {layout.publicationStatus ? ` · ${layout.publicationStatus}` : ""}
                      </p>
                    </td>
                    <td data-label="Status">
                      <span className="md-status">{layout.status}</span>
                    </td>
                    <td data-label="Venue">{workspace.adopted?.venueName ?? "Venue not provided"}</td>
                    <td data-label="Updated">
                      <CanonicalTime iso={layout.updatedAt} />
                    </td>
                    <td data-label="Hash">
                      <code>{layout.contentHash.slice(0, 12)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
