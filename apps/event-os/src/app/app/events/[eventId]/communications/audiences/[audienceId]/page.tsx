import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { getRuntime } from "../../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../../server/communications-page";

export default async function AudiencePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; audienceId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId, audienceId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgAudience) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Audience preview" lede="Eligibility preview">
        <p className="empty">{loaded.denied ?? "Audience preview is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const preview = getRuntime().service.previewAudience(loaded.actor, {
    organisationId: loaded.scoped.organisation.id,
    eventId: loaded.scoped.event.id,
    audienceId,
    channel: "EMAIL",
    purpose: "INVITATION",
  });
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Audience preview"
      lede="This is a preview. Approval freezes an immutable snapshot."
      error={(await searchParams).error}
    >
      <p>
        Included {preview.included} · Excluded {preview.excluded}
        {preview.unknownPredicates.length > 0 ? ` · Unavailable: ${preview.unknownPredicates.join(", ")}` : ""}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Eligibility</th>
              <th>Codes</th>
            </tr>
          </thead>
          <tbody>
            {preview.snapshot.members.map((member) => (
              <tr key={member.guestId}>
                <td>{member.guestId}</td>
                <td>{member.eligibility}</td>
                <td>{member.exclusionCodes.join(", ") || "Eligible"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CommunicationsFrame>
  );
}
