export const LV1_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-S002",
  nativeId: "LV1",
  sliceId: "MD-LV1",
} as const;

export const FC1_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-S001",
  nativeId: "FC1",
  sliceId: "MD-FC1",
} as const;

export const CT4_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0005",
  nativeId: "CT4",
  sliceId: "MD-CT4",
} as const;

export const CT9_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0010",
  nativeId: "CT9",
  sliceId: "MD-CT9",
} as const;

export const CT8_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0009",
  nativeId: "CT8",
  sliceId: "MD-CT8",
} as const;

export const CT7_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0008",
  nativeId: "CT7",
  sliceId: "MD-CT7",
} as const;

export const CT6_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0007",
  nativeId: "CT6",
  sliceId: "MD-CT6",
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

export const CT6_SURFACES = [
  { href: "/programme/open-items", label: "Open items" },
  { href: "/programme/decisions", label: "Decisions" },
  { href: "/programme/releases", label: "Releases" },
] as const;

export const CT7_SURFACES = [{ href: "/programme/ask", label: "Ask" }] as const;

export const CT8_SURFACES = [{ href: "/programme/charts", label: "Charts" }] as const;

export const CT9_SURFACES = [{ href: "/programme/ops", label: "Operations" }] as const;

export const LATER_SURFACES: ReadonlyArray<{ href: string; label: string; slice: string }> = [];
