import "server-only";
import {
  assertRsvpAccessConfig,
  assertSessionConfig,
  DEFAULT_NON_PRODUCTION_RSVP_ACCESS,
  resolveAccessAuthority,
  resolveAtelierAccessFromEnv,
  resolveVendorAccessFromEnv,
  type AccessAuthority,
  type AtelierAccessConfig,
  type RsvpAccessConfig,
  type SessionConfig,
  type VendorAccessConfig,
} from "@maison-doclar/shared-platform";
import { currentApplicationIdentity } from "./build-identity";

const DEV_TOKEN = "event-os-access-token-not-for-production";
const DEV_SECRET = "event-os-session-secret-not-for-production-32";

function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}

export function fixturesAllowed(): boolean {
  return runtimeEnv("EVENT_OS_ALLOW_FIXTURES") === "1";
}

export function databaseUrl(): string | undefined {
  const value = runtimeEnv("DATABASE_URL")?.trim();
  return value || undefined;
}

export function sessionConfig(): SessionConfig {
  const production = runtimeEnv("NODE_ENV") === "production";
  const accessToken = runtimeEnv("EVENT_OS_ACCESS_TOKEN") ?? (production ? "" : DEV_TOKEN);
  const sessionSecret = runtimeEnv("EVENT_OS_SESSION_SECRET") ?? (production ? "" : DEV_SECRET);
  const config = {
    accessToken,
    sessionSecret,
    ttlSeconds: Number(runtimeEnv("EVENT_OS_SESSION_TTL_SECONDS") ?? 8 * 60 * 60),
  };
  assertSessionConfig(config, production);
  return config;
}

export function sessionTtlSeconds(): number {
  return sessionConfig().ttlSeconds ?? 8 * 60 * 60;
}

export function productionAuthorised(): false {
  return false;
}

export function accessAuthority(): AccessAuthority {
  return resolveAccessAuthority({
    productionAuthorised: productionAuthorised(),
    fixturesAllowed: fixturesAllowed(),
    env: process.env,
  });
}

/** Truthful immutable application SHA for this running Event OS bundle. */
export function deployedSha(): string {
  return currentApplicationIdentity().deployedSha;
}

export function applicationIdentity() {
  return currentApplicationIdentity();
}

export function rsvpAccessConfig(): RsvpAccessConfig {
  const config: RsvpAccessConfig = {
    invitationPepper: runtimeEnv("EVENT_OS_RSVP_PEPPER") ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS.invitationPepper,
    sessionSecret: runtimeEnv("EVENT_OS_RSVP_SESSION_SECRET") ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS.sessionSecret,
    currentKeyId: runtimeEnv("EVENT_OS_RSVP_KEY_ID") ?? DEFAULT_NON_PRODUCTION_RSVP_ACCESS.currentKeyId,
    invitationTtlSeconds: DEFAULT_NON_PRODUCTION_RSVP_ACCESS.invitationTtlSeconds,
    sessionTtlSeconds: DEFAULT_NON_PRODUCTION_RSVP_ACCESS.sessionTtlSeconds,
    maxExchangeFailures: DEFAULT_NON_PRODUCTION_RSVP_ACCESS.maxExchangeFailures,
  };
  assertRsvpAccessConfig(config, productionAuthorised());
  return config;
}

export function rsvpSessionTtlSeconds(): number {
  return rsvpAccessConfig().sessionTtlSeconds ?? 2 * 60 * 60;
}

export function vendorAccessConfig(): VendorAccessConfig {
  return resolveVendorAccessFromEnv(process.env, accessAuthority());
}

export function atelierAccessConfig(): AtelierAccessConfig {
  return resolveAtelierAccessFromEnv(process.env, accessAuthority());
}

export function cookieSecure(): boolean {
  const forced = runtimeEnv("EVENT_OS_COOKIE_SECURE");
  if (forced === "1") return true;
  if (forced === "0") return false;
  const publicUrl = runtimeEnv("EVENT_OS_PUBLIC_URL") ?? runtimeEnv("EVENT_OS_BASE_URL");
  if (!publicUrl) return false;
  try {
    return new URL(publicUrl).protocol === "https:";
  } catch {
    return false;
  }
}
