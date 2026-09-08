import Link from "next/link";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { CanonicalId, HistoryDisclosure } from "../../../components/canonical-evidence";
import { AppShell } from "../../../components/shell";
import { guardedActor } from "../../../server/guard";
import { buildGovernanceLabelIndex, presentAssignment } from "../../../server/identity-resolution";
import { getRuntime } from "../../../server/runtime";

export default async function MyWorkPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const assignments = organisation ? runtime.service.listAssignments(actor, organisation.id) : [];
  const labels = organisation ? buildGovernanceLabelIndex(runtime.service, actor, organisation.id) : undefined;
  const presented = labels
    ? assignments.map((item) => presentAssignment(item, labels, new Date().toISOString()))
    : [];
  const unique = new Map(presented.map((item) => [item.id, item]));
  const rows = [...unique.values()];
  const active = rows.filter((item) => item.active);
  const historical = rows.filter((item) => !item.active);

  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/my-work">
      <AtelierPageHeader
        eyebrow="Assignment queue"
        title="My Work"
        lede="Your current assignments and the destinations they open. This is the staff assignment queue, not a separate task ledger or alert product."
      />
      {active.length === 0 ? (
        <p className="empty">No active assignments.</p>
      ) : (
        <ul className="atelier-queue" data-testid="my-work-active">
          {active.map((item) => (
            <li key={item.id} data-testid="my-work-assignment">
              <p>
                <strong>{item.roleLabel}</strong> · {item.scopeLabel}
                {item.clientLabel ? ` · ${item.clientLabel}` : ""} · {item.statusLabel}
              </p>
              <p>
                {item.href ? <Link href={item.href}>{item.destinationLabel}</Link> : <Link href="/app">{item.destinationLabel}</Link>}
              </p>
              {item.explanation ? <p className="lede">{item.explanation}</p> : null}
              <CanonicalId id={item.assignmentId} label="Assignment ID" />
            </li>
          ))}
        </ul>
      )}
      <HistoryDisclosure summary="Earlier or inactive assignments" count={historical.length} testId="my-work-history">
        <ul className="atelier-queue">
          {historical.map((item) => (
            <li key={item.id}>
              <p>
                {item.roleLabel} · {item.scopeLabel} · {item.statusLabel}
              </p>
              <CanonicalId id={item.assignmentId} label="Assignment ID" />
            </li>
          ))}
        </ul>
      </HistoryDisclosure>
    </AppShell>
  );
}
