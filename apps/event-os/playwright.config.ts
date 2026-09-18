import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3100", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "pnpm exec next start --port 3100",
    port: 3100,
    reuseExistingServer: false,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://maisondoclar@localhost:5432/eos_s01_test",
      EVENT_OS_SESSION_SECRET:
        process.env.EVENT_OS_SESSION_SECRET ?? "local-dev-session-secret-value-32",
      EVENT_OS_ALLOW_FIXTURES: "1",
      EVENT_OS_GIT_SHA: "e2e",
      NODE_ENV: "production",
    },
  },
});
