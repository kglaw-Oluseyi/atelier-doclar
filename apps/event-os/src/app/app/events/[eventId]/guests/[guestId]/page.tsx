import Link from "next/link";
import { PlatformError, operationalDisplayName, type ActorContext } from "@maison-doclar/shared-platform";
import { GuestAddressingWorkspace } from "../../../../../../components/guest-addressing-form";
import { DuplicateResolveForm, GuestAmendForm } from "../../../../../../components/guest-amend-form";
import { GuestAccessLink } from "../../../../../../components/guest-access-link";
import { IssueInvitationForm, StaffRsvpForm } from "../../../../../../components/staff-rsvp-forms";
import { AppShell } from "../../../../../../components/shell";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";

function GuestCommunicationsTimeline({
  actor,
  organisationId,
  eventId,
  guestId,
}: {
  actor: ActorContext;
  organisationId: string;
  eventId: string;
  guestId: string;
}) {
  const timeline = getRuntime().service.listGuestCommunications(actor, organisationId, eventId, guestId);
  return (
    <section>
      <h2>Communications</h2>
      <p>
        <Link href={`/app/events/${eventId}/communications`}>Open communications centre</Link>
      </p>
      {timeline.messages.length === 0 && timeline.inbound.length === 0 ? (
        <p className="empty">No guest communications recorded for this event.</p>
      ) : null}
      {timeline.messages.map((item) => (
        <p key={item.id}>
          {item.direction} · {item.channel} · {item.status}
        </p>
      ))}
      {timeline.inbound.map((item) => (
        <p key={item.id}>
          Inbound · {item.matchStatus} · {item.channel}
        </p>
      ))}
    </section>
  );
}

