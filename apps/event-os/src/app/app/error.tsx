"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page">
      <h1>Something needs attention</h1>
      <p className="alert" role="alert">
        {error.message || "The page could not be shown."}
      </p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
