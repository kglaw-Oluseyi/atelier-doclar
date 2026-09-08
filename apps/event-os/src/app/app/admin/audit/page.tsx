import { authorize } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { CanonicalId, CanonicalTime } from "../../../../components/canonical-evidence";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { buildGovernanceLabelIndex, presentAuditEvent } from "../../../../server/identity-resolution";
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
  const labels = organisation ? buildGovernanceLabelIndex(runtime.service, actor, organisation.id) : undefined;
  const rows = labels ? audit.map((item) => presentAuditEvent(item, labels)) : [];

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/admin/audit">
      <AtelierPageHeader
        eyebrow="Executive ledger"
        title="Audit"
        lede="Append-only consequential history. Display names are resolved at read time. Immutable identifiers remain the evidence."
      />
      {rows.length === 0 ? (
        <p className="empty">No audit events are visible.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table" data-testid="audit-ledger">
            <caption>Consequential history</caption>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>Outcome</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td data-label="When">
                    <CanonicalTime iso={item.occurredAt} />
                  </td>
                  <td data-label="Who">{item.actorLabel}</td>
                  <td data-label="Action">{item.actionLabel}</td>
                  <td data-label="Target">{item.targetLabel}</td>
                  <td data-label="Outcome">
                    <span className="md-status">{item.outcomeLabel}</span>
                    {item.reason ? <p className="lede">{item.reason}</p> : null}
                  </td>
                  <td data-label="Evidence">
                    <CanonicalId id={item.correlationId} label="Correlation" />
                    {item.resourceId ? <CanonicalId id={item.resourceId} label="Resource ID" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