function fieldLine(label: string, quality: string, value?: string) {
  return (
    <p>
      <strong>{label}</strong>{" "}
      <span className="md-status">{quality.replaceAll("_", " ")}</span> {value ?? "Not supplied"}
    </p>
  );
}

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; guestId: string }>;
  searchParams: Promise<{ error?: string; issued?: string }>;
}) {
  const { eventId, guestId } = await params;
  const paramsQuery = await searchParams;
  const error = paramsQuery.error;
  const issued = paramsQuery.issued;
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest record</h1>
        <p className="empty">The requested event is not available in this assignment.</p>
      </AppShell>
    );
  }
  const runtime = getRuntime();
  let guest;
  try {
    guest = runtime.service.getGuest(actor, scoped.organisation.id, scoped.event.id, guestId);
  } catch (caught) {
    if (caught instanceof PlatformError) {
      return (
        <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
          <h1>Guest record</h1>
          <p className="empty">The requested guest record is not available in this assignment.</p>
        </AppShell>
      );
    }
    throw caught;
  }
  const duplicates = runtime.service.listGuestDuplicates(actor, scoped.organisation.id, scoped.event.id, guest.id);
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  let workspace;
  try {
    workspace = permissions.addressingView
      ? runtime.service.getGuestAddressingWorkspace(actor, scoped.organisation.id, scoped.event.id, guest.id)
      : undefined;
  } catch {
    workspace = undefined;
  }
  let rsvp;
  try {
    rsvp = permissions.rsvpView
      ? runtime.service.getGuestRsvp(actor, scoped.organisation.id, scoped.event.id, guest.id)
      : undefined;
  } catch {
    rsvp = undefined;
  }
  const policy = permissions.rsvpView
    ? runtime.service.getRsvpPolicy(actor, scoped.organisation.id, scoped.event.id)
    : undefined;

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      current="/app/events"
    >
      <div className="page-header">
        <h1>{operationalDisplayName(guest)}</h1>
        <p className="lede">
          Operational guest record. Identity resolution is {guest.identityResolution.replaceAll("_", " ").toLowerCase()}.
        </p>
      </div>
      <p>
        <Link href={`/app/events/${scoped.event.id}/guests`}>Back to directory</Link>
      </p>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <section>
        <h2>Record state</h2>
        <p>
          <span className="md-status" data-tone="brass">
            {guest.lifecycle}
          </span>{" "}
          <span className="md-status" data-tone={guest.attentionRequired ? "warn" : "ok"}>
            {guest.attentionRequired ? "Attention required" : "No attention flag"}
          </span>
        </p>
        {workspace ? (
          <p>
            <strong>Formal</strong> {workspace.guest.formalSalutation.text} · <strong>Familiar</strong>{" "}
            {workspace.guest.familiarName.text}
          </p>
        ) : null}
        {fieldLine("Given name", guest.givenName.quality, guest.givenName.value)}
        {fieldLine("Family name", guest.familyName.quality, guest.familyName.value)}
        {fieldLine("Preferred name", guest.preferredName.quality, guest.preferredName.value)}
        {fieldLine("Email", guest.email.quality, guest.email.value)}
        {fieldLine("Phone", guest.phone.quality, guest.phone.value)}
        {fieldLine("Dietary", guest.dietaryRequirement.quality, guest.dietaryRequirement.value)}
        {fieldLine("Accessibility", guest.accessibilityRequirement.quality, guest.accessibilityRequirement.value)}
        <p>
          <strong>Source</strong> {guest.intakeSource.replaceAll("_", " ")} · recorded {guest.provenance.recordedAt}
        </p>
        <p>
          <strong>Person link</strong>{" "}
          {guest.personId ? "Linked to an authoritative person reference" : "Unresolved — no person created"}
        </p>
      </section>
      {rsvp ? (
        <section>
          <h2>RSVP</h2>
          <p>
            <span className="md-status" data-tone="brass">
              {(rsvp.response?.attendanceIntent ?? "NOT_SUPPLIED").replaceAll("_", " ")}
            </span>{" "}
            <span className="md-status">{rsvp.response?.provenance?.replaceAll("_", " ") ?? "No response"}</span>
          </p>
          <p>
            <strong>Recorded</strong> {rsvp.response?.respondedAt ?? "Not yet supplied"} ·{" "}
            <strong>Guest access</strong> {rsvp.invitation?.status ?? "Not issued"}
          </p>
          {rsvp.exceptions.some((item) => item.status === "OPEN") ? (
            <p>
              <span className="md-status" data-tone="warn">
                Guest input conflicts with a verified field
              </span>
            </p>
          ) : null}
          {issued ? (
            <p role="status">
              Synthetic guest access is ready.{" "}
              <GuestAccessLink href={`/rsvp/${issued}`} />
            </p>
          ) : null}
          {policy && permissions.rsvpInvite ? (
            <IssueInvitationForm eventId={scoped.event.id} guestId={guest.id} />
          ) : null}
          {policy && permissions.rsvpAmend ? (
            <StaffRsvpForm
              eventId={scoped.event.id}
              guestId={guest.id}
              expectedVersion={rsvp.response?.version}
              current={rsvp.response?.attendanceIntent}
              error={error}
            />
          ) : null}
        </section>
      ) : null}
      {permissions.msgView ? (
        <GuestCommunicationsTimeline
          actor={actor}
          organisationId={scoped.organisation.id}
          eventId={scoped.event.id}
          guestId={guest.id}
        />
      ) : null}
      {duplicates.length > 0 ? (
        <section>
          <h2>Duplicate and identity review</h2>
          {duplicates.map((candidate) => (
            <article key={candidate.id} className="card-list">
              <p>
                <span className="md-status" data-tone={candidate.status === "OPEN" ? "warn" : "ok"}>
                  {candidate.kind.replaceAll("_", " ")}
                </span>{" "}
                {candidate.status}
              </p>
              {permissions.resolveDuplicate && candidate.status === "OPEN" ? (
                <DuplicateResolveForm candidate={candidate} eventId={scoped.event.id} />
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
      {workspace ? (
        <GuestAddressingWorkspace workspace={workspace} eventId={scoped.event.id} error={error} />
      ) : null}
      {permissions.amend ? (
        <section>
          <h2>Controlled amendment</h2>
          <GuestAmendForm guest={guest} eventId={scoped.event.id} error={error} />
        </section>
      ) : (
        <p className="empty">Your assignment can view this record but cannot amend it.</p>
      )}
    </AppShell>
  );
}
