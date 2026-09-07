import { GuestFrame } from "../../../components/guest-frame";

export default function MerchandiseGuestUnavailablePage() {
  return (
    <GuestFrame host="Maison Doclar" eventName="Private merchandise unavailable">
      <p role="status">
        This private merchandise access is expired, revoked or no longer available. It does not change any invitation or
        RSVP.
      </p>
    </GuestFrame>
  );
}
