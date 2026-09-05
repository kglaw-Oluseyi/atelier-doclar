import {
  issueRsvpInvitationAction,
  prepareRsvpAction,
  staffEnterRsvpAction,
  upsertRsvpPolicyAction,
} from "../server/actions";
import type { RsvpPolicy } from "@maison-doclar/shared-platform";

export function PrepareRsvpForm({ eventId, eventName }: { eventId: string; eventName: string }) {
  return (
    <form className="form" action={prepareRsvpAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="eventDisplayName" value={eventName} />
      <input type="hidden" name="hostDisplayName" value="Maison Doclar" />
      <label>
        Reason
        <input name="reason" required defaultValue="Prepare guest RSVP for this event" />
      </label>
      <button type="submit">Prepare guest RSVP</button>
    </form>
  );
}

export function RsvpPolicyForm({ eventId, policy, error }: { eventId: string; policy?: RsvpPolicy; error?: string }) {
  return (
    <form className="form" action={upsertRsvpPolicyAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="expectedVersion" value={policy?.version ?? ""} />
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <label>
        Host name shown to guests
        <input name="hostDisplayName" required defaultValue={policy?.hostDisplayName ?? "Maison Doclar"} />
      </label>
      <label>
        Event name shown to guests
        <input name="eventDisplayName" required defaultValue={policy?.eventDisplayName ?? ""} />
      </label>
      <label>
        Privacy notice
        <textarea name="privacyNotice" rows={4} required defaultValue={policy?.privacyNotice ?? ""} />
      </label>
      <label className="check">
        <input type="checkbox" name="amendmentsPermitted" value="1" defaultChecked={policy?.amendmentsPermitted !== false} />
        Guests may update a submitted response
      </label>
      <label className="check">
        <input type="checkbox" name="companionsPermitted" value="1" defaultChecked={policy?.companionsPermitted === true} />
        Companions permitted by default
      </label>
      <label>
        Default companion allowance
        <input name="defaultCompanionAllowance" type="number" min={0} max={4} defaultValue={policy?.defaultCompanionAllowance ?? 0} />
      </label>
      <label>
        Reason
        <input name="reason" required />
      </label>
      <button type="submit">Save RSVP policy</button>
    </form>
  );
}

export function IssueInvitationForm({ eventId, guestId }: { eventId: string; guestId: string }) {
  return (
    <form className="form" action={issueRsvpInvitationAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guestId} />
      <label>
        Reason
        <input name="reason" required defaultValue="Issue guest self-service access" />
      </label>
      <button type="submit">Issue guest access</button>
    </form>
  );
}

export function StaffRsvpForm({
  eventId,
  guestId,
  expectedVersion,
  current,
  error,
}: {
  eventId: string;
  guestId: string;
  expectedVersion?: number;
  current?: string;
  error?: string;
}) {
  return (
    <form className="form" action={staffEnterRsvpAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guestId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion ?? ""} />
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      <label>
        Response
        <select name="attendanceIntent" defaultValue={current ?? "NOT_SUPPLIED"} required>
          <option value="NOT_SUPPLIED">Not yet supplied</option>
          <option value="ATTENDING">Attending</option>
          <option value="NOT_ATTENDING">Not attending</option>
          <option value="UNCERTAIN">Uncertain</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" name="withdraw" value="1" />
        Withdraw the recorded response
      </label>
      <label>
        Reason
        <input name="reason" required />
      </label>
      <button type="submit">Record staff response</button>
    </form>
  );
}
