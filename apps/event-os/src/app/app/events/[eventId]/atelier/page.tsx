import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { EventAtelierWorkspaceView } from "../../../../../components/event-atelier-workspace";
import { AppShell } from "../../../../../components/shell";
import { loadPresentedActionResult, readIssuedAccessFlash } from "../../../../../server/action-flash";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { resolveAtelierEvent } from "../../../../../server/atelier-scope";
import { guardedActor } from "../../../../../server/guard";
import { getRuntime } from "../../../../../server/runtime";

export default async function EventAtelierPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveAtelierEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")} />
      </AppShell>
    );
  }
  let workspace;
  try {
    workspace = getRuntime().service.getEventAtelierWorkspace(actor, scoped.organisation.id, scoped.event.id);
    if (workspace.capabilities.canPublish && workspace.atelier.currentNarrativeEditionId) {
      try {
        getRuntime().service.ensureAtelierNarrativeRevision(actor, {
          organisationId: scoped.organisation.id,
          eventId: scoped.event.id,
          reason: "Open the staff editor from the current published or draft narrative",
        });
        workspace = getRuntime().service.getEventAtelierWorkspace(actor, scoped.organisation.id, scoped.event.id);
      } catch {
        // Genesis-only or unpublished source material stays readable without a revision draft.
      }
    }
  } catch (error) {
    const code = error instanceof PlatformError ? error.code : "FORBIDDEN";
    const message = error instanceof PlatformError ? error.publicMessage : "The private Atelier is not available in this assignment.";
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode(code, message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${scoped.event.id}/atelier`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: scoped.event.id,
  });
  const issued = await readIssuedAccessFlash();
  const issuedHref = issued?.kind === "atelier" ? `/atelier/${issued.token}` : undefined;
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Private Atelier · ${scoped.event.name}`}
        title="Event Blueprint, Journey and Host Experience"
        lede="A curated projection and governed request gateway. Event OS remains the operational source of truth."
      />
      <ActionResultBanner presented={presented} />
      <EventAtelierWorkspaceView workspace={workspace} issuedHref={issuedHref} />
    </AppShell>
  );
}
