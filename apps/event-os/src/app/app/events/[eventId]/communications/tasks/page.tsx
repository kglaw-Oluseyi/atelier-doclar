import { CommunicationsFrame } from "../../../../../../components/communications-frame";
import { TaskActionForm } from "../../../../../../components/communications-forms";
import { getRuntime } from "../../../../../../server/runtime";
import { loadCommunicationsPage } from "../../../../../../server/communications-page";

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const loaded = await loadCommunicationsPage(eventId);
  if (!loaded.scoped || !loaded.permissions?.msgView) {
    return (
      <CommunicationsFrame person={loaded.person} eventId={eventId} title="Follow-up tasks" lede="Owned concierge work">
        <p className="empty">{loaded.denied ?? "Task queue is not available."}</p>
      </CommunicationsFrame>
    );
  }
  const tasks = getRuntime().service.listFollowUpTasks(loaded.actor, loaded.scoped.organisation.id, loaded.scoped.event.id);
  return (
    <CommunicationsFrame
      person={loaded.person}
      organisationName={loaded.scoped.organisation.displayName}
      eventName={loaded.scoped.event.name}
      eventId={eventId}
      title="Follow-up tasks"
      lede="Ownership, acknowledgement, escalation and resolution. SLA exists only when the event configures it."
      error={(await searchParams).error}
    >
      {tasks.length === 0 ? <p className="empty">No follow-up tasks.</p> : null}
      {tasks.map((task) => (
        <article key={task.id} className="card-list">
          <h2>
            {task.category} · {task.status}
          </h2>
          <p>
            Escalation {task.escalationLevel}
            {task.dueAt ? ` · due ${task.dueAt}` : " · no event SLA configured"}
          </p>
          {loaded.permissions.msgTask || loaded.permissions.msgAssign ? (
            <TaskActionForm
              eventId={eventId}
              taskId={task.id}
              expectedVersion={task.version}
              ownerPersonId={loaded.person.id}
            />
          ) : null}
        </article>
      ))}
    </CommunicationsFrame>
  );
}
