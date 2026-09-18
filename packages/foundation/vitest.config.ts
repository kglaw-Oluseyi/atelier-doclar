import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 30000,
    setupFiles: ["./test/setup.ts"],
    env: {
      DATABASE_URL: "postgresql://maisondoclar@localhost:5432/eos_s01_test",
      EVENT_OS_SESSION_SECRET: "synthetic-test-session-secret-32chars",
      EVENT_OS_ALLOW_FIXTURES: "1",
      NODE_ENV: "test",
    },
  },
});
