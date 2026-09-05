import { AppShell } from "../../../../components/shell";
import { productionAuthorised } from "../../../../server/config";
import { guardedActor } from "../../../../server/guard";
import { getRuntime, persistenceLabel } from "../../../../server/runtime";

export default async function SystemPage() {
  const { actor, person } = await guardedActor();
  const organisation = getRuntime().service.listOrganisations(actor)[0];
  return (
    <AppShell person={person} organisationName={organisation?.displayName} current="/app/admin/system">
      <div className="page-header">
        <h1>System health</h1>
        <p className="lede">Release and dependency status without secrets.</p>
      </div>
      <ul>
        <li>Service: Event OS foundation</li>
        <li>Persistence: {persistenceLabel()}</li>
        <li>Production authorised: {String(productionAuthorised())}</li>
        <li>Production IdP: not selected</li>
        <li>Railway mutation: not authorised</li>
      </ul>
    </AppShell>
  );
}
