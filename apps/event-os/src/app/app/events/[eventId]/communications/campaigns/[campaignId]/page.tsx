import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { CampaignLifecycleForms } from "../../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../../server/communications-page";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; campaignId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId, campaignId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgCampaign) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Campaign" lede="Campaign run">
        <p className="empty">{loaded.denied ?? "Campaign is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const campaign = getRuntime().service.getCampaign(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
    campaignId,
  );
  const failures = getRuntime().service.listFailures(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title={campaign.name}
      lede="Approval is not a role shortcut. Audience snapshot stays frozen after approval."
      error={(await searchParams).error}
    >
      <p>
        <span className="md-status">{campaign.status}</span> · {campaign.purpose} · {campaign.channel}
        {campaign.testOnly ? " · Test watermark" : ""}
      </p>
      {campaign.status === "AWAITING_APPROVAL" ? (
        <section>
          <h2>Approval</h2>
          <p>A different named human must approve. The author cannot approve their own campaign.</p>
        </section>
      ) : null}
      <CampaignLifecycleForms eventId={eventId} campaign={campaign} />
      <p>
        <Link href={`/app/events/${eventId}/communications/failures`}>Delivery failures ({failures.length})</Link>
      </p>
    </CommunicationsFrame>
  );
}
