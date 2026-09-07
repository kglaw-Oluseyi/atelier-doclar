import type { EventLanguageWorkspace } from "@maison-doclar/shared-platform";
import {
  assembleRecipientContentAction,
  createCulturalSourceTextAction,
  createDependentEditionAction,
  decideCulturalTextAction,
  decideTranslationAction,
  recordLanguagePreferenceAction,
} from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function LanguageWorkspace({
  workspace,
  mutationLocked,
}: {
  workspace: EventLanguageWorkspace;
  mutationLocked: boolean;
}) {
  const primary = workspace.editions.find((item) => item.kind === "PRIMARY" && item.status === "APPROVED");
  return (
    <div className="language-atelier" data-testid="language-workspace">
      <p className="lede" data-testid="language-convention">
        Event English convention {workspace.englishConvention}. Language is named, never shown as a flag.
      </p>
      <section className="atelier-panel" id="language-preferences" data-testid="language-preferences">
        <h2>Language preferences</h2>
        <p>Preference is explicit, event-scoped and can be unknown. Names and households never invent a language.</p>
        <ul className="language-preference-list">
          {workspace.preferences.map((item) => (
            <li key={item.guestId} className="language-preference-card">
              <p>
                <strong>{item.displayName}</strong>
              </p>
              <p>
                {item.unknown ? (
                  <span className="md-status" data-tone="warn">
                    No preference supplied
                  </span>
                ) : (
                  <span className="md-status" data-tone="brass" lang={item.preferredLanguageTag}>
                    {item.preferredLanguageName} ({item.preferredLanguageTag})
                  </span>
                )}{" "}
                <span className="eyebrow">{item.source.replaceAll("_", " ")}</span>
              </p>
              {workspace.capabilities.canManagePreference ? (
                <form action={recordLanguagePreferenceAction} className="language-inline-form">
                  <input type="hidden" name="eventId" value={workspace.eventId} />
                  <input type="hidden" name="guestId" value={item.guestId} />
                  <input type="hidden" name="expectedVersion" value={item.version} />
                  <IdempotencyField />
                  <label>
                    Explicit preference
                    <select name="preferredLanguageTag" defaultValue={item.preferredLanguageTag ?? ""}>
                      <option value="">No preference supplied</option>
                      {workspace.register.map((language) => (
                        <option key={language.tag} value={language.tag}>
                          {language.displayName} ({language.tag})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reason
                    <input name="reason" required maxLength={400} defaultValue="Correct explicit preference" />
                  </label>
                  <PendingSubmit locked={mutationLocked}>Save preference</PendingSubmit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="atelier-panel" id="language-cultural" data-testid="language-cultural">
        <h2>Cultural source library</h2>
        <p>Cultural text keeps provenance. Synthetic fixtures stay unvalidated and are never specialist-approved by workflow alone.</p>
        {workspace.culturalTexts.map((item) => (
          <article key={item.id} className="language-source-card" lang={item.htmlLang}>
            <p className="eyebrow">
              {item.languageName} · {item.status}
              {item.syntheticUnvalidated ? " · Synthetic, unvalidated" : ""}
            </p>
            <p className="language-source-text">{item.exactText}</p>
            <p>{item.purpose}</p>
            {workspace.capabilities.canApproveCultural && item.status !== "APPROVED" ? (
              <form action={decideCulturalTextAction}>
                <input type="hidden" name="eventId" value={workspace.eventId} />
                <input type="hidden" name="culturalSourceTextId" value={item.id} />
                <input type="hidden" name="expectedVersion" value={item.version} />
                <input type="hidden" name="decision" value="APPROVED" />
                <IdempotencyField />
                <PendingSubmit locked={mutationLocked}>Approve cultural text</PendingSubmit>
              </form>
            ) : null}
          </article>
        ))}
        {workspace.capabilities.canCreateCultural ? (
          <form action={createCulturalSourceTextAction} className="language-editor">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <IdempotencyField />
            <label>
              Exact cultural text
              <textarea name="exactText" required lang="yo" rows={3} />
            </label>
            <label>
              Language
              <select name="languageTag" defaultValue="yo">
                {workspace.register.map((language) => (
                  <option key={language.tag} value={language.tag}>
                    {language.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Purpose
              <input name="purpose" required defaultValue="Greeting" />
            </label>
            <label>
              Cultural meaning
              <textarea name="culturalMeaning" required rows={2} />
            </label>
            <label>
              Usage note
              <textarea name="usageNote" required rows={2} defaultValue="Draft only. Human review required." />
            </label>
            <label>
              Provenance
              <input name="provenance" required defaultValue="Staff-authored draft" />
            </label>
            <PendingSubmit locked={mutationLocked}>Add cultural source</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section className="atelier-panel" id="language-translations" data-testid="language-translations">
        <h2>Translation workspace</h2>
        <p>Source stays first. Target sits beside it on wide screens and beneath it on a narrow one.</p>
        {workspace.editions.map((edition) => {
          const source = workspace.editions.find((item) => item.id === primary?.id);
          return (
            <article key={edition.id} className="language-compare" data-testid={`edition-${edition.kind}-${edition.languageTag}`}>
              <div className="language-compare-source" lang={source?.htmlLang ?? "en-GB"}>
                <p className="eyebrow">Source · {source?.languageName ?? "English (United Kingdom)"}</p>
                <p>{source?.blocks[0]?.exactText ?? "Primary source is being prepared."}</p>
              </div>
              <div className="language-compare-target" lang={edition.htmlLang}>
                <p className="eyebrow">
                  {edition.languageName} · {edition.kind} · {edition.status}
                  {edition.coverageStatus === "PARTIAL" ? " · Partial" : ""}
                  {edition.coverageStatus === "STALE" ? " · Stale" : ""}
                  {edition.syntheticUnvalidated ? " · Synthetic" : ""}
                </p>
                {edition.blocks.map((block) => (
                  <p key={block.id} lang={block.htmlLang}>
                    {block.exactText}
                  </p>
                ))}
                {workspace.capabilities.canApproveTranslation && edition.status === "DRAFT" && edition.kind !== "PRIMARY" ? (
                  <form action={decideTranslationAction}>
                    <input type="hidden" name="eventId" value={workspace.eventId} />
                    <input type="hidden" name="editionId" value={edition.id} />
                    <input type="hidden" name="expectedVersion" value={edition.version} />
                    <input type="hidden" name="decision" value="APPROVED" />
                    <IdempotencyField />
                    <PendingSubmit locked={mutationLocked}>Approve translation</PendingSubmit>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
        {workspace.capabilities.canCreateTranslation && primary?.blocks[0] ? (
          <form action={createDependentEditionAction} className="language-editor">
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="workId" value={primary.workId} />
            <input type="hidden" name="sourceEditionId" value={primary.id} />
            <input type="hidden" name="sourceBlockId" value={primary.blocks[0].id} />
            <IdempotencyField />
            <label>
              Target language
              <select name="targetLanguageTag" defaultValue="ha">
                {workspace.register
                  .filter((item) => item.tag !== "en-GB")
                  .map((language) => (
                    <option key={language.tag} value={language.tag}>
                      {language.displayName}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Pattern
              <select name="kind" defaultValue="PARTIAL">
                <option value="PARTIAL">Translate selected text</option>
                <option value="SUMMARY">Add translated summary</option>
                <option value="BILINGUAL">Create bilingual version</option>
                <option value="COMPLETE">Translate entire message</option>
              </select>
            </label>
            <label>
              Translation
              <textarea name="exactText" required rows={4} />
            </label>
            <PendingSubmit locked={mutationLocked}>Save translation draft</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section className="atelier-panel" id="language-coverage" data-testid="language-coverage">
        <h2>Coverage</h2>
        {workspace.coverage.map((item) => (
          <p key={item.workId}>
            <strong>{item.workTitle}</strong> — {item.coverageStatus.replaceAll("_", " ")}. {item.explanation} Unresolved
            preferences: {item.unresolvedPreferenceCount}.
          </p>
        ))}
      </section>

      <section className="atelier-panel" id="language-assembly" data-testid="language-assembly">
        <h2>Recipient assembly preview</h2>
        <p>Ready for communications review. Not dispatched. Provider not invoked.</p>
        {workspace.assemblies.map((item) => (
          <article key={item.id} className="language-assembly-card" data-testid="assembly-preview">
            <p>
              {item.displayName} · requested {item.requestedLanguageTag ?? "unknown"} · selected {item.selectedLanguageName}
            </p>
            <p className="md-status" data-tone="ok">
              Ready for governed communications review · not dispatched
            </p>
            {item.units.map((unit) => (
              <p key={unit.selectedBlockId} lang={unit.selectedLanguageTag}>
                {unit.renderedText}
                {unit.fallbackUsed ? <span className="language-fallback"> Fallback used ({unit.fallbackReason})</span> : null}
              </p>
            ))}
          </article>
        ))}
        {workspace.capabilities.canPreviewAssembly && workspace.works[0] && workspace.preferences[0] ? (
          <form action={assembleRecipientContentAction}>
            <input type="hidden" name="eventId" value={workspace.eventId} />
            <input type="hidden" name="workId" value={workspace.works[0].id} />
            <label>
              Guest
              <select name="guestId" defaultValue={workspace.preferences[0].guestId}>
                {workspace.preferences.map((item) => (
                  <option key={item.guestId} value={item.guestId}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
            <IdempotencyField />
            <PendingSubmit locked={mutationLocked}>Assemble preview</PendingSubmit>
          </form>
        ) : null}
      </section>

      <section className="atelier-panel" id="language-glossary" data-testid="language-glossary">
        <h2>Glossary</h2>
        {workspace.glossary.map((item) => (
          <p key={item.id} lang={item.languageTag}>
            Search may find unmarked text. Display remains {item.approvedDisplayForm}. Policy: {item.policy}.
          </p>
        ))}
      </section>

      {workspace.capabilities.canAudit ? (
        <section className="atelier-panel" id="language-audit" data-testid="language-audit">
          <h2>Preference history</h2>
          {workspace.history.map((item) => (
            <p key={item.id}>
              {item.previousUnknown ? "unknown" : "set"} → {item.nextUnknown ? "unknown" : item.nextLanguageTag}. {item.reason}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}
