"use client";

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="atelier-chamber at-scope">
      <main className="sign-in">
        <p className="eyebrow">Command Atelier</p>
        <span className="at-thread" aria-hidden="true" />
        <h1>The requested record is not available</h1>
        <p className="lede">No protected detail is shown. Return to a permitted screen or sign in again.</p>
      </main>
    </div>
  );
}
