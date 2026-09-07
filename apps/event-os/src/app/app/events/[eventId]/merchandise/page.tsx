import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { MerchandiseWorkspace } from "../../../../../components/merchandise-workspace";
import { AppShell } from "../../../../../components/shell";
import { refreshMerchandiseRecordAction } from "../../../../../server/actions";
import { loadPresentedActionResult, readAudiencePreviewFlash, readIssuedAccessFlash } from "../../../../../server/action-flash";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { guardedActor } from "../../../../../server/guard";
import { merchandisePermissions, resolveMerchandiseEvent } from "../../../../../server/merchandise-scope";
import { getRuntime } from "../../../../../server/runtime";

export default async function MerchandisePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveMerchandiseEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = merchandisePermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view merchandise coordination.")}
        />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventMerchandiseWorkspace(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Merchandise could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  const issued = await readIssuedAccessFlash();
  const previewNames = await readAudiencePreviewFlash();
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${scoped.event.id}/merchandise`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: scoped.event.id,
  });
  const reloadFields = { eventId };

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      eventId={scoped.event.id}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`${scoped.event.name} · aso-ebi and aso-oke`}
        title="Merchandise coordination"
        lede="Host offers, private guest choices and vendor fulfilment. Maison Doclar does not receive guest money."
      />
      <AtelierSectionTabs
        label="Merchandise sections"
        items={[
          { href: "#merchandise-overview", label: "Readiness" },
          { href: "#collections", label: "Collections" },
          { href: "#items", label: "Items" },
          { href: "#cohorts", label: "Audience" },
          { href: "#offers", label: "Offers" },
          { href: "#guest-access", label: "Guest access" },
          { href: "#fulfilment", label: "Fulfilment" },
          { href: "#vendor-handoff", label: "Vendor" },
        ]}
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshMerchandiseRecordAction}
        reloadFields={reloadFields}
      />
      <MerchandiseWorkspace
        workspace={workspace}
        issued={presented.mutationLocked ? undefined : issued}
        previewNames={previewNames}
        mutationLocked={presented.mutationLocked}
      />
    </AppShell>
  );
}
