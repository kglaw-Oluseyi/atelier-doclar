import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../components/atelier-section-tabs";
import { VenueDetailWorkspaceView } from "../../../../components/venue-detail-workspace";
import { AppShell } from "../../../../components/shell";
import { loadPresentedActionResult } from "../../../../server/action-flash";
import { refreshVenueRecordAction } from "../../../../server/actions";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";
import { operationalStateFromCode } from "../../../../server/operational-state";
import { resolveVenueOrganisation, venuePermissions } from "../../../../server/venue-scope";

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { venueId } = await params;
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
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view venue provenance.")}
        />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getVenueDetailWorkspace(actor, organisation.id, venueId);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Venue could not be loaded.";
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/venues/${venueId}`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
  });
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/venues">
      <AtelierPageHeader
        eyebrow="Venue provenance"
        title={workspace.venue.displayName}
        lede="Reusable organisation facts with source, applicability and verification state. Binary evidence upload is unavailable."
      />
      <AtelierSectionTabs
        label="Venue sections"
        items={[
          { href: "#venue-identity", label: "Identity" },
          { href: "#venue-facts", label: "Facts" },
          { href: "#venue-evidence", label: "Evidence" },
        ]}
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshVenueRecordAction}
        reloadFields={{ path: `/app/venues/${venueId}` }}
      />
      <VenueDetailWorkspaceView workspace={workspace} mutationLocked={presented.mutationLocked} />
    </AppShell>
  );
}
