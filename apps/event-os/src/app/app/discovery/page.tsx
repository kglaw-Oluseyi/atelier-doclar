import Link from "next/link";
import { ActionResultBanner } from "../../../components/action-result-banner";
import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "../../../components/atelier-pending-submit";
import { AppShell } from "../../../components/shell";
import { loadPresentedActionResult } from "../../../server/action-flash";
import { createDiscoveryOpportunityAction, refreshDiscoveryRecordAction } from "../../../server/actions";
import { discoveryPermissions, resolveDiscoveryOrganisation } from "../../../server/discovery-scope";
import { guardedActor } from "../../../server/guard";
import { getRuntime } from "../../../server/runtime";
import { operationalStateFromCode } from "../../../server/operational-state";

export default async function DiscoveryIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          state={operationalStateFromCode("FORBIDDEN", "This assignment cannot view discovery enquiries.")}
        />
      </AppShell>
    );
  }
  const runtime = getRuntime();
  const opportunities = runtime.service.listEngagementOpportunities(actor, organisation.id);
  const engagements = runtime.service.listDiscoveryEngagements(actor, organisation.id);
  const presented = await loadPresentedActionResult({
    requestPath: "/app/discovery",
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
  });
  return (
    <AppShell person={person} organisationName={organisation.displayName} current="/app/discovery">
      <AtelierPageHeader
        eyebrow={`Discovery · ${organisation.displayName}`}
        title="Discovery"
        lede="Open an enquiry and keep the first conversation in one place. This is not an Event, not a Client record, and not the later Executive Event Command dashboard."
      />
      <ActionResultBanner
        presented={presented}
        reloadAction={refreshDiscoveryRecordAction}
        reloadFields={{ path: "/app/discovery" }}
      />
      {permissions.create ? (
        <form action={createDiscoveryOpportunityAction} className="form programme-form" data-testid="discovery-create-form">
          <IdempotencyField />
          <input type="hidden" name="organisationId" value={organisation.id} />
          <p className="lede">Next action: name the enquiry so the family is not asked to repeat themselves later.</p>
          <label>
            Enquiry name
            <input name="displayReference" required maxLength={160} placeholder="Adéwálé family enquiry" />
          </label>
          <label>
            How it arrived
            <select name="enquiryChannel" defaultValue="DIRECT">
              <option value="DIRECT">Direct</option>
              <option value="REFERRAL">Referral</option>
              <option value="PARTNER">Partner</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label>
            Known event type
            <select name="knownEventType" defaultValue="">
              <option value="">Not yet known</option>
              <option value="WEDDING">Wedding</option>
              <option value="CORPORATE">Corporate</option>
              <option value="PRIVATE_DINNER">Private dinner</option>
              <option value="FUNERAL_MEMORIAL">Funeral or memorial</option>
              <option value="CHIEFTAINCY">Chieftaincy</option>
              <option value="DESTINATION">Destination</option>
              <option value="GENERIC">Generic</option>
            </select>
          </label>
          <label>
            Reason
            <input name="reason" required maxLength={400} defaultValue="Open a discovery enquiry" />
          </label>
          <PendingSubmit locked={presented.mutationLocked}>Open enquiry and start discovery</PendingSubmit>
        </form>
      ) : (
        <p className="lede" data-testid="discovery-create-blocked">
          Opening an enquiry is blocked for this assignment. Viewing existing conversations remains available.
        </p>
      )}
      {engagements.length === 0 && opportunities.length === 0 ? (
        <p className="empty" data-testid="discovery-empty">
          No discovery conversations yet. Open an enquiry when you are ready.
        </p>
      ) : (
        <ul className="atelier-queue" data-testid="discovery-list">
          {engagements.map((engagement) => {
            const opportunity = opportunities.find((item) => item.id === engagement.opportunityId);
            return (
              <li key={engagement.id} className="discovery-card">
                <p>
                  <Link href={`/app/discovery/${engagement.id}`}>{engagement.displayReference}</Link>
                </p>
                <p>
                  <span className="md-status">{engagement.status}</span>{" "}
                  {opportunity ? <span className="md-status" data-tone="brass">{opportunity.stage}</span> : null}{" "}
                  {engagement.eventConceptLabel ?? opportunity?.knownEventType ?? "Event type not yet known"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
