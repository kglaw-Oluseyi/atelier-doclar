import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { checksumFor, PLATFORM_MIGRATIONS, runPlatformMigrations } from "../src/migrations.js";
import { MemorySeatingV2Repository } from "../src/memory-seating-v2-store.js";
import { PostgresSeatingV2Repository, PostgresSeatingV2Transaction } from "../src/postgres-seating-v2-store.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { SEATING_ALLOCATION_POSTGRES_SCHEMA } from "../src/seating-postgres-schema.js";
import {
  EOS_S06_SEATING_V2_MIGRATION_ID,
  EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID,
  EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID,
  SEATING_V2_POSTGRES_SCHEMA,
  SEATING_V2_REPLAY_IDENTITY_POSTGRES_SCHEMA,
  SEATING_V2_LAYOUT_BINDING_POSTGRES_SCHEMA,
  SEATING_V2_SQL_TABLES,
} from "../src/seating-v2-postgres-schema.js";
import type { SeatingV2Transaction } from "../src/seating-v2-repository.js";
import { SEATING_V2_COLLECTIONS, SEATING_V2_PURGE_CONFIRMATION, emptySeatingV2State } from "../src/seating-v2-state.js";
import { emptySnapshot } from "../src/store.js";
import { people } from "./helpers.js";

const NOW = "2026-09-12T18:00:00.000Z";
const HASH = "a".repeat(64);
const RULE_EDITION_ID = "00000000-0000-4000-8000-000000000811";
const RULE_ID = "00000000-0000-4000-8000-000000000812";
const CURRENT_ID = "00000000-0000-4000-8000-000000000813";
const WORKING_A = "00000000-0000-4000-8000-000000000814";
const WORKING_B = "00000000-0000-4000-8000-000000000815";

function ruleEdition(overrides?: Record<string, unknown>) {
  return {
    id: RULE_EDITION_ID,
    ruleId: RULE_ID,
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    schemaVersion: 1,
    editionNo: 1,
    contentHash: HASH,
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    sourceType: "MANUAL",
    lifecycle: "DRAFT" as const,
    createdByPersonId: people.personPlanner,
    createdAt: NOW,
    ...overrides,
  };
}

function eventCurrent(overrides?: Record<string, unknown>) {
  return {
    id: CURRENT_ID,
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    schemaVersion: 1,
    workingEditionId: null,
    submittedEditionId: null,
    currentPublicationId: null,
    version: 0,
    createdAt: NOW,
    ...overrides,
  };
}

function auditRecord() {
  return {
    id: "00000000-0000-4000-8000-000000000816",
    occurredAt: NOW,
    actorType: "USER" as const,
    actorPersonId: people.personPlanner,
    service: "event-os",
    action: "seating.v2.rule.create",
    outcome: "SUCCESS" as const,
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    resourceType: "seating_v2_rule_edition",
    resourceId: RULE_EDITION_ID,
    correlationId: "corr-s06-v2",
    schemaVersion: 1 as const,
  };
}

function transactionMethods(tx: SeatingV2Transaction): string[] {
  const names = new Set<string>();
  let current: object | null = tx;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) names.add(name);
    current = Object.getPrototypeOf(current);
  }
  return [...names];
}

