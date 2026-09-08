import { presentationLabel } from "@maison-doclar/shared-platform";
import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { PublishOccasionForm, PublishPolicyForm } from "../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function CommunicationsPolicyPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Communication policy" lede="Event-configured channels">
        <p className="empty">{loaded.denied}</p>
      </CommunicationsFrame>
    );
  }
  const { actor, person, scoped, permissions } = loaded;
  const runtime = getRuntime();
  const policy = runtime.service.getChannelPolicy(actor, scoped.organisation.id, scoped.event.id);
  const occasion = runtime.service.getGuestSafeOccasion(actor, scoped.organisation.id, scoped.event.id);
  return (
    <CommunicationsFrame
      person={person}
      organisationName={scoped.organisation.displayName}
      eventName={scoped.event.name} eventId={scoped.event.id}
      title="Policy and occasion"
      lede="Channel permission, suppression and guest-safe facts. Unknown facts stay unavailable."
      error={(await searchParams).error}
    >
      {!policy ? <p className="empty">Communications have not been prepared.</p> : null}
      {policy ? (
        <section>
          <h2>Channel policy</h2>
          <p>
            <span className="md-status">{policy.status}</span> · {policy.enabledChannels.join(", ")} · quiet hours{" "}
            {policy.quietHoursStart}–{policy.quietHoursEnd} {policy.timezone}
            {policy.sandboxDispatchEnabled ? " · Synthetic sandbox on" : " · Synthetic sandbox off"}
          </p>
          {policy.status === "PUBLISHED" && policy.sandboxDispatchEnabled ? (
            <p>Channel policy is published for synthetic dispatch.</p>
          ) : (
            <p>Channel policy must be published with synthetic sandbox before send.</p>
          )}
          {permissions?.msgPolicy ? <PublishPolicyForm eventId={eventId} policy={policy} /> : null}
        </section>
      ) : null}
      {occasion ? (
        <section>
          <h2>Guest-safe occasion</h2>
          <p>
            Event name {occasion.eventName?.value ?? "unavailable"} ({presentationLabel(occasion.eventName?.quality ?? "UNVERIFIED")})
          </p>
          <p>When {occasion.when?.value ?? "unavailable"} ({presentationLabel(occasion.when?.quality ?? "UNVERIFIED")})</p>
          {permissions?.msgPolicy ? <PublishOccasionForm eventId={eventId} occasion={occasion} /> : null}
        </section>
      ) : null}
    </CommunicationsFrame>
  );
}
