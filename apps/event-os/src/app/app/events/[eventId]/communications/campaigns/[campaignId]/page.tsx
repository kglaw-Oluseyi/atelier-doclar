import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { CampaignLifecycleForms } from "../../../../../../../components/communications-forms";
import { staffDisplayName } from "../../../../../../../server/comms-display";
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
  const runtime = getRuntime();
  const campaign = runtime.service.getCampaign(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
    campaignId,
  );
  const failures = runtime.service.listFailures(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  const approvals = runtime.service
    .currentSnapshot()
    .campaignApprovals.filter((item) => item.campaignId === campaign.id)
    .sort((left, right) => Date.parse(right.decidedAt) - Date.parse(left.decidedAt));
  const latestApproval = approvals[0];
  const authorName = staffDisplayName(runtime.service, campaign.createdByPersonId);
  const approverName = latestApproval ? staffDisplayName(runtime.service, latestApproval.decidedByPersonId) : undefined;
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title={campaign.name}
      lede="Approval is not a role shortcut. Audience snapshot stays frozen after approval."
      error={(await searchParams).error}
    >
      <p>
        <span className="md-status">{campaign.status}</span> · {campaign.purpose} · {campaign.channel}
        {campaign.testOnly ? " · Test watermark" : ""}
      </p>
      <dl className="meta-list">
        <div>
          <dt>Author</dt>
          <dd>{authorName}</dd>
        </div>
        <div>
          <dt>Approval state</dt>
          <dd>{campaign.status === "AWAITING_APPROVAL" ? "Awaiting separate approver" : campaign.status}</dd>
        </div>
        {approverName ? (
          <div>
            <dt>Approver</dt>
            <dd>{approverName}</dd>
          </div>
        ) : null}
      </dl>
      {campaign.status === "AWAITING_APPROVAL" ? (
        <section>
          <h2>Approval</h2>
          <p>A different named human must approve, unless you are organisation-wide CEO completing maker/checker alone.</p>
        </section>
      ) : null}
      <CampaignLifecycleForms eventId={eventId} campaign={campaign} canApprove={loaded.permissions.msgApprove} />
      <p>
        <Link href={`/app/events/${eventId}/communications/failures`}>Delivery failures ({failures.length})</Link>
      </p>
    </CommunicationsFrame>
  );
}
