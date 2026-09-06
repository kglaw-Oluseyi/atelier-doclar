import {
  HONORIFICS,
  type GuestAddressingWorkspace,
} from "@maison-doclar/shared-platform";
import {
  createResponsibleAdultLinkAction,
  nominateCompanionAction,
  reconcileCompanionNamesAction,
  updateGuestAddressingAction,
} from "../server/actions";

const AGE_BANDS = ["INFANT", "EARLY_CHILDHOOD", "CHILD", "PRE_TEEN", "TEEN", "ADULT", "UNKNOWN"] as const;

export function GuestAddressingWorkspace({
  workspace,
  eventId,
  error,
}: {
  workspace: GuestAddressingWorkspace;
  eventId: string;
  error?: string;
}) {
  const { guest, capabilities } = workspace;
  return (
    <section className="addressing-workspace" aria-labelledby="addressing-heading">
      <h2 id="addressing-heading">Addressing</h2>
      <p className="lede">
        Titles are stored only when explicitly supplied. The system never infers Mr, Mrs, Dr, or any other honorific
        from a name.
      </p>
      <dl className="meta-list addressing-preview">
        <div>
          <dt>Formal salutation</dt>
          <dd data-testid="formal-salutation">{guest.formalSalutation.text}</dd>
        </div>
        <div>
          <dt>Familiar name</dt>
          <dd data-testid="familiar-name">{guest.familiarName.text}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className="md-status" data-tone={guest.addressingStatus === "UNVERIFIED" ? "brass" : "ok"}>
              {(guest.addressingStatus ?? "Not supplied").replaceAll("_", " ")}
            </span>
          </dd>
        </div>
        {guest.honorific ? (
          <div>
            <dt>Honorific</dt>
            <dd>{guest.honorific}</dd>
          </div>
        ) : (
          <div>
            <dt>Honorific</dt>
            <dd>Blank — safe fallback, no inferred title</dd>
          </div>
        )}
        {guest.traditionalTitle ? (
          <div>
            <dt>Traditional title</dt>
            <dd>{guest.traditionalTitle}</dd>
          </div>
        ) : null}
        {guest.pronunciationNote ? (
          <div>
            <dt>Pronunciation note</dt>
            <dd>{guest.pronunciationNote}</dd>
          </div>
        ) : null}
      </dl>
      {error ? (
        <p
          className="alert"
          data-tone="danger"
          data-kind={
            error.includes("changed while") || error.includes("Reload before") || error.includes("expected version")
              ? "conflict"
              : "validation"
          }
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {capabilities.canManageAddressing ? (
        <form className="form" action={updateGuestAddressingAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={guest.guestId} />
          <input type="hidden" name="expectedVersion" value={guest.version} />
          <fieldset>
            <legend>Structured addressing</legend>
            <div className="atelier-field-grid">
            <label>
              Honorific
              <select name="honorific" defaultValue={guest.honorific ?? ""}>
                <option value="">Blank — do not infer</option>
                {HONORIFICS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Professional title
              <input name="professionalTitle" defaultValue={guest.professionalTitle ?? ""} />
            </label>
            {capabilities.canViewProtocolNote ? (
              <label>
                Traditional title
                <input name="traditionalTitle" defaultValue={guest.traditionalTitle ?? ""} />
              </label>
            ) : null}
            <label>
              Middle names
              <input name="middleNames" defaultValue={guest.middleNames ?? ""} />
            </label>
            <label>
              Preferred display name
              <input name="preferredDisplayName" defaultValue={guest.preferredDisplayName ?? ""} />
            </label>
            <label>
              Preferred formal salutation
              <input name="preferredFormalSalutation" defaultValue={guest.preferredFormalSalutation ?? ""} />
            </label>
            {capabilities.canViewProtocolNote ? (
              <label>
                Pronunciation note
                <input name="pronunciationNote" defaultValue={guest.pronunciationNote ?? ""} />
              </label>
            ) : null}
            {capabilities.canManageChild ? (
              <label>
                Age band
                <select name="ageBand" defaultValue={workspace.child?.ageBand ?? ""}>
                  <option value="">Not supplied</option>
                  {AGE_BANDS.map((item) => (
                    <option key={item} value={item}>
                      {item.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Reason
              <input name="reason" required defaultValue="Update structured addressing" />
            </label>
            </div>
          </fieldset>
          <div className="actions">
            <button type="submit" className="secondary">
              Save addressing
            </button>
            {capabilities.canConfirmAddressing ? (
              <button type="submit" name="confirm" value="true">
                Confirm addressing
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="empty">Your assignment can view addressing but cannot change it.</p>
      )}
      {workspace.child ? (
        <section>
          <h3>Child readiness</h3>
          <p>
            <span className="md-status" data-tone={workspace.child.childReadiness === "READY_FOR_EVENT" ? "ok" : "warn"}>
              {(workspace.child.childReadiness ?? "Not assessed").replaceAll("_", " ")}
            </span>{" "}
            Age band {(workspace.child.ageBand ?? "not supplied").replaceAll("_", " ")}
          </p>
          {workspace.child.responsibleAdult ? (
            <p>
              Responsible adult {workspace.child.responsibleAdult.adultFamiliarName} ·{" "}
              {workspace.child.responsibleAdult.scope}
            </p>
          ) : workspace.child.requiresResponsibleAdult ? (
            <p className="empty">A responsible adult is required before this child is ready for the event.</p>
          ) : null}
          {capabilities.canManageChild && workspace.child.requiresResponsibleAdult && !workspace.child.responsibleAdult ? (
            <form className="form" action={createResponsibleAdultLinkAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="guestId" value={guest.guestId} />
              <label>
                Responsible adult guest id
                <input name="responsibleAdultGuestId" required />
              </label>
              <label>
                Reason
                <input name="reason" required defaultValue="Record responsible adult" />
              </label>
              <button type="submit">Link responsible adult</button>
            </form>
          ) : null}
        </section>
      ) : null}
      {workspace.parties.length > 0 ? (
        <section>
          <h3>Parties</h3>
          <p className="lede">A party is a container, not a person. Each member keeps their own guest identity.</p>
          {workspace.parties.map((party) => (
            <article key={party.id} className="card-list">
              <p>
                <strong>{party.label}</strong> · {party.type.replaceAll("_", " ")} · {party.memberCount} members
              </p>
              <ul>
                {party.members.map((member) => (
                  <li key={member.guestId}>
                    {member.displayName} · {member.role.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ) : null}
      {workspace.relationships.length > 0 ? (
        <section>
          <h3>Declared relationships</h3>
          {workspace.relationships.map((item) => (
            <p key={item.id}>
              {item.fromDisplayName} · {item.type.replaceAll("_", " ")} · {item.toDisplayName}
            </p>
          ))}
        </section>
      ) : null}
      {capabilities.canViewEntitlement ? (
        <section>
          <h3>Companion entitlements</h3>
          {workspace.entitlements.length === 0 ? (
            <p className="empty">No S04A companion entitlement is recorded for this guest.</p>
          ) : (
            workspace.entitlements.map((item) => (
              <article key={item.id} className="card-list">
                <p>
                  Allowance {item.allowance} · {item.status.replaceAll("_", " ")} ·{" "}
                  {item.unnamed ? "Unnamed — no fabricated guest" : item.nominatedDisplayName}
                </p>
                {capabilities.canManageEntitlement && item.unnamed ? (
                  <form className="form" action={nominateCompanionAction}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="guestId" value={guest.guestId} />
                    <input type="hidden" name="entitlementId" value={item.id} />
                    <input type="hidden" name="expectedVersion" value={item.version} />
                    <label>
                      Companion given name
                      <input name="suppliedGivenName" />
                    </label>
                    <label>
                      Companion family name
                      <input name="suppliedFamilyName" />
                    </label>
                    <label>
                      Reason
                      <input name="reason" required defaultValue="Nominate companion" />
                    </label>
                    <button type="submit">Materialise companion</button>
                  </form>
                ) : null}
              </article>
            ))
          )}
          {workspace.companionNameReconciliations.length > 0 ? (
            <p>Recorded free-text companion names: {workspace.companionNameReconciliations.map((item) => item.legacyDisplayText).join(", ")}</p>
          ) : null}
          {workspace.pendingCompanionNames.length > 0 && capabilities.canManageEntitlement ? (
            <form className="form" action={reconcileCompanionNamesAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="guestId" value={guest.guestId} />
              <p>Unreconciled S03 companion names: {workspace.pendingCompanionNames.join(", ")}. This records the text. It does not create guests.</p>
              <label>
                Reason
                <input name="reason" required defaultValue="Reconcile S03 companion names" />
              </label>
              <button type="submit">Record companion-name reconciliation</button>
            </form>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
