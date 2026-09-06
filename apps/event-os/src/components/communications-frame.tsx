import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "./shell";
import type { Person } from "@maison-doclar/shared-platform";

const LINKS = [
  ["", "Overview"],
  ["policy", "Policy"],
  ["templates", "Templates"],
  ["audiences", "Audiences"],
  ["campaigns", "Campaigns"],
  ["inbox", "Inbox"],
  ["unmatched", "Unmatched"],
  ["failures", "Failures"],
  ["tasks", "Tasks"],
  ["corrections", "Corrections"],
  ["audit", "Attention"],
] as const;

export function CommunicationsFrame({
  person,
  organisationName,
  eventName,
  eventId,
  title,
  lede,
  error,
  children,
}: {
  person: Person;
  organisationName?: string;
  eventName?: string;
  eventId: string;
  title: string;
  lede: string;
  error?: string;
  children: ReactNode;
}) {
  const base = `/app/events/${eventId}/communications`;
  return (
    <AppShell
      person={person}
      organisationName={organisationName}
      eventName={eventName}
      eventId={eventId}
      current="/app/events"
    >
      <div className="page-header">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>
      <nav className="comms-nav" aria-label="Communications">
        {LINKS.map(([path, label]) => (
          <Link key={path || "overview"} href={path ? `${base}/${path}` : base}>
            {label}
          </Link>
        ))}
      </nav>
      {error ? (
        <p className="alert" data-tone="danger" role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </AppShell>
  );
}
