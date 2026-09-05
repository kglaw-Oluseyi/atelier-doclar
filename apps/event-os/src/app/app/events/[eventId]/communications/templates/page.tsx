import Link from "next/link";
import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { ApproveTemplateForm } from "../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function TemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgTemplate) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Templates" lede="Versioned guest messages">
        <p className="empty">{loaded.denied ?? "Your assignment does not include template management."}</p>
      </CommunicationsFrame>
    );
  }
  const templates = getRuntime().service.listTemplates(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Templates"
      lede="Approved variables only. Missing guest-safe facts stay unresolved."
      error={(await searchParams).error}
    >
      {templates.length === 0 ? <p className="empty">No templates yet. Prepare communications first.</p> : null}
      <div className="card-list">
        {templates.map((item) => {
          const versions = getRuntime().service.listTemplateVersions(
            loaded.actor,
            loaded.scoped!.organisation.id,
            loaded.scoped!.event.id,
            item.id,
          );
          const current = versions.find((version) => version.id === item.activeVersionId) ?? versions.at(-1);
          return (
            <article key={item.id}>
              <h2>
                <Link href={`/app/events/${eventId}/communications/templates/${item.id}`}>{item.key}</Link>
              </h2>
              <p>
                {item.purpose} · {item.channel} · {item.status}
              </p>
              {loaded.permissions.msgTemplatePublish && current && current.status !== "APPROVED" ? (
                <ApproveTemplateForm
                  eventId={eventId}
                  templateId={item.id}
                  templateVersionId={current.id}
                  expectedVersion={current.version}
                />
              ) : null}
            </article>
          );
        })}
      </div>
    </CommunicationsFrame>
  );
}
