import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { redactPolicyEdition } from "../src/risk-disclosure.js";
import { createPolicyEditionOnSnap, createPolicyOnSnap, createEvidenceDocumentOnSnap, completeEvidenceUploadOnSnap } from "../src/risk-policy-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { store, service, snap: store.snapshot() };
}

describe("EOS-S05B permissions and disclosure", () => {
  it("denies System Administrator business mutation and omits policy identifiers from public projection", () => {
    const { service, snap } = env();
    assert.equal(permissionsForRole("SYSTEM_ADMINISTRATOR").some((item) => item.startsWith("risk.")), false);
    assert.throws(
      () =>
        service.createRiskPolicy(actor(people.personAdmin), {
          organisationId: people.orgMaison,
          assignmentId: people.assignAdmin,
          expectedVersion: 0,
          idempotencyKey: "admin-policy-denied-01",
          policyType: "PUBLIC_LIABILITY",
          insurerPartyId: "00000000-0000-4000-8000-000000000202",
          insurerLabel: "X",
        }),
      PlatformError,
    );
    const policy = createPolicyOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "disc-policy-01",
        policyType: "PUBLIC_LIABILITY",
        insurerPartyId: "00000000-0000-4000-8000-000000000202",
        insurerLabel: "Synthetic",
      },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    const document = createEvidenceDocumentOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "disc-evidence-01",
        title: "Certificate",
        classification: "POLICY_IDENTIFIER",
        originalFilename: "cert.pdf",
      },
      "2026-09-10T09:01:00.000Z",
      people.personCeo,
    );
    completeEvidenceUploadOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: document.version,
        idempotencyKey: "disc-upload-01",
        documentId: document.id,
        objectKey: `risk/${people.orgMaison}/${document.id}`,
        byteChecksum: "a".repeat(64),
        byteLength: 128,
        contentType: "application/pdf",
        scanAdapter: "INACTIVE",
      },
      "2026-09-10T09:02:00.000Z",
    );
    const edition = createPolicyEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: policy.version,
        idempotencyKey: "disc-edition-01",
        policyId: policy.id,
        policyNumber: "SYN-SECRET-001",
        currency: "NGN",
        period: { startOn: "2026-01-01", endOn: "2026-12-31" },
        limits: [{ coverageKey: "PUBLIC_LIABILITY", limit: { currency: "NGN", minor: "100000000" }, basis: "any one occurrence" }],
        deductibles: [],
        insuredPartyLabels: ["Maison"],
        documentEditionId: document.id,
      },
      "2026-09-10T09:03:00.000Z",
      people.personCeo,
    );
    const hidden = redactPolicyEdition(edition, "PUBLIC");
    assert.equal("policyNumberCiphertext" in hidden, false);
    assert.equal("policyNumber" in hidden, false);
  });

  it("denies cross-organisation mutation and cross-event protection reads", () => {
    const { service } = env();
    assert.throws(
      () =>
        service.createRiskPolicy(actor(people.personCeo), {
          organisationId: people.orgOther,
          assignmentId: people.assignCeo,
          expectedVersion: 0,
          idempotencyKey: "cross-org-denied-01",
          policyType: "PUBLIC_LIABILITY",
          insurerPartyId: "00000000-0000-4000-8000-000000000202",
          insurerLabel: "Other",
        }),
      PlatformError,
    );
    assert.throws(() => service.getEventProtection(actor(people.personCeo), people.orgMaison, people.eventOther), PlatformError);
  });
});
