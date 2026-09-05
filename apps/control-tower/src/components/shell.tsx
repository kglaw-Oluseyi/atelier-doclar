import type { ReactNode } from "react";
import {
  CT5_SURFACES,
  CT6_SURFACES,
  CT7_SURFACES,
  CT8_SURFACES,
  CT9_SURFACES,
  LATER_SURFACES,
} from "@maison-doclar/programme-tower";
import { authMode } from "../server/config";

export function TowerShell({
  children,
  actor,
}: {
  children: ReactNode;
  actor?: { actorId: string; role: string };
}) {
  const temporary = authMode() === "TEMPORARY_LIVE_VERIFICATION";
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <nav className="nav" aria-label="Control Tower">
        <h1>Maison Doclar</h1>
        <p>Private Control Tower</p>
        <a href="/programme">Portfolio</a>
        {[...CT5_SURFACES, ...CT6_SURFACES, ...CT7_SURFACES, ...CT8_SURFACES, ...CT9_SURFACES].map((item) => (
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
          <div className="session">
            <p className="meta">
              {actor.actorId} · {actor.role}
            </p>
            <a className="logout" href="/api/session/logout">
              Log out
            </a>
          </div>
        ) : null}
      </nav>
      <main id="main" className="main">
        {temporary ? (
          <p className="banner" data-tone="warn" role="status">
            TEMPORARY live-verification access. Permanent production identity remains unresolved. Protected gates
            cannot be signed from this session.
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
