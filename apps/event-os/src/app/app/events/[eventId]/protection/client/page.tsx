import { AtelierPageHeader } from "../../../../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../../../../components/atelier-operational-state";
import { AppShell } from "../../../../../../components/shell";
import { ActionResultBanner } from "../../../../../../components/action-result-banner";
import { IdempotencyField } from "../../../../../../components/atelier-pending-submit";
import { ProtectionMutationForm } from "../../../../../../components/protection-mutation-form";
import { loadPresentedActionResult } from "../../../../../../server/action-flash";
import { guardedActor } from "../../../../../../server/guard";
import { getRuntime } from "../../../../../../server/runtime";
import { protectionPermissions } from "../../../../../../server/protection-scope";
import { operationalStateFromCode } from "../../../../../../server/operational-state";
import { recordClientDossierMessageAction } from "../../../../../../server/risk-actions";

export default async function ClientProtectionDossierPage({
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
  if (!permissions.dossierView) {
    return (
      <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This assignment cannot open the published client dossier.")} />
      </AppShell>
    );
  }
  const dossier = await Promise.resolve(runtime.service.getPublishedClientDossier(actor, organisation.id, event.id));
  const assignmentId = runtime.service.resolveActor(person.id).assignments.find((item) => item.eventId === event.id || !item.eventId)?.id ?? "";
  const presented = await loadPresentedActionResult({
    requestPath: `/app/events/${event.id}/protection/client`,
    resultId: typeof query.result === "string" ? query.result : undefined,
    actorPersonId: person.id,
    eventId: event.id,
    organisationId: organisation.id,
  });
  return (
    <AppShell person={person} organisationName={organisation.displayName} eventName={event.name} eventId={event.id} current="/app/events">
      <AtelierPageHeader
        eyebrow="Client dossier"
        title="Published protection dossier"
        lede="This is the current published permission-safe edition. It does not edit staff protection records."
      />
      <ActionResultBanner presented={presented} />
      <section className="atelier-panel" data-testid="client-protection-dossier">
        {dossier.published ? (
          <>
            <p>Publication {dossier.publicationNumber} · {dossier.publishedAt}</p>
            <p>{dossier.limitations}</p>
            <p>{dossier.phrases.evidenceReviewed}</p>
            <p>{dossier.phrases.knownGaps}</p>
            <p>{dossier.phrases.contingencyPrepared}</p>
            <p>{dossier.phrases.confirmationRequired}</p>
            <ul>
              {dossier.messages.map((item) => (
                <li key={item.id}>
                  {item.kind}: {item.body}
                </li>
              ))}
            </ul>
            <ProtectionMutationForm action={recordClientDossierMessageAction} className="atelier-form protection-form">
              <input type="hidden" name="organisationId" value={organisation.id} />
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <input type="hidden" name="expectedVersion" value="0" />
              <IdempotencyField />
              <label>
                Response
                <select name="kind" required>
                  <option value="">Select</option>
                  <option value="ACKNOWLEDGE">Acknowledge</option>
                  <option value="QUESTION">Ask a question</option>
                </select>
              </label>
              <label>
                Message
                <textarea name="body" required rows={3} />
              </label>
              <button type="submit" className="button">
                Send client response
              </button>
            </ProtectionMutationForm>
          </>
        ) : (
          <p>No published client dossier is available yet.</p>
        )}
      </section>
    </AppShell>
  );
}
