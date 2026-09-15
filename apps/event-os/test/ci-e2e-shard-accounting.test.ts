import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const planPath = join(root, "scripts", "ci-e2e-shard-plan.json");

describe("Event OS formal CI e2e shard accounting", () => {
  it("assigns every listed Playwright test file exactly once with 280 tests", () => {
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    assert.equal(plan.design, "sharded-postgres-next-start");
    assert.equal(plan.retries, 0);
    assert.equal(plan.workersPerShard, 1);
    assert.equal(plan.totalTests, 280);
    assert.equal(plan.totalFiles, 130);
    assert.ok(plan.heapMbDefault <= 4096);
    assert.equal(plan.runtime, "next start");
    assert.equal(plan.database, "ephemeral-postgres");

    const listed = spawnSync("pnpm", ["exec", "playwright", "test", "--list"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, CI: "1" },
    });
    assert.equal(listed.status, 0, listed.stderr || listed.stdout);
    const fileCounts = new Map();
    for (const line of listed.stdout.split(/\r?\n/)) {
      const match = line.match(/› ([^:]+\.spec\.ts):/);
      if (!match) continue;
      fileCounts.set(match[1], (fileCounts.get(match[1]) ?? 0) + 1);
    }
    assert.equal(fileCounts.size, 130);
    assert.equal([...fileCounts.values()].reduce((a, b) => a + b, 0), 280);

    const assigned = [];
    let testSum = 0;
    for (const shard of plan.shards) {
      assert.ok(shard.timeoutSeconds > 0);
      assert.equal(shard.files.length > 0, true);
      for (const file of shard.files) {
        assert.ok(fileCounts.has(file), `plan file missing from playwright --list: ${file}`);
        assigned.push(file);
      }
      testSum += shard.tests;
      const expected = shard.files.reduce((n, file) => n + (fileCounts.get(file) ?? 0), 0);
      assert.equal(shard.tests, expected, `shard ${shard.name} test count mismatch`);
    }
    assert.equal(assigned.length, new Set(assigned).size, "duplicate file assignment");
    assert.equal(assigned.length, 130);
    assert.equal(testSum, 280);
    for (const file of fileCounts.keys()) {
      assert.ok(assigned.includes(file), `listed file omitted from plan: ${file}`);
    }
    assert.equal(plan.shards[0]?.name, "eos-s06-current-acceptance");
    assert.deepEqual(plan.shards[0]?.files, ["eos-s06-current-acceptance.spec.ts"]);
  });
});
