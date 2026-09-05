import { defineConfig } from "@playwright/test";

const productionLike = process.env.PLAYWRIGHT_PROD === "1" || process.env.CI === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:3020",
    browserName: "chromium",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" as const } }],
  webServer: {
    command: productionLike
      ? "rm -f data/event-os-non-production.json && pnpm start"
      : "rm -f data/event-os-non-production.json && pnpm dev",
    url: "http://127.0.0.1:3020/sign-in",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      EVENT_OS_ALLOW_FIXTURES: "1",
      CI: process.env.CI ?? "1",
      EVENT_OS_ACCESS_TOKEN: productionLike
        ? (process.env.EVENT_OS_ACCESS_TOKEN ?? "ci-event-os-access-token")
        : "event-os-access-token-not-for-production",
      EVENT_OS_SESSION_SECRET: productionLike
        ? (process.env.EVENT_OS_SESSION_SECRET ?? "ci-event-os-session-secret-32b")
        : "event-os-session-secret-not-for-production-32",
    },
  },
});
