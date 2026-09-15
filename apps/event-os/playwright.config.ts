import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const appDir = dirname(fileURLToPath(import.meta.url));

/** Formal CI: production build + ephemeral Postgres (never next-dev, never Railway). */
const ciPostgres = process.env.EVENT_OS_CI_POSTGRES === "1";
const productionLike = process.env.PLAYWRIGHT_PROD === "1";
const live = process.env.PLAYWRIGHT_LIVE === "1";
const checkpoint = Boolean(process.env.EVENT_OS_CHECKPOINT_MANIFEST?.trim());
/** Use installed Google Chrome on Windows when Playwright-managed browsers are unavailable. */
const chromiumUse =
  process.platform === "win32" ? ({ channel: "chrome" as const } as const) : ({} as const);

if (ciPostgres && !process.env.DATABASE_URL?.trim()) {
  throw new Error("EVENT_OS_CI_POSTGRES=1 requires DATABASE_URL for next start");
}
if (ciPostgres && /railway\.app|railway\.internal/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("EVENT_OS_CI_POSTGRES refuses Railway DATABASE_URL");
}

function webServerEnv(preserveDatabaseUrl: boolean) {
  const env = {
    ...process.env,
    PORT: "3020",
    NODE_OPTIONS: [
      process.env.NODE_OPTIONS,
      `--max-old-space-size=${process.env.EVENT_OS_E2E_HEAP_MB ?? (ciPostgres ? "2048" : "3072")}`,
    ]
      .filter(Boolean)
      .join(" "),
    EVENT_OS_ALLOW_FIXTURES: "1",
    EVENT_OS_TEST_NOW: "2026-09-05T14:00:00.000Z",
    CI: process.env.CI ?? "1",
    EVENT_OS_ACCESS_TOKEN:
      process.env.EVENT_OS_ACCESS_TOKEN ??
      (ciPostgres || productionLike ? "ci-event-os-access-token" : "event-os-access-token-not-for-production"),
    EVENT_OS_SESSION_SECRET:
      process.env.EVENT_OS_SESSION_SECRET ??
      (ciPostgres || productionLike ? "ci-event-os-session-secret-32b" : "event-os-session-secret-not-for-production-32"),
    EVENT_OS_RSVP_PEPPER:
      process.env.EVENT_OS_RSVP_PEPPER ??
      (ciPostgres || productionLike ? "ci-event-os-rsvp-pepper-32bytes" : "rsvp-invitation-pepper-not-for-production"),
    EVENT_OS_RSVP_SESSION_SECRET:
      process.env.EVENT_OS_RSVP_SESSION_SECRET ??
      (ciPostgres || productionLike
        ? "ci-event-os-rsvp-session-secret-32"
        : "rsvp-guest-session-secret-not-for-production-32"),
    EVENT_OS_ATELIER_LINK_PEPPER:
      process.env.EVENT_OS_ATELIER_LINK_PEPPER ??
      (ciPostgres || productionLike
        ? "ci-event-os-atelier-link-pepper-32b"
        : "s04e-atelier-link-pepper-not-for-production-32"),
    EVENT_OS_ATELIER_SESSION_SECRET:
      process.env.EVENT_OS_ATELIER_SESSION_SECRET ??
      (ciPostgres || productionLike
        ? "ci-event-os-atelier-session-secret-32"
        : "s04e-atelier-session-secret-not-for-production"),
    EVENT_OS_LAYOUT_EXPORT_FIXTURE_STORE: "1",
    EVENT_OS_DIAGNOSTIC_TOKEN:
      process.env.EVENT_OS_DIAGNOSTIC_TOKEN ?? "s073-local-diagnostic-token-not-for-production",
  };
  if (!preserveDatabaseUrl) delete env.DATABASE_URL;
  delete env.PLAYWRIGHT_LIVE;
  delete env.PLAYWRIGHT_BASE_URL;
  delete env.PLAYWRIGHT_EXPECTED_SHA;
  return env;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL: live
      ? (process.env.PLAYWRIGHT_BASE_URL ?? "https://event-os-production-bc8d.up.railway.app")
      : "http://127.0.0.1:3020",
    browserName: "chromium",
    ...chromiumUse,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" as const, ...chromiumUse } }],
  // Formal CI (EVENT_OS_CI_POSTGRES=1): next start + ephemeral Postgres DATABASE_URL preserved.
  // Local default: next-dev + file store (DATABASE_URL unset). Live/Railway: no webServer.
  // PLAYWRIGHT_PROD=1 without CI Postgres remains a local experiment that unsets DATABASE_URL
  // and therefore cannot use the file-store under production NODE_ENV — not formal CI.
  webServer: live || checkpoint
    ? undefined
    : ciPostgres
      ? {
          command: "pnpm exec next start --port 3020",
          url: "http://127.0.0.1:3020/sign-in",
          reuseExistingServer: false,
          cwd: appDir,
          timeout: 120_000,
          env: webServerEnv(true),
        }
      : {
          command: productionLike
            ? "env -u DATABASE_URL node ./scripts/clean-e2e-store.mjs && env -u DATABASE_URL pnpm exec next start --port 3020"
            : "env -u DATABASE_URL node ./scripts/clean-e2e-store.mjs && env -u DATABASE_URL pnpm dev",
          url: "http://127.0.0.1:3020/sign-in",
          reuseExistingServer: false,
          cwd: appDir,
          timeout: 120_000,
          env: webServerEnv(false),
        },
});
