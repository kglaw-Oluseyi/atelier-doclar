import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { VenueRegistryWorkspace } from "../../../components/venue-registry-workspace";
import { AppShell } from "../../../components/shell";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";
import { operationalStateFromCode } from "../../../server/operational-state";
import { resolveVenueOrganisation, venuePermissions } from "../../../server/venue-scope";

export default async function VenueRegistryPage() {
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
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view the venue registry.")}
        />
      </AppShell>
    );
  }
  const venues = getRuntime().service.listVenues(actor, organisation.id);
  const workspace = venues[0]
    ? getRuntime().service.getVenueDetailWorkspace(actor, organisation.id, venues[0].id)
    : undefined;
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
      <AtelierPageHeader
        eyebrow={`Venue registry · ${organisation.displayName}`}
        title="Venues"
        lede="Organisation-owned reusable venue facts. Adoption into an event creates a snapshot and never silently edits the source."
      />
      <VenueRegistryWorkspace
        venues={venues}
        capabilities={
          workspace?.capabilities ?? {
            canViewRegistry: true,
            canCreateVenue: permissions.create,
            canUpdateVenue: permissions.update,
            canRecordFact: permissions.recordFact,
            canVerifyFact: permissions.verifyFact,
            canAdoptVenue: permissions.adopt,
            canOverrideFact: permissions.override,
            canViewLayout: permissions.viewLayout,
            canCreateLayout: permissions.createLayout,
            canUpdateLayout: permissions.updateLayout,
            canAcquireLease: false,
            canOverrideConstraint: false,
          }
        }
      />
    </AppShell>
  );
}
