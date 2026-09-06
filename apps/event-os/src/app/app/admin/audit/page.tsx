import { AtelierPageHeader } from "../../../../components/atelier-page-header";
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
      <AtelierPageHeader
        eyebrow="Executive ledger"
        title="Audit"
        lede="Append-only consequential history. Secrets are not stored."
      />
      {audit.length === 0 ? (
        <p className="empty">No audit events are visible.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Consequential history</caption>
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
                  <td data-label="When">{item.occurredAt}</td>
                  <td data-label="Action">{item.action}</td>
                  <td data-label="Outcome">
                    <span className="md-status">{item.outcome}</span>
                  </td>
                  <td data-label="Correlation">{item.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
