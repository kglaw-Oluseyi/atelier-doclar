import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import {
  CreateRiskPolicyFormSchema,
  isSensitiveFormKey,
  parseFormSchema,
  platformErrorFromUnknown,
  safeAttemptedValues,
  validationFormState,
  zodIssuesToFieldErrors,
} from "../src/risk-form-contract.js";
import {
  FIXTURE_INSURER_PARTY_ID,
  FIXTURE_VENDOR_PARTY_ID,
  assertGovernedProtectionParty,
  listGovernedProtectionParties,
} from "../src/risk-protection-parties.js";
import { createPolicyOnSnap } from "../src/risk-policy-operations.js";
import { s05bEvaluationReadinessFromSnap } from "../src/risk-evaluation-projections.js";
import { s05bEvaluationCorpusHash } from "../src/risk-evaluation-corpus.js";
import { actor, fixtureService, people } from "./helpers.js";
import { migrateEosS05B } from "../src/risk-migration.js";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { store, service, snap: store.snapshot() };
}

describe("EOS-S05B human-safe validation contract", () => {
  it("maps Zod/validation failure to NOT_APPLIED without raw issue JSON", () => {
    const parsed = parseFormSchema(CreateRiskPolicyFormSchema, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "policy-create-safe-1",
      policyType: "PUBLIC_LIABILITY",
      insurerPartyId: "not-a-uuid",
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    assert.equal(parsed.fieldErrors.insurerPartyId, "Choose an insurer from the governed party register.");
    assert.doesNotMatch(JSON.stringify(parsed.fieldErrors), /invalid uuid|invalid_type|\[\{/i);
    const state = validationFormState({
      fieldErrors: parsed.fieldErrors,
      attemptedValues: { policyType: "PUBLIC_LIABILITY" },
    });
    assert.equal(state.application, "NOT_APPLIED");
    assert.equal(state.didDataChange, false);
    const zapped = platformErrorFromUnknown({
      name: "ZodError",
      issues: [{ path: ["insurerPartyId"], message: "Invalid uuid", code: "invalid_string" }],
    });
    assert.equal(zapped.code, "VALIDATION_FAILED");
    assert.doesNotMatch(zapped.message + (zapped.details ?? []).join(""), /Invalid uuid/);
    const duck = platformErrorFromUnknown({
      name: "PlatformError",
      code: "VALIDATION_FAILED",
      message: "Choose an insurer from the governed party register.",
      field: "insurerPartyId",
      publicMessage: "The submitted information is not valid.",
    });
    assert.equal(duck.code, "VALIDATION_FAILED");
    assert.equal(duck.field, "insurerPartyId");
    assert.match(duck.message, /Choose an insurer/);
  });

  it("retains safe attempted values and clears sensitive keys", () => {
    const { values, sensitiveCleared } = safeAttemptedValues({
      policyType: "PUBLIC_LIABILITY",
      insurerPartyId: "",
      policyNumber: "POL-SECRET-99",
      objectKey: "risk/org/doc",
      title: "Yorùbá",
    });
    assert.equal(values.policyType, "PUBLIC_LIABILITY");
    assert.equal(values.title, "Yorùbá");
    assert.equal(values.policyNumber, undefined);
    assert.ok(sensitiveCleared.includes("policyNumber"));
    assert.ok(isSensitiveFormKey("byteChecksum"));
    assert.equal(isSensitiveFormKey("policyType"), false);
  });

  it("denies forged, invalid, cross-org and stale party ids without mutating", () => {
    const { store, service } = env();
    const before = store.snapshot().riskPolicies.length;
    assert.throws(
      () =>
        createPolicyOnSnap(
          store.snapshot(),
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignCeo,
            expectedVersion: 0,
            idempotencyKey: "policy-forged-1",
            policyType: "PUBLIC_LIABILITY",
            insurerPartyId: "00000000-0000-4000-8000-000000000099",
            insurerLabel: "Forged",
          },
          "2026-09-10T09:00:00.000Z",
          people.personCeo,
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED" && error.field === "insurerPartyId",
    );
    assert.throws(
      () =>
        service.createRiskPolicy(actor(people.personCeo), {
          organisationId: people.orgMaison,
          assignmentId: people.assignCeo,
          expectedVersion: 0,
          idempotencyKey: "policy-cross-org-party-1",
          policyType: "PUBLIC_LIABILITY",
          insurerPartyId: listGovernedProtectionParties(store.snapshot(), people.orgOther, "INSURER")[0]?.id,
        }),
      PlatformError,
    );
    assert.equal(store.snapshot().riskPolicies.length, before);
    const audits = store.snapshot().audit.filter((item) => item.idempotencyKey === "policy-forged-1" && item.outcome === "SUCCESS");
    assert.equal(audits.length, 0);
  });

  it("returns only organisation-scoped insurer and vendor choices", () => {
    const { store, service } = env();
    const maison = service.listGovernedProtectionParties(actor(people.personCeo), people.orgMaison, "INSURER");
    const other = listGovernedProtectionParties(store.snapshot(), people.orgOther, "INSURER");
    assert.ok(maison.some((item) => item.id === FIXTURE_INSURER_PARTY_ID));
    assert.equal(other.some((item) => item.id === FIXTURE_INSURER_PARTY_ID), false);
    assert.ok(maison.every((item) => item.organisationId === people.orgMaison));
    assert.ok(other.every((item) => item.organisationId === people.orgOther));
    const vendors = listGovernedProtectionParties(store.snapshot(), people.orgMaison, "VENDOR");
    assert.ok(vendors.some((item) => item.id === FIXTURE_VENDOR_PARTY_ID));
    const party = assertGovernedProtectionParty(store.snapshot(), people.orgMaison, FIXTURE_INSURER_PARTY_ID, "INSURER");
    assert.equal(party.label, "Synthetic Insurer");
  });

  it("does not write a success audit or idempotency receipt on validation failure", () => {
    const { store, service } = env();
    const key = "policy-validation-no-receipt";
    assert.throws(
      () =>
        service.createRiskPolicy(actor(people.personCeo), {
          organisationId: people.orgMaison,
          assignmentId: people.assignCeo,
          expectedVersion: 0,
          idempotencyKey: key,
          policyType: "PUBLIC_LIABILITY",
          insurerPartyId: "not-a-uuid",
        }),
      PlatformError,
    );
    assert.equal(store.snapshot().idempotency.filter((item) => item.key === key).length, 0);
    assert.equal(
      store.snapshot().audit.filter((item) => item.action === "risk.policy.create" && item.outcome === "SUCCESS").length,
      0,
    );
  });

  it("projects release evidence from durable evaluation rows and fails closed when unrun", () => {
    const { store } = env();
    const ready = s05bEvaluationReadinessFromSnap(store.snapshot(), people.orgMaison);
    assert.equal(ready.corpusEdition, "s05b-eval-v4");
    assert.equal(ready.corpusHash, s05bEvaluationCorpusHash());
    assert.notEqual(ready.corpusHash, "a5d540db67ccb6d4e4835d8b6d113903189ad3af3ab10e1c997929bef0198617");
    assert.equal(ready.evaluationStatus, "UNRUN");
    assert.equal(ready.evaluationBlocked, true);
    assert.equal(ready.releaseReady, false);
    assert.equal(ready.persistedResultCount, 0);
    assert.equal(ready.passedCount, 0);
    assert.ok(ready.blockingReasons.length > 0);
  });

  it("refuses protected diagnostics to an unauthorised actor", () => {
    const { service } = env();
    assert.throws(
      () => service.getS05BEvaluationReadiness(actor(people.personAdmin), people.orgMaison),
      (error: unknown) => error instanceof PlatformError && (error.code === "FORBIDDEN" || error.code === "SCOPE_MISMATCH"),
    );
    assert.throws(
      () => service.listGovernedProtectionParties(actor(people.personUnassigned), people.orgMaison, "INSURER"),
      PlatformError,
    );
  });
});

describe("S05B form families share the contract", () => {
  it("maps empty policy type and vendor id to public field keys", () => {
    const policy = parseFormSchema(CreateRiskPolicyFormSchema, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "family-policy-1",
      policyType: "",
      insurerPartyId: FIXTURE_INSURER_PARTY_ID,
    });
    assert.equal(policy.success, false);
    if (!policy.success) assert.ok(policy.fieldErrors.policyType);
    const issues = zodIssuesToFieldErrors([{ path: ["vendorId"], message: "Invalid uuid" }]);
    assert.equal(issues.vendorId, "Choose a vendor from the governed party register.");
  });
});
