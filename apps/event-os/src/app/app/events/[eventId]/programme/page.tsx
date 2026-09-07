import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { ProgrammeWorkspace } from "../../../../../components/programme-workspace";
import { AppShell } from "../../../../../components/shell";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { guardedActor } from "../../../../../server/guard";
import { programmePermissions, resolveProgrammeEvent } from "../../../../../server/programme-scope";
import { getRuntime } from "../../../../../server/runtime";

export default async function ProgrammePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveProgrammeEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const permissions = programmePermissions(person, scoped.organisation.id, scoped.event.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view programme, routing or perimeter records.")}
        />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventProgrammeWorkspace(actor, scoped.organisation.id, scoped.event.id);
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "The programme could not be loaded.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${scoped.event.id}/programme`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: scoped.event.id,
  });
  const outcome = typeof query.outcome === "string" ? query.outcome : undefined;

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      eventId={scoped.event.id}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`${scoped.event.name} · ${scoped.event.timezone}`}
        title={workspace.simpleMode ? "Arrival and ceremony" : "Programme, routing and perimeter"}
        lede="Command Atelier planning for phases, gates and signed Slice 8 projections. Live attendance remains a later runtime."
      />
      <AtelierSectionTabs
        label="Programme sections"
        items={[
          { href: "#programme-overview", label: "Overview" },
          { href: "#phases", label: "Phases" },
          { href: "#checkpoints", label: "Perimeter" },
          { href: "#vehicles", label: "Vehicles" },
          { href: "#handoff", label: "Handoff" },
        ]}
      />
      <ActionResultBanner presented={presented} />
      <ProgrammeWorkspace workspace={workspace} outcome={outcome} />
    </AppShell>
  );
}
