import { GuestFrame } from "../../../components/guest-frame";

export default function GuestRsvpUnavailablePage() {
  return (
    <GuestFrame host="Maison Doclar" eventName="Guest response">
      <h2>This link is no longer available</h2>
      <p className="lede">
        The host team can send a new invitation if you still need to respond. No further details are shown here.
      </p>
    </GuestFrame>
  );
}
