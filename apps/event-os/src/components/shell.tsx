import type { ReactNode } from "react";
import Link from "next/link";
import type { Person } from "@maison-doclar/shared-platform";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import { presentStaffIdentity } from "../server/staff-identity-display";

export function AppShell({
  person,
  organisationName,
  eventName,
  eventId,
  children,
  current,
}: {
  person: Person;
  organisationName?: string;
  eventName?: string;
  eventId?: string;
  current: string;
  children: ReactNode;
}) {
  const identity = presentStaffIdentity(person, eventId);
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
          <ThemeToggle />
          <StaffIdentity identity={identity} />
          <LogoutButton />
        </div>
      </nav>
      <div className="main">
        <header className="staff-identity-bar" aria-label="Signed-in staff">
          <StaffIdentity identity={identity} />
          <div className="staff-identity-actions">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <div className="context" role="status">
          <span>Organisation: {organisationName ?? "Not provided"}</span>
          <span>Event: {eventName ?? "Not provided"}</span>
        </div>
        <main id="main">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Primary">
        <Link href="/app" aria-current={current === "/app" ? "page" : undefined}>
          Home
        </Link>
        <Link href="/app/events" aria-current={current === "/app/events" ? "page" : undefined}>
          Events
        </Link>
        <Link href="/app/my-work" aria-current={current === "/app/my-work" ? "page" : undefined}>
          My Work
        </Link>
        <Link href="/app/clients" aria-current={current === "/app/clients" ? "page" : undefined}>
          More
        </Link>
      </nav>
    </div>
  );
}

function StaffIdentity({ identity }: { identity: { displayName: string; roleLabel: string } }) {
  return (
    <p className="staff-identity" aria-label={`Signed in as ${identity.displayName}, ${identity.roleLabel}`}>
      <span className="staff-identity-name">{identity.displayName}</span>
      <span className="staff-identity-role">{identity.roleLabel}</span>
    </p>
  );
}
