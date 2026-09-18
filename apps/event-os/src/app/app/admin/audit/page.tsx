import { rows, searchAudit, withTx } from "@maison-doclar/foundation";
import { exportRequestAction, exportSettleAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: { action?: string; outcome?: string; notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const events = await searchAudit(actor, {
    action: searchParams?.action,
    outcome: searchParams?.outcome,
  });
  const exports = await withTx((db) =>
    rows<Record<string, unknown>>(
      db,
      `SELECT id, status, created_at FROM audit_exports WHERE organisation_id = $1 ORDER BY created_at DESC`,
      [actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <h1>Audit</h1>
      <p className="lede">Append-only history. Secrets are not stored here.</p>
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
      <form className="filters">
        <label>
          Action
          <input name="action" defaultValue={searchParams?.action ?? ""} />
        </label>
        <label>
          Outcome
          <select name="outcome" defaultValue={searchParams?.outcome ?? ""}>
            <option value="">Any</option>
            <option>SUCCESS</option>
            <option>DENIED</option>
            <option>FAILED</option>
          </select>
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>
      {events.length === 0 ? (
        <p className="empty">No audit events match.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Outcome</th>
              <th>Correlation</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={String(event.id)}>
                <td>{String(event.occurred_at)}</td>
                <td>{String(event.action)}</td>
                <td>{String(event.outcome)}</td>
                <td>{String(event.correlation_id)}</td>
                <td>{String(event.reason ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={exportRequestAction}>
        <button type="submit">Request export</button>
      </form>
      <section className="panel">
        <h2>Exports</h2>
        {exports.length === 0 ? (
          <p>No export has been requested.</p>
        ) : (
          exports.map((item) => (
            <form key={String(item.id)} action={exportSettleAction}>
              <input type="hidden" name="id" value={String(item.id)} />
              <span>{String(item.status)}</span>
              <button type="submit">Settle export</button>
            </form>
          ))
        )}
      </section>
    </main>
  );
}
