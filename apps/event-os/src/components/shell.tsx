import type { ReactNode } from "react";
import Link from "next/link";
import type { Person } from "@maison-doclar/shared-platform";
import { LogoutButton } from "./logout-button";

export function AppShell({
  person,
  organisationName,
  eventName,
  children,
  current,
}: {
  person: Person;
  organisationName?: string;
  eventName?: string;
  current: string;
  children: ReactNode;
}) {
  const links = [
    ["/app", "Home"],
    ["/app/clients", "Clients"],
    ["/app/events", "Events"],
    ["/app/my-work", "My Work"],
    ["/app/admin/access", "Access"],
    ["/app/admin/audit", "Audit"],
    ["/app/admin/system", "System"],
  ] as const;

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <nav className="nav" aria-label="Staff">
        <p className="brand">Maison Doclar</p>
        <p className="brand-note">Event OS</p>
        {links.map(([href, label]) => (
          <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>
            {label}
          </Link>
        ))}
        <div className="user-menu">
          <p>{person.displayName}</p>
          <LogoutButton />
        </div>
      </nav>
      <div className="main">
        <div className="context" role="status">
          <span>Organisation: {organisationName ?? "Not provided"}</span>
          <span>Event: {eventName ?? "Not provided"}</span>
        </div>
        <main id="main">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Primary">
        <Link href="/app">Home</Link>
        <Link href="/app/events">Events</Link>
        <Link href="/app/my-work">My Work</Link>
        <Link href="/app/clients">More</Link>
      </nav>
    </div>
  );
}
