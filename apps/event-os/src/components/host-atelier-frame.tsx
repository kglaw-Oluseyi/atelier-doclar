import type { ReactNode } from "react";

export function HostAtelierFrame({
  eventName,
  hostName,
  children,
}: {
  eventName: string;
  hostName?: string;
  children: ReactNode;
}) {
  return (
    <div className="host-atelier" data-testid="host-atelier-frame">
      <header className="host-atelier-masthead">
        <p className="host-atelier-eyebrow">Maison Doclar</p>
        <h1 className="host-atelier-mark">{eventName}</h1>
        {hostName ? <p className="host-atelier-host">For {hostName}</p> : null}
      </header>
      <main className="host-atelier-stage">{children}</main>
    </div>
  );
}
