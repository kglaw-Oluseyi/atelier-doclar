import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
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

describe("EOS-S05B Budget Intelligence successor", () => {
  it("creates an immutable PROTECT_INVESTMENT successor and does not invent unquantified money", () => {
    const { snap } = env();
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
    assert.equal(unknown.quantifiedMinor, "0");
    assert.ok(unknown.successorScenarioEditionId);
    const successor = snap.budgetScenarioEditions.find((item) => item.id === unknown.successorScenarioEditionId);
    assert.equal(successor?.purpose, "PROTECT_INVESTMENT");
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

  it("copies sourced premium from the accepted engine result", () => {
    const { snap } = env();
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
    const governing = snap.budgetScenarioEditions.find((item) => item.id === sourced.budgetScenarioEditionId);
    if (governing) {
      assert.notEqual(governing.id, sourced.successorScenarioEditionId);
      assert.ok(governing.status === "APPROVED" || governing.status === "PUBLISHED" || governing.current);
    }
  });
});
