import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../../components/shell";
import { GuestIntakeForm } from "../../../../../../components/guest-intake-form";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../../server/operational-state";
import { guardedActor } from "../../../../../../server/guard";

export default async function GuestIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; state?: string; ok?: string; demo?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  const state = operationalStateFromQuery(query);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest intake</h1>
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")} />
      </AppShell>
    );
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      current="/app/events"
    >
      <AtelierPageHeader
        eyebrow={`Guest intake · ${scoped.event.name}`}
        title="Manual guest intake"
        lede={`Creates an operational guest record for ${scoped.event.name}. This does not create a person, user, or membership. Titles are never inferred. A date of birth is not collected.`}
      />
      {permissions.intake ? (
        <GuestIntakeForm eventId={scoped.event.id} state={state} />
      ) : (
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "Your assignment does not include guest intake.")}
        />
      )}
    </AppShell>
  );
}
