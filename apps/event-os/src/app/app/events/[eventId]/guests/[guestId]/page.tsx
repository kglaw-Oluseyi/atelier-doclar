import Link from "next/link";
import {
  CHILD_AGE_BANDS,
  PlatformError,
  operationalDisplayName,
  type ActorContext,
} from "@maison-doclar/shared-platform";
import { GuestAddressingWorkspace } from "../../../../../../components/guest-addressing-form";
import { DuplicateResolveForm, GuestAmendForm } from "../../../../../../components/guest-amend-form";
import { GuestAccessLink } from "../../../../../../components/guest-access-link";
import { IssueInvitationForm, StaffRsvpForm } from "../../../../../../components/staff-rsvp-forms";
import { AtelierSectionTabs } from "../../../../../../components/atelier-section-tabs";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { AtelierRecordRefresh } from "../../../../../../components/atelier-record-refresh";
import { AtelierStateFocus } from "../../../../../../components/atelier-state-focus";
import { AppShell } from "../../../../../../components/shell";
import { readActionFlash } from "../../../../../../server/action-flash";
import { guestChoicesFromRecords } from "../../../../../../server/guest-name-display";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { operationalStateFromCode, operationalStateFromQuery } from "../../../../../../server/operational-state";
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
    <section className="atelier-panel">
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
      <span className="md-status">{quality.replaceAll("_", " ")}</span>{" "}
      <span className="guest-name">{value ?? "Not supplied"}</span>
    </p>
  );
}

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; guestId: string }>;
  searchParams: Promise<{ error?: string; issued?: string; state?: string; ok?: string; demo?: string; hint?: string }>;
}) {
  const { eventId, guestId } = await params;
  const paramsQuery = await searchParams;
  const flash = await readActionFlash();
  const { actor, person } = await guardedActor();
  const scoped = resolveScopedEvent(actor, eventId);
  if (!scoped) {
    return (
      <AppShell person={person} current="/app/events">
        <h1>Guest record</h1>
        <AtelierOperationalState
          state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")}
        />
      </AppShell>
    );
  }
  const runtime = getRuntime();
  let guest;
  try {
    guest = runtime.service.getGuest(actor, scoped.organisation.id, scoped.event.id, guestId);
  } catch (caught) {
    if (caught instanceof PlatformError) {
      const code = caught.code === "FORBIDDEN" ? "FORBIDDEN" : caught.code === "SCOPE_MISMATCH" ? "SCOPE_MISMATCH" : "NOT_FOUND";
      return (
        <AppShell person={person} organisationName={scoped.organisation.displayName} eventName={scoped.event.name} current="/app/events">
          <h1>Guest record</h1>
          <AtelierOperationalState state={operationalStateFromCode(code, "The requested guest record is not available in this assignment.")} />
        </AppShell>
      );
    }
    throw caught;
  }
  const duplicates = runtime.service.listGuestDuplicates(actor, scoped.organisation.id, scoped.event.id, guest.id);
  const permissions = guestPermissions(person, actor, scoped.organisation.id, scoped.event.id);
  let workspace;
  let workspacePartial = false;
  try {
    workspace = permissions.addressingView
      ? runtime.service.getGuestAddressingWorkspace(actor, scoped.organisation.id, scoped.event.id, guest.id)
      : undefined;
  } catch {
    workspacePartial = permissions.addressingView;
    workspace = undefined;
  }
  let rsvp;
  let rsvpPartial = false;
  try {
    rsvp = permissions.rsvpView
      ? runtime.service.getGuestRsvp(actor, scoped.organisation.id, scoped.event.id, guest.id)
      : undefined;
  } catch {
    rsvpPartial = permissions.rsvpView;
    rsvp = undefined;
  }
  const policy = permissions.rsvpView
    ? runtime.service.getRsvpPolicy(actor, scoped.organisation.id, scoped.event.id)
    : undefined;
  const directoryGuests = runtime.service.listGuests(actor, {
    organisationId: scoped.organisation.id,
    eventId: scoped.event.id,
  });
  const guestChoices = guestChoicesFromRecords(directoryGuests);
  const adultChoices = guestChoices.filter(
    (item) => item.id !== guest.id && (!item.ageBand || !(CHILD_AGE_BANDS as readonly string[]).includes(item.ageBand)),
  );
  const conflictPreserved = paramsQuery.state === "VERSION_CONFLICT" || flash?.code === "VERSION_CONFLICT";
  const queryState = operationalStateFromQuery({
    error: paramsQuery.error ?? flash?.message,
    state:
      paramsQuery.hint === "permission" && paramsQuery.state === "FORBIDDEN"
        ? "PERMISSION_CHANGED"
        : paramsQuery.state ?? flash?.code,
    ok: conflictPreserved ? undefined : paramsQuery.ok,
    demo: paramsQuery.demo,
  });
  const mutationLocked = queryState?.kind === "conflict";
  const dossierPath = `/app/events/${eventId}/guests/${guestId}`;
  const conflictReloadHref = `${dossierPath}?state=VERSION_CONFLICT&error=${encodeURIComponent(queryState?.message ?? "The record changed elsewhere. Your attempted edit was not saved.")}`;
  const partialState =
    workspacePartial || rsvpPartial
      ? operationalStateFromCode(
          "PARTIAL",
          workspacePartial
            ? "Addressing, party or entitlement sections could not be loaded."
            : "RSVP could not be loaded.",
        )
      : undefined;

  return (
    <AppShell
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name}
      current="/app/events"
    >
      <div className="atelier-dossier at-scope">
        <header className="atelier-dossier-header atelier-masthead">
          <p className="eyebrow">Operational dossier · {scoped.event.name}</p>
          <span className="at-thread" aria-hidden="true" />
          <h1 className="guest-name">{operationalDisplayName(guest)}</h1>
          <p className="lede">
            Independent guest identity. Identity resolution is {guest.identityResolution.replaceAll("_", " ").toLowerCase()}.
            Raw household, child-protection and protocol records are not exposed here.
          </p>
          {workspace ? (
            <div className="atelier-address-pair">
              <p>
                <span className="eyebrow">Formal</span>
                <span className="guest-name">{workspace.guest.formalSalutation.text}</span>
              </p>
              <p>
                <span className="eyebrow">Familiar</span>
                <span className="guest-name">{workspace.guest.familiarName.text}</span>
              </p>
            </div>
          ) : null}
          <AtelierSectionTabs
            label="Dossier sections"
            items={[
              { href: "#record-state", label: "Identity" },
              { href: "#addressing-heading", label: "Addressing" },
              { href: "#party-heading", label: "Party" },
              { href: "#guest-amendment", label: "Amendment" },
            ]}
          />
          <AtelierRecordRefresh href={mutationLocked ? dossierPath : undefined} />
        </header>
        <p>
          <Link href={`/app/events/${scoped.event.id}/guests`}>Back to directory</Link>
        </p>
        {queryState ? (
          <>
            <AtelierStateFocus targetId="operational-state" active={queryState.kind === "conflict"} />
            <AtelierOperationalState
              state={queryState}
              reloadHref={queryState.reloadRequired ? (mutationLocked ? dossierPath : conflictReloadHref) : undefined}
            />
          </>
        ) : null}
        {partialState ? <AtelierOperationalState state={partialState} id="partial-state" /> : null}
        {runtime.persistence === "UNAVAILABLE" || runtime.migrationStatus === "FAILED" ? (
          <AtelierOperationalState
            state={operationalStateFromCode(
              runtime.persistence === "UNAVAILABLE" ? "DEPENDENCY_UNAVAILABLE" : "CAPABILITY_NOT_ENABLED",
            )}
          />
        ) : null}
        <div className="atelier-columns">
          <section id="record-state" className="atelier-panel">
            <h2>Record state</h2>
            <p>
              <span className="md-status" data-tone="brass">
                {guest.lifecycle}
              </span>{" "}
              <span
                className="md-status"
                data-tone={guest.attentionRequired ? "warn" : "ok"}
                data-testid="guest-attention"
              >
                {guest.attentionRequired ? "Attention required" : "No attention flag"}
              </span>
            </p>
            {workspace ? (
              <p>
                <strong>Formal</strong> <span className="guest-name">{workspace.guest.formalSalutation.text}</span> ·{" "}
                <strong>Familiar</strong> <span className="guest-name">{workspace.guest.familiarName.text}</span>
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
            <p data-testid="record-version">
              <strong>Record version</strong> {guest.version} · updated {guest.updatedAt}
            </p>
          </section>
          <div className="atelier-side-stack">
            {rsvp ? (
              <section className="atelier-panel">
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
                {paramsQuery.issued ? (
                  <p role="status">
                    Synthetic guest access is ready. <GuestAccessLink href={`/rsvp/${paramsQuery.issued}`} />
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
                    error={paramsQuery.error}
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
              <section className="atelier-panel">
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
          </div>
        </div>
        {workspace ? (
          <GuestAddressingWorkspace
            workspace={workspace}
            eventId={scoped.event.id}
            guestChoices={guestChoices}
            adultChoices={adultChoices}
            locked={mutationLocked}
          />
        ) : permissions.addressingView ? null : (
          <AtelierOperationalState
            state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view addressing, party or entitlement records.")}
          />
        )}
        {permissions.amend ? (
          <section id="guest-amendment" className="atelier-panel">
            <h2>Controlled amendment</h2>
            <GuestAmendForm
              key={`${guest.id}-${guest.version}-${queryState?.kind ?? "idle"}`}
              guest={guest}
              eventId={scoped.event.id}
              error={queryState?.kind === "conflict" ? undefined : paramsQuery.error}
              locked={mutationLocked}
            />
          </section>
        ) : (
          <p className="empty">Your assignment can view this record but cannot amend it.</p>
        )}
      </div>
    </AppShell>
  );
}
