import { PlatformError } from "@maison-doclar/shared-platform";
import { ActionResultBanner } from "../../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../components/atelier-operational-state";
import { AtelierSectionTabs } from "../../../../components/atelier-section-tabs";
import { DiscoveryWorkspaceView } from "../../../../components/discovery-workspace";
import { IntelligenceWorkspaceView } from "../../../../components/intelligence-workspace";
import { AppShell } from "../../../../components/shell";
import { loadPresentedActionResult } from "../../../../server/action-flash";
import { refreshDiscoveryRecordAction } from "../../../../server/actions";
import { discoveryPermissions, resolveDiscoveryOrganisation } from "../../../../server/discovery-scope";
import { guardedActor } from "../../../../server/guard";
import { getRuntime } from "../../../../server/runtime";
import { operationalStateFromCode } from "../../../../server/operational-state";

export default async function DiscoveryWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ engagementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { engagementId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const organisation = resolveDiscoveryOrganisation(actor);
  if (!organisation) {
    return (
      <AppShell person={person} current="/app/discovery">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "No organisation assignment is available.")} />
      </AppShell>
    );
  }
  const permissions = discoveryPermissions(person, organisation.id);
  if (!permissions.view) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/discovery">
        <AtelierOperationalState
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view discovery conversations.")}
        />
      </AppShell>
    );
  }
  let workspace;
  let intelligence;
  try {
    workspace = getRuntime().service.getDiscoveryWorkspace(actor, organisation.id, engagementId);
    intelligence = getRuntime().service.getIntelligenceWorkspace(actor, organisation.id, engagementId);
  } catch (error) {
    const code = error instanceof PlatformError ? error.code : "INTERNAL_ERROR";
    const message = error instanceof PlatformError ? error.publicMessage : "Discovery workspace could not be loaded.";
    return (
      <AppShell person={person} organisationName={organisation.displayName} current="/app/discovery">
        <AtelierOperationalState state={operationalStateFromCode(code, message)} />
      </AppShell>
    );
  }
  const presented = await loadPresentedActionResult({
    requestPath: `/app/discovery/${engagementId}`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
  });
  const clientPath = typeof query.clientPath === "string" && /^\/discover\/[0-9a-f-]{36}$/i.test(query.clientPath) ? query.clientPath : undefined;
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/discovery">
      <AtelierPageHeader
        eyebrow={`Discovery · ${workspace.opportunity.stage}`}
        title={workspace.engagement.displayReference}
        lede={`${workspace.nextAction}. Source notes, AI proposals and confirmed facts stay distinct. Nothing here creates an Event.`}
      />
      <AtelierSectionTabs
        label="Discovery sections"
        items={[
          { href: "#discovery-consent", label: "Consent" },
          { href: "#discovery-session", label: "Session" },
          { href: "#discovery-evidence", label: "Evidence" },
          { href: "#discovery-coverage", label: "Coverage" },
          { href: "#discovery-assertions", label: "Review" },
          { href: "#brief-review", label: "Brief" },
          { href: "#budget-studio", label: "Budget" },
          { href: "#roadmap-studio", label: "Roadmap" },
          { href: "#change-impact", label: "Change" },
        ]}
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshDiscoveryRecordAction}
        reloadFields={{ path: `/app/discovery/${engagementId}` }}
      />
      {clientPath ? (
        <p>
          <a href={clientPath} data-testid="client-conversation-link">
            Open the one-time client conversation
          </a>
        </p>
      ) : null}
      <DiscoveryWorkspaceView workspace={workspace} mutationLocked={presented.mutationLocked} />
      <IntelligenceWorkspaceView
        organisationId={organisation.id}
        engagementId={engagementId}
        engagementVersion={workspace.engagement.version}
        publishedHash={intelligence.editions.find((item) => item.status === "PUBLISHED" && item.current)?.contentHash}
        intelligence={intelligence}
        mutationLocked={presented.mutationLocked}
        canAuthorBrief={permissions.briefAuthor}
        canSubmitBrief={permissions.briefSubmit}
        canDecideBrief={permissions.briefDecide}
        canPublishBrief={permissions.briefPublish}
        canConvert={permissions.convert}
        canCalculateBudget={permissions.budgetCalculate}
        canDecideBudget={permissions.budgetDecide}
        canAuthorRoadmap={permissions.roadmapAuthor}
        canTriageChange={permissions.changeTriage}
        canDecideChange={permissions.changeDecide}
        canManageSource={permissions.manageSource}
      />
    </AppShell>
  );
}
