import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { actor, fixtureService, people } from "./helpers.js";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { store, service };
}

const MUTATIONS = [
  {
    name: "assemble",
    run: (service: ReturnType<typeof env>["service"], personId: string, assignmentId: string, key: string) =>
      service.assembleRiskDossier(actor(personId), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId,
        expectedVersion: 0,
        idempotencyKey: key,
      }),
  },
  {
    name: "submit",
    run: (service: ReturnType<typeof env>["service"], personId: string, assignmentId: string, key: string) =>
      service.transitionRiskDossier(actor(personId), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId,
        expectedVersion: 0,
        idempotencyKey: key,
        dossierId: "00000000-0000-4000-8000-000000000099",
        to: "SUBMITTED",
      }),
  },
  {
    name: "approve",
    run: (service: ReturnType<typeof env>["service"], personId: string, assignmentId: string, key: string) =>
      service.transitionRiskDossier(actor(personId), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId,
        expectedVersion: 0,
        idempotencyKey: key,
        dossierId: "00000000-0000-4000-8000-000000000099",
        to: "APPROVED",
      }),
  },
  {
    name: "publish",
    run: (service: ReturnType<typeof env>["service"], personId: string, assignmentId: string, key: string) =>
      service.publishRiskDossier(actor(personId), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId,
        expectedVersion: 0,
        idempotencyKey: key,
        editionId: "00000000-0000-4000-8000-000000000099",
        approvedHash: "a".repeat(64),
      }),
  },
  {
    name: "export",
    run: (service: ReturnType<typeof env>["service"], personId: string, assignmentId: string, key: string) =>
      service.exportRiskDossier(actor(personId), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId,
        expectedVersion: 0,
        idempotencyKey: key,
        dossierId: "00000000-0000-4000-8000-000000000099",
      }),
  },
  {
    name: "issue-client-access",
    run: (service: ReturnType<typeof env>["service"], personId: string, assignmentId: string, key: string) =>
      service.issueRiskDossierAccess(actor(personId), {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId,
        expectedVersion: 0,
        idempotencyKey: key,
      }),
  },
] as const;

function assertDeniedMutation(
  service: ReturnType<typeof env>["service"],
  store: ReturnType<typeof env>["store"],
  personId: string,
  assignmentId: string,
  mutation: (typeof MUTATIONS)[number],
) {
  const beforeEditions = store.snapshot().riskDossierEditions.length;
  const beforePublications = store.snapshot().riskDossierPublications.length;
  const beforeSuccess = store.snapshot().audit.filter((item) => item.outcome === "SUCCESS").length;
  const beforeReceipts = store.snapshot().idempotency.length;
  assert.throws(
    () => mutation.run(service, personId, assignmentId, `deny-${mutation.name}-${personId}`),
    (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.ok(error.code === "FORBIDDEN" || error.code === "NOT_FOUND");
      assert.equal(/contentHash|limitations|componentHashes/i.test(`${error.message}\n${error.publicMessage}`), false);
      return true;
    },
  );
  const after = store.snapshot();
  assert.equal(after.riskDossierEditions.length, beforeEditions);
  assert.equal(after.riskDossierPublications.length, beforePublications);
  assert.equal(after.audit.filter((item) => item.outcome === "SUCCESS").length, beforeSuccess);
  assert.equal(after.idempotency.length, beforeReceipts);
}

describe("MD-PR-S060 dossier authority", () => {
  it("grants the exact dossier role matrix", () => {
    const planner = permissionsForRole("PLANNER");
    const director = permissionsForRole("EVENT_DIRECTOR");
    const auditor = permissionsForRole("READ_ONLY_AUDITOR");
    const admin = permissionsForRole("SYSTEM_ADMINISTRATOR");
    const ceo = permissionsForRole("CEO");
    assert.equal(planner.includes("risk.dossier.view"), true);
    assert.equal(planner.includes("risk.dossier.assemble"), true);
    assert.equal(planner.includes("risk.dossier.submit"), true);
    assert.equal(planner.includes("risk.dossier.approve"), false);
    assert.equal(planner.includes("risk.dossier.publish"), false);
    assert.equal(director.includes("risk.dossier.approve"), true);
    assert.equal(director.includes("risk.dossier.publish"), false);
    assert.equal(director.includes("risk.dossier.client_access.manage"), false);
    assert.equal(ceo.includes("risk.dossier.publish"), true);
    assert.equal(ceo.includes("risk.dossier.client_access.manage"), true);
    assert.equal(auditor.includes("risk.dossier.view"), true);
    assert.equal(auditor.includes("risk.dossier.assemble"), false);
    assert.equal(admin.some((key) => key.startsWith("risk.dossier")), false);
  });

  it("denies Auditor and System Administrator every dossier mutation", () => {
    const auditorEnv = env();
    const adminEnv = env();
    for (const mutation of MUTATIONS) {
      assertDeniedMutation(auditorEnv.service, auditorEnv.store, people.personAuditor, people.assignAuditor, mutation);
      assertDeniedMutation(adminEnv.service, adminEnv.store, people.personAdmin, people.assignAdmin, mutation);
    }
  });

  it("denies source self-approval even for CEO and accepts a distinct reviewer", () => {
    const { service } = env();
    const source = service.createRiskSource(actor(people.personCeo), {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "s060-source-self-01",
      title: "NSITF",
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic",
      retrievedAt: "2026-09-10T09:00:00.000Z",
      lastVerifiedAt: "2026-09-10T09:00:00.000Z",
      nextReviewAt: "2026-12-10T09:00:00.000Z",
    });
    assert.throws(
      () =>
        service.approveRiskSource(actor(people.personCeo), {
          organisationId: people.orgMaison,
          assignmentId: people.assignCeo,
          sourceId: source.id,
          expectedVersion: source.version,
          idempotencyKey: "s060-source-self-approve",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const approved = service.approveRiskSource(actor(people.personRiskReviewer), {
      organisationId: people.orgMaison,
      assignmentId: people.assignRiskReviewer,
      sourceId: source.id,
      expectedVersion: source.version,
      idempotencyKey: "s060-source-reviewer-approve",
    });
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.approvedByPersonId, people.personRiskReviewer);
  });
});
