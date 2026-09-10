import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEMA_VERSION } from "../src/constants.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { backfillNormalizedRiskTables } from "../src/risk-normalized-migration.js";
import { EOS_S05B_PROTECTION_V2_ID } from "../src/risk-postgres-schema.js";
import { people } from "./helpers.js";

describe("EOS-S05B normalized persistence", () => {
  it("migrates an empty database onto dedicated risk tables", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const applied = pg.migrations.map((item) => item.id);
    assert.ok(applied.includes("004_risk_protection_normalized"));
    const receipts = pg.riskRows.filter((row) => row.table === "risk_migration_receipts");
    assert.equal(receipts.length, 1);
    assert.equal((receipts[0]?.body as { migrationId?: string }).migrationId, EOS_S05B_PROTECTION_V2_ID);
    assert.equal(pg.documents.filter((row) => String(row.collection).startsWith("risk")).length, 0);
  });

  it("does not rewrite S05A documents during S05B backfill", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    pg.documents.push({
      collection: "budgetScenarioEditions",
      id: "00000000-0000-4000-8000-000000000301",
      organisation_id: people.orgMaison,
      client_id: null,
      event_id: people.eventAlphaOne,
      version: 1,
      body: { id: "00000000-0000-4000-8000-000000000301", organisationId: people.orgMaison, purpose: "PROTECT_PRIORITIES" },
    });
    const replay = await backfillNormalizedRiskTables(pg);
    assert.equal(replay.status, "REPLAYED");
    assert.equal(pg.documents.filter((row) => row.collection === "budgetScenarioEditions").length, 1);
  });

  it("backfills S05B JSONB fixture rows then ignores them as authority", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    pg.riskRows.splice(0, pg.riskRows.length);
    pg.documents.push({
      collection: "riskPolicies",
      id: "00000000-0000-4000-8000-000000000302",
      organisation_id: people.orgMaison,
      client_id: null,
      event_id: null,
      version: 1,
      body: {
        id: "00000000-0000-4000-8000-000000000302",
        organisationId: people.orgMaison,
        scopeKind: "ORGANISATION",
        policyType: "PUBLIC_LIABILITY",
        insurerPartyId: "00000000-0000-4000-8000-000000000202",
        insurerLabel: "Backfill insurer",
        createdByPersonId: people.personCeo,
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: "2026-09-10T09:00:00.000Z",
        updatedAt: "2026-09-10T09:00:00.000Z",
      },
    });
    const result = await backfillNormalizedRiskTables(pg);
    assert.equal(result.status, "APPLIED");
    assert.ok((result.createdRecords.riskPolicies ?? 0) >= 1);
    const store = await PostgresPlatformStore.open(pg);
    const snap = store.snapshot();
    assert.ok(snap.riskPolicies.some((item) => item.id === "00000000-0000-4000-8000-000000000302"));
  });

  it("replays a duplicate backfill without inserting a second receipt", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const first = await backfillNormalizedRiskTables(pg);
    const second = await backfillNormalizedRiskTables(pg);
    assert.equal(first.status, "REPLAYED");
    assert.equal(second.status, "REPLAYED");
    assert.equal(pg.riskRows.filter((row) => row.table === "risk_migration_receipts").length, 1);
  });

  it("rolls back a partial backfill failure", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    pg.riskRows.splice(0, pg.riskRows.length);
    pg.failNextWrite();
    await assert.rejects(() => backfillNormalizedRiskTables(pg));
    assert.equal(pg.riskRows.filter((row) => row.table === "risk_migration_receipts").length, 0);
  });
});
