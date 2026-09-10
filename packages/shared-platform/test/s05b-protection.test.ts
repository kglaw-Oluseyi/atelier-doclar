import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { PlatformError } from "../src/errors.js";
import { RiskCommandEnvelopeSchema, RiskDateRangeSchema } from "../src/risk-schemas.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import {
  createPolicyEditionOnSnap,
  createPolicyOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { computeVendorBand, assessVendorOnSnap, assignRosterOnSnap, decideVendorAssessmentOnSnap } from "../src/risk-vendor-assessment.js";
import { projectRiskBudgetOnSnap } from "../src/risk-budget-projection.js";
import { executeS05BEvaluationOnSnap } from "../src/risk-evaluation-runner.js";
import { s05bEvaluationReadinessFromSnap } from "../src/risk-evaluation-projections.js";
import { detectUnsafeAdapter, executeS05BCase } from "../src/risk-evaluation-fixtures.js";
import { S05B_EVALUATION_CASES } from "../src/risk-evaluation-corpus.js";
import { redactPolicyEdition } from "../src/risk-disclosure.js";
import { actor, fixtureService, people } from "./helpers.js";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { store, service, snap: store.snapshot() };
}

describe("EOS-S05B foundations", () => {
  it("rejects extra keys, invalid dates and negative limits", () => {
    assert.equal(RiskCommandEnvelopeSchema.safeParse({ organisationId: people.orgMaison, extra: true }).success, false);
    assert.equal(RiskDateRangeSchema.safeParse({ startOn: "2026-12-02", endOn: "2026-12-01" }).success, false);
    const { snap } = env();
    const policy = createPolicyOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "policy-create-001",
        policyType: "PUBLIC_LIABILITY",
        insurerPartyId: "00000000-0000-4000-8000-000000000202",
        insurerLabel: "Synthetic",
      },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    assert.throws(
      () =>
        createPolicyEditionOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignCeo,
            expectedVersion: policy.version,
            idempotencyKey: "edition-neg-1",
            policyId: policy.id,
            policyNumber: "X",
            currency: "NGN",
            period: { startOn: "2026-01-01", endOn: "2026-12-31" },
            limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "-1" }, basis: "any" }],
            deductibles: [],
            insuredPartyLabels: ["Maison"],
            documentEditionId: "00000000-0000-4000-8000-000000000099",
          },
          "2026-09-10T09:00:00.000Z",
          people.personCeo,
        ),
      PlatformError,
    );
  });

  it("keeps System Administrator out of business risk permissions", () => {
    const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
    const planner = permissionsForRole("PLANNER");
    const auditor = permissionsForRole("READ_ONLY_AUDITOR");
    assert.equal(admin.includes("risk.event.decide"), false);
    assert.equal(admin.includes("risk.catalogue.manage"), false);
    assert.ok(planner.includes("risk.event.manage"));
    assert.equal(planner.includes("risk.event.decide"), false);
    assert.ok(auditor.includes("risk.event.view"));
    assert.equal(auditor.includes("risk.policy.manage"), false);
  });

  it("applies S05B migration twice as replay", () => {
    const { store } = env();
    const second = migrateEosS05B(store.snapshot());
    assert.equal(second.status, "REPLAYED");
    assert.ok(second.snapshot.riskCheckpointTemplates.length >= 3);
  });
});

