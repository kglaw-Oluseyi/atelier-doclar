import { ALLOWED_TEMPLATE_VARIABLES } from "@maison-doclar/shared-platform";
import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { ApproveTemplateForm, TemplateEditorForm } from "../../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../../server/communications-page";

export default async function TemplateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; templateId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId, templateId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgTemplate) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Template" lede="Template editor">
        <p className="empty">{loaded.denied ?? "Template management is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const runtime = getRuntime();
  const versions = runtime.service.listTemplateVersions(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
    templateId,
  );
  const current = versions.at(-1);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Template editor"
      lede={`Allowed variables: ${ALLOWED_TEMPLATE_VARIABLES.join(", ")}`}
      error={(await searchParams).error}
    >
      {!current ? <p className="empty">This template has no versions.</p> : null}
      {current ? (
        <>
          <p>
            Version {current.versionNumber} · {current.status}
          </p>
          <TemplateEditorForm eventId={eventId} templateId={templateId} subject={current.subject} body={current.body} />
          {loaded.permissions.msgTemplatePublish && current.status !== "APPROVED" ? (
            <ApproveTemplateForm
              eventId={eventId}
              templateId={templateId}
              templateVersionId={current.id}
              expectedVersion={current.version}
            />
          ) : null}
        </>
      ) : null}
    </CommunicationsFrame>
  );
}
