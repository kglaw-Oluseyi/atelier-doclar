import { VendorFrame } from "../../../components/vendor-frame";

export default function VendorUnavailablePage() {
  return (
    <VendorFrame vendorName="Vendor access unavailable">
      <p role="status">This vendor access is expired, revoked or no longer available. Ask Maison Doclar staff for a replacement assignment if one is still required.</p>
    </VendorFrame>
  );
}
