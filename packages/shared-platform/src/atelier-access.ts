import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  coerceAccessAuthority,
  SYNTHETIC_RAILWAY_PROJECT_NAME,
  type AccessAuthority,
} from "./access-authority.js";
import { ATELIER_HOST_ROLES } from "./constants.js";
import { PlatformError } from "./errors.js";

export type AtelierHostRole = (typeof ATELIER_HOST_ROLES)[number];

export const DEFAULT_NON_PRODUCTION_ATELIER_ACCESS: AtelierAccessConfig = {
  linkPepper: "s04e-atelier-link-pepper-not-for-production-32",
  sessionSecret: "s04e-atelier-session-secret-not-for-production",
  currentKeyId: "ak-1",
  sessionTtlSeconds: 2 * 60 * 60,
  idleTtlSeconds: 30 * 60,
  challengeTtlSeconds: 30 * 60,
  maxExchangeFailures: 8,
  stepUpTtlSeconds: 15 * 60,
};

export interface AtelierAccessConfig {
  linkPepper: string;
  sessionSecret: string;
  currentKeyId: string;
  sessionTtlSeconds?: number;
  idleTtlSeconds?: number;
  challengeTtlSeconds?: number;
  maxExchangeFailures?: number;
  stepUpTtlSeconds?: number;
}

