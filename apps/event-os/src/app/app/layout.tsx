import Link from "next/link";
import { projectCapabilities } from "@maison-doclar/foundation";
import { signOutAction } from "@/server/actions";
import { requireActor } from "@/server/session";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireActor();
  const capabilities = new Set(projectCapabilities(session.actor));
  const links = [
    ["/app", "Home", true],
    ["/app/clients", "Clients", capabilities.has("client.list")],
    ["/app/events", "Events", capabilities.has("event.list")],
    ["/app/my-work", "My Work", true],
    [
      "/app/admin/access",
      "Access",
      capabilities.has("user.view") || capabilities.has("assignment.grant"),
    ],
    ["/app/admin/audit", "Audit", capabilities.has("audit.view")],
    [
      "/app/admin/approvals",
      "Approvals",
      capabilities.has("approval.request") || capabilities.has("approval.decide"),
    ],
    ["/app/admin/departments", "Departments", capabilities.has("department.view")],
    ["/app/admin/system", "System", capabilities.has("system.health.view")],
  ] as const;
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span>Event OS</span>
          <strong>Maison Doclar</strong>
        </div>
        <nav aria-label="Primary">
          {links
            .filter((item) => item[2])
            .map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
        </nav>
        <div className="user-menu">
          <form action={signOutAction}>
            <button className="secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="context">
            <span className="badge">Synthetic organisation</span>
            <span className="badge">Production not authorised</span>
          </div>
          <Link href="/app/events">Switch event</Link>
        </header>
        <div id="main">{children}</div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile">
        <Link href="/app">Home</Link>
        <Link href="/app/events">Events</Link>
        <Link href="/app/my-work">My Work</Link>
        <Link href="/app/admin/access">More</Link>
      </nav>
    </div>
  );
}
