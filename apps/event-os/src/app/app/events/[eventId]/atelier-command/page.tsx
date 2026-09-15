import { PlatformError, authorize } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../../components/action-result-banner";
import { AtelierCommandWorkspace } from "../../../../../components/atelier-command-workspace";
import { AtelierOperationalState } from "../../../../../components/atelier-operational-state";
import { AtelierPageHeader } from "../../../../../components/atelier-page-header";
import { AppShell } from "../../../../../components/shell";
import { loadPresentedActionResult } from "../../../../../server/action-flash";
import { guardedActor } from "../../../../../server/guard";
import { operationalStateFromCode } from "../../../../../server/operational-state";
import { getRuntime } from "../../../../../server/runtime";

export default async function AtelierCommandPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const actorSnap = runtime.service.resolveActor(person.id);
  const organisations = runtime.service.listOrganisations(actor);
  const events = organisations.flatMap((item) => runtime.service.listEvents(actor, item.id));
  const event = events.find((item) => item.id === eventId);
  const organisation = organisations.find((item) => item.id === event?.organisationId);

  if (!organisation || !event) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }

  const canView = authorize({
    actor: actorSnap,
    permission: "atelierCommand.view",
    scope: { organisationId: organisation.id, eventId: event.id },
  }).allow;

  if (!canView) {
    return (
      <AppShell
        person={person}
        organisationName={organisation.displayName}
        eventName={event.name}
        eventId={event.id}
        current="/app/events"
      >
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open Atelier Command for the selected event.")}
        />
      </AppShell>
    );
  }

  const taskQuery = typeof query.q === "string" ? query.q : undefined;
  const taskDomain = typeof query.domain === "string" ? query.domain : undefined;
  const roleKey = actorSnap.roles.find((role) =>
    actorSnap.assignments.some((assignment) => assignment.roleId === role.id && assignment.status === "ACTIVE"),
  )?.key;

  let workspace;
  try {
    workspace = await runtime.service.getAtelierCommandWorkspace(actor, organisation.id, event.id, {
      eventName: event.name,
      organisationName: organisation.displayName,
      taskQuery,
      taskDomain,
      roleKey,
    });
  } catch (error) {
    const message = error instanceof PlatformError ? error.publicMessage : "Atelier Command could not be loaded.";
    return (
      <AppShell
        person={person}
        organisationName={organisation.displayName}
        eventName={event.name}
        eventId={event.id}
        current="/app/events"
      >
        <AtelierOperationalState state={operationalStateFromCode("INTERNAL_ERROR", message)} />
      </AppShell>
    );
  }

  const canInstruct = authorize({
    actor: actorSnap,
    permission: "atelierCommand.instruct",
    scope: { organisationId: organisation.id, eventId: event.id },
  }).allow;
  const canExecute = authorize({
    actor: actorSnap,
    permission: "atelierCommand.execute",
    scope: { organisationId: organisation.id, eventId: event.id },
  }).allow;
  const canApprove = authorize({
    actor: actorSnap,
    permission: "atelierCommand.approve",
    scope: { organisationId: organisation.id, eventId: event.id },
  }).allow;

  const activeAssignment =
    actorSnap.assignments.find(
      (assignment) =>
        assignment.status === "ACTIVE" &&
        assignment.organisationId === organisation.id &&
        (assignment.eventId === event.id || !assignment.eventId),
    ) ?? actorSnap.assignments.find((assignment) => assignment.status === "ACTIVE" && assignment.organisationId === organisation.id);
  const role = actorSnap.roles.find((item) => item.id === activeAssignment?.roleId);
  const actorLabel = person.displayName;
  const assignmentLabel = role
    ? `${role.key}${activeAssignment?.eventId ? " · event-scoped" : " · organisation-wide"}`
    : "Assignment unavailable";

  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${event.id}/atelier-command`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: event.id,
  });

  return (
    <AppShell
      person={person}
      organisationName={organisation.displayName}
      eventName={event.name}
      eventId={event.id}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`Atelier Command · ${event.name}`}
        title="Atelier Command"
        lede="Governed intelligence, native execution and browser-assisted work — always inside the selected event. The conversation is human; the control plane is deterministic."
      />
      <ActionResultBanner presented={presented} />
      <AtelierCommandWorkspace
        organisationId={organisation.id}
        eventId={event.id}
        eventName={event.name}
        workspace={workspace}
        canInstruct={canInstruct}
        canExecute={canExecute}
        canApprove={canApprove}
        actorLabel={actorLabel}
        assignmentLabel={assignmentLabel}
        taskQuery={taskQuery ?? ""}
        taskDomain={taskDomain ?? ""}
      />
    </AppShell>
  );
}
