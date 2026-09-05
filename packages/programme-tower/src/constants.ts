export const CT4_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0005",
  nativeId: "CT4",
  sliceId: "MD-CT4",
} as const;

export const TOWER_ROLES = ["executive", "reviewer", "implementer", "reader"] as const;
export type TowerRole = (typeof TOWER_ROLES)[number];

export const SESSION_COOKIE = "md_programme_session";
export const SYNTHETIC_ACCESS_TOKEN = "ct4-synthetic-access-token-not-for-production";
export const SYNTHETIC_SESSION_SECRET = "ct4-synthetic-session-secret-not-for-production";

export const LATER_SURFACES = [
  { href: "/programme/roadmap", label: "Roadmap", slice: "MD-CT5" },
  { href: "/programme/event-os", label: "Event OS", slice: "MD-CT5" },
  { href: "/programme/event-day", label: "Event-Day", slice: "MD-CT5" },
  { href: "/programme/academy", label: "Academy", slice: "MD-CT5" },
  { href: "/programme/marketing", label: "Marketing", slice: "MD-CT5" },
  { href: "/programme/ushering", label: "Ushering", slice: "MD-CT5" },
  { href: "/programme/integration", label: "Integration", slice: "MD-CT5" },
  { href: "/programme/open-items", label: "Open items", slice: "MD-CT6" },
  { href: "/programme/commits", label: "Commits", slice: "MD-CT5" },
  { href: "/programme/evidence", label: "Evidence", slice: "MD-CT5" },
  { href: "/programme/decisions", label: "Decisions", slice: "MD-CT6" },
  { href: "/programme/releases", label: "Releases", slice: "MD-CT6" },
] as const;
