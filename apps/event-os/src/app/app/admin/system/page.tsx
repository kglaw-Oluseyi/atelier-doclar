import { AtelierPageHeader } from "../../../../components/atelier-page-header";
import { AppShell } from "../../../../components/shell";
import { productionAuthorised } from "../../../../server/config";
import { guardedActor } from "../../../../server/guard";
import { getRuntime, persistenceLabel } from "../../../../server/runtime";

export default async function SystemPage() {
  const { actor, person } = await guardedActor();
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/admin/system">
      <AtelierPageHeader
        eyebrow="Governance"
        title="System health"
        lede="Release and dependency status without secrets."
      />
      <ul className="atelier-ledger">
        <li>Service: Event OS foundation</li>
        <li>Persistence: {persistenceLabel()}</li>
        <li>Production authorised: {String(productionAuthorised())}</li>
        <li>Production IdP: not selected</li>
        <li>Railway project: atelier-doclar (deploy-by-default; production operations gated)</li>
      </ul>
    </AppShell>
  );
}
