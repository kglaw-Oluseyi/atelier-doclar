import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { CampaignComposerForm } from "../../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../../server/communications-page";

export default async function CampaignComposerPage({
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
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Compose campaign" lede="Campaign composer">
        <p className="empty">{loaded.denied ?? "Campaign composer is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const runtime = getRuntime();
  const templates = runtime.service.listTemplates(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  const audiences = loaded.permissions.msgAudience
    ? runtime.service.listAudiences(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id)
    : [];
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Compose campaign"
      lede="A campaign carries a purpose. It does not become RSVP invitation authority."
      error={(await searchParams).error}
    >
      {audiences.length === 0 ? <p className="empty">Save an audience before composing a campaign.</p> : null}
      <CampaignComposerForm eventId={eventId} templates={templates} audiences={audiences} />
    </CommunicationsFrame>
  );
}
