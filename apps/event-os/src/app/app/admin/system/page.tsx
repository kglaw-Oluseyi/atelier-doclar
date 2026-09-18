import { loadConfig, readiness, one, withTx } from "@maison-doclar/foundation";
import { organisationAction } from "@/server/actions";
import { requireActor } from "@/server/session";

export default async function SystemPage() {
  const { actor } = await requireActor();
  const config = loadConfig();
  const health = await readiness();
  const organisation = await withTx((db) =>
    one<Record<string, unknown>>(db, `SELECT * FROM organisations WHERE id = $1`, [
      actor.organisationId,
    ]),
  );
  return (
    <main className="page">
      <h1>System health</h1>
      <p className="lede">Release and dependency status. No credentials are shown.</p>
      <div className="cards">
        <article className="card">
          <h2>Release</h2>
          <p>{config.gitSha}</p>
        </article>
        <article className="card">
          <h2>Database</h2>
          <p>{health.database}</p>
        </article>
        <article className="card">
          <h2>Migrations</h2>
          <p>{health.migrations}</p>
        </article>
        <article className="card">
          <h2>Schema</h2>
          <p>{config.schema}</p>
        </article>
        <article className="card">
          <h2>Production authorised</h2>
          <p>{String(config.productionAuthorised)}</p>
        </article>
        <article className="card">
          <h2>Identity provider</h2>
          <p>{config.oidcIssuer ? "Configured" : "Unavailable"}</p>
        </article>
      </div>
      <p>
        <a href="/docs/runbooks/rollback.md">Rollback runbook</a>
      </p>
      {organisation ? (
        <form className="panel form-grid" action={organisationAction}>
          <h2>Organisation settings</h2>
          <input type="hidden" name="version" value={String(organisation.version)} />
          <label>
            Display name
            <input name="displayName" defaultValue={String(organisation.display_name)} />
          </label>
          <label>
            Legal name
            <input name="legalName" defaultValue={String(organisation.legal_name)} />
          </label>
          <label>
            Status
            <select name="status" defaultValue={String(organisation.status)}>
              <option>ACTIVE</option>
              <option>SUSPENDED</option>
              <option>ARCHIVED</option>
            </select>
          </label>
          <button type="submit">Save organisation</button>
        </form>
      ) : null}
    </main>
  );
}