describe("EOS-S05B insurance and vendor", () => {
  it("denies maker self-verify and omits policy numbers from planner projections", () => {
    const { service } = env();
    const ceo = actor(people.personCeo);
    const policy = service.createRiskPolicy(ceo, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "svc-policy-1",
      policyType: "PUBLIC_LIABILITY",
      insurerPartyId: "00000000-0000-4000-8000-000000000202",
      insurerLabel: "Synthetic",
    });
    const document = service.createRiskEvidence(ceo, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "svc-doc-0001",
      title: "Certificate",
      classification: "POLICY_IDENTIFIER",
    });
    service.completeRiskEvidenceUpload(ceo, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: document.version,
      idempotencyKey: "svc-upload-01",
      documentId: document.id,
      objectKey: `risk/${people.orgMaison}/${document.id}`,
      byteChecksum: "b".repeat(64),
      byteLength: 12,
      contentType: "application/pdf",
      scanAdapter: "INACTIVE",
    });
    const edition = service.createRiskPolicyEdition(ceo, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: policy.version,
      idempotencyKey: "svc-edition-1",
      policyId: policy.id,
      policyNumber: "SECRET-99",
      currency: "NGN",
      period: { startOn: "2026-01-01", endOn: "2026-12-31" },
      limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "1000" }, basis: "any" }],
      deductibles: [],
      insuredPartyLabels: ["Maison"],
      documentEditionId: document.id,
    });
    assert.throws(
      () =>
        service.verifyRiskPolicy(ceo, {
          organisationId: people.orgMaison,
          assignmentId: people.assignCeo,
          expectedVersion: edition.version,
          idempotencyKey: "svc-verify-self",
          editionId: edition.id,
          decision: "VERIFIED",
        }),
      PlatformError,
    );
    const redacted = redactPolicyEdition(edition, "PLANNER");
    assert.equal("policyNumberCiphertext" in redacted, false);
  });

  it("treats unknown facts as indeterminate and does not invent premiums", () => {
    const { snap } = env();
    createSourceEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "src-create-1",
        title: "Discovery source",
        publisher: "NAICOM",
        locator: "https://naicom.gov.ng/",
        authority: "REGULATOR",
        jurisdiction: "NG",
        summary: "Synthetic discovery.",
        retrievedAt: "2026-09-10T09:00:00.000Z",
        lastVerifiedAt: "2026-09-10T09:00:00.000Z",
        nextReviewAt: "2026-12-10T09:00:00.000Z",
      },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    recordFactEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "fact-unknown",
        factKey: "jurisdiction",
        value: "UNKNOWN",
        unknown: true,
      },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    const evaluated = evaluateApplicabilityOnSnap(
      snap,
      { organisationId: people.orgMaison, eventId: people.eventAlphaOne, assignmentId: people.assignCeo, expectedVersion: 0, idempotencyKey: "eval-apply-1" },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    assert.ok(["INDETERMINATE", "READY", "GAPS", "STALE"].includes(evaluated.snapshot.overall));
    const projection = projectRiskBudgetOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "budget-proj-1",
        drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "No sourced quote", evidenceIds: [] }],
      },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    assert.equal(projection.quantifiedMinor, "0");
    assert.ok(projection.unquantifiedReasons.length);
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
            drivers: [{ kind: "INSURANCE_PREMIUM_ASSUMPTION", money: { currency: "NGN", minor: "50000" }, evidenceIds: [] }],
          },
          "2026-09-10T09:00:00.000Z",
          people.personCeo,
        ),
      /unevidenced premium/,
    );
  });

  it("preserves computed vendor band and keeps standby unengaged", () => {
    const { snap } = env();
    const assessment = assessVendorOnSnap(
      snap,
      { organisationId: people.orgMaison, vendorId: "00000000-0000-4000-8000-000000000201", assignmentId: people.assignCeo, expectedVersion: 0, idempotencyKey: "assess-vend-1" },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    const decided = decideVendorAssessmentOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: assessment.version,
        idempotencyKey: "decide-vend-1",
        assessmentId: assessment.id,
        decision: "RESTRICTED",
        reason: "Missing certificate",
      },
      "2026-09-10T09:01:00.000Z",
      people.personDirector,
      "HUMAN",
    );
    assert.equal(decided.band, assessment.band);
    const roster = assignRosterOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "roster-standby-1",
        vendorId: "00000000-0000-4000-8000-000000000201",
        vendorLabel: "Standby AV",
        role: "STANDBY",
        criticalFunctionKey: "AV",
        commercialStatus: "UNCONFIRMED",
      },
      "2026-09-10T09:02:00.000Z",
      people.personCeo,
    );
    assert.equal(roster.commercialStatus, "NOT_ENGAGED");
    assert.equal(roster.booked, false);
    assert.equal(computeVendorBand([{ key: "missing_required_evidence", status: "UNKNOWN", evidenceIds: [], explanation: "unknown" }]), "INDETERMINATE");
  });
});

describe("EOS-S05B evaluation", () => {
  it("runs s05b-eval-v1 against production functions and stays fail-closed when unrun", () => {
    const { store } = env();
    const unrun = s05bEvaluationReadinessFromSnap(store.snapshot(), people.orgMaison);
    assert.equal(unrun.evaluationStatus, "UNRUN");
    assert.equal(unrun.releaseReady, false);
    const snap = store.snapshot();
    const run = executeS05BEvaluationOnSnap(snap, {
      organisationId: people.orgMaison,
      requestedByPersonId: people.personCeo,
      correlationId: "eval-1",
      idempotencyKey: "eval-key-1xxxxxxx",
      applicationSha: "local-dev",
      now: "2026-09-10T10:00:00.000Z",
    });
    store.replace(snap);
    const ready = s05bEvaluationReadinessFromSnap(store.snapshot(), people.orgMaison);
    if (run.status !== "PASSED") {
      const failed = store.snapshot().riskEvaluationCaseResults.filter((item) => item.runId === run.id && item.verdict !== "PASSED");
      assert.equal(run.status, "PASSED", failed.map((item) => `${item.caseId}:${item.diagnosticSummary}`).join(" | "));
    }
    assert.equal(run.caseCount, S05B_EVALUATION_CASES.length);
    assert.equal(run.passedCount, S05B_EVALUATION_CASES.length);
    assert.equal(ready.evaluationStatus, "PASSED");
    assert.equal(ready.releaseReady, true);
  });

  it("detects fabricated coverage and false success negative adapters", () => {
    const fabricated = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-APP-01")!, { fabricateCoverage: true });
    assert.ok(detectUnsafeAdapter({ fabricateCoverage: true }, fabricated).includes("FABRICATED_COVERAGE"));
    const falsed = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-ROSTER-01")!, { falseSuccess: true });
    assert.ok(detectUnsafeAdapter({ falseSuccess: true }, falsed).includes("FALSE_SUCCESS"));
  });
});
