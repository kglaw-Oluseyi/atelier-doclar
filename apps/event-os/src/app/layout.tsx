import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@maison-doclar/design-system";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Maison Doclar Event OS",
  description: "Staff operating environment for Maison Doclar Event OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={sourceSerif.variable} suppressHydrationWarning>
      <head>
        <title>Maison Doclar Event OS</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
