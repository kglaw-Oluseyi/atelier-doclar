import { GuestFrame } from "../../../components/guest-frame";
import { MerchandiseGuestAccessExchange } from "../../../components/merchandise-guest-access-exchange";

export default async function MerchandiseGuestTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <GuestFrame host="Maison Doclar" eventName="Private merchandise">
      <MerchandiseGuestAccessExchange token={token} />
    </GuestFrame>
  );
}
