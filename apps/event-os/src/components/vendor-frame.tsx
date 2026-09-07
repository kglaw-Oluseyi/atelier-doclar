import type { ReactNode } from "react";

export function VendorFrame({
  vendorName,
  children,
}: {
  vendorName: string;
  children: ReactNode;
}) {
  return (
    <div className="vendor-shell atelier-vendor at-scope">
      <a className="skip" href="#vendor-main">
        Skip to assigned fulfilments
      </a>
      <header className="vendor-masthead">
        <p className="vendor-mark">Maison Doclar</p>
        <span className="at-thread" aria-hidden="true" />
        <p className="eyebrow">Separate vendor portal</p>
        <h1>{vendorName}</h1>
        <p>Assigned merchandise only. This is not Event OS staff access.</p>
      </header>
      <main id="vendor-main" className="vendor-main">
        {children}
      </main>
    </div>
  );
}
