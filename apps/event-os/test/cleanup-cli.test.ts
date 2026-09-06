import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const cwd = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("synthetic cleanup CLI packaging", () => {
  it("runs a non-destructive preview without importing TypeScript workspace sources via node", () => {
    const result = spawnSync("pnpm", ["seed:cleanup"], {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "",
        RAILWAY_PROJECT_ID: "",
        RAILWAY_PROJECT_NAME: "",
        RAILWAY_ENVIRONMENT: "",
        EVENT_OS_CLEANUP_SCOPE: "",
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /"mode": "PREVIEW"/);
    assert.match(result.stdout, /Dry-run only/);
    assert.doesNotMatch(result.stdout, /postgresql:\/\//);
    assert.doesNotMatch(result.stderr, /Unknown file extension "\.ts"/);
  });

  it("refuses execute when not bound to Railway project atelier-doclar", () => {
    const result = spawnSync("pnpm", ["seed:cleanup", "--", "--execute", "--confirm", "SYNTHETIC_CLEANUP_CONFIRMED"], {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "",
        RAILWAY_PROJECT_ID: "",
        RAILWAY_PROJECT_NAME: "",
        RAILWAY_ENVIRONMENT: "",
        EVENT_OS_CLEANUP_SCOPE: "atelier-doclar",
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}\n${result.stdout}`, /atelier-doclar/);
  });
});
