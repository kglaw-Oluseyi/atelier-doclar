import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FileBackedSeatingV2Repository, seatingV2StorePathFor } from "../src/server/file-seating-v2-store.ts";

const ORG = "00000000-0000-4000-8000-000000000001";
const EVENT = "00000000-0000-4000-8000-000000000021";

function bindingRow(id: string) {
  return {
    id,
    organisationId: ORG,
    eventId: EVENT,
    layoutId: "11111111-1111-4111-8111-111111111103",
    layoutPublicationId: "11111111-1111-4111-8111-111111111102",
    layoutContentHash: "a".repeat(64),
    state: "ACTIVE" as const,
    version: 1,
    proposedByPersonId: "00000000-0000-4000-8000-000000000043",
    proposedAt: "2026-09-14T00:00:00.000Z",
    activatedByPersonId: "00000000-0000-4000-8000-000000000044",
    activatedAt: "2026-09-14T00:00:00.000Z",
    reason: "unit persist",
    schemaVersion: 1,
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-14T00:00:00.000Z",
  };
}

describe("FileBackedSeatingV2Repository", () => {
  it("persists layout bindings across repository instances (restart)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "s075-v2-file-"));
    const platform = join(dir, "event-os-non-production.json");
    const path = seatingV2StorePathFor(platform);
    writeFileSync(platform, "{}");
    let first: FileBackedSeatingV2Repository | undefined;
    let second: FileBackedSeatingV2Repository | undefined;
    try {
      first = new FileBackedSeatingV2Repository(path, { platformStorePath: platform });
      await first.transaction(async (tx) => {
        await tx.insert("layoutBindings", bindingRow("11111111-1111-4111-8111-111111111101"));
      });
      first.dispose();
      first = undefined;

      const raw = JSON.parse(readFileSync(path, "utf8")) as {
        schemaVersion: number;
        platformStorePath: string;
        state: { layoutBindings: unknown[] };
      };
      assert.equal(raw.schemaVersion, 1);
      assert.equal(raw.platformStorePath, platform);
      assert.equal(raw.state.layoutBindings.length, 1);

      second = new FileBackedSeatingV2Repository(path, { platformStorePath: platform });
      const bindings = await second.transaction(async (tx) =>
        tx.list("layoutBindings", { organisationId: ORG, eventId: EVENT }),
      );
      assert.equal(bindings.length, 1);
      assert.equal((bindings[0] as { state: string }).state, "ACTIVE");
    } finally {
      first?.dispose();
      second?.dispose();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("derives sibling seating-v2 path from platform store path", () => {
    assert.equal(
      seatingV2StorePathFor("/tmp/foo/event-os-non-production.json"),
      "/tmp/foo/event-os-non-production.seating-v2.json",
    );
  });

  it("rolls back memory when a transaction throws before durable write", async () => {
    const dir = mkdtempSync(join(tmpdir(), "s075-v2-rb-"));
    const platform = join(dir, "event-os-non-production.json");
    const path = seatingV2StorePathFor(platform);
    writeFileSync(platform, "{}");
    const repo = new FileBackedSeatingV2Repository(path, { platformStorePath: platform });
    try {
      await assert.rejects(
        repo.transaction(async (tx) => {
          await tx.insert("layoutBindings", bindingRow("11111111-1111-4111-8111-111111111111"));
          throw new Error("forced failure");
        }),
        /forced failure/,
      );
      assert.equal(existsSync(path), false, "failed transaction must not create the durable seating store");
      const bindings = await repo.transaction(async (tx) =>
        tx.list("layoutBindings", { organisationId: ORG, eventId: EVENT }),
      );
      assert.equal(bindings.length, 0);
    } finally {
      repo.dispose();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a second simultaneous writer (single-writer lock)", () => {
    const dir = mkdtempSync(join(tmpdir(), "s075-v2-lock-"));
    const platform = join(dir, "event-os-non-production.json");
    const path = seatingV2StorePathFor(platform);
    writeFileSync(platform, "{}");
    const first = new FileBackedSeatingV2Repository(path, { platformStorePath: platform });
    try {
      assert.throws(
        () => new FileBackedSeatingV2Repository(path, { platformStorePath: platform }),
        /already locked \(single-writer\)/,
      );
    } finally {
      first.dispose();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reclaims a lock left by a dead process", () => {
    const dir = mkdtempSync(join(tmpdir(), "s075-v2-stale-"));
    const platform = join(dir, "event-os-non-production.json");
    const path = seatingV2StorePathFor(platform);
    writeFileSync(platform, "{}");
    writeFileSync(`${path}.lock`, "999999999\n");
    const repo = new FileBackedSeatingV2Repository(path, { platformStorePath: platform });
    try {
      assert.ok(repo.lockedPlatformStorePath);
    } finally {
      repo.dispose();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails closed on corrupt or truncated seating store", () => {
    const dir = mkdtempSync(join(tmpdir(), "s075-v2-corrupt-"));
    const platform = join(dir, "event-os-non-production.json");
    const path = seatingV2StorePathFor(platform);
    writeFileSync(platform, "{}");
    writeFileSync(path, "{not-json");
    assert.throws(
      () => new FileBackedSeatingV2Repository(path, { platformStorePath: platform }),
      /corrupt|truncated|fail-closed/,
    );
    writeFileSync(path, "");
    assert.throws(
      () => new FileBackedSeatingV2Repository(path, { platformStorePath: platform }),
      /empty|fail-closed/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("fails closed when platform-store identity drifts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "s075-v2-drift-"));
    const platform = join(dir, "event-os-non-production.json");
    const other = join(dir, "other-store.json");
    const path = seatingV2StorePathFor(platform);
    writeFileSync(platform, "{}");
    writeFileSync(other, "{}");
    const first = new FileBackedSeatingV2Repository(path, { platformStorePath: platform });
    try {
      await first.transaction(async (tx) => {
        await tx.insert("layoutBindings", bindingRow("11111111-1111-4111-8111-111111111121"));
      });
    } finally {
      first.dispose();
    }
    assert.throws(
      () => new FileBackedSeatingV2Repository(path, { platformStorePath: other }),
      /identity drift/,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("cleanup of one temporary store does not touch a sibling store", async () => {
    const root = mkdtempSync(join(tmpdir(), "s075-v2-clean-"));
    const aDir = join(root, "a");
    const bDir = join(root, "b");
    mkdirSync(aDir);
    mkdirSync(bDir);
    const aPlatform = join(aDir, "event-os-non-production.json");
    const bPlatform = join(bDir, "event-os-non-production.json");
    writeFileSync(aPlatform, "{}");
    writeFileSync(bPlatform, "{}");
    const aPath = seatingV2StorePathFor(aPlatform);
    const bPath = seatingV2StorePathFor(bPlatform);
    const a = new FileBackedSeatingV2Repository(aPath, { platformStorePath: aPlatform });
    const b = new FileBackedSeatingV2Repository(bPath, { platformStorePath: bPlatform });
    try {
      await a.transaction(async (tx) => {
        await tx.insert("layoutBindings", bindingRow("11111111-1111-4111-8111-111111111131"));
      });
      await b.transaction(async (tx) => {
        await tx.insert("layoutBindings", bindingRow("11111111-1111-4111-8111-111111111132"));
      });
    } finally {
      a.dispose();
      b.dispose();
    }
    rmSync(aDir, { recursive: true, force: true });
    assert.equal(existsSync(aPath), false);
    assert.equal(existsSync(bPath), true);
    const reopened = new FileBackedSeatingV2Repository(bPath, { platformStorePath: bPlatform });
    try {
      const bindings = await reopened.transaction(async (tx) =>
        tx.list("layoutBindings", { organisationId: ORG, eventId: EVENT }),
      );
      assert.equal(bindings.length, 1);
    } finally {
      reopened.dispose();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
