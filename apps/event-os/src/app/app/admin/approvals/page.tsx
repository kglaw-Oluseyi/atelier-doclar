import { loadConfig, rows, withTx } from "@maison-doclar/foundation";
import { approvalDecideAction, approvalSubmitAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams?: { notice?: string; error?: string };
}) {
  const { actor } = await requireActor();
  const requests = await withTx((db) =>
    rows<Record<string, unknown>>(
      db,
      `SELECT * FROM approval_requests WHERE organisation_id = $1 ORDER BY created_at DESC`,
      [actor.organisationId],
    ),
  );
  const events = await withTx((db) =>
    rows<{ id: string; name: string }>(
      db,
      `SELECT id, name FROM events WHERE organisation_id = $1`,
      [actor.organisationId],
    ),
  );
  return (
    <main className="page">
      <h1>Approvals</h1>
      <p className="lede">
        Maker/checker decisions. An organisation-wide CEO may complete both sides. Nobody else may
        decide their own request.
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
      <form className="panel form-grid" action={approvalSubmitAction}>
        <label>
          Kind
          <select name="kind">
            <option>EVENT_ARCHIVE</option>
            <option>GOVERNANCE_RULE</option>
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
          Title
          <input name="title" required />
        </label>
        <label>
          Detail
          <textarea name="detail" required />
        </label>
        <button type="submit">Submit request</button>
      </form>
      {requests.map((request) => (
        <form key={String(request.id)} className="panel form-grid" action={approvalDecideAction}>
          <h2>{String(request.title)}</h2>
          <p>
            {String(request.kind)} · {String(request.status)}
          </p>
          <p>{String(request.detail)}</p>
          <input type="hidden" name="id" value={String(request.id)} />
          <input type="hidden" name="version" value={String(request.version)} />
          <label>
            Reason
            <textarea name="reason" required />
          </label>
          <div className="actions">
            <button
              name="decision"
              value="APPROVED"
              type="submit"
              disabled={request.status !== "SUBMITTED"}
            >
              Approve
            </button>
            <button
              name="decision"
              value="REJECTED"
              className="secondary"
              type="submit"
              disabled={request.status !== "SUBMITTED"}
            >
              Reject
            </button>
          </div>
        </form>
      ))}
      <p className="callout">
        Release {loadConfig().gitSha}. Authority file remains unauthorised. Readiness is on System.
      </p>
    </main>
  );
}
