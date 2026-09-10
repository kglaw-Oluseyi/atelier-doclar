import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEMA_VERSION } from "../src/constants.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { PostgresRiskProtectionRepository, PostgresRiskProtectionStore } from "../src/postgres-risk-store.js";
import { backfillNormalizedRiskTables } from "../src/risk-normalized-migration.js";
import { EOS_S05B_PROTECTION_V2_ID } from "../src/risk-postgres-schema.js";
import { createContinuityPlanOnSnap } from "../src/risk-continuity.js";
import { applySyntheticSeedIfNeeded } from "../src/synthetic-seed.js";
import { emptySnapshot } from "../src/store.js";
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

  it("demotes prior current continuity plans so one-current indexes hold", async () => {
    const pg = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(pg);
    await applySyntheticSeedIfNeeded(store, pg);
    await store.flush();
    const snap = store.snapshot();
    createContinuityPlanOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "persist-plan-one-01",
        title: "First current plan",
        recoveryObjectiveMinutes: 30,
        maximumTolerableInterruptionMinutes: 60,
        decisionRole: "CEO",
      },
      "2026-09-10T10:00:00.000Z",
      people.personCeo,
    );
    createContinuityPlanOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "persist-plan-two-01",
        title: "Second current plan",
        recoveryObjectiveMinutes: 45,
        maximumTolerableInterruptionMinutes: 90,
        decisionRole: "CEO",
      },
      "2026-09-10T10:01:00.000Z",
      people.personCeo,
    );
    for (const plan of snap.riskContinuityPlans.filter((item) => item.eventId === people.eventAlphaOne)) plan.current = true;
    await store.replaceAsync(snap);
    const currents = pg.riskRows.filter((row) => row.table === "risk_continuity_plans" && row.current === true && row.event_id === people.eventAlphaOne);
    assert.equal(currents.length, 1);
  });

  it("rolls back a partial backfill failure", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    pg.riskRows.splice(0, pg.riskRows.length);
    pg.failNextWrite();
    await assert.rejects(() => backfillNormalizedRiskTables(pg));
    assert.equal(pg.riskRows.filter((row) => row.table === "risk_migration_receipts").length, 0);
  });

  it("does not physically delete immutable rows that are absent from a later snapshot", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const store = new PostgresRiskProtectionStore(pg);
    const previous = emptySnapshot();
    const first = emptySnapshot();
    first.riskPolicies.push({
      id: "00000000-0000-4000-8000-000000000501",
      organisationId: people.orgMaison,
      policyType: "PUBLIC_LIABILITY",
      insurerPartyId: "00000000-0000-4000-8000-000000000202",
      insurerLabel: "Durable insurer",
      createdByPersonId: people.personCeo,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: "2026-09-10T09:00:00.000Z",
      updatedAt: "2026-09-10T09:00:00.000Z",
    } as (typeof first.riskPolicies)[0]);
    await store.persistFromSnapshotAsync(previous, first);
    const partial = emptySnapshot();
    await store.persistFromSnapshotAsync(first, partial);
    assert.equal(pg.riskRows.filter((row) => row.table === "risk_policies" && row.id === "00000000-0000-4000-8000-000000000501").length, 1);
  });

  it("rolls back a domain write when audit or idempotency fails in the same transaction", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const repo = new PostgresRiskProtectionRepository(pg);
    pg.failNextAuditWrite();
    await assert.rejects(() =>
      repo.transaction(async (tx) => {
        await tx.insertImmutable("riskPolicies", {
          id: "00000000-0000-4000-8000-000000000502",
          organisationId: people.orgMaison,
          version: 1,
          createdAt: "2026-09-10T09:00:00.000Z",
          updatedAt: "2026-09-10T09:00:00.000Z",
        });
        await tx.appendAudit({
          id: "00000000-0000-4000-8000-000000000503",
          occurredAt: "2026-09-10T09:00:00.000Z",
          action: "risk.policy.create",
          outcome: "SUCCESS",
          organisationId: people.orgMaison,
        } as never);
        return true;
      }),
    );
    assert.equal(pg.riskRows.filter((row) => row.id === "00000000-0000-4000-8000-000000000502").length, 0);
    assert.equal(pg.audit.length, 0);
  });

  it("lets only one of two concurrent versioned writers apply", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const repo = new PostgresRiskProtectionRepository(pg);
    await repo.transaction(async (tx) => {
      await tx.insertImmutable("riskPolicies", {
        id: "00000000-0000-4000-8000-000000000504",
        organisationId: people.orgMaison,
        version: 1,
        createdAt: "2026-09-10T09:00:00.000Z",
        updatedAt: "2026-09-10T09:00:00.000Z",
      });
    });
    await repo.transaction(async (tx) => {
      await tx.updateVersioned("riskPolicies", "00000000-0000-4000-8000-000000000504", 1, {
        id: "00000000-0000-4000-8000-000000000504",
        organisationId: people.orgMaison,
        version: 2,
        updatedAt: "2026-09-10T09:01:00.000Z",
      });
    });
    await assert.rejects(
      () =>
        repo.transaction(async (tx) => {
          await tx.updateVersioned("riskPolicies", "00000000-0000-4000-8000-000000000504", 1, {
            id: "00000000-0000-4000-8000-000000000504",
            organisationId: people.orgMaison,
            version: 3,
            updatedAt: "2026-09-10T09:02:00.000Z",
          });
        }),
      /stale risk aggregate/,
    );
    const row = pg.riskRows.find((item) => item.id === "00000000-0000-4000-8000-000000000504");
    assert.equal(row?.version, 2);
  });

  it("replays an idempotent receipt without manufacturing a second success audit", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const repo = new PostgresRiskProtectionRepository(pg);
    const receipt = {
      organisationId: people.orgMaison,
      action: "risk.policy.create",
      idempotencyKey: "persist-replay-01",
      resultRef: "00000000-0000-4000-8000-000000000505",
      hash: "abc",
      createdAt: "2026-09-10T09:00:00.000Z",
    };
    const first = await repo.transaction(async (tx) => {
      await tx.insertImmutable("riskPolicies", {
        id: receipt.resultRef,
        organisationId: people.orgMaison,
        version: 1,
        createdAt: receipt.createdAt,
        updatedAt: receipt.createdAt,
      });
      await tx.appendAudit({
        id: "00000000-0000-4000-8000-000000000506",
        occurredAt: receipt.createdAt,
        action: "risk.policy.create",
        outcome: "SUCCESS",
        organisationId: people.orgMaison,
      } as never);
      return tx.insertIdempotency(receipt);
    });
    const second = await repo.transaction(async (tx) => {
      const existing = await tx.getIdempotency({ organisationId: people.orgMaison }, receipt.action, receipt.idempotencyKey);
      assert.ok(existing);
      return tx.insertIdempotency(receipt);
    });
    assert.equal(first.resultRef, second.resultRef);
    assert.equal(pg.riskIdempotency.length, 1);
    assert.equal(pg.audit.filter((item) => (item as { action?: string }).action === "risk.policy.create").length, 1);
  });

  it("hydrates a prior s05b-eval-v2 TEXT observation without failing the store", async () => {
    const pg = new MemoryPlatformPg();
    await PostgresPlatformStore.migrate(pg);
    const id = "00000000-0000-4000-8000-000000000507";
    pg.riskRows.push({
      table: "risk_evaluation_case_results",
      id,
      organisation_id: people.orgMaison,
      event_id: people.eventAlphaOne,
      version: 1,
      current: null,
      status: "PASSED",
      parent_id: "00000000-0000-4000-8000-000000000508",
      content_hash: null,
      submitted_by_person_id: people.personCeo,
      approved_by_person_id: null,
      body: {
        id,
        organisationId: people.orgMaison,
        runId: "00000000-0000-4000-8000-000000000508",
        caseId: "S05B-BUDGET-03",
        family: "BUDGET",
        verdict: "PASSED",
        observations: [{ kind: "TEXT", code: "REPLAY_SAME_IDS", value: "identical budget request replays" }],
        diagnosticSummary: "legacy v2 sentence observation",
        zeroToleranceCategories: ["FALSE_SUCCESS"],
        schemaVersion: SCHEMA_VERSION,
        version: 1,
        createdAt: "2026-09-10T09:00:00.000Z",
        updatedAt: "2026-09-10T09:00:00.000Z",
      },
      created_at: "2026-09-10T09:00:00.000Z",
      updated_at: "2026-09-10T09:00:00.000Z",
    });
    pg.riskRows.push({
      table: "risk_evaluation_case_results",
      id: "00000000-0000-4000-8000-000000000509",
      organisation_id: people.orgMaison,
      event_id: null,
      version: 1,
      current: null,
      status: null,
      parent_id: null,
      content_hash: null,
      submitted_by_person_id: null,
      approved_by_person_id: null,
      body: { id: "not-a-uuid", observations: "broken" },
      created_at: "2026-09-10T09:00:00.000Z",
      updated_at: "2026-09-10T09:00:00.000Z",
    });
    const store = await PostgresPlatformStore.open(pg);
    const row = store.snapshot().riskEvaluationCaseResults.find((item) => item.id === id);
    assert.ok(row);
    assert.equal(row.observations[0]?.kind, "TEXT");
    assert.equal(
      store.snapshot().riskEvaluationCaseResults.some((item) => item.id === "00000000-0000-4000-8000-000000000509"),
      false,
    );
  });
});
