import { rows, withTx } from "@maison-doclar/foundation";
import { departmentAction, departmentStatusAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams?: { notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const departments = await withTx((db) =>
    rows<Record<string, unknown>>(
      db,
      `SELECT * FROM departments WHERE organisation_id = $1 ORDER BY name`,
      [actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <h1>Departments</h1>
      <p className="lede">
        Organisation-owned departments. Workstreams belong to one event and one department.
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
      {departments.length === 0 ? (
        <p className="empty">No departments yet.</p>
      ) : (
        departments.map((department) => (
          <form
            key={String(department.id)}
            className="panel actions"
            action={departmentStatusAction}
          >
            <strong>{String(department.name)}</strong>
            <span className="status">{String(department.status)}</span>
            <input type="hidden" name="id" value={String(department.id)} />
            <input type="hidden" name="version" value={String(department.version)} />
            <input name="reason" required placeholder="Reason" aria-label="Reason" />
            <button
              name="status"
              value={department.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
              type="submit"
            >
              {department.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
            </button>
          </form>
        ))
      )}
      <form className="panel form-grid" action={departmentAction}>
        <h2>Create department</h2>
        <label>
          Code
          <input name="code" required />
        </label>
        <label>
          Name
          <input name="name" required />
        </label>
        <button type="submit">Create department</button>
      </form>
    </main>
  );
}
