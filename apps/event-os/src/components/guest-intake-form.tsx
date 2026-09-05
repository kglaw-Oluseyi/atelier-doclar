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
