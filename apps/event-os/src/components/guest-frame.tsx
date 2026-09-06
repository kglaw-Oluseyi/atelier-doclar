import type { ReactNode } from "react";

export function GuestFrame({
  host,
  eventName,
  children,
}: {
  host: string;
  eventName: string;
  children: ReactNode;
}) {
  return (
    <div className="guest-shell">
      <a className="skip" href="#guest-main">
        Skip to response
      </a>
      <header className="guest-masthead">
        <p className="guest-mark">Maison Doclar</p>
        <p className="guest-host">{host}</p>
        <h1>{eventName}</h1>
      </header>
      <main id="guest-main" className="guest-main">
        {children}
      </main>
    </div>
  );
}
