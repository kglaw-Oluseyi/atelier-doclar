import { ActionResultBanner } from "../../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../../components/shell";
import { IdempotencyField, PendingSubmit } from "../../../../../../components/atelier-pending-submit";
import { createBlankLayoutAction, refreshLayoutRecordAction } from "../../../../../../server/actions";
import { loadPresentedActionResult } from "../../../../../../server/action-flash";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";
import { operationalStateFromCode } from "../../../../../../server/operational-state";
import { resolveVenueEvent, venuePermissions } from "../../../../../../server/venue-scope";

export default async function NewLayoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
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
  const workspace = getRuntime().service.getEventVenueWorkspace(actor, scoped.organisation.id, scoped.event.id);
  if (!permissions.createLayout) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot create a layout.")} />
      </AppShell>
    );
  }
  if (!workspace.adopted) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("VALIDATION_FAILED", "Adopt a venue before creating a blank layout.")}
        />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${eventId}/layouts/new`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId,
  });
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Blank layout · ${scoped.event.name}`}
        title="Create blank layout"
        lede="Canonical sizes are integer millimetres. Display metres or feet without changing stored truth. The canvas is not the source of truth."
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshLayoutRecordAction}
        reloadFields={{ eventId, path: `/app/events/${eventId}/layouts/new` }}
      />
      <form action={createBlankLayoutAction} className="form programme-form" data-testid="layout-create-form">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="eventVenueId" value={workspace.adopted.id} />
        <IdempotencyField />
        <label>
          Layout name
          <input name="name" required maxLength={160} defaultValue="Ceremony floor" />
        </label>
        <label>
          Width (mm)
          <input name="widthMm" required inputMode="numeric" defaultValue="24000" />
        </label>
        <label>
          Height (mm)
          <input name="heightMm" required inputMode="numeric" defaultValue="18000" />
        </label>
        <label>
          Display unit
          <select name="displayLengthUnit" defaultValue="METRE">
            <option value="METRE">Metres</option>
            <option value="FOOT">Feet</option>
          </select>
        </label>
        <p className="lede">Origin is the top-left of the floor. X increases right. Y increases down. Viewport pixels are not saved.</p>
        <label>
          Reason
          <input name="reason" required maxLength={400} defaultValue="Create blank event layout" />
        </label>
        <PendingSubmit locked={presented.mutationLocked}>Save layout</PendingSubmit>
      </form>
    </AppShell>
  );
}