export interface AtelierSessionActor {
  sessionId: string;
  grantId: string;
  personId: string;
  eventId: string;
  organisationId: string;
  atelierId: string;
  hostRole: AtelierHostRole;
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

const RAILWAY_SECRET_MIN_LENGTH = 32;
const LOCAL_SECRET_MIN_LENGTH = 24;

export function usesKnownFixtureAtelierSecrets(config: AtelierAccessConfig): boolean {
  return (
    safeEqual(config.linkPepper, DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.linkPepper) ||
    safeEqual(config.sessionSecret, DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.sessionSecret) ||
    /not-for-production/i.test(`${config.linkPepper}${config.sessionSecret}`)
  );
}

export function atelierSecretFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function resolveAtelierAccessFromEnv(
  env: Record<string, string | undefined>,
  authority: AccessAuthority,
): AtelierAccessConfig {
  const linkPepper = env.EVENT_OS_ATELIER_LINK_PEPPER;
  const sessionSecret = env.EVENT_OS_ATELIER_SESSION_SECRET;
  if (authority.hostedRuntime === "RAILWAY") {
    if (!linkPepper || !sessionSecret) {
      throw new PlatformError(
        "PRODUCTION_ADAPTER_FORBIDDEN",
        "Railway atelier access requires configured EVENT_OS_ATELIER_LINK_PEPPER and EVENT_OS_ATELIER_SESSION_SECRET",
      );
    }
  }
  const config: AtelierAccessConfig = {
    linkPepper: linkPepper ?? DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.linkPepper,
    sessionSecret: sessionSecret ?? DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.sessionSecret,
    currentKeyId: env.EVENT_OS_ATELIER_KEY_ID ?? DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.currentKeyId,
    sessionTtlSeconds: DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.sessionTtlSeconds,
    idleTtlSeconds: DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.idleTtlSeconds,
    challengeTtlSeconds: DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.challengeTtlSeconds,
    maxExchangeFailures: DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.maxExchangeFailures,
    stepUpTtlSeconds: DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.stepUpTtlSeconds,
  };
  assertAtelierAccessConfig(config, authority);
  return config;
}

export function assertAtelierAccessConfig(config: AtelierAccessConfig, authority: AccessAuthority | boolean): void {
  const ctx = coerceAccessAuthority(authority);
  const minLength = ctx.hostedRuntime === "RAILWAY" ? RAILWAY_SECRET_MIN_LENGTH : LOCAL_SECRET_MIN_LENGTH;
  if (config.linkPepper.length < minLength || config.sessionSecret.length < minLength) {
    throw new PlatformError("VALIDATION_FAILED", "atelier access secrets are too short");
  }
  const fixtureSecrets = usesKnownFixtureAtelierSecrets(config);
  if (ctx.productionAuthorised) {
    if (fixtureSecrets || ctx.identityAdapter === "NON_PRODUCTION_FIXTURE") {
      throw new PlatformError(
        "PRODUCTION_ADAPTER_FORBIDDEN",
        "fixture atelier identity/session configuration cannot be used when production is authorised",
      );
    }
    return;
  }
  if (ctx.hostedRuntime !== "RAILWAY") return;
  if (ctx.identityAdapter !== "NON_PRODUCTION_FIXTURE") {
    throw new PlatformError(
      "PRODUCTION_ADAPTER_FORBIDDEN",
      "synthetic atelier access requires the explicit non-production identity adapter",
    );
  }
  if (ctx.railwayProjectName !== SYNTHETIC_RAILWAY_PROJECT_NAME) {
    throw new PlatformError(
      "PRODUCTION_ADAPTER_FORBIDDEN",
      "synthetic atelier access is limited to the atelier-doclar Railway project",
    );
  }
  if (fixtureSecrets) {
    throw new PlatformError(
      "PRODUCTION_ADAPTER_FORBIDDEN",
      "synthetic atelier secrets cannot be used on Railway; configure EVENT_OS_ATELIER_LINK_PEPPER and EVENT_OS_ATELIER_SESSION_SECRET",
    );
  }
}

export function generateAtelierLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAtelierLinkToken(token: string, config: AtelierAccessConfig): string {
  return hmac(config.linkPepper, `atelier-link:${token}`);
}

export function atelierTokenPrefix(token: string): string {
  return token.slice(0, 8);
}

export function issueAtelierSession(
  input: {
    sessionId: string;
    grantId: string;
    personId: string;
    eventId: string;
    organisationId: string;
    atelierId: string;
    hostRole: AtelierHostRole;
    now?: string;
  },
  config: AtelierAccessConfig,
): { token: string; actor: AtelierSessionActor } {
  const now = input.now ?? new Date().toISOString();
  const ttl = config.sessionTtlSeconds ?? DEFAULT_NON_PRODUCTION_ATELIER_ACCESS.sessionTtlSeconds ?? 7200;
  const actor: AtelierSessionActor = {
    sessionId: input.sessionId,
    grantId: input.grantId,
    personId: input.personId,
    eventId: input.eventId,
    organisationId: input.organisationId,
    atelierId: input.atelierId,
    hostRole: input.hostRole,
    keyId: config.currentKeyId,
    issuedAt: now,
    expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(actor), "utf8").toString("base64url");
  return { token: `${payload}.${hmac(config.sessionSecret, payload)}`, actor };
}

export function readAtelierSession(
  token: string | undefined,
  config: AtelierAccessConfig,
  now = new Date().toISOString(),
): AtelierSessionActor {
  if (!token) {
    throw new PlatformError("AUTH_REQUIRED", "atelier access is unavailable", {
      publicMessage: "This private Atelier is no longer available.",
    });
  }
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PlatformError("AUTH_REQUIRED", "atelier access is unavailable", {
      publicMessage: "This private Atelier is no longer available.",
    });
  }
  const [payload, signature] = parts;
  if (!safeEqual(signature, hmac(config.sessionSecret, payload))) {
    throw new PlatformError("AUTH_REQUIRED", "atelier access is unavailable", {
      publicMessage: "This private Atelier is no longer available.",
    });
  }
  let actor: AtelierSessionActor;
  try {
    actor = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AtelierSessionActor;
  } catch {
    throw new PlatformError("AUTH_REQUIRED", "atelier access is unavailable", {
      publicMessage: "This private Atelier is no longer available.",
    });
  }
  if (Date.parse(actor.expiresAt) <= Date.parse(now)) {
    throw new PlatformError("AUTH_REQUIRED", "atelier access is unavailable", {
      publicMessage: "This private Atelier session has ended.",
    });
  }
  return actor;
}

export function atelierAccessUnavailable(): PlatformError {
  return new PlatformError("AUTH_REQUIRED", "atelier access is unavailable", {
    publicMessage: "This private Atelier is no longer available.",
  });
}
