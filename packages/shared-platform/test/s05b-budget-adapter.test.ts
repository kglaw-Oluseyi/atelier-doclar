import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateBudgetScenarioOnSnap, decideBudgetScenarioOnSnap } from "../src/eec-intelligence.js";
import { PlatformError } from "../src/errors.js";
import { governingEditionFingerprint } from "../src/risk-repository.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { projectRiskBudgetOnSnap } from "../src/risk-budget-projection.js";
import { createEvidenceDocumentOnSnap } from "../src/risk-policy-operations.js";
import { fixtureService, people } from "./helpers.js";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { store, service, snap: store.snapshot() };
}

function seedGoverning(snap: ReturnType<typeof env>["snap"]) {
  const draft = calculateBudgetScenarioOnSnap(
    snap,
    {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      purpose: "PROTECT_INVESTMENT",
      archetype: "WEDDING",
      guests: "120",
    },
    "2026-09-10T08:00:00.000Z",
    people.personCeo,
  );
  return decideBudgetScenarioOnSnap(
    snap,
    { organisationId: people.orgMaison, scenarioId: draft.id, expectedVersion: draft.version },
    "2026-09-10T08:05:00.000Z",
    people.personDirector,
  );
}

describe("EOS-S05B Budget Intelligence successor", () => {
  it("keeps governing approved truth unchanged and persists a distinct calculation result", () => {
    const { snap } = env();
    const governing = seedGoverning(snap);
    const before = structuredClone(governing);
    const unknown = projectRiskBudgetOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "budget-unknown",
        drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote", evidenceIds: [] }],
      },
      "2026-09-10T09:22:00.000Z",
      people.personCeo,
    );
    const reloaded = snap.budgetScenarioEditions.find((item) => item.id === governing.id);
    assert.ok(reloaded);
    assert.notEqual(reloaded, before);
    assert.deepEqual(governingEditionFingerprint(reloaded), governingEditionFingerprint(before));
    assert.equal(reloaded.current, true);
    assert.equal(reloaded.status, "APPROVED");
    assert.equal(unknown.quantifiedMinor, "0");
    assert.ok(unknown.unquantifiedReasons.length >= 1);
    assert.ok(unknown.successorScenarioEditionId);
    assert.ok(unknown.calculationResultId);
    assert.notEqual(unknown.calculationResultId, unknown.successorScenarioEditionId);
    const successor = snap.budgetScenarioEditions.find((item) => item.id === unknown.successorScenarioEditionId);
    assert.equal(successor?.purpose, "PROTECT_INVESTMENT");
    assert.equal(successor?.current, false);
    assert.equal(successor?.supersedesScenarioEditionId, governing.id);
    assert.equal(successor?.calculationResultId, unknown.calculationResultId);
    assert.notEqual(successor?.id, successor?.calculationResultId);
    const replay = projectRiskBudgetOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "budget-unknown-2",
        drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced replacement quote", evidenceIds: [] }],
      },
      "2026-09-10T09:23:00.000Z",
      people.personCeo,
    );
    assert.equal(replay.id, unknown.id);
    assert.equal(replay.generatedAt, unknown.generatedAt);
    assert.equal(replay.successorScenarioEditionId, unknown.successorScenarioEditionId);
    assert.equal(replay.calculationResultId, unknown.calculationResultId);
    assert.throws(
      () =>
        projectRiskBudgetOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            assignmentId: people.assignCeo,
            expectedVersion: 0,
            idempotencyKey: "budget-invent",
            drivers: [{ kind: "INSURANCE_PREMIUM_ASSUMPTION", money: { currency: "NGN", minor: "5000000" }, evidenceIds: [] }],
          },
          "2026-09-10T09:24:00.000Z",
          people.personCeo,
        ),
      PlatformError,
    );
  });

  it("copies sourced premium from the accepted engine result without displacing governing truth", () => {
    const { snap } = env();
    const governing = seedGoverning(snap);
    const evidence = createEvidenceDocumentOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "quote-evidence-01",
        title: "Premium quote",
        classification: "LIMIT_DEDUCTIBLE",
      },
      "2026-09-10T09:21:00.000Z",
      people.personCeo,
    );
    const sourced = projectRiskBudgetOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "budget-sourced",
        drivers: [{ kind: "INSURANCE_PREMIUM_ASSUMPTION", money: { currency: "NGN", minor: "2500000" }, evidenceIds: [evidence.id], assumptionLabel: "broker quote" }],
      },
      "2026-09-10T09:22:00.000Z",
      people.personCeo,
    );
    assert.equal(sourced.quantifiedMinor, "2500000");
    assert.ok(snap.budgetLines.some((item) => item.scenarioId === sourced.successorScenarioEditionId && item.itemCode.startsWith("RISK_")));
    const successor = snap.budgetScenarioEditions.find((item) => item.id === sourced.successorScenarioEditionId);
    assert.ok(successor?.trace.some((step) => String(step.detail).includes("RISK_") || String(step.op).includes("LINE") || sourced.quantifiedMinor === "2500000"));
    const liveGoverning = snap.budgetScenarioEditions.find((item) => item.id === governing.id);
    assert.equal(liveGoverning?.current, true);
    assert.equal(liveGoverning?.status, "APPROVED");
    assert.notEqual(governing.id, sourced.successorScenarioEditionId);
  });

  it("rejects a stale governing hash or version without creating a successor", () => {
    const { snap } = env();
    seedGoverning(snap);
    const beforeCount = snap.budgetScenarioEditions.length;
    assert.throws(
      () =>
        projectRiskBudgetOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            assignmentId: people.assignCeo,
            expectedVersion: 0,
            idempotencyKey: "budget-stale",
            expectedScenarioVersion: 99,
            drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "stale", evidenceIds: [] }],
          },
          "2026-09-10T09:22:00.000Z",
          people.personCeo,
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    assert.equal(snap.budgetScenarioEditions.length, beforeCount);
    assert.equal(snap.riskBudgetProjections.length, 0);
  });

  it("creates a new immutable branch when drivers change", () => {
    const { snap } = env();
    seedGoverning(snap);
    const evidence = createEvidenceDocumentOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "quote-evidence-02",
        title: "Premium quote two",
        classification: "LIMIT_DEDUCTIBLE",
      },
      "2026-09-10T09:21:00.000Z",
      people.personCeo,
    );
    const first = projectRiskBudgetOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "budget-branch-a",
        drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "unknown A", evidenceIds: [] }],
      },
      "2026-09-10T09:22:00.000Z",
      people.personCeo,
    );
    const second = projectRiskBudgetOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "budget-branch-b",
        drivers: [{ kind: "INSURANCE_PREMIUM_ASSUMPTION", money: { currency: "NGN", minor: "2500000" }, evidenceIds: [evidence.id], assumptionLabel: "broker quote" }],
      },
      "2026-09-10T09:23:00.000Z",
      people.personCeo,
    );
    assert.notEqual(first.id, second.id);
    assert.notEqual(first.successorScenarioEditionId, second.successorScenarioEditionId);
    assert.notEqual(first.calculationResultId, second.calculationResultId);
  });
});
