import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalSetup() {
  if (process.env.EVENT_OS_CAPACITY_600 !== "1") return;
  if (process.env.EVENT_OS_CI_POSTGRES !== "1") {
    throw new Error("EOS-S06 capacity-600 browser evidence requires EVENT_OS_CI_POSTGRES=1 and ephemeral DATABASE_URL");
  }
  if (process.env.CAPACITY_600_SKIP_SEED === "1") return;
  const appDir = dirname(fileURLToPath(import.meta.url));
  execSync("pnpm exec tsx ./scripts/s06-capacity-600-seed.ts", {
    cwd: join(appDir, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=8192"].filter(Boolean).join(" "),
    },
  });
}
