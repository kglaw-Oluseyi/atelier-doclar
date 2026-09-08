import { ActionResultBanner } from "../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AppShell } from "../../../../components/shell";
import { IdempotencyField, PendingSubmit } from "../../../../components/atelier-pending-submit";
import { createVenueAction, refreshVenueRecordAction } from "../../../../server/actions";
import { loadPresentedActionResult } from "../../../../server/action-flash";
import { guardedActor } from "../../../../server/guard";
import { operationalStateFromCode } from "../../../../server/operational-state";
import { resolveVenueOrganisation, venuePermissions } from "../../../../server/venue-scope";

export default async function NewVenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const organisation = resolveVenueOrganisation(actor);
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/venues">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "No organisation assignment is available.")} />
      </AppShell>
    );
  }
  const permissions = venuePermissions(person, organisation.id);
  if (!permissions.create) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot register a venue.")}
        />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: "/app/venues/new",
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
  });
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
      <AtelierPageHeader
        eyebrow="Venue registry"
        title="Register a venue"
        lede="Create an organisation-owned reusable venue using synthetic facts only. This is not a real client venue."
      />
      <ActionResultBanner presented={presented} reloadAction={refreshVenueRecordAction} reloadFields={{ path: "/app/venues/new" }} />
      <form action={createVenueAction} className="form programme-form" data-testid="venue-create-form">
        <IdempotencyField />
        <label>
          Display name
          <input name="displayName" required maxLength={160} defaultValue="Synthetic Garden Pavilion" />
        </label>
        <label>
          Locality
          <input name="locality" maxLength={120} defaultValue="Ikoyi" />
        </label>
        <label>
          Country
          <input name="countryCode" maxLength={2} defaultValue="NG" />
        </label>
        <label>
          Notes
          <input name="notes" maxLength={400} defaultValue="Synthetic fixture only." />
        </label>
        <label>
          Reason
          <input name="reason" required maxLength={400} defaultValue="Register synthetic organisation venue" />
        </label>
        <PendingSubmit locked={presented.mutationLocked}>Save venue</PendingSubmit>
      </form>
    </AppShell>
  );
}
