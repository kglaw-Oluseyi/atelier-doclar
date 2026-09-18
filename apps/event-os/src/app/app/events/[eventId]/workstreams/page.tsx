import Link from "next/link";
import { rows, withTx } from "@maison-doclar/foundation";
import { operateAction, workstreamAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function WorkstreamsPage({
  params,
  searchParams,
}: {
  params: { eventId: string };
  searchParams?: { notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const streams = await withTx((db) =>
    rows<Record<string, unknown>>(
      db,
      `SELECT w.*, d.name AS department_name FROM workstreams w JOIN departments d ON d.id = w.department_id WHERE w.event_id = $1 AND w.organisation_id = $2`,
      [params.eventId, actor.organisationId],
    ),
  );
  const departments = await withTx((db) =>
    rows<{ id: string; name: string }>(
      db,
      `SELECT id, name FROM departments WHERE organisation_id = $1 AND status = 'ACTIVE'`,
      [actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <div className="crumbs">
        <Link href={`/app/events/${params.eventId}`}>Event</Link> / Workstreams
      </div>
      <h1>Workstreams</h1>
      <p className="lede">
        Department work stays inside this event. Event scope alone is not department isolation.
      </p>
      {searchParams?.notice ? (
        <p className="success" role="status">
          {searchParams.notice}
        </p>
      ) : null}
      {searchParams?.error ? (
        <p className="alert" role="alert">
          {searchParams.error}
        </p>
      ) : null}
      {streams.length === 0 ? (
        <p className="empty">No workstream is linked to this event yet.</p>
      ) : (
        streams.map((stream) => (
          <form key={String(stream.id)} className="panel form-grid" action={operateAction}>
            <h2>{String(stream.name)}</h2>
            <p>
              {String(stream.department_name)} · {String(stream.status)}
            </p>
            <input type="hidden" name="id" value={String(stream.id)} />
            <input type="hidden" name="eventId" value={params.eventId} />
            <input type="hidden" name="version" value={String(stream.version)} />
            <label>
              Operational note
              <textarea name="note" defaultValue={String(stream.operational_note ?? "")} />
            </label>
            <button type="submit">Save operational note</button>
          </form>
        ))
      )}
      <form className="panel form-grid" action={workstreamAction}>
        <h2>Create workstream</h2>
        <input type="hidden" name="eventId" value={params.eventId} />
        <label>
          Department
          <select name="departmentId" required>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Code
          <input name="code" required />
        </label>
        <label>
          Name
          <input name="name" required />
        </label>
        <button type="submit">Create workstream</button>
      </form>
    </main>
  );
}
