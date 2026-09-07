import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PlatformError } from "./errors.js";

export const DEFAULT_NON_PRODUCTION_VENDOR_ACCESS: VendorAccessConfig = {
  assignmentPepper: "s04c-vendor-pepper-not-for-production-32",
  sessionSecret: "s04c-vendor-session-secret-not-for-production",
  currentKeyId: "vk-1",
  sessionTtlSeconds: 2 * 60 * 60,
  maxExchangeFailures: 8,
};

export interface VendorAccessConfig {
  assignmentPepper: string;
  sessionSecret: string;
  currentKeyId: string;
  sessionTtlSeconds?: number;
  maxExchangeFailures?: number;
}

export interface VendorSessionActor {
  sessionId: string;
  assignmentId: string;
  vendorId: string;
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

export function assertVendorAccessConfig(config: VendorAccessConfig, production: boolean): void {
  if (production && /not-for-production/i.test(`${config.assignmentPepper}${config.sessionSecret}`)) {
    throw new PlatformError("PRODUCTION_ADAPTER_FORBIDDEN", "synthetic vendor secrets cannot be used in production");
  }
  if (config.assignmentPepper.length < 24 || config.sessionSecret.length < 24) {
    throw new PlatformError("VALIDATION_FAILED", "vendor access secrets are too short");
  }
}

export function generateVendorAssignmentToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashVendorAssignmentToken(token: string, config: VendorAccessConfig): string {
  return hmac(config.assignmentPepper, token);
}

export function vendorTokenPrefix(token: string): string {
  return token.slice(0, 8);
}

export function issueVendorSession(
  input: {
    sessionId: string;
    assignmentId: string;
    vendorId: string;
    eventId: string;
    organisationId: string;
    now?: string;
  },
  config: VendorAccessConfig,
): { token: string; actor: VendorSessionActor } {
  const now = input.now ?? new Date().toISOString();
  const ttl = config.sessionTtlSeconds ?? DEFAULT_NON_PRODUCTION_VENDOR_ACCESS.sessionTtlSeconds ?? 7200;
  const actor: VendorSessionActor = {
    sessionId: input.sessionId,
    assignmentId: input.assignmentId,
    vendorId: input.vendorId,
    eventId: input.eventId,
    organisationId: input.organisationId,
    keyId: config.currentKeyId,
    issuedAt: now,
    expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");
  return { token: `${payload}.${hmac(config.sessionSecret, payload)}`, actor };
}

export function readVendorSession(
  token: string | undefined,
  config: VendorAccessConfig,
  now = new Date().toISOString(),
): VendorSessionActor {
  if (!token) {
    throw new PlatformError("AUTH_REQUIRED", "vendor access is unavailable", {
      publicMessage: "This vendor access is no longer available.",
    });
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PlatformError("AUTH_REQUIRED", "vendor access is unavailable", {
      publicMessage: "This vendor access is no longer available.",
    });
  }
  const [payload, signature] = parts;
  if (!safeEqual(signature, hmac(config.sessionSecret, payload))) {
    throw new PlatformError("AUTH_REQUIRED", "vendor access is unavailable", {
      publicMessage: "This vendor access is no longer available.",
    });
  }
  const actor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as VendorSessionActor;
  if (Date.parse(actor.expiresAt) <= Date.parse(now)) {
    throw new PlatformError("AUTH_REQUIRED", "vendor access is unavailable", {
      publicMessage: "This vendor access has expired.",
    });
  }
  return actor;
}

export function vendorAccessUnavailable(message = "This vendor access is no longer available."): PlatformError {
  return new PlatformError("AUTH_REQUIRED", "vendor access is unavailable", { publicMessage: message });
}
