import Link from "next/link";
import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AppShell } from "../../../../../../components/shell";
import { RsvpPolicyForm } from "../../../../../../components/staff-rsvp-forms";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";

export default async function RsvpPolicyPage({
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
        <h1>RSVP policy</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
      </AppShell>
    );
  }
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  if (!permissions.rsvpManage) {
    return (
      <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
        <h1>RSVP policy</h1>
        <p className="empty">Your assignment does not include RSVP policy management.</p>
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const policy = runtime.service.getRsvpPolicy(actor, scoped.organisation.id, scoped.event.id);
  const questionnaire = runtime.service.getPublishedQuestionnaire(actor, scoped.organisation.id, scoped.event.id);
  return (
    <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
      <AtelierPageHeader
        eyebrow={`Configuration · ${scoped.event.name}`}
        title="RSVP policy and form"
        lede="Guest-facing names and the published response form. Delivery of invitations remains deferred."
      />
      <p>
        <Link href={`/app/events/${scoped.event.id}/rsvp`}>Back to RSVP</Link>
      </p>
      <RsvpPolicyForm eventId={scoped.event.id} policy={policy} error={error} />
      {questionnaire ? (
        <section>
          <h2>Published form version {questionnaire.versionNumber}</h2>
          <ul>
            {questionnaire.sections.map((section) => (
              <li key={section.key}>{section.title}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="empty">Prepare guest RSVP on the overview to publish the canonical form.</p>
      )}
    </AppShell>
  );
}
