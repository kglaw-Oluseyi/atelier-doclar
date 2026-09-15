import { authorize, PlatformError, type Person } from "@maison-doclar/shared-platform";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { CanonicalId, CanonicalTime } from "../../../../components/canonical-evidence";
import { AppShell } from "../../../../components/shell";
import { guardedActor } from "../../../../server/guard";
import { buildGovernanceLabelIndex, presentAuditEvent } from "../../../../server/identity-resolution";
import { operationalStateFromCode } from "../../../../server/operational-state";
import { getRuntime } from "../../../../server/runtime";

function isAuditDenied(error: unknown): boolean {
  if (error instanceof PlatformError) {
    return error.code === "FORBIDDEN" || error.code === "ACCESS_PENDING";
  }
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "FORBIDDEN" || code === "ACCESS_PENDING";
}

function AuditDenied({
  person,
  organisationName,
}: {
  person: Person;
  organisationName?: string;
}) {
  return (
    <AppShell person={person} organisationName={organisationName} current="/app/admin/audit">
      <h1>Audit</h1>
      <AtelierOperationalState
        state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view the audit ledger.")}
      />
    </AppShell>
  );
}

export default async function AuditPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/admin/audit">
        <h1>Audit</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }

  const actorSnap = runtime.service.resolveActor(person.id);
  // Executive Ledger is org-wide evidence. Gate on platform.audit.read_all only —
  // operational audit remit must not open this surface (Event Director).
  const canViewExecutiveLedger = authorize({
    actor: actorSnap,
    permission: "platform.audit.read_all",
    scope: { organisationId: organisation.id },
  }).allow;

  if (!canViewExecutiveLedger) {
    return <AuditDenied person={person} organisationName={organisation.displayName} />;
  }

  try {
    const audit = runtime.service.searchAudit(actor, organisation.id);
    const labels = buildGovernanceLabelIndex(runtime.service, actor, organisation.id);
    const rows = audit.map((item) => presentAuditEvent(item, labels));

    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/admin/audit">
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
  } catch (error) {
    if (isAuditDenied(error)) {
      return <AuditDenied person={person} organisationName={organisation.displayName} />;
    }
    throw error;
  }
}
