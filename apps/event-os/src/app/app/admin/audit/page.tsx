import { authorize } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { operationalStateFromCode } from "../../../../server/operational-state";
import { getRuntime } from "../../../../server/runtime";

export default async function AuditPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const actorSnap = runtime.service.resolveActor(person.id);
  const canViewAudit = organisation
    ? authorize({ actor: actorSnap, permission: "audit.view", scope: { organisationId: organisation.id } }).allow
    : false;
  if (organisation && !canViewAudit) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/admin/audit">
        <h1>Audit</h1>
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view the audit ledger.")}
        />
      </AppShell>
    );
  }
  const audit = organisation && canViewAudit ? runtime.service.searchAudit(actor, organisation.id) : [];

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
