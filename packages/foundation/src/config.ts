import { createHash } from "node:crypto";

export interface AppConfig {
  databaseUrl: string;
  sessionSecret: string;
  gitSha: string;
  allowFixtures: boolean;
  productionAuthorised: false;
  nodeEnv: string;
  schema: "eos_s01";
  idleTimeoutSeconds: number;
  absoluteTimeoutSeconds: number;
  oidcIssuer: string | null;
}

const SECRET_BAN = /not-for-production|changeme|password123/i;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env.EVENT_OS_PRODUCTION_AUTHORISED === "true") {
    throw new Error("productionAuthorised must remain false");
  }
  const databaseUrl = env.DATABASE_URL ?? "";
  const sessionSecret = env.EVENT_OS_SESSION_SECRET ?? "";
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (sessionSecret.length < 32)
    throw new Error("EVENT_OS_SESSION_SECRET must be at least 32 characters");
  if (env.NODE_ENV === "production" && SECRET_BAN.test(sessionSecret)) {
    throw new Error("synthetic session secrets are forbidden when NODE_ENV=production");
  }
  const allowFixtures = env.EVENT_OS_ALLOW_FIXTURES === "1";
  return {
    databaseUrl,
    sessionSecret,
    gitSha: env.EVENT_OS_GIT_SHA ?? "unknown",
    allowFixtures,
    productionAuthorised: false,
    nodeEnv: env.NODE_ENV ?? "development",
    schema: "eos_s01",
    idleTimeoutSeconds: 30 * 60,
    absoluteTimeoutSeconds: 12 * 60 * 60,
    oidcIssuer: env.EVENT_OS_OIDC_ISSUER ?? null,
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
