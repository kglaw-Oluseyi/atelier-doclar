import { HostAtelierFrame } from "../../../components/host-atelier-frame";

export default function AtelierUnavailablePage() {
  return (
    <HostAtelierFrame eventName="Private Atelier">
      <p data-testid="atelier-unavailable">
        This private Atelier is no longer available. The invitation may have been used, expired, forwarded or withdrawn.
        Nothing about a host or event is confirmed by this message.
      </p>
    </HostAtelierFrame>
  );
}
