import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function CampaignsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgCampaign) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Campaigns" lede="Approved guest communications">
        <p className="empty">{loaded.denied ?? "Campaign management is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const campaigns = getRuntime().service.listCampaigns(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Campaigns"
      lede="Approval freezes audience and content. Dispatch is synthetic only."
      error={(await searchParams).error}
    >
      <p className="actions">
        <Link className="button" href={`/app/events/${eventId}/communications/campaigns/new`}>
          Compose campaign
        </Link>
      </p>
      {campaigns.length === 0 ? <p className="empty">No campaigns yet.</p> : null}
      <div className="card-list">
        {campaigns.map((item) => (
          <article key={item.id}>
            <h2>
              <Link href={`/app/events/${eventId}/communications/campaigns/${item.id}`}>{item.name}</Link>
            </h2>
            <p>
              {item.purpose} · {item.channel} · {item.status}
              {item.testOnly ? " · Test only" : ""}
            </p>
          </article>
        ))}
      </div>
    </CommunicationsFrame>
  );
}
