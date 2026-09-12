import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checksumFor, runPlatformMigrations } from "../src/migrations.js";
import { MemorySeatingRepository } from "../src/memory-seating-store.js";
import { PostgresPlatformStore, MemoryPlatformPg } from "../src/postgres-store.js";
import { PostgresSeatingRepository } from "../src/postgres-seating-store.js";
import { EOS_S06_SEATING_MIGRATION_ID } from "../src/seating-postgres-schema.js";
import { PLATFORM_MIGRATIONS } from "../src/migrations.js";
import { people } from "./helpers.js";

const NOW = "2026-09-12T08:00:00.000Z";

function edition(overrides?: Record<string, unknown>) {
  return {
    id: "00000000-0000-4000-8000-000000000701",
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    version: 0,
    status: "FROZEN",
    guestCohortHash: "a".repeat(64),
    rsvpTruthHash: "b".repeat(64),
    layoutPublicationId: "00000000-0000-4000-8000-000000000702",
    layoutContentHash: "c".repeat(64),
    contentHash: "d".repeat(64),
    createdBy: people.personPlanner,
    current: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("EOS-S06 seating persistence", () => {
  it("adds additive migration 007 without editing earlier checksums", async () => {
    const pg = new MemoryPlatformPg();
    const first = await runPlatformMigrations(pg);
    const second = await runPlatformMigrations(pg);
    assert.equal(first.status, "APPLIED");
    assert.equal(second.status, "APPLIED");
    assert.ok(first.applied.includes(EOS_S06_SEATING_MIGRATION_ID));
    assert.ok(pg.migrations.some((item) => item.id === EOS_S06_SEATING_MIGRATION_ID));
    const six = PLATFORM_MIGRATIONS.find((item) => item.id === "006_risk_authority_governance_receipts");
    assert.ok(six);
    assert.equal(
      pg.migrations.find((item) => item.id === "006_risk_authority_governance_receipts")?.checksum,
      checksumFor(six.sql),
    );
    await PostgresPlatformStore.migrate(pg);
  });

  it("preserves an unrelated event when a partial event load writes", async () => {
    const repo = new MemorySeatingRepository();
    await repo.transaction(async (tx) => {
      await tx.insert("inputEditions", edition());
      await tx.insert(
        "inputEditions",
        edition({
          id: "00000000-0000-4000-8000-000000000703",
          eventId: people.eventAlphaTwo,
          contentHash: "e".repeat(64),
        }),
      );
    });
    await repo.transaction(async (tx) => {
      const loaded = await tx.load("inputEditions", "00000000-0000-4000-8000-000000000701", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      });
      assert.ok(loaded);
      const other = await tx.list("inputEditions", { organisationId: people.orgMaison, eventId: people.eventAlphaTwo });
      assert.equal(other.length, 1);
    });
    const all = await repo.backingStore.collection("inputEditions");
    assert.equal(all.length, 2);
  });

  it("rolls back a domain write when audit fails in the same transaction", async () => {
    const repo = new MemorySeatingRepository();
    await assert.rejects(
      () =>
        repo.transaction(async (tx) => {
          await tx.insert("inputEditions", edition());
          throw new Error("synthetic audit failure");
        }),
      /synthetic audit failure/,
    );
    assert.equal(repo.backingStore.collection("inputEditions").length, 0);
    assert.equal(repo.backingStore.audit.length, 0);
  });

  it("rejects a stale two-writer CAS update", async () => {
    const repo = new MemorySeatingRepository();
    await repo.transaction(async (tx) => {
      await tx.insert("inputEditions", edition());
    });
    await repo.transaction(async (tx) => {
      await tx.updateVersioned("inputEditions", edition().id, 0, { version: 1, status: "STALE" });
    });
    await assert.rejects(
      () =>
        repo.transaction(async (tx) => {
          await tx.updateVersioned("inputEditions", edition().id, 0, { version: 1, status: "SUPERSEDED" });
        }),
      /VERSION_CONFLICT|stale/,
    );
    assert.equal(repo.backingStore.collection("inputEditions")[0]?.status, "STALE");
    assert.equal(repo.backingStore.collection("inputEditions")[0]?.version, 1);
  });

  it("replays an identical idempotency receipt and isolates organisations", async () => {
    const repo = new MemorySeatingRepository();
    const receipt = {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      action: "freezeSeatingInputs",
      idempotencyKey: "idempotency-1",
      requestHash: "f".repeat(64),
      resultIdentity: edition().id,
      application: "APPLIED" as const,
      createdAt: NOW,
    };
    await repo.transaction(async (tx) => {
      await tx.insertIdempotency(receipt);
      const replayed = await tx.insertIdempotency(receipt);
      assert.equal(replayed.resultIdentity, receipt.resultIdentity);
      await tx.insert("inputEditions", edition());
      await tx.insert(
        "inputEditions",
        edition({
          id: "00000000-0000-4000-8000-000000000704",
          organisationId: people.orgOther,
          eventId: people.eventOther,
        }),
      );
    });
    await repo.transaction(async (tx) => {
      const maison = await tx.list("inputEditions", { organisationId: people.orgMaison, eventId: people.eventAlphaOne });
      const other = await tx.list("inputEditions", { organisationId: people.orgOther, eventId: people.eventOther });
      assert.equal(maison.length, 1);
      assert.equal(other.length, 1);
      assert.equal((maison[0] as { organisationId?: string } | undefined)?.organisationId, people.orgMaison);
    });
  });

  it("purges only explicitly listed fixture ids", async () => {
    const repo = new MemorySeatingRepository();
    await repo.transaction(async (tx) => {
      await tx.insert("inputEditions", edition());
      await tx.insert("inputEditions", edition({ id: "00000000-0000-4000-8000-000000000705", eventId: people.eventAlphaTwo }));
      const removed = await tx.purgeFixtureRecords(
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
        { inputEditions: [edition().id] },
      );
      assert.equal(removed, 1);
    });
    assert.equal(repo.backingStore.collection("inputEditions").length, 1);
    assert.equal(repo.backingStore.collection("inputEditions")[0]?.eventId, people.eventAlphaTwo);
  });

  it("applies the same decisions through the Postgres repository on MemoryPlatformPg", async () => {
    const pg = new MemoryPlatformPg();
    await runPlatformMigrations(pg);
    const repo = new PostgresSeatingRepository(pg);
    await repo.transaction(async (tx) => {
      await tx.insert("inputEditions", edition());
      const loaded = await tx.load("inputEditions", edition().id, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      });
      assert.equal((loaded as { contentHash?: string } | undefined)?.contentHash, "d".repeat(64));
      await tx.updateVersioned("inputEditions", edition().id, 0, { version: 1, status: "STALE" });
    });
    const after = pg.seatingRows.find((row) => row.table === "seating_input_editions");
    assert.equal(after?.cols.status, "STALE");
    assert.equal(after?.cols.version, 1);
    await assert.rejects(
      () =>
        repo.transaction(async (tx) => {
          await tx.updateVersioned("inputEditions", edition().id, 0, { version: 1, status: "SUPERSEDED" });
        }),
      /VERSION_CONFLICT|stale/,
    );
  });
});
