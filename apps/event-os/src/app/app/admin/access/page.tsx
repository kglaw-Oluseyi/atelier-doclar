import { authorize, PlatformError, type Person } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../components/action-result-banner";
import { AssignmentForm } from "../../../../components/assignment-form";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { CanonicalId } from "../../../../components/canonical-evidence";
import { AppShell } from "../../../../components/shell";
import { loadPresentedActionResult } from "../../../../server/action-flash";
import { guardedActor } from "../../../../server/guard";
import { buildGovernanceLabelIndex, presentAssignment } from "../../../../server/identity-resolution";
import { operationalStateFromCode } from "../../../../server/operational-state";
import { getRuntime } from "../../../../server/runtime";

function isAccessDenied(error: unknown): boolean {
  if (error instanceof PlatformError) {
    return error.code === "FORBIDDEN" || error.code === "ACCESS_PENDING";
  }
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "FORBIDDEN" || code === "ACCESS_PENDING";
}

function AccessDenied({
  person,
  organisationName,
}: {
  person: Person;
  organisationName?: string;
}) {
  return (
    <AppShell person={person} organisationName={organisationName} current="/app/admin/access">
      <h1>Access administration</h1>
      <AtelierOperationalState
        state={operationalStateFromCode("FORBIDDEN", "This assignment cannot administer access.")}
      />
    </AppShell>
  );
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; state?: string; result?: string }>;
}) {
  const params = await searchParams;
  const { actor, person } = await guardedActor();
  const presented = await loadPresentedActionResult({
    requestPath: "/app/admin/access",
    resultId: params.result,
    actorPersonId: person.id,
  });
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/admin/access">
        <h1>Access</h1>
        <p className="empty">No organisation assignment is available.</p>
      </AppShell>
    );
  }

  const actorSnap = runtime.service.resolveActor(person.id);
  const canManage = authorize({
    actor: actorSnap,
    permission: "assignment.manage",
    scope: { organisationId: organisation.id },
  }).allow;

  if (!canManage) {
    try {
      runtime.service.getAccessAdministration(actor, organisation.id);
    } catch (error) {
      if (!isAccessDenied(error)) throw error;
    }
    return <AccessDenied person={person} organisationName={organisation.displayName} />;
  }

  try {
    const administration = runtime.service.getAccessAdministration(actor, organisation.id);
    const labels = buildGovernanceLabelIndex(runtime.service, actor, organisation.id);
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/admin/access">
        <AtelierPageHeader
          eyebrow="Governance"
          title="Access administration"
          lede="Technical administration is not CEO or Event Director business authority."
        />
        <ActionResultBanner presented={presented} />
        <ul className="atelier-ledger">
          {administration.assignments.map((item) => {
            const presented = presentAssignment(item, labels, new Date().toISOString());
            return (
              <li key={item.id} data-testid="access-assignment">
                <p>
                  <strong>{presented.personLabel}</strong> · {presented.roleLabel} · {presented.scopeLabel} · {presented.statusLabel}
                </p>
                <CanonicalId id={item.id} label="Assignment ID" />
              </li>
            );
          })}
        </ul>
        <AssignmentForm people={administration.people} events={administration.events} error={params.error} />
      </AppShell>
    );
  } catch (error) {
    if (isAccessDenied(error)) {
      return <AccessDenied person={person} organisationName={organisation.displayName} />;
    }
    throw error;
  }
}
