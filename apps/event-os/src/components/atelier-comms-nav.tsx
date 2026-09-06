"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function AtelierCommsNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/app/events/${eventId}/communications`;

  return (
    <nav className="at-tabs comms-nav" aria-label="Communications">
      {LINKS.map(([path, label]) => {
        const href = path ? `${base}/${path}` : base;
        const current = path ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
        return (
          <Link key={path || "overview"} href={href} aria-current={current ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
