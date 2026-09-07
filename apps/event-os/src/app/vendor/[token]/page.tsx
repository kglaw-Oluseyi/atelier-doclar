import { VendorAccessExchange } from "../../../components/vendor-access-exchange";
import { VendorFrame } from "../../../components/vendor-frame";

export default async function VendorTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <VendorFrame vendorName="Vendor access">
      <p>Exchanging a scoped assignment token. Staff sessions are not reused.</p>
      <VendorAccessExchange token={token} />
    </VendorFrame>
  );
}
