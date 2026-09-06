import { importGuestsAction, intakeGuestAction } from "../server/actions";

export function GuestIntakeForm({
  eventId,
  error,
}: {
  eventId: string;
  error?: string;
}) {
  return (
    <form className="form" action={intakeGuestAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <label>
        Given name
        <input name="givenName" autoComplete="given-name" />
      </label>
      <label>
        Family name
        <input name="familyName" autoComplete="family-name" />
      </label>
      <label>
        Preferred name
        <input name="preferredName" />
      </label>
      <fieldset>
        <legend>Structured addressing (optional)</legend>
        <p className="lede">Leave honorific blank unless a title was explicitly supplied. Titles are never inferred.</p>
        <label>
          Honorific
          <select name="honorific" defaultValue="">
            <option value="">Blank — do not infer</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
            <option value="Mx">Mx</option>
            <option value="Dr">Dr</option>
            <option value="Dr (Mrs)">Dr (Mrs)</option>
            <option value="Dr (Mr)">Dr (Mr)</option>
            <option value="Dr (Ms)">Dr (Ms)</option>
            <option value="Professor">Professor</option>
            <option value="Rev">Rev</option>
            <option value="Pastor">Pastor</option>
            <option value="Chief">Chief</option>
            <option value="Alhaji">Alhaji</option>
            <option value="Alhaja">Alhaja</option>
            <option value="Engr">Engr</option>
            <option value="Barrister">Barrister</option>
            <option value="Hon">Hon</option>
            <option value="HRH">HRH</option>
            <option value="Sir">Sir</option>
            <option value="Dame">Dame</option>
          </select>
        </label>
        <label>
          Preferred formal salutation
          <input name="preferredFormalSalutation" />
        </label>
        <label>
          Age band
          <select name="ageBand" defaultValue="">
            <option value="">Not supplied</option>
            <option value="ADULT">Adult</option>
            <option value="TEEN">Teen</option>
            <option value="PRE_TEEN">Pre teen</option>
            <option value="CHILD">Child</option>
            <option value="EARLY_CHILDHOOD">Early childhood</option>
            <option value="INFANT">Infant</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </label>
      </fieldset>
      <label>
        Email
        <input name="email" type="email" autoComplete="off" />
      </label>
      <label>
        Phone
        <input name="phone" inputMode="tel" autoComplete="off" />
      </label>
      <label>
        Household key
        <input name="householdKey" />
      </label>
      <label>
        Dietary requirement
        <input name="dietaryRequirement" />
      </label>
      <label>
        Accessibility requirement
        <input name="accessibilityRequirement" />
      </label>
      <label>
        Operational note
        <textarea name="operationalNote" rows={3} />
      </label>
      <label>
        Reason
        <input name="reason" required defaultValue="Manual staff intake" />
      </label>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Create guest record</button>
    </form>
  );
}

export function GuestImportForm({ eventId, error }: { eventId: string; error?: string }) {
  return (
    <form className="form" action={importGuestsAction}>
      <input type="hidden" name="eventId" value={eventId} />
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
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Import guest rows</button>
    </form>
  );
}
