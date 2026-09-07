import { AtelierAccessExchange } from "../../../components/atelier-access-exchange";
import { HostAtelierFrame } from "../../../components/host-atelier-frame";

export default async function AtelierTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <HostAtelierFrame eventName="Private Atelier">
      <p>Exchanging a single-use invitation. Staff, guest and vendor sessions are not reused.</p>
      <AtelierAccessExchange token={token} />
    </HostAtelierFrame>
  );
}
