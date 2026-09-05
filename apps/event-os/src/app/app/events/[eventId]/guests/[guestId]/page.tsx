import Link from "next/link";
import { PlatformError, operationalDisplayName } from "@maison-doclar/shared-platform";
import { DuplicateResolveForm, GuestAmendForm } from "../../../../../../components/guest-amend-form";
import { AppShell } from "../../../../../../components/shell";
import { guestPermissions, resolveScopedEvent } from "../../../../../../server/guest-scope";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";

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
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId, guestId } = await params;
  const error = (await searchParams).error;
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
