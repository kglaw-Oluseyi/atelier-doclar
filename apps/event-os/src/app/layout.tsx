import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Maison Doclar Event OS",
  description: "Staff operating environment for Maison Doclar Event OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Maison Doclar Event OS</title>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
