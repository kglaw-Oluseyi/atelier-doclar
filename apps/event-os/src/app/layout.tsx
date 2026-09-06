import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import "./atelier.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap" });
const instrument = Instrument_Serif({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-editorial",
});

export const metadata: Metadata = {
  title: "Maison Doclar Event OS",
  description: "Staff operating environment for Maison Doclar Event OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  try {
    const { ensureRuntime } = await import("../server/runtime");
    await ensureRuntime();
  } catch {
    // Prefetch and navigation must not become an unexplained 503 when boot is slow.
    // Pages classify unreadiness as a controlled operational state.
  }
  return (
    <html lang="en" className={`atelier ${instrument.variable}`}>
      <head>
        <title>Maison Doclar Event OS</title>
      </head>
      <body className={`atelier ${inter.className}`}>{children}</body>
    </html>
  );
}
