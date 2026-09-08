import { CommunicationsFrame } from "../../../../../../../components/communications-frame";
import { ReplyForm, TaskActionForm } from "../../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../../server/communications-page";

export default async function InboxWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; threadId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId, threadId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgView) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Conversation" lede="Concierge workspace">
        <p className="empty">{loaded.denied ?? "Conversation is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const workspace = getRuntime().service.getThread(
    loaded.actor,
    loaded.scoped.organisation.id,
    loaded.scoped.event.id,
    threadId,
  );
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name} eventId={loaded.scoped.event.id}
      title="Conversation"
      lede="Guest-visible replies stay separate from private notes. No autonomous concierge decisions."
      error={(await searchParams).error}
    >
      <p>
        {workspace.thread.channel} · {workspace.thread.status}
      </p>
      <section>
        <h2>Inbound</h2>
        {workspace.inbound.length === 0 ? <p className="empty">No inbound messages in this thread.</p> : null}
        {workspace.inbound.map((item) => (
          <article key={item.id}>
            <p>{item.body}</p>
            {item.attachmentFileName ? <p>Attachment held: {item.attachmentFileName} (quarantined)</p> : null}
          </article>
        ))}
      </section>
      {loaded.permissions.msgRespond ? <ReplyForm eventId={eventId} threadId={threadId} /> : null}
      {workspace.tasks.map((task) => (
        <section key={task.id}>
          <h2>Follow-up {task.status}</h2>
          <TaskActionForm
            eventId={eventId}
            taskId={task.id}
            expectedVersion={task.version}
            ownerPersonId={loaded.person.id}
          />
        </section>
      ))}
    </CommunicationsFrame>
  );
}
