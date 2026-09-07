import { PlatformError, S04C_VENDOR_TOKEN } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { MerchandiseWorkspace } from "../../../../../components/merchandise-workspace";
import { AppShell } from "../../../../../components/shell";
import { readActionFlash } from "../../../../../server/action-flash";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../server/operational-state";
import { guardedActor } from "../../../../../server/guard";
import { merchandisePermissions, resolveMerchandiseEvent } from "../../../../../server/merchandise-scope";
import { getRuntime } from "../../../../../server/runtime";

function successCopy(ok: string): string {
  if (ok === "collection") return "The merchandise collection was recorded.";
  if (ok === "cohort") return "The host-assigned cohort was recorded. Identities were not merged.";
  if (ok === "review") return "The vendor report was reviewed as attributed evidence.";
  if (ok === "exception") return "The merchandise exception was recorded without payment data.";
  if (ok === "choice") return "The private guest choice was recorded.";
  return "Merchandise coordination was updated.";
}

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
  const flash = await readActionFlash();
  const stateQuery = typeof query.state === "string" ? query.state : undefined;
  const errorQuery = typeof query.error === "string" ? query.error : undefined;
  const ok = typeof query.ok === "string" ? query.ok : undefined;
  const queryState = operationalStateFromQuery({ state: stateQuery, error: errorQuery });
  const success = ok ? operationalStateFromCode("SUCCESS", successCopy(ok)) : undefined;

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
          { href: "#cohorts", label: "Cohorts" },
          { href: "#offers", label: "Offers" },
          { href: "#fulfilment", label: "Fulfilment" },
          { href: "#vendor-handoff", label: "Vendor" },
        ]}
      />
      {flash ? <AtelierOperationalState state={operationalStateFromCode(flash.code, flash.message)} /> : null}
      {queryState ? <AtelierOperationalState state={queryState} /> : null}
      {success ? <AtelierOperationalState state={success} /> : null}
      <MerchandiseWorkspace workspace={workspace} vendorToken={S04C_VENDOR_TOKEN} />
    </AppShell>
  );
}
