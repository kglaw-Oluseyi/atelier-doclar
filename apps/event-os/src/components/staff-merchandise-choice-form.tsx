"use client";

import { useMemo, useState } from "react";
import { recordStaffParticipationAction } from "../server/actions";
import { IdempotencyField, PendingSubmit } from "./atelier-pending-submit";

const PARTICIPATION_CHOICES = [
  "FULL_PARTICIPATION",
  "FABRIC_ONLY",
  "ACCESSORY_ONLY",
  "ALTERNATIVE",
  "HOST_SPONSORED",
  "DECLINE_GRACEFULLY",
  "UNDECIDED",
] as const;

type OfferOption = {
  id: string;
  guestId: string;
  version: number;
  guestDisplayName: string;
  itemName: string;
};

export function StaffMerchandiseChoiceForm({
  eventId,
  offers,
}: {
  eventId: string;
  offers: OfferOption[];
}) {
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const selected = useMemo(() => offers.find((item) => item.id === offerId) ?? offers[0], [offers, offerId]);
  if (!selected) return null;
  return (
    <form className="merchandise-form" action={recordStaffParticipationAction}>
      <h3>Assist a private choice</h3>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={selected.guestId} />
      <input type="hidden" name="expectedOfferVersion" value={selected.version} />
      <IdempotencyField />
      <label>
        Offer
        <select name="guestOfferId" required value={offerId} onChange={(event) => setOfferId(event.target.value)}>
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.guestDisplayName} · {offer.itemName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Choice
        <select name="choice" required defaultValue="UNDECIDED">
          {PARTICIPATION_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <input name="reason" required defaultValue="Assist guest merchandise choice" />
      </label>
      <PendingSubmit>Record choice</PendingSubmit>
    </form>
  );
}
