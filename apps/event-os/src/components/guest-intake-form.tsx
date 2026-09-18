import { AGE_BANDS, HONORIFICS } from "@maison-doclar/shared-platform";
import { importGuestsAction, intakeGuestAction } from "../server/actions";
import type { OperationalStateView } from "../server/operational-state";
import { AtelierOperationalState } from "./atelier-operational-state";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

export function GuestIntakeForm({
  eventId,
  state,
}: {
  eventId: string;
  state?: OperationalStateView;
}) {
  return (
    <form className="form atelier-intake" action={intakeGuestAction} aria-describedby={state ? "operational-state-title" : undefined}>
      <input type="hidden" name="eventId" value={eventId} />
      <IdempotencyField />
      {state ? <AtelierOperationalState state={state} /> : null}
      <fieldset>
        <legend>Independent guest identity</legend>
        <p className="lede">
          Given name and family name identify this person. Titles are never inferred. A full date of birth is not
          collected.
        </p>
        <div className="atelier-field-grid">
          <label>
            Given name
            <span className="field-req">Required for a usable record</span>
            <input name="givenName" autoComplete="given-name" />
          </label>
          <label>
            Middle names
            <span className="field-opt">Optional · authorised structured field</span>
            <input name="middleNames" autoComplete="additional-name" />
          </label>
          <label>
            Family name
            <span className="field-req">Required for a usable record</span>
            <input name="familyName" autoComplete="family-name" />
          </label>
          <label>
            Honorific
            <span className="field-opt">Optional · leave blank unless a title was supplied</span>
            <select name="honorific" defaultValue="">
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
            <span className="field-opt">Optional · stored only when supplied</span>
            <input name="professionalTitle" />
          </label>
          <label>
            Traditional title
            <span className="field-opt">Optional · stored only when supplied</span>
            <input name="traditionalTitle" />
          </label>
          <label>
            Post-nominals
            <span className="field-opt">Optional · comma-separated</span>
            <input name="postNominals" placeholder="OON, SAN" />
          </label>
          <label>
            Preferred name
            <span className="field-opt">Optional familiar name</span>
            <input name="preferredName" />
          </label>
          <label>
            Preferred display name
            <span className="field-opt">Optional</span>
            <input name="preferredDisplayName" />
          </label>
          <label>
            Preferred formal salutation
            <span className="field-opt">Optional · used only after confirmation</span>
            <input name="preferredFormalSalutation" />
          </label>
          <label>
            Age band
            <span className="field-opt">Optional · never a date of birth</span>
            <select name="ageBand" defaultValue="">
              <option value="">Not supplied</option>
              {AGE_BANDS.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Operational contact</legend>
        <div className="atelier-field-grid">
          <label>
            Email
            <span className="field-opt">Optional</span>
            <input name="email" type="email" autoComplete="off" />
          </label>
          <label>
            Phone
            <span className="field-opt">Optional</span>
            <input name="phone" inputMode="tel" autoComplete="off" />
          </label>
          <label>
            Household key
            <span className="field-opt">Optional grouping key · not a party or identity</span>
            <input name="householdKey" />
          </label>
          <label>
            Dietary requirement
            <span className="field-opt">Optional</span>
            <input name="dietaryRequirement" />
          </label>
          <label>
            Accessibility requirement
            <span className="field-opt">Optional</span>
            <input name="accessibilityRequirement" />
          </label>
        </div>
        <label>
          Operational note
          <span className="field-opt">Optional</span>
          <textarea name="operationalNote" rows={3} />
        </label>
        <label>
          Reason
          <span className="field-req">Required</span>
          <input name="reason" required defaultValue="Manual staff intake" />
        </label>
      </fieldset>
      <div className="actions">
        <PendingSubmit pendingLabel="Creating record…">Create guest record</PendingSubmit>
      </div>
    </form>
  );
}

export function GuestImportForm({ eventId, state }: { eventId: string; state?: OperationalStateView }) {
  return (
    <form className="form" action={importGuestsAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <IdempotencyField />
      {state ? <AtelierOperationalState state={state} id="import-state" /> : null}
      <label>
        File name
        <input name="filename" required defaultValue="guest-intake.csv" />
      </label>
      <label>
        Canonical CSV
        <textarea
          name="csv"
          rows={6}
          required
          spellCheck={false}
          defaultValue="givenName,familyName,email,phone,householdKey"
        />
      </label>
      <label>
        Reason
        <input name="reason" required defaultValue="Canonical CSV intake" />
      </label>
      <label className="guestbook-attention-filter">
        <input type="checkbox" name="markAttendingForSeating" value="true" defaultChecked />
        <span>Mark imported guests as attending so they are seating-eligible</span>
      </label>
      <p className="lede">
        Without attendance intent, Seating Overview shows Eligible guests · 0 even when the directory is full.
      </p>
      <PendingSubmit className="secondary" pendingLabel="Importing…">
        Import guest rows
      </PendingSubmit>
    </form>
  );
}
