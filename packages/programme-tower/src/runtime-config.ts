import { SYNTHETIC_ACCESS_TOKEN, SYNTHETIC_SESSION_SECRET } from "./constants.js";

export const SYNTHETIC_WEBHOOK_SECRET = "ct3-synthetic-webhook-secret-not-for-production";

export const RUNTIME_CONFIG_CONTRACT = {
  requiredInProduction: [
    "NODE_ENV",
    "PROGRAMME_SESSION_SECRET",
    "PROGRAMME_ACCESS_TOKEN",
  ],
  optional: [
    "PORT",
    "PROGRAMME_BASE_URL",
    "PROGRAMME_DATA_DIR",
    "PROGRAMME_GITHUB_TOKEN",
    "PROGRAMME_GITHUB_LIVE",
    "PROGRAMME_GITHUB_WEBHOOK_SECRET",
    "PROGRAMME_RAG_CACHE",
    "PROGRAMME_ALLOW_FIXTURES",
  ],
  failClosed: true,
} as const;

export interface RuntimeConfigAssessment {
  mode: "development" | "production" | "test";
  ready: boolean;
  applicationAlive: true;
  sessionConfigured: boolean;
  productionSecretsSafe: boolean;
  githubLiveEnabled: boolean;
  githubTokenPresent: boolean;
  webhookConfigured: boolean;
  persistenceConfigured: boolean;
  ragCache: "memory" | "file";
  baseUrl?: string;
  failures: string[];
}

function modeOf(env: NodeJS.ProcessEnv): RuntimeConfigAssessment["mode"] {
  if (env.NODE_ENV === "production") return "production";
  if (env.NODE_ENV === "test") return "test";
  return "development";
}

function isSyntheticSecret(value: string | undefined): boolean {
  if (!value) return false;
  return (
    value === SYNTHETIC_ACCESS_TOKEN ||
    value === SYNTHETIC_SESSION_SECRET ||
    value === SYNTHETIC_WEBHOOK_SECRET ||
    value.includes("not-for-production")
  );
}

export function evaluateRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfigAssessment {
  const mode = modeOf(env);
  const failures: string[] = [];
  const sessionSecret = env.PROGRAMME_SESSION_SECRET;
  const accessToken = env.PROGRAMME_ACCESS_TOKEN;
  const webhookSecret = env.PROGRAMME_GITHUB_WEBHOOK_SECRET;
  const sessionConfigured = Boolean(sessionSecret && accessToken);
  const githubLiveEnabled = env.PROGRAMME_GITHUB_LIVE === "1";
  const githubTokenPresent = Boolean(env.PROGRAMME_GITHUB_TOKEN);
  const webhookConfigured = Boolean(webhookSecret) && !isSyntheticSecret(webhookSecret);
  const persistenceConfigured = Boolean(env.PROGRAMME_DATA_DIR);
  const ragCache = env.PROGRAMME_RAG_CACHE === "file" ? "file" : "memory";

  if (mode === "production") {
    if (!sessionSecret) failures.push("PROGRAMME_SESSION_SECRET is required in production");
    if (!accessToken) failures.push("PROGRAMME_ACCESS_TOKEN is required in production");
    if (isSyntheticSecret(sessionSecret) || isSyntheticSecret(accessToken)) {
      failures.push("synthetic development secrets are forbidden in production");
    }
    if (githubLiveEnabled && !githubTokenPresent) {
      failures.push("PROGRAMME_GITHUB_TOKEN is required when PROGRAMME_GITHUB_LIVE=1");
    }
  }

  const productionSecretsSafe =
    mode !== "production" ||
    (sessionConfigured && !isSyntheticSecret(sessionSecret) && !isSyntheticSecret(accessToken));

  return {
    mode,
    ready: failures.length === 0 && (mode !== "production" || productionSecretsSafe),
    applicationAlive: true,
    sessionConfigured: sessionConfigured || mode !== "production",
    productionSecretsSafe,
    githubLiveEnabled,
    githubTokenPresent,
    webhookConfigured,
    persistenceConfigured,
    ragCache,
    ...(env.PROGRAMME_BASE_URL ? { baseUrl: env.PROGRAMME_BASE_URL } : {}),
    failures,
  };
}
