import { defineConfig } from "@playwright/test";

const productionLike = process.env.PLAYWRIGHT_PROD === "1" || process.env.CI === "1";
const live = process.env.PLAYWRIGHT_LIVE === "1";
/** Use installed Google Chrome on Windows when Playwright-managed browsers are unavailable. */
const chromiumUse =
  process.platform === "win32" ? ({ channel: "chrome" as const } as const) : ({} as const);

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
  webServer: live
    ? undefined
    : {
        command: productionLike
          ? "node ./scripts/clean-e2e-store.mjs && pnpm exec next start --port 3020"
          : "node ./scripts/clean-e2e-store.mjs && pnpm dev",
        url: "http://127.0.0.1:3020/sign-in",
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: "3020",
          NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=8192"].filter(Boolean).join(" "),
          EVENT_OS_ALLOW_FIXTURES: "1",
          EVENT_OS_TEST_NOW: "2026-09-05T14:00:00.000Z",
          CI: process.env.CI ?? "1",
          EVENT_OS_ACCESS_TOKEN: productionLike
            ? (process.env.EVENT_OS_ACCESS_TOKEN ?? "ci-event-os-access-token")
            : "event-os-access-token-not-for-production",
          EVENT_OS_SESSION_SECRET: productionLike
            ? (process.env.EVENT_OS_SESSION_SECRET ?? "ci-event-os-session-secret-32b")
            : "event-os-session-secret-not-for-production-32",
          EVENT_OS_RSVP_PEPPER: productionLike
            ? (process.env.EVENT_OS_RSVP_PEPPER ?? "ci-event-os-rsvp-pepper-32bytes")
            : "rsvp-invitation-pepper-not-for-production",
          EVENT_OS_RSVP_SESSION_SECRET: productionLike
            ? (process.env.EVENT_OS_RSVP_SESSION_SECRET ?? "ci-event-os-rsvp-session-secret-32")
            : "rsvp-guest-session-secret-not-for-production-32",
          EVENT_OS_ATELIER_LINK_PEPPER: productionLike
            ? (process.env.EVENT_OS_ATELIER_LINK_PEPPER ?? "ci-event-os-atelier-link-pepper-32b")
            : "s04e-atelier-link-pepper-not-for-production-32",
          EVENT_OS_ATELIER_SESSION_SECRET: productionLike
            ? (process.env.EVENT_OS_ATELIER_SESSION_SECRET ?? "ci-event-os-atelier-session-secret-32")
            : "s04e-atelier-session-secret-not-for-production",
          EVENT_OS_LAYOUT_EXPORT_FIXTURE_STORE: "1",
          EVENT_OS_DIAGNOSTIC_TOKEN:
            process.env.EVENT_OS_DIAGNOSTIC_TOKEN ?? "s073-local-diagnostic-token-not-for-production",
        },
      },
});
