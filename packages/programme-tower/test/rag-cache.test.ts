import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ProgrammeIndexCache, programmeSourceFingerprint } from "../src/rag-cache.js";
import { resolveProgrammeIndex } from "../src/rag.js";

describe("programme index cache", () => {
  it("reuses an unchanged fingerprint and rebuilds after invalidation", () => {
    const first = resolveProgrammeIndex({ now: "2026-09-05T16:10:00.000Z" });
    const second = resolveProgrammeIndex({ now: "2026-09-05T17:10:00.000Z" });
    assert.equal(first.sourceFingerprint, second.sourceFingerprint);
    assert.equal(first.builtAt, second.builtAt);
    const fingerprint = programmeSourceFingerprint();
    assert.equal(typeof fingerprint, "string");
    assert.equal(fingerprint.length, 64);
  });

  it("persists a file cache behind the same fingerprint", () => {
    const dir = mkdtempSync(join(tmpdir(), "md-rag-"));
    const cache = new ProgrammeIndexCache(join(dir, "index.json"));
    const first = cache.getOrBuild({ now: "2026-09-05T16:10:00.000Z" });
    const second = cache.getOrBuild({ now: "2026-09-05T17:10:00.000Z" });
    assert.equal(first.sourceFingerprint, second.sourceFingerprint);
    assert.equal(first.chunks.length, second.chunks.length);
    assert.ok(first.chunks.every((chunk) => chunk.classification === "control" || chunk.classification === "restricted"));
  });
});
