import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Maison Doclar Event OS",
  description: "Staff operating system for organisation, client and event foundations.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <p className="banner">Synthetic rehearsal. Production is not authorised.</p>
        {children}
      </body>
    </html>
  );
}
