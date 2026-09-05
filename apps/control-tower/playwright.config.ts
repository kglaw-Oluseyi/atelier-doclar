import { defineConfig } from "@playwright/test";

const productionLike = process.env.PLAYWRIGHT_PROD === "1" || process.env.CI === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:3010",
    browserName: "chromium",
  },
  webServer: {
    command: productionLike ? "pnpm start" : "pnpm dev",
    url: "http://127.0.0.1:3010/programme/login",
    reuseExistingServer: !process.env.CI && process.env.PLAYWRIGHT_PROD !== "1",
    timeout: 120_000,
    env: {
      ...process.env,
      PROGRAMME_ROOT: process.env.PROGRAMME_ROOT ?? process.cwd().replace(/\/apps\/control-tower$/, ""),
      PROGRAMME_ALLOW_FIXTURES: "1",
      PROGRAMME_GITHUB_LIVE: "",
      PROGRAMME_ACCESS_TOKEN: productionLike
        ? (process.env.PROGRAMME_ACCESS_TOKEN ?? "ci-control-tower-access-token")
        : "ct4-synthetic-access-token-not-for-production",
      PROGRAMME_SESSION_SECRET: productionLike
        ? (process.env.PROGRAMME_SESSION_SECRET ?? "ci-control-tower-session-secret-32b")
        : "ct4-synthetic-session-secret-not-for-production",
    },
  },
});