describe("EOS-S06 V2 additive persistence", () => {
  it("lists migration 008 after 007 and leaves 007 SQL unchanged", async () => {
    const ids = PLATFORM_MIGRATIONS.map((item) => item.id);
    const index007 = ids.indexOf("007_seating_allocation");
    const index008 = ids.indexOf(EOS_S06_SEATING_V2_MIGRATION_ID);
    const index009 = ids.indexOf(EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID);
    const index010 = ids.indexOf(EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID);
    assert.equal(EOS_S06_SEATING_V2_MIGRATION_ID, "008_seating_truth_v2");
    assert.equal(EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID, "009_seating_v2_run_reuse_identity");
    assert.equal(EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID, "010_seating_v2_layout_binding");
    assert.ok(index007 >= 0);
    assert.equal(index008, index007 + 1);
    assert.equal(index009, index008 + 1);
    assert.equal(index010, index009 + 1);
    const seven = PLATFORM_MIGRATIONS[index007];
    const eight = PLATFORM_MIGRATIONS[index008];
    const nine = PLATFORM_MIGRATIONS[index009];
    const ten = PLATFORM_MIGRATIONS[index010];
    assert.ok(seven);
    assert.ok(eight);
    assert.ok(nine);
    assert.ok(ten);
    assert.equal(seven.id, "007_seating_allocation");
    assert.equal(seven.sql, SEATING_ALLOCATION_POSTGRES_SCHEMA);
    assert.equal(checksumFor(seven.sql), checksumFor(SEATING_ALLOCATION_POSTGRES_SCHEMA));
    assert.equal(eight.sql, SEATING_V2_POSTGRES_SCHEMA);
    assert.equal(nine.sql, SEATING_V2_REPLAY_IDENTITY_POSTGRES_SCHEMA);
    assert.equal(ten.sql, SEATING_V2_LAYOUT_BINDING_POSTGRES_SCHEMA);
    assert.ok(nine.sql.includes("legacy-unknown-compiler"));
    assert.ok(nine.sql.includes("legacy-unknown-validator"));
    assert.equal(nine.sql.includes("s06-compiler-v2"), false);
    assert.ok(ten.sql.includes("seating_v2_layout_bindings_one_active"));
    assert.ok(ten.sql.includes("seating_layout_binding_id"));
    assert.ok(ten.sql.includes("ADD COLUMN IF NOT EXISTS layout_id TEXT"));
    assert.match(ten.sql, /CREATE UNIQUE INDEX IF NOT EXISTS seating_v2_layout_bindings_one_active[\s\S]*WHERE state = 'ACTIVE'/);
    assert.equal(checksumFor(eight.sql), checksumFor(SEATING_V2_POSTGRES_SCHEMA));
    assert.equal(checksumFor(nine.sql), checksumFor(SEATING_V2_REPLAY_IDENTITY_POSTGRES_SCHEMA));
    assert.equal(checksumFor(ten.sql), checksumFor(SEATING_V2_LAYOUT_BINDING_POSTGRES_SCHEMA));
    assert.equal(SEATING_V2_SQL_TABLES.length, 35);
    for (const table of SEATING_V2_SQL_TABLES) {
      assert.ok(SEATING_V2_POSTGRES_SCHEMA.includes(`CREATE TABLE IF NOT EXISTS ${table}`), table);
    }
    const pg = new MemoryPlatformPg();
    const first = await runPlatformMigrations(pg);
    const second = await runPlatformMigrations(pg);
    assert.equal(first.status, "APPLIED");
    assert.equal(second.status, "APPLIED");
    assert.ok(first.applied.includes("007_seating_allocation"));
    assert.ok(first.applied.includes(EOS_S06_SEATING_V2_MIGRATION_ID));
    assert.ok(first.applied.includes(EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID));
    assert.ok(first.applied.includes(EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID));
    assert.equal(
      pg.migrations.find((item) => item.id === "007_seating_allocation")?.checksum,
      checksumFor(SEATING_ALLOCATION_POSTGRES_SCHEMA),
    );
    assert.equal(
      pg.migrations.find((item) => item.id === EOS_S06_SEATING_V2_MIGRATION_ID)?.checksum,
      checksumFor(SEATING_V2_POSTGRES_SCHEMA),
    );
    assert.equal(
      pg.migrations.find((item) => item.id === EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID)?.checksum,
      checksumFor(SEATING_V2_REPLAY_IDENTITY_POSTGRES_SCHEMA),
    );
    assert.equal(
      pg.migrations.find((item) => item.id === EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID)?.checksum,
      checksumFor(SEATING_V2_LAYOUT_BINDING_POSTGRES_SCHEMA),
    );
    await PostgresPlatformStore.migrate(pg);
  });

  it("lists every V2 collection through Postgres including org-only evaluation tables", async () => {
    const pg = new MemoryPlatformPg();
    await runPlatformMigrations(pg);
    const repo = new PostgresSeatingV2Repository(pg);
    await repo.transaction(async (tx) => {
      const scope = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
      for (const collection of SEATING_V2_COLLECTIONS) {
        const rows = await tx.list(collection, scope);
        assert.equal(Array.isArray(rows), true, collection);
      }
    });
  });

  it("inserts a rule edition, reloads it, and exposes no update method for editions", async () => {
    const repo = new MemorySeatingV2Repository();
    await repo.transaction(async (tx) => {
      const methods = transactionMethods(tx);
      assert.equal(methods.includes("update"), false);
      assert.equal(methods.includes("updateVersioned"), false);
      assert.equal(methods.includes("updateRuleEdition"), false);
      assert.equal(typeof tx.insert, "function");
      assert.equal(typeof tx.updateCurrent, "function");
      assert.equal(typeof tx.updateLayoutBinding, "function");
      await tx.insert("ruleEditions", ruleEdition());
    });
    await repo.transaction(async (tx) => {
      const loaded = await tx.load("ruleEditions", RULE_EDITION_ID, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      });
      assert.ok(loaded);
      assert.equal((loaded as { contentHash?: string }).contentHash, HASH);
      assert.equal((loaded as { lifecycle?: string }).lifecycle, "DRAFT");
    });
    assert.equal(repo.backingStore.collection("ruleEditions").length, 1);
    assert.equal(typeof (repo.backingStore.collection("ruleEditions")[0] as { updatedAt?: string }).updatedAt, "undefined");
  });

  it("rolls back a rule insert when appendAudit throws in the same transaction", async () => {
    const repo = new MemorySeatingV2Repository();
    await assert.rejects(
      () =>
        repo.transaction(async (tx) => {
          await tx.insert("ruleEditions", ruleEdition());
          tx.appendAudit = async () => {
            throw new Error("synthetic audit failure");
          };
          await tx.appendAudit(auditRecord());
        }),
      /synthetic audit failure/,
    );
    assert.equal(repo.backingStore.collection("ruleEditions").length, 0);
    assert.equal(repo.backingStore.audit.length, 0);
  });

  it("rejects a concurrent CAS on seating_v2_event_current version", async () => {
    const repo = new MemorySeatingV2Repository();
    const scope = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
    await repo.transaction(async (tx) => {
      await tx.insert("eventCurrent", eventCurrent());
    });
    const settled = await Promise.allSettled([
      repo.transaction(async (tx) => tx.updateCurrent(scope, 0, { version: 1, workingEditionId: WORKING_A })),
      repo.transaction(async (tx) => tx.updateCurrent(scope, 0, { version: 1, workingEditionId: WORKING_B })),
    ]);
    const fulfilled = settled.filter((item) => item.status === "fulfilled");
    const rejected = settled.filter((item) => item.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const failure = rejected[0];
    assert.ok(failure && failure.status === "rejected");
    assert.ok(failure.reason instanceof PlatformError);
    assert.equal(failure.reason.code, "VERSION_CONFLICT");
    const current = repo.backingStore.collection("eventCurrent")[0];
    assert.equal(current?.version, 1);
    await assert.rejects(
      () => repo.transaction(async (tx) => tx.updateCurrent(scope, 0, { version: 1, workingEditionId: WORKING_B })),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });

  it("isolates rule editions across events and organisations", async () => {
    const repo = new MemorySeatingV2Repository();
    await repo.transaction(async (tx) => {
      await tx.insert("ruleEditions", ruleEdition());
      await tx.insert(
        "ruleEditions",
        ruleEdition({
          id: "00000000-0000-4000-8000-000000000821",
          ruleId: "00000000-0000-4000-8000-000000000822",
          eventId: people.eventAlphaTwo,
          contentHash: "b".repeat(64),
        }),
      );
      await tx.insert(
        "ruleEditions",
        ruleEdition({
          id: "00000000-0000-4000-8000-000000000823",
          ruleId: "00000000-0000-4000-8000-000000000824",
          organisationId: people.orgOther,
          eventId: people.eventOther,
          contentHash: "c".repeat(64),
        }),
      );
    });
    await repo.transaction(async (tx) => {
      const alphaOne = await tx.list("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      });
      const alphaTwo = await tx.list("ruleEditions", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaTwo,
      });
      const other = await tx.list("ruleEditions", {
        organisationId: people.orgOther,
        eventId: people.eventOther,
      });
      assert.equal(alphaOne.length, 1);
      assert.equal(alphaTwo.length, 1);
      assert.equal(other.length, 1);
      assert.equal((alphaOne[0] as { eventId?: string }).eventId, people.eventAlphaOne);
      assert.equal((other[0] as { organisationId?: string }).organisationId, people.orgOther);
      const missed = await tx.load("ruleEditions", RULE_EDITION_ID, {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaTwo,
      });
      assert.equal(missed, undefined);
    });
  });

  it("keeps V2 collections out of PlatformSnapshot and emptySnapshot", () => {
    const snap = emptySnapshot();
    const snapKeys = new Set(Object.keys(snap));
    for (const collection of SEATING_V2_COLLECTIONS) {
      assert.equal(snapKeys.has(collection), false, collection);
    }
    const serialised = JSON.stringify(snap);
    for (const table of SEATING_V2_SQL_TABLES) {
      assert.equal(serialised.includes(table), false, table);
    }
    assert.equal("seatingV2" in snap, false);
    const empty = emptySeatingV2State();
    assert.equal(Object.keys(empty).length, SEATING_V2_COLLECTIONS.length);
    assert.equal(empty.ruleEditions.length, 0);
  });

  it("commits domain write, audit and idempotency together and purges only when confirmed", async () => {
    const repo = new MemorySeatingV2Repository();
    const receipt = {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      schemaVersion: 1,
      action: "createRuleEdition",
      idempotencyKey: "idempotency-v2-1",
      requestHash: HASH,
      resultIdentity: RULE_EDITION_ID,
      application: "APPLIED" as const,
      createdAt: NOW,
    };
    await repo.transaction(async (tx) => {
      await tx.insert("ruleEditions", ruleEdition());
      await tx.appendAudit(auditRecord());
      const first = await tx.insertIdempotency(receipt);
      const replayed = await tx.insertIdempotency(receipt);
      assert.equal(first.resultIdentity, RULE_EDITION_ID);
      assert.equal(replayed.resultIdentity, RULE_EDITION_ID);
    });
    assert.equal(repo.backingStore.collection("ruleEditions").length, 1);
    assert.equal(repo.backingStore.audit.length, 1);
    assert.equal(repo.backingStore.collection("idempotencyReceipts").length, 1);
    await assert.rejects(
      () =>
        repo.transaction(async (tx) =>
          tx.purgeFixtureRecords(
            { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
            { ruleEditions: [RULE_EDITION_ID] },
            "NOT_CONFIRMED" as typeof SEATING_V2_PURGE_CONFIRMATION,
          ),
        ),
      /confirmed command/,
    );
    await repo.transaction(async (tx) => {
      const removed = await tx.purgeFixtureRecords(
        { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
        { ruleEditions: [RULE_EDITION_ID] },
        SEATING_V2_PURGE_CONFIRMATION,
      );
      assert.equal(removed, 1);
    });
    assert.equal(repo.backingStore.collection("ruleEditions").length, 0);
  });

  it("maps a postgres unique violation on layout bindings to MULTIPLE_ACTIVE", async () => {
    const tx = new PostgresSeatingV2Transaction({
      query: async () => {
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      },
    } as never);
    await assert.rejects(
      () =>
        tx.insert("layoutBindings", {
          id: "00000000-0000-4000-8000-000000000831",
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          layoutId: "00000000-0000-4000-8000-000000000832",
          layoutPublicationId: "00000000-0000-4000-8000-000000000833",
          layoutContentHash: HASH,
          state: "ACTIVE",
          version: 1,
          proposedByPersonId: people.personPlanner,
          proposedAt: NOW,
          reason: "postgres unique",
          schemaVersion: 1,
          createdAt: NOW,
          updatedAt: NOW,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS",
    );
  });
});
