"use client";

import { useId, useState } from "react";
import { resolveUnmatchedAction } from "../server/actions";

export type UnmatchedGuestOption = {
  id: string;
  displayName: string;
  contactHint: string;
};

export function UnmatchedResolutionForm({
  eventId,
  inboundId,
  expectedVersion,
  guests,
}: {
  eventId: string;
  inboundId: string;
  expectedVersion: number;
  guests: UnmatchedGuestOption[];
}) {
  const [action, setAction] = useState<"DISMISS" | "ESCALATE" | "LINK">("DISMISS");
  const [guestId, setGuestId] = useState("");
  const actionId = useId();
  const guestFieldId = useId();

  const linkSelected = action === "LINK";
  const canSubmitLink = !linkSelected || guestId.length > 0;

  return (
    <form className="form" action={resolveUnmatchedAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="inboundId" value={inboundId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <input type="hidden" name="guestId" value={linkSelected ? guestId : ""} />
      <label htmlFor={actionId}>
        Action
        <select id={actionId} name="action" value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
          <option value="DISMISS">Keep unmatched</option>
          <option value="ESCALATE">Escalate</option>
          <option value="LINK">Link to guest</option>
        </select>
      </label>
      {linkSelected ? (
        <fieldset id={guestFieldId}>
          <legend>Select guest to link</legend>
          {guests.length === 0 ? (
            <p className="empty">No event guests are available for linking.</p>
          ) : (
            guests.map((guest) => (
              <label key={guest.id} className="check">
                <input
                  type="radio"
                  name="guestChoice"
                  value={guest.id}
                  checked={guestId === guest.id}
                  onChange={() => setGuestId(guest.id)}
                  required={linkSelected}
                />
                <span>
                  {guest.displayName}
                  {guest.contactHint ? ` · ${guest.contactHint}` : ""}
                </span>
              </label>
            ))
          )}
        </fieldset>
      ) : null}
      <label>
        Reason
        <input name="reason" defaultValue="Resolve unmatched inbound" required />
      </label>
      <button type="submit" disabled={!canSubmitLink || (linkSelected && guests.length === 0)}>
        Resolve inbound
      </button>
    </form>
  );
}
