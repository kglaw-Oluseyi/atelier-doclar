import { PlatformError } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../../components/atelier-section-tabs";
import { ProgrammeWorkspace } from "../../../../../components/programme-workspace";
import { AppShell } from "../../../../../components/shell";
import { readActionFlash } from "../../../../../server/action-flash";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../server/operational-state";
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
  const flash = await readActionFlash();
  const stateQuery = typeof query.state === "string" ? query.state : undefined;
  const errorQuery = typeof query.error === "string" ? query.error : undefined;
  const ok = typeof query.ok === "string" ? query.ok : undefined;
  const outcome = typeof query.outcome === "string" ? query.outcome : undefined;
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
      {flash ? <AtelierOperationalState state={operationalStateFromCode(flash.code, flash.message)} /> : null}
      {queryState ? <AtelierOperationalState state={queryState} /> : null}
      {success ? <AtelierOperationalState state={success} /> : null}
      <ProgrammeWorkspace workspace={workspace} outcome={outcome} />
    </AppShell>
  );
}

function successCopy(ok: string): string {
  switch (ok) {
    case "phase":
      return "The ceremony was added. Guest identities were not duplicated.";
    case "entitlement":
      return "The guest was assigned to the selected phase only.";
    case "checkpoint":
      return "The checkpoint was recorded. It does not admit anyone on its own.";
    case "route":
      return "The arrival route was recorded. Fast-track remains routing, not authority.";
    case "vehicle":
      return "The vehicle was registered. Occupants remain independent identities.";
    case "package":
      return "A signed access plan was published. Canonical programme truth was not rewritten.";
    case "consumed":
      return "The offline projection was consumed. Attendance was not written.";
    case "resolve":
      return "Checkpoint resolution completed without writing attendance.";
    default:
      return "The programme change was saved.";
  }
}
