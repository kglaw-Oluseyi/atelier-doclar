import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { ProtectionReleaseEvidence } from "../../../../components/protection-release-evidence";
import { applicationIdentity, deployedSha, productionAuthorised } from "../../../../server/config";
import { guardedActor } from "../../../../server/guard";
import { getRuntime, persistenceLabel } from "../../../../server/runtime";

/**
 * Intentionally visible to authenticated assigned staff.
 * This is a minimum-necessary readiness projection: persistence label, deployed SHA,
 * productionAuthorised, and the non-secret Railway project name. It is not gated on
 * `system.health.view`, which remains the privileged health/export permission.
 * DATABASE_URL, credentials, tokens and secret environment values must never appear here.
 */
export default async function SystemPage() {
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  const evaluation = organisation ? runtime.service.getS05BReadiness(organisation.id) : undefined;
  const s05a = organisation ? runtime.service.getS05AReadiness(organisation.id) : undefined;
  const identity = applicationIdentity();
  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/admin/system">
      <AtelierPageHeader
        eyebrow="Governance"
        title="System health"
        lede="Release and dependency status without secrets."
      />
      <ul className="atelier-ledger" data-testid="system-health">
        <li>Service: Event OS foundation</li>
        <li>Persistence: {persistenceLabel()}</li>
        <li data-testid="system-deployed-sha">Deployed SHA: {deployedSha()}</li>
        <li data-testid="system-application-sha">Application SHA: {identity.applicationSha}</li>
        <li data-testid="system-deployment-source-sha">
          Deployment source SHA: {identity.deploymentSourceSha ?? "unset (upload/archive deploy)"}
        </li>
        <li data-testid="system-documentation-head">
          Documentation HEAD: {identity.documentationHead ?? "not declared on this deployment"}
        </li>
        <li>Build identity source: {identity.buildIdentitySource}</li>
        <li>Production authorised: {String(productionAuthorised())}</li>
        <li>Production IdP: not selected</li>
        <li>Railway project: atelier-doclar (deploy-by-default; production operations gated)</li>
      </ul>
      {evaluation ? (
        <ProtectionReleaseEvidence
          deployedSha={deployedSha()}
          persistence={persistenceLabel()}
          migrationStatus={runtime.migrationStatus}
          productionAuthorised={productionAuthorised()}
          s05aStatus={s05a?.evaluationStatus}
          s05aEdition={s05a?.evaluationCorpusEdition}
          evaluation={evaluation}
        />
      ) : null}
    </AppShell>
  );
}
