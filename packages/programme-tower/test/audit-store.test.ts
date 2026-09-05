import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FileAuditRepository, MemoryAuditRepository } from "../src/audit-store.js";
import type { AuditEntry } from "../src/authority.js";

const entry = (id: string): AuditEntry => ({
  id,
  at: "2026-09-05T16:10:00.000Z",
  actorId: "named-reviewer",
  action: "GATE_APPROVAL_ATTEMPT",
  targetId: "GATE-CEO-PRODUCTION",
  result: "rejected",
  reason: "UNAUTHORISED_ACTOR",
});

describe("durable audit repository", () => {
  it("appends without overwrite and is idempotent on the same identity", () => {
    const memory = new MemoryAuditRepository();
    assert.equal(memory.append(entry("AUD-1")).kind, "appended");
    assert.equal(memory.append(entry("AUD-1")).kind, "duplicate");
    assert.equal(memory.list().length, 1);
    assert.throws(() => memory.append({ ...entry("AUD-1"), reason: "other" }));
  });

  it("reconstructs from append-only JSONL", () => {
    const dir = mkdtempSync(join(tmpdir(), "md-audit-"));
    const path = join(dir, "audit.jsonl");
    const first = new FileAuditRepository(path);
    first.append(entry("AUD-1"));
    first.append(entry("AUD-2"));
    const again = new FileAuditRepository(path);
    assert.equal(again.list().length, 2);
    assert.equal(again.append(entry("AUD-1")).kind, "duplicate");
    const text = readFileSync(path, "utf8");
    assert.equal(text.trim().split("\n").length, 2);
    assert.ok(!text.includes("overwrite"));
  });
});
