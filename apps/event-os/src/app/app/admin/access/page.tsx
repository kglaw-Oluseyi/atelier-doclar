import { ROLE_KEYS, listAssignments, listDirectory, rows, withTx } from "@maison-doclar/foundation";
import {
  assignmentStatusAction,
  grantAction,
  inviteAction,
  userStatusAction,
} from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function AccessPage({
  searchParams,
}: {
  searchParams?: { notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const people = await listDirectory(actor);
  const assignments = await listAssignments(actor);
  const events = await withTx((db) =>
    rows<{ id: string; name: string; client_id: string }>(
      db,
      `SELECT id, name, client_id FROM events WHERE organisation_id = $1`,
      [actor.organisationId],
    ),
  );
  const departments = await withTx((db) =>
    rows<{ id: string; name: string }>(
      db,
      `SELECT id, name FROM departments WHERE organisation_id = $1`,
      [actor.organisationId],
    ),
  );
  const streams = await withTx((db) =>
    rows<{ id: string; name: string }>(
      db,
      `SELECT id, name FROM workstreams WHERE organisation_id = $1`,
      [actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <h1>Access</h1>
      <p className="lede">
        Staff, roles and scoped assignments. Technical administration is separate from business
        authority.
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
      <form className="panel form-grid" action={inviteAction}>
        <h2>Invite staff</h2>
        <label>
          Name
          <input name="displayName" required />
        </label>
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <button type="submit">Send invitation</button>
      </form>
      <section className="panel">
        <h2>Directory</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={String(person.id)}>
                <td>{String(person.display_name)}</td>
                <td>{String(person.email)}</td>
                <td>{String(person.status)}</td>
                <td>
                  <form action={userStatusAction}>
                    <input type="hidden" name="userId" value={String(person.id)} />
                    <select
                      name="status"
                      defaultValue={String(person.status)}
                      aria-label={`Status for ${String(person.display_name)}`}
                    >
                      <option>ACTIVE</option>
                      <option>SUSPENDED</option>
                      <option>DEACTIVATED</option>
                    </select>
                    <input name="reason" placeholder="Reason" aria-label="Reason" required />
                    <button type="submit">Update</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <form className="panel form-grid" action={grantAction}>
        <h2>Grant assignment</h2>
        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
        <label>
          Person
          <select name="userId" required>
            {people.map((person) => (
              <option key={String(person.id)} value={String(person.id)}>
                {String(person.display_name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select name="roleKey">
            {ROLE_KEYS.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>
        </label>
        <label>
          Scope
          <select name="scopeKind">
            <option>ORGANISATION</option>
            <option>CLIENT</option>
            <option>EVENT</option>
            <option>WORKSTREAM</option>
            <option>GOVERNANCE</option>
          </select>
        </label>
        <label>
          Event
          <select name="eventId">
            <option value="">None</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Client id
          <input name="clientId" placeholder="Required for client scope" />
        </label>
        <label>
          Department
          <select name="departmentId">
            <option value="">None</option>
            {departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Workstream
          <select name="workstreamId">
            <option value="">None</option>
            {streams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ends
          <input type="datetime-local" name="endsAt" />
        </label>
        <label>
          Reason
          <textarea name="reason" required />
        </label>
        <button type="submit">Grant</button>
      </form>
      <section className="panel">
        <h2>Access history</h2>
        {assignments.map((item) => (
          <form key={String(item.id)} action={assignmentStatusAction} className="actions">
            <span>
              {String(item.display_name)} · {String(item.role_key)} · {String(item.status)} ·{" "}
              {String(item.scope_kind)}
            </span>
            <input type="hidden" name="id" value={String(item.id)} />
            <input type="hidden" name="version" value={String(item.version)} />
            <input name="reason" placeholder="Reason" aria-label="Reason" required />
            <button name="status" value="SUSPENDED" className="secondary" type="submit">
              Suspend
            </button>
            <button name="status" value="REVOKED" className="danger" type="submit">
              Revoke
            </button>
          </form>
        ))}
      </section>
    </main>
  );
}
