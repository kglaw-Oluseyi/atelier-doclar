import { AppShell } from "../../../../../../components/shell";
import { GuestIntakeForm } from "../../../../../../components/guest-intake-form";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { guardedActor } from "../../../../../../server/guard";

export default async function GuestIntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const error = (await searchParams).error;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest intake</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
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
      <div className="page-header">
        <h1>Manual guest intake</h1>
        <p className="lede">
          Creates an operational guest record for {scoped.event.name}. This does not create a person, user, or
          membership.
        </p>
      </div>
      {permissions.intake ? (
        <GuestIntakeForm eventId={scoped.event.id} error={error} />
      ) : (
        <p className="empty">Your assignment does not include guest intake.</p>
      )}
    </AppShell>
  );
}
