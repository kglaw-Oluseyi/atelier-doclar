import { createHmac, timingSafeEqual } from "node:crypto";
import { PlatformError } from "./errors.js";

export interface SessionActor {
  personId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface SessionConfig {
  accessToken: string;
  sessionSecret: string;
  ttlSeconds?: number;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
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
  input: { personId: string; accessToken: string; now?: string },
  config: SessionConfig,
): string {
  if (!config.accessToken || !safeEqual(input.accessToken, config.accessToken)) {
    throw new PlatformError("AUTH_REQUIRED", "access token is not valid");
  }
  if (!input.personId.trim()) {
    throw new PlatformError("VALIDATION_FAILED", "person identity is required");
  }
  const now = input.now ?? new Date().toISOString();
  const ttl = config.ttlSeconds ?? 8 * 60 * 60;
  const actor: SessionActor = {
    personId: input.personId.trim(),
    issuedAt: now,
    expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");
  return `${payload}.${sign(payload, config.sessionSecret)}`;
}

export function readSession(
  token: string | undefined,
  config: SessionConfig,
  now = new Date().toISOString(),
): SessionActor {
  if (!token) throw new PlatformError("AUTH_REQUIRED", "session is missing");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PlatformError("AUTH_REQUIRED", "session is malformed");
  }
  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload, config.sessionSecret))) {
    throw new PlatformError("AUTH_REQUIRED", "session signature is invalid");
  }
  let actor: SessionActor;
  try {
    actor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionActor;
  } catch {
    throw new PlatformError("AUTH_REQUIRED", "session payload is malformed");
  }
  if (!actor.personId || !actor.expiresAt) {
    throw new PlatformError("AUTH_REQUIRED", "session payload is incomplete");
  }
  if (Date.parse(actor.expiresAt) <= Date.parse(now)) {
    throw new PlatformError("AUTH_REQUIRED", "session has expired");
  }
  return actor;
}
