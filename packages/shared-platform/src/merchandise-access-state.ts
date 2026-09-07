export const MERCHANDISE_ACCESS_DISPLAY_STATES = [
  "not_issued",
  "active",
  "expiring",
  "expired",
  "revoked",
  "renewed",
  "unavailable",
] as const;

export type MerchandiseAccessDisplayState = (typeof MERCHANDISE_ACCESS_DISPLAY_STATES)[number];

const EXPIRING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function describeMerchandiseAccessState(input: {
  status: string;
  expiresAt: string;
  revokedAt?: string;
  renewedAt?: string;
  now: string;
  hasUsableIssuedLink: boolean;
}): { state: MerchandiseAccessDisplayState; ready: boolean; label: string } {
  const nowMs = Date.parse(input.now);
  const expMs = Date.parse(input.expiresAt);
  if (input.status === "REVOKED" || input.revokedAt) {
    return { state: "revoked", ready: false, label: "Revoked" };
  }
  if (input.status === "SUPERSEDED") {
    return { state: "renewed", ready: false, label: "Superseded by renewal" };
  }
  if (input.status === "EXPIRED" || (!Number.isNaN(expMs) && expMs <= nowMs)) {
    return { state: "expired", ready: false, label: "Expired" };
  }
  if (input.status !== "ACTIVE") {
    return { state: "unavailable", ready: false, label: "Unavailable" };
  }
  const expiring = !Number.isNaN(expMs) && expMs - nowMs <= EXPIRING_WINDOW_MS;
  if (input.renewedAt) {
    return {
      state: expiring ? "expiring" : "renewed",
      ready: input.hasUsableIssuedLink,
      label: input.hasUsableIssuedLink ? (expiring ? "Renewed · expiring" : "Renewed · usable") : "Renewed · re-issue for a usable link",
    };
  }
  if (!input.hasUsableIssuedLink) {
    return {
      state: expiring ? "expiring" : "active",
      ready: false,
      label: expiring ? "Active · expiring · renew for a usable link" : "Active · renew or issue for a usable synthetic link",
    };
  }
  return {
    state: expiring ? "expiring" : "active",
    ready: true,
    label: expiring ? "Expiring · currently usable" : "Active",
  };
}
