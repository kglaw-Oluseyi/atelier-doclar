export const CT4_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0005",
  nativeId: "CT4",
  sliceId: "MD-CT4",
} as const;

export const CT5_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0006",
  nativeId: "CT5",
  sliceId: "MD-CT5",
} as const;

export const TOWER_ROLES = ["executive", "reviewer", "implementer", "reader"] as const;
export type TowerRole = (typeof TOWER_ROLES)[number];

export const SESSION_COOKIE = "md_programme_session";
export const SYNTHETIC_ACCESS_TOKEN = "ct4-synthetic-access-token-not-for-production";
export const SYNTHETIC_SESSION_SECRET = "ct4-synthetic-session-secret-not-for-production";

export const CT5_SURFACES = [
  { href: "/programme/roadmap", label: "Roadmap" },
  { href: "/programme/event-os", label: "Event OS" },
  { href: "/programme/event-day", label: "Event-Day" },
  { href: "/programme/academy", label: "Academy" },
  { href: "/programme/marketing", label: "Marketing" },
  { href: "/programme/ushering", label: "Ushering" },
  { href: "/programme/integration", label: "Integration" },
  { href: "/programme/commits", label: "Commits" },
  { href: "/programme/evidence", label: "Evidence" },
] as const;

export const LATER_SURFACES = [
  { href: "/programme/open-items", label: "Open items", slice: "MD-CT6" },
  { href: "/programme/decisions", label: "Decisions", slice: "MD-CT6" },
  { href: "/programme/releases", label: "Releases", slice: "MD-CT6" },
] as const;
