import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";

export default async function AuditPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const audit = organisation ? runtime.service.searchAudit(actor, organisation.id) : [];

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/admin/audit">
      <div className="page-header">
        <h1>Audit</h1>
        <p className="lede">Append-only consequential history. Secrets are not stored.</p>
      </div>
      {audit.length === 0 ? (
        <p className="empty">No audit events are visible.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Correlation</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((item) => (
                <tr key={item.id}>
                  <td>{item.occurredAt}</td>
                  <td>{item.action}</td>
                  <td>
                    <span className="md-status">{item.outcome}</span>
                  </td>
                  <td>{item.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
