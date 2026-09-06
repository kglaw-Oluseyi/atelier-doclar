"use client";

import { useId, useState } from "react";
import { proposeCorrectionAction } from "../server/actions";
import type { UnmatchedGuestOption } from "./unmatched-resolution-form";

export function ProposeCorrectionForm({
  eventId,
  inboundId,
  sourceMessageId,
  guests,
  defaultChannel,
}: {
  eventId: string;
  inboundId: string;
  sourceMessageId: string;
  guests: UnmatchedGuestOption[];
  defaultChannel: string;
}) {
  const [guestId, setGuestId] = useState("");
  const guestFieldId = useId();

  return (
    <form className="form" action={proposeCorrectionAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="inboundId" value={inboundId} />
      <input type="hidden" name="sourceMessageId" value={sourceMessageId} />
      <h3>Propose contact correction</h3>
      <p className="lede">Creates a governed review proposal. Canonical contact data is unchanged until approved.</p>
      <fieldset id={guestFieldId}>
        <legend>Guest</legend>
        {guests.length === 0 ? (
          <p className="empty">No event guests are available.</p>
        ) : (
          guests.map((guest) => (
            <label key={guest.id} className="check">
              <input
                type="radio"
                name="guestId"
                value={guest.id}
                checked={guestId === guest.id}
                onChange={() => setGuestId(guest.id)}
                required
              />
              <span>
                {guest.displayName}
                {guest.contactHint ? ` · ${guest.contactHint}` : ""}
              </span>
            </label>
          ))
        )}
      </fieldset>
      <label>
        Contact channel
        <select name="channel" defaultValue={defaultChannel}>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </label>
      <label>
        Proposed value
        <input name="proposedValue" required autoComplete="off" />
      </label>
      <label>
        Reason
        <input name="reason" defaultValue="Propose contact correction from unmatched inbound" required />
      </label>
      <button type="submit" disabled={guests.length === 0 || !guestId}>
        Propose contact correction
      </button>
    </form>
  );
}
