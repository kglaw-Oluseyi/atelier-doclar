import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PlatformError } from "./errors.js";

export const DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS: MerchandiseGuestAccessConfig = {
  grantPepper: "s04c-merch-guest-pepper-not-for-production",
  sessionSecret: "s04c-merch-guest-session-secret-not-prod",
  currentKeyId: "mgk-1",
  grantTtlSeconds: 7 * 24 * 60 * 60,
  sessionTtlSeconds: 2 * 60 * 60,
  maxExchangeFailures: 8,
};

export interface MerchandiseGuestAccessConfig {
  grantPepper: string;
  sessionSecret: string;
  currentKeyId: string;
  grantTtlSeconds?: number;
  sessionTtlSeconds?: number;
  maxExchangeFailures?: number;
}

export interface MerchandiseGuestSessionActor {
  kind: "MERCHANDISE_GUEST";
  sessionId: string;
  grantId: string;
  guestId: string;
  eventId: string;
  organisationId: string;
  keyId: string;
  issuedAt: string;
  expiresAt: string;
}

const GRANT_NAMESPACE = "merch-guest-grant:";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function assertMerchandiseGuestAccessConfig(config: MerchandiseGuestAccessConfig, production: boolean): void {
  if (production && /not-for-production|not-prod/i.test(`${config.grantPepper}${config.sessionSecret}`)) {
    throw new PlatformError("PRODUCTION_ADAPTER_FORBIDDEN", "synthetic merchandise guest secrets cannot be used in production");
  }
  if (config.grantPepper.length < 24 || config.sessionSecret.length < 24) {
    throw new PlatformError("VALIDATION_FAILED", "merchandise guest access secrets are too short");
  }
}

export function generateMerchandiseGuestGrantToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashMerchandiseGuestGrantToken(token: string, config: MerchandiseGuestAccessConfig): string {
  return hmac(config.grantPepper, `${GRANT_NAMESPACE}${token}`);
}

export function merchandiseGuestTokenPrefix(token: string): string {
  return token.slice(0, 8);
}

export function issueMerchandiseGuestSession(
  input: {
    sessionId: string;
    grantId: string;
    guestId: string;
    eventId: string;
    organisationId: string;
    now?: string;
  },
  config: MerchandiseGuestAccessConfig,
): { token: string; actor: MerchandiseGuestSessionActor } {
  const now = input.now ?? new Date().toISOString();
  const ttl = config.sessionTtlSeconds ?? DEFAULT_NON_PRODUCTION_MERCHANDISE_GUEST_ACCESS.sessionTtlSeconds ?? 7200;
  const actor: MerchandiseGuestSessionActor = {
    kind: "MERCHANDISE_GUEST",
    sessionId: input.sessionId,
    grantId: input.grantId,
    guestId: input.guestId,
    eventId: input.eventId,
    organisationId: input.organisationId,
    keyId: config.currentKeyId,
    issuedAt: now,
    expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");
  return { token: `${payload}.${hmac(config.sessionSecret, payload)}`, actor };
}

function isMerchandiseGuestSessionActor(value: unknown): value is MerchandiseGuestSessionActor {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.kind === "MERCHANDISE_GUEST" &&
    typeof record.sessionId === "string" &&
    typeof record.grantId === "string" &&
    typeof record.guestId === "string" &&
    typeof record.eventId === "string" &&
    typeof record.organisationId === "string"
  );
}

export function readMerchandiseGuestSession(
  token: string | undefined,
  config: MerchandiseGuestAccessConfig,
  now = new Date().toISOString(),
): MerchandiseGuestSessionActor {
  if (!token) {
    throw merchandiseGuestAccessUnavailable();
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw merchandiseGuestAccessUnavailable();
  }
  const [payload, signature] = parts;
  if (!safeEqual(signature, hmac(config.sessionSecret, payload))) {
    throw merchandiseGuestAccessUnavailable();
  }
  let actor: MerchandiseGuestSessionActor;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isMerchandiseGuestSessionActor(parsed)) throw new Error("incomplete");
    actor = parsed;
  } catch {
    throw merchandiseGuestAccessUnavailable();
  }
  if (Date.parse(actor.expiresAt) <= Date.parse(now)) {
    throw new PlatformError("AUTH_REQUIRED", "merchandise guest access is unavailable", {
      publicMessage: "This private merchandise access has expired.",
    });
  }
  return actor;
}

export function merchandiseGuestAccessUnavailable(
  message = "This private merchandise access is no longer available.",
): PlatformError {
  return new PlatformError("AUTH_REQUIRED", "merchandise guest access is unavailable", { publicMessage: message });
}
