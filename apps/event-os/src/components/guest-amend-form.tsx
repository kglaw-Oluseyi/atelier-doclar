import { amendGuestAction, resolveDuplicateAction } from "../server/actions";
import type { GuestDuplicateCandidate, OperationalGuest } from "@maison-doclar/shared-platform";

export function GuestAmendForm({
  guest,
  eventId,
  error,
}: {
  guest: OperationalGuest;
  eventId: string;
  error?: string;
}) {
  return (
    <form className="form" action={amendGuestAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guest.id} />
      <input type="hidden" name="expectedVersion" value={guest.version} />
      <label>
        Given name
        <input name="givenName" defaultValue={guest.givenName.value ?? ""} />
      </label>
      <label>
        Family name
        <input name="familyName" defaultValue={guest.familyName.value ?? ""} />
      </label>
      <label>
        Preferred name
        <input name="preferredName" defaultValue={guest.preferredName.value ?? ""} />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={guest.email.value ?? ""} autoComplete="off" />
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={guest.phone.value ?? ""} autoComplete="off" />
      </label>
      <label>
        Dietary requirement
        <input name="dietaryRequirement" defaultValue={guest.dietaryRequirement.value ?? ""} />
      </label>
      <label>
        Accessibility requirement
        <input name="accessibilityRequirement" defaultValue={guest.accessibilityRequirement.value ?? ""} />
      </label>
      <label>
        Lifecycle
        <select name="lifecycle" defaultValue={guest.lifecycle}>
          <option value="ACTIVE">Active</option>
          <option value="WITHDRAWN">Withdrawn</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" name="replaceVerifiedField" value="true" />
        Replace a verified field (requires reason)
      </label>
      <label>
        Reason
        <input name="reason" required />
      </label>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Save amendment</button>
    </form>
  );
}

export function DuplicateResolveForm({
  candidate,
  eventId,
}: {
  candidate: GuestDuplicateCandidate;
  eventId: string;
}) {
  return (
    <form className="form" action={resolveDuplicateAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="candidateId" value={candidate.id} />
      <input type="hidden" name="expectedVersion" value={candidate.version} />
      <label>
        Decision
        <select name="decision" required>
          <option value="KEEP_SEPARATE">Keep separate</option>
          <option value="DISMISS">Dismiss suggestion</option>
        </select>
      </label>
      <label>
        Reason
        <input name="reason" required defaultValue="Operator reviewed duplicate risk" />
      </label>
      <button type="submit">Record resolution</button>
    </form>
  );
}
