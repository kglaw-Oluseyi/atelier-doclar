import {
  ADDRESSING_SOURCES,
  AGE_BANDS,
  HONORIFICS,
  type GuestAddressingWorkspace,
} from "@maison-doclar/shared-platform";
import { updateGuestAddressingAction } from "../server/actions";
import type { GuestChoice } from "../server/guest-name-display";
import type { OperationalStateView } from "../server/operational-state";
import { AtelierOperationalState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";
import { GuestChildWorkspace } from "./guest-child-workspace";
import { GuestEntitlementWorkspace } from "./guest-entitlement-workspace";
import { GuestPartyWorkspace } from "./guest-party-workspace";
import { GuestRelationshipWorkspace } from "./guest-relationship-workspace";

export function GuestAddressingWorkspace({
  workspace,
  eventId,
  state,
  guestChoices,
  adultChoices,
  locked = false,
}: {
  workspace: GuestAddressingWorkspace;
  eventId: string;
  state?: OperationalStateView;
  guestChoices: GuestChoice[];
  adultChoices: GuestChoice[];
  locked?: boolean;
}) {
  const { guest, capabilities } = workspace;
  return (
    <section className="addressing-workspace" aria-labelledby="addressing-heading">
      <h2 id="addressing-heading">Addressing</h2>
      <p className="lede">
        Titles are stored only when explicitly supplied. The system never infers Mr, Mrs, Dr, or any other honorific
        from a name. Yorùbá diacritics are preserved exactly as entered.
      </p>
      <dl className="meta-list addressing-preview">
        <div>
          <dt>Formal salutation</dt>
          <dd className="guest-name" data-testid="formal-salutation">
            {guest.formalSalutation.text}
          </dd>
        </div>
        <div>
          <dt>Familiar name</dt>
          <dd className="guest-name" data-testid="familiar-name">
            {guest.familiarName.text}
          </dd>
        </div>
        <div>
          <dt>Addressing status</dt>
          <dd>
            <span className="md-status" data-tone={guest.addressingStatus === "UNVERIFIED" ? "brass" : "ok"}>
              {(guest.addressingStatus ?? "Not supplied").replaceAll("_", " ")}
            </span>
          </dd>
        </div>
        <div>
          <dt>Confirmation provenance</dt>
          <dd>{guest.addressingStatus ? guest.addressingStatus.replaceAll("_", " ") : "Not confirmed"}</dd>
        </div>
        <div>
          <dt>Addressing source</dt>
          <dd>{guest.addressingSource?.replaceAll("_", " ") ?? "Not supplied"}</dd>
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
        {guest.professionalTitle ? (
          <div>
            <dt>Professional title</dt>
            <dd>{guest.professionalTitle}</dd>
          </div>
        ) : null}
        {guest.traditionalTitle ? (
          <div>
            <dt>Traditional title</dt>
            <dd>{guest.traditionalTitle}</dd>
          </div>
        ) : null}
        {guest.middleNames ? (
          <div>
            <dt>Middle names</dt>
            <dd className="guest-name">{guest.middleNames}</dd>
          </div>
        ) : null}
        {guest.postNominals?.length ? (
          <div>
            <dt>Post-nominals</dt>
            <dd>{guest.postNominals.join(" ")}</dd>
          </div>
        ) : null}
        {guest.pronunciationNote ? (
          <div>
            <dt>Pronunciation note</dt>
            <dd className="guest-name">{guest.pronunciationNote}</dd>
          </div>
        ) : null}
      </dl>
      {state ? <AtelierOperationalState state={state} /> : null}
      {capabilities.canManageAddressing ? (
        <form id="structured-addressing-form" className="form" action={updateGuestAddressingAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={guest.guestId} />
          <input type="hidden" name="expectedVersion" value={guest.version} />
          <IdempotencyField />
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
                Post-nominals
                <span className="field-opt">Optional · comma-separated</span>
                <input name="postNominals" defaultValue={guest.postNominals?.join(", ") ?? ""} />
              </label>
              <label>
                Preferred display name
                <input name="preferredDisplayName" defaultValue={guest.preferredDisplayName ?? ""} />
              </label>
              <label>
                Preferred formal salutation
                <input name="preferredFormalSalutation" defaultValue={guest.preferredFormalSalutation ?? ""} />
              </label>
              {guest.preferredFormalSalutation ? (
                <fieldset data-testid="salutation-governance">
                  <legend>Preferred salutation after a title change</legend>
                  <p className="lede">
                    A manually supplied preferred formal salutation is explicit authored data. Changing an honorific or
                    title will not rewrite it. If the current wording still contains the former title, update the
                    salutation yourself or explicitly retain it. The system will not infer replacement wording.
                  </p>
                  {guest.preferredFormalSalutationGovernance ? (
                    <p>
                      Last governed choice: {guest.preferredFormalSalutationGovernance.decision.replaceAll("_", " ")} at{" "}
                      {guest.preferredFormalSalutationGovernance.recordedAt}
                    </p>
                  ) : null}
                  <label className="check">
                    <input type="radio" name="salutationDecision" value="UPDATE" />
                    I am updating this salutation
                  </label>
                  <label className="check">
                    <input type="radio" name="salutationDecision" value="RETAIN" />
                    Keep this salutation unchanged
                  </label>
                </fieldset>
              ) : null}
              {capabilities.canViewProtocolNote ? (
                <label>
                  Pronunciation note
                  <span className="field-opt">Authorised protocol field</span>
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
                Addressing source
                <select name="addressingSource" defaultValue={guest.addressingSource ?? "STAFF"}>
                  {ADDRESSING_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason
                <input name="reason" required defaultValue="Update structured addressing" />
              </label>
            </div>
          </fieldset>
          <div className="actions">
            <PendingSubmit className="secondary" pendingLabel="Saving addressing…" locked={locked}>
              Save addressing
            </PendingSubmit>
            {capabilities.canConfirmAddressing ? (
              <PendingSubmit name="confirm" value="true" pendingLabel="Confirming…" locked={locked}>
                Confirm addressing
              </PendingSubmit>
            ) : (
              <p className="empty">Planner assignments can administer addressing but cannot confirm it.</p>
            )}
          </div>
        </form>
      ) : (
        <p className="empty">Your assignment can view addressing but cannot change it.</p>
      )}
      <GuestRelationshipWorkspace workspace={workspace} eventId={eventId} guestChoices={guestChoices} locked={locked} />
      <GuestChildWorkspace workspace={workspace} eventId={eventId} adultChoices={adultChoices} locked={locked} />
      <GuestPartyWorkspace workspace={workspace} eventId={eventId} guestChoices={guestChoices} locked={locked} />
      <GuestEntitlementWorkspace workspace={workspace} eventId={eventId} guestChoices={guestChoices} locked={locked} />
    </section>
  );
}
