import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PlatformError } from "./errors.js";

export const DEFAULT_NON_PRODUCTION_RSVP_ACCESS: RsvpAccessConfig = {
  invitationPepper: "rsvp-invitation-pepper-not-for-production",
  sessionSecret: "rsvp-guest-session-secret-not-for-production-32",
  currentKeyId: "rk-1",
  invitationTtlSeconds: 30 * 24 * 60 * 60,
  sessionTtlSeconds: 2 * 60 * 60,
  maxExchangeFailures: 8,
};

export interface RsvpAccessConfig {
  invitationPepper: string;
  sessionSecret: string;
  currentKeyId: string;
  invitationTtlSeconds?: number;
  sessionTtlSeconds?: number;
  maxExchangeFailures?: number;
}

export interface GuestSessionActor {
  sessionId: string;
  invitationId: string;
  guestId: string;
  eventId: string;
  organisationId: string;
  keyId: string;
  issuedAt: string;
  expiresAt: string;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function assertRsvpAccessConfig(config: RsvpAccessConfig, production: boolean): void {
  if (
    production &&
    /not-for-production/i.test(`${config.invitationPepper}${config.sessionSecret}`)
  ) {
    throw new PlatformError(
      "PRODUCTION_ADAPTER_FORBIDDEN",
      "synthetic RSVP secrets cannot be used in production",
    );
  }
  if (config.invitationPepper.length < 24 || config.sessionSecret.length < 24) {
    throw new PlatformError("VALIDATION_FAILED", "RSVP access secrets are too short");
  }
  if (!config.currentKeyId.trim()) {
    throw new PlatformError("VALIDATION_FAILED", "RSVP key id is required");
  }
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string, config: RsvpAccessConfig): string {
  return hmac(config.invitationPepper, token);
}

export function invitationPrefix(token: string): string {
  return token.slice(0, 8);
}

export function issueGuestSession(
  input: {
    sessionId: string;
    invitationId: string;
    guestId: string;
    eventId: string;
    organisationId: string;
    now?: string;
  },
  config: RsvpAccessConfig,
): { token: string; actor: GuestSessionActor } {
  const now = input.now ?? new Date().toISOString();
  const ttl = config.sessionTtlSeconds ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS.sessionTtlSeconds ?? 7200;
  const actor: GuestSessionActor = {
    sessionId: input.sessionId,
    invitationId: input.invitationId,
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

export function readGuestSession(
  token: string | undefined,
  config: RsvpAccessConfig,
  now = new Date().toISOString(),
): GuestSessionActor {
  if (!token) {
    throw new PlatformError("AUTH_REQUIRED", "guest access is unavailable", {
      publicMessage: "This guest access is no longer available.",
    });
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PlatformError("AUTH_REQUIRED", "guest access is unavailable", {
      publicMessage: "This guest access is no longer available.",
    });
  }
  const [payload, signature] = parts;
  if (!safeEqual(signature, hmac(config.sessionSecret, payload))) {
    throw new PlatformError("AUTH_REQUIRED", "guest access is unavailable", {
      publicMessage: "This guest access is no longer available.",
    });
  }
  let actor: GuestSessionActor;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!isGuestSessionActor(parsed)) {
      throw new Error("incomplete");
    }
    actor = parsed;
  } catch {
    throw new PlatformError("AUTH_REQUIRED", "guest access is unavailable", {
      publicMessage: "This guest access is no longer available.",
    });
  }
  if (Date.parse(actor.expiresAt) <= Date.parse(now)) {
    throw new PlatformError("AUTH_REQUIRED", "guest access is unavailable", {
      publicMessage: "This guest access is no longer available.",
    });
  }
  return actor;
}

export function hashGuestSessionToken(token: string, config: RsvpAccessConfig): string {
  return hmac(config.sessionSecret, token);
}

function isGuestSessionActor(value: unknown): value is GuestSessionActor {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sessionId === "string" &&
    typeof record.invitationId === "string" &&
    typeof record.guestId === "string" &&
    typeof record.eventId === "string" &&
    typeof record.organisationId === "string" &&
    typeof record.keyId === "string" &&
    typeof record.issuedAt === "string" &&
    typeof record.expiresAt === "string"
  );
}

export function guestAccessUnavailable(): PlatformError {
  return new PlatformError("NOT_FOUND", "guest access is unavailable", {
    publicMessage: "This guest access is no longer available.",
  });
}
