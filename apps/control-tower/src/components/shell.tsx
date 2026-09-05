import type { ReactNode } from "react";
import { LATER_SURFACES } from "@maison-doclar/programme-tower";

export function TowerShell({
  children,
  actor,
}: {
  children: ReactNode;
  actor?: { actorId: string; role: string };
}) {
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <nav className="nav" aria-label="Control Tower">
        <h1>Maison Doclar</h1>
        <p>Private Control Tower</p>
        <a href="/programme" aria-current="page">
          Portfolio
        </a>
        {LATER_SURFACES.map((item) => (
          <span className="later" key={item.href}>
            {item.label} · {item.slice}
          </span>
        ))}
        {actor ? (
          <p className="meta">
            {actor.actorId} · {actor.role}
          </p>
        ) : null}
      </nav>
      <main id="main" className="main">
        {children}
      </main>
    </div>
  );
}
