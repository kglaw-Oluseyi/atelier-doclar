import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3010",
    browserName: "chromium",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3010/programme/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PROGRAMME_ALLOW_FIXTURES: "1",
      PROGRAMME_ACCESS_TOKEN: "ct4-synthetic-access-token-not-for-production",
      PROGRAMME_SESSION_SECRET: "ct4-synthetic-session-secret-not-for-production",
    },
  },
});
