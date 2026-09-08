import { PlatformError, type ActorContext } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { LayoutSetupWorkspaceView } from "../../../../../../components/layout-setup-workspace";
import { LayoutStudioWorkspace } from "../../../../../../components/layout-studio-workspace";
import { LayoutAssuranceWorkspace as LayoutAssuranceWorkspaceView } from "../../../../../../components/layout-assurance-workspace";
import { AppShell } from "../../../../../../components/shell";
import { loadPresentedActionResult } from "../../../../../../server/action-flash";
import { refreshLayoutRecordAction } from "../../../../../../server/actions";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";
import { operationalStateFromCode } from "../../../../../../server/operational-state";
import { resolveVenueEvent, venuePermissions } from "../../../../../../server/venue-scope";

export default async function LayoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; layoutId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId, layoutId } = await params;
  const query = await searchParams;
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
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view this layout.")} />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getLayoutSetupWorkspace(actor, scoped.organisation.id, scoped.event.id, layoutId);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Layout could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${eventId}/layouts/${layoutId}`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId,
  });
  const baseSnapshot = typeof query.baseSnapshot === "string" ? query.baseSnapshot : "";
  const compareSnapshot = typeof query.compareSnapshot === "string" ? query.compareSnapshot : "";
  let comparison:
    | {
        entries: Array<{ kind: string; summary: string }>;
        direction: string;
        noChange: boolean;
      }
    | undefined;
  if (baseSnapshot && compareSnapshot) {
    try {
      comparison = getRuntime().service.compareLayoutSnapshots(
        actor,
        scoped.organisation.id,
        scoped.event.id,
        baseSnapshot,
        compareSnapshot,
      );
    } catch (error) {
      comparison = {
        entries: [
          {
            kind: "TYPE_OR_PROPERTY",
            summary: error instanceof PlatformError ? error.publicMessage : "Comparison could not be loaded.",
          },
        ],
        direction: "Comparison failed",
        noChange: false,
      };
    }
  }
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} eventId={scoped.event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Layout setup · ${scoped.event.name}`}
        title={workspace.layout.name}
        titleClamp
        lede="Authoritative millimetre geometry with a typed studio projection, validation, snapshots and immutable publication. Refresh after a conflict before retrying. Seating allocation is not available."
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshLayoutRecordAction}
        reloadFields={{ eventId, layoutId, path: `/app/events/${eventId}/layouts/${layoutId}` }}
      />
      <LayoutSetupWorkspaceView workspace={workspace} eventId={eventId} mutationLocked={presented.mutationLocked} />
      <LayoutStudioWorkspace
        workspace={workspace}
        eventId={eventId}
        actorPersonId={person.id}
        mutationLocked={presented.mutationLocked}
        conflict={presented.mutationLocked}
        focusObjectIds={typeof query.focusObjects === "string" ? query.focusObjects.split(",").filter(Boolean) : []}
      />
      <LayoutAssuranceWorkspaceView
        workspace={workspace}
        eventId={eventId}
        mutationLocked={presented.mutationLocked}
        diffSummary={comparison?.entries}
        comparisonDirection={comparison?.direction}
        comparisonNoChange={comparison?.noChange}
      />
      <PublishedLayoutPanel actorOrganisationId={scoped.organisation.id} eventId={eventId} layoutId={layoutId} actor={actor} />
    </AppShell>
  );
}

function PublishedLayoutPanel({
  actorOrganisationId,
  eventId,
  layoutId,
  actor,
}: {
  actorOrganisationId: string;
  eventId: string;
  layoutId: string;
  actor: ActorContext;
}) {
  let viewer;
  try {
    viewer = getRuntime().service.getPublishedLayoutViewer(actor, actorOrganisationId, eventId, layoutId);
  } catch {
    return null;
  }
  return (
    <section className="atelier-panel" data-testid="published-viewer">
      <h2>Published viewer</h2>
      <p>
        {viewer.eventName}
        {viewer.venueName ? ` · ${viewer.venueName}` : ""} · publication {viewer.publicationNumber} · {viewer.status} · hash{" "}
        {viewer.contentHash} · {viewer.publishedAt}
      </p>
      <p>{viewer.sourceContext}</p>
      <p>
        Validation {viewer.validationSummary.engineId} {viewer.validationSummary.engineVersion}: {viewer.validationSummary.blockingCount}{" "}
        blocking, {viewer.validationSummary.warningCount} warning.
      </p>
      <ul className="atelier-folio">
        {viewer.objects.map((object) => (
          <li key={object.id}>
            {object.objectType === "MASKED" ? "Restricted layer masked" : `${object.label} · ${object.objectType}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
