import Link from "next/link";
import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../../components/shell";
import { ActionResultBanner } from "../../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../../components/protection-mutation-form";
import { loadPresentedActionResult, readIssuedAccessFlash } from "../../../../../../server/action-flash";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";
import { protectionPermissions } from "../../../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../../../server/operational-state";
import {
  assembleDossierAction,
  approveDossierAction,
  exportDossierAction,
  issueDossierAccessAction,
  publishDossierAction,
  revokeDossierAccessAction,
  submitDossierAction,
} from "../../../../../../server/risk-actions";
import { clientDossierCopy } from "@maison-doclar/shared-platform";

function Envelope({ fields }: { fields: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
    </>
  );
}

export default async function FocusedEventDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const { actor, person } = await guardedActor();
  const runtime = getRuntime();
  const organisations = runtime.service.listOrganisations(actor);
  const events = organisations.flatMap((item) => runtime.service.listEvents(actor, item.id));
  const event = events.find((item) => item.id === eventId);
  const organisation = organisations.find((item) => item.id === event?.organisationId);
  if (!organisation || !event) {
    return (
      <AppShell person={person} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("NOT_FOUND", "The requested event is not available in this assignment.")} />
      </AppShell>
    );
  }
  const permissions = protectionPermissions(person, organisation.id, event.id);
  if (!permissions.eventView && !permissions.dossierView) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open the focused dossier review.")} />
      </AppShell>
    );
  }
  const workspace = await Promise.resolve(runtime.service.getEventDossierReview(actor, organisation.id, event.id));
  const assignmentId = runtime.service.resolveActor(person.id).assignments.find((item) => item.eventId === event.id || !item.eventId)?.id ?? "";
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${event.id}/protection/dossier`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    organisationId: organisation.id,
    eventId: event.id,
  });
  const copy = clientDossierCopy();
  const commandEdition = workspace.workingEdition ?? workspace.workingDossier ?? workspace.dossiers.at(-1);
  const currentDossier = workspace.workingDossier ?? commandEdition;
  const commandVersion =
    commandEdition && "version" in commandEdition && typeof commandEdition.version === "number" ? commandEdition.version : 1;
  const commandId = commandEdition?.id ?? "";
  const commandHash = commandEdition && "contentHash" in commandEdition ? String(commandEdition.contentHash ?? "") : "";
  const currentPublication = workspace.publications.find((item) => item.current || item.status === "CURRENT");
  const issuedAccess = await readIssuedAccessFlash();
  const envelopeFields = { organisationId: organisation.id, eventId: event.id, assignmentId };
  const createFields = { ...envelopeFields, expectedVersion: 0 };
  return (
    <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow="Focused dossier review"
        title={`${event.name} client assurance dossier`}
        lede="Assemble, submit, approve and publish one edition here. This surface does not load the full event protection matrix."
      />
      <ActionResultBanner presented={presented} />
      <section className="atelier-panel" data-testid="focused-dossier-workspace">
        <p>
          {copy.phrases.evidenceReviewed} {copy.phrases.knownGaps} {copy.phrases.contingencyPrepared} {copy.phrases.confirmationRequired}
        </p>
        <p>
          <Link href={`/app/events/${event.id}/protection`}>Return to event protection</Link>
          {" · "}
          <Link href={`/app/events/${event.id}/protection/client`}>Preview permission-safe client dossier</Link>
        </p>
        {currentPublication ? (
          <p data-testid="focused-dossier-publication">
            Last-known-good publication {currentPublication.publicationNumber} · {currentPublication.id} · hash{" "}
            {(currentPublication.approvedHash ?? currentPublication.contentHash ?? "").slice(0, 12)} · not dispatched.
          </p>
        ) : (
          <p data-testid="focused-dossier-publication">No current publication is recorded.</p>
        )}
        {permissions.dossierManageClientAccess ? (
          <ProtectionMutationForm action={issueDossierAccessAction}>
            <Envelope fields={createFields} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Issue client dossier access
            </button>
          </ProtectionMutationForm>
        ) : null}
        <p>Issuing access creates access. It does not send it.</p>
        {issuedAccess?.kind === "dossier" ? (
          <p data-testid="issued-dossier-token">
            One-time client path /client-dossier/{issuedAccess.token}
          </p>
        ) : null}
        {(workspace.accessGrants ?? []).filter((item) => item.status === "ACTIVE").map((grant) => (
          <p key={grant.id}>
            Active grant expires {grant.expiresAt}
            {permissions.dossierManageClientAccess ? (
              <ProtectionMutationForm action={revokeDossierAccessAction}>
                <Envelope fields={{ ...envelopeFields, expectedVersion: grant.version, grantId: grant.id }} />
                <IdempotencyField />
                <button type="submit" className="button secondary">
                  Revoke client access
                </button>
              </ProtectionMutationForm>
            ) : null}
          </p>
        ))}
        {permissions.dossierAssemble ? (
          <ProtectionMutationForm action={assembleDossierAction} testId="protection-assemble-dossier">
            <Envelope fields={createFields} />
            <input type="hidden" name="reason" value="S063 uniquely labelled dossier edition" />
            <IdempotencyField />
            <button type="submit" className="button">
              Assemble dossier edition
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierSubmit && currentDossier.status === "DRAFT" ? (
          <ProtectionMutationForm action={submitDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: commandVersion, dossierId: commandId || currentDossier.id }} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Submit dossier
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierApprove && currentDossier.status === "SUBMITTED" ? (
          <ProtectionMutationForm action={approveDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: commandVersion, dossierId: commandId || currentDossier.id }} />
            <IdempotencyField />
            <button type="submit" className="button">
              Approve dossier
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierPublish && currentDossier.status === "APPROVED" ? (
          <ProtectionMutationForm action={publishDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: commandVersion, dossierId: commandId || currentDossier.id }} />
            <IdempotencyField />
            <input type="hidden" name="approvedHash" value={commandHash || currentDossier.contentHash || ""} />
            <button type="submit" className="button secondary">
              Publish dossier without sending
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier && permissions.dossierExport && (currentDossier.status === "APPROVED" || currentDossier.status === "PUBLISHED") && workspace.publications.some((item) => item.current || item.status === "CURRENT") ? (
          <ProtectionMutationForm action={exportDossierAction}>
            <Envelope fields={{ ...envelopeFields, expectedVersion: commandVersion, dossierId: commandId || currentDossier.id }} />
            <IdempotencyField />
            <button type="submit" className="button secondary">
              Generate permission-safe export
            </button>
          </ProtectionMutationForm>
        ) : null}
        {currentDossier ? (
          <p data-testid="focused-dossier-status">
            Status {currentDossier.status} · hash {currentDossier.contentHash?.slice(0, 12)} · not dispatched.
          </p>
        ) : (
          <p data-testid="focused-dossier-status">No working dossier edition is current.</p>
        )}
      </section>
    </AppShell>
  );
}
