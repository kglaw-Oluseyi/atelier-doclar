import { GuestFrame } from "../../../components/guest-frame";
import { GuestAccessExchange } from "../../../components/guest-access-exchange";

export default async function GuestAccessExchangePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <GuestFrame host="Maison Doclar" eventName="Guest response">
      <GuestAccessExchange token={token} />
    </GuestFrame>
  );
}
