import type { ReactNode } from "react";
import { CT5_SURFACES, CT6_SURFACES, CT7_SURFACES, LATER_SURFACES } from "@maison-doclar/programme-tower";

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
        <a href="/programme">Portfolio</a>
        {[...CT5_SURFACES, ...CT6_SURFACES, ...CT7_SURFACES].map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
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
