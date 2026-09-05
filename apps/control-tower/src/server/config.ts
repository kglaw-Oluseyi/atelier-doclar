import "server-only";
import {
  SYNTHETIC_ACCESS_TOKEN,
  SYNTHETIC_SESSION_SECRET,
  type SessionConfig,
} from "@maison-doclar/programme-tower";

export function sessionConfig(): SessionConfig {
  const production = process.env.NODE_ENV === "production";
  const accessToken = process.env.PROGRAMME_ACCESS_TOKEN;
  const sessionSecret = process.env.PROGRAMME_SESSION_SECRET;
  if (production) {
    if (!accessToken || !sessionSecret) {
      throw new Error("production session configuration is absent");
    }
    if (accessToken.includes("not-for-production") || sessionSecret.includes("not-for-production")) {
      throw new Error("synthetic development secrets are forbidden in production");
    }
    return {
      accessToken,
      sessionSecret,
      ttlSeconds: Number(process.env.PROGRAMME_SESSION_TTL_SECONDS ?? 2 * 60 * 60),
    };
  }
  return {
    accessToken: accessToken ?? SYNTHETIC_ACCESS_TOKEN,
    sessionSecret: sessionSecret ?? SYNTHETIC_SESSION_SECRET,
  };
}

export function authMode(): "development" | "TEMPORARY_LIVE_VERIFICATION" | "production-idp" {
  if (process.env.PROGRAMME_AUTH_MODE === "TEMPORARY_LIVE_VERIFICATION") return "TEMPORARY_LIVE_VERIFICATION";
  if (process.env.NODE_ENV === "production") return "TEMPORARY_LIVE_VERIFICATION";
  return "development";
}

export function fixturesAllowed(): boolean {
  return process.env.PROGRAMME_ALLOW_FIXTURES === "1";
}

export function isProductionIdp(): boolean {
  return false;
}

export function sessionTtlSeconds(): number {
  return sessionConfig().ttlSeconds ?? 8 * 60 * 60;
}
