"use client";

import { PublicChrome } from "../components/public-chrome";

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <main className="sign-in">
      <PublicChrome />
      <h1>The requested record is not available</h1>
      <p className="lede">No protected detail is shown. Return to a permitted screen or sign in again.</p>
      <p className="empty">{error.name}</p>
    </main>
  );
}
