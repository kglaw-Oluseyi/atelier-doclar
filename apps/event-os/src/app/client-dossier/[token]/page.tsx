import { AtelierPageHeader } from "../../../components/atelier-page-header";
import { AtelierOperationalState } from "../../../components/atelier-operational-state";
import { getRuntime } from "../../../server/runtime";
import { operationalStateFromCode } from "../../../server/operational-state";
import { recordClientDossierTokenMessageAction } from "../../../server/dossier-client-actions";

export default async function ClientDossierTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const runtime = getRuntime();
  try {
    const view = runtime.service.getClientDossierByToken(token, process.env.EVENT_OS_TEST_NOW);
    return (
      <main className="atelier-shell" data-testid="client-dossier-session">
        <AtelierPageHeader
          eyebrow="Client dossier"
          title="Published protection dossier"
          lede="This session is separate from staff. It shows the current published permission-safe edition only."
        />
        <section className="atelier-panel" data-testid="client-protection-dossier">
          {view.dossier.published ? (
            <>
              <p>Publication {view.dossier.publicationNumber} · {view.dossier.publishedAt}</p>
              <p>{view.dossier.limitations}</p>
              <p>{view.dossier.phrases.evidenceReviewed}</p>
              <p>{view.dossier.phrases.knownGaps}</p>
              <p>{view.dossier.phrases.contingencyPrepared}</p>
              <p>{view.dossier.phrases.confirmationRequired}</p>
              <ul>
                {view.dossier.messages.map((item) => (
                  <li key={item.id}>
                    {item.kind}: {item.body}
                  </li>
                ))}
              </ul>
              <form action={recordClientDossierTokenMessageAction} className="atelier-form">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="idempotencyKey" value={`client-${crypto.randomUUID()}`} />
                <label>
                  Kind
                  <select name="kind" required>
                    <option value="ACKNOWLEDGE">Acknowledge</option>
                    <option value="QUESTION">Question</option>
                  </select>
                </label>
                <label>
                  Message
                  <textarea name="body" required rows={3} />
                </label>
                <button type="submit" className="button">
                  Record client note
                </button>
              </form>
            </>
          ) : (
            <p>No published client dossier is available.</p>
          )}
        </section>
      </main>
    );
  } catch {
    return (
      <main className="atelier-shell" data-testid="client-dossier-denied">
        <AtelierOperationalState state={operationalStateFromCode("FORBIDDEN", "This client dossier access is not available.")} />
      </main>
    );
  }
}
