import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { StaffSessionDenialStatus } from "./constants.js";
import { PlatformError } from "./errors.js";
import { StaffSessionActorSchema, type StaffSessionActor } from "./schemas.js";

export type { StaffSessionDenialStatus } from "./constants.js";

export type SessionActor = StaffSessionActor;

export interface SessionConfig {
  accessToken: string;
  sessionSecret: string;
  ttlSeconds?: number;
}

export const DEFAULT_NON_PRODUCTION_STAFF_SESSION: SessionConfig = {
  accessToken: "event-os-access-token-not-for-production",
  sessionSecret: "event-os-session-secret-not-for-production-32",
  ttlSeconds: 8 * 60 * 60,
};

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function sessionUnavailable(message: string, status: StaffSessionDenialStatus): PlatformError {
  return new PlatformError("AUTH_REQUIRED", message, {
    publicMessage: "Sign in is required.",
    details: [status],
  });
}

export function assertSessionConfig(config: SessionConfig, production: boolean): void {
  if (production && /not-for-production/i.test(`${config.accessToken}${config.sessionSecret}`)) {
    throw new PlatformError(
      "PRODUCTION_ADAPTER_FORBIDDEN",
      "synthetic secrets cannot be used in production",
    );
  }
  if (config.sessionSecret.length < 24) {
    throw new PlatformError("VALIDATION_FAILED", "session secret is too short");
  }
}

export function issueSession(
  input: { personId: string; accessToken: string; sessionId?: string; now?: string },
  config: SessionConfig,
): { token: string; actor: StaffSessionActor } {
  if (!config.accessToken || !safeEqual(input.accessToken, config.accessToken)) {
    throw new PlatformError("AUTH_REQUIRED", "access token is not valid", {
      publicMessage: "Sign in is required.",
    });
  }
  if (!input.personId.trim()) {
    throw new PlatformError("VALIDATION_FAILED", "person identity is required");
  }
  const now = input.now ?? new Date().toISOString();
  const ttl = config.ttlSeconds ?? 8 * 60 * 60;
  const actor = StaffSessionActorSchema.parse({
    sessionId: input.sessionId ?? randomUUID(),
    personId: input.personId.trim(),
    issuedAt: now,
    expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString(),
  });
  const payload = Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");
  return { token: `${payload}.${sign(payload, config.sessionSecret)}`, actor };
}

export function readSession(
  token: string | undefined,
  config: SessionConfig,
  now = new Date().toISOString(),
): StaffSessionActor {
  if (!token) throw sessionUnavailable("session is missing", "missing");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw sessionUnavailable("session is malformed", "malformed");
  }
  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload, config.sessionSecret))) {
    throw sessionUnavailable("session signature is invalid", "malformed");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw sessionUnavailable("session payload is malformed", "malformed");
  }
  const actor = StaffSessionActorSchema.safeParse(parsed);
  if (!actor.success) {
    throw sessionUnavailable("session is no longer valid", "legacy");
  }
  if (Date.parse(actor.data.expiresAt) <= Date.parse(now)) {
    throw sessionUnavailable("session has expired", "expired");
  }
  return actor.data;
}

export function hashStaffSessionToken(token: string, config: SessionConfig): string {
  return createHmac("sha256", config.sessionSecret).update(token).digest("base64url");
}
