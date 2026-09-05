import "server-only";
import { assertSessionConfig, type SessionConfig } from "@maison-doclar/shared-platform";

const DEV_TOKEN = "event-os-access-token-not-for-production";
const DEV_SECRET = "event-os-session-secret-not-for-production-32";

function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}

export function fixturesAllowed(): boolean {
  return runtimeEnv("EVENT_OS_ALLOW_FIXTURES") === "1";
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

export function cookieSecure(requestUrl?: string): boolean {
  const forced = runtimeEnv("EVENT_OS_COOKIE_SECURE");
  if (forced === "1") return true;
  if (forced === "0") return false;
  if (requestUrl) {
    try {
      return new URL(requestUrl).protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}
