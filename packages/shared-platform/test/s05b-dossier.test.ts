import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { assembleDossierOnSnap, exportDossierOnSnap, transitionDossierOnSnap } from "../src/risk-projections.js";
import { createSourceEditionOnSnap, approveSourceEditionOnSnap, createRuleEditionOnSnap, reviewRuleEditionOnSnap, recordFactEditionOnSnap, evaluateApplicabilityOnSnap } from "../src/risk-policy-operations.js";
import { DOSSIER_TRANSITIONS, assertLegalTransition } from "../src/risk-transitions.js";
import { actor, fixtureService, people } from "./helpers.js";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { store, service, snap: store.snapshot() };
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignPlanner,
    expectedVersion: 0,
    idempotencyKey: `dossier-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function prepare(snap: ReturnType<typeof env>["snap"]) {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title: "NSITF",
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic",
      retrievedAt: "2026-09-10T09:00:00.000Z",
      lastVerifiedAt: "2026-09-10T09:00:00.000Z",
      nextReviewAt: "2026-12-10T09:00:00.000Z",
    },
    "2026-09-10T09:00:00.000Z",
    people.personCeo,
  );
  approveSourceEditionOnSnap(snap, { organisationId: people.orgMaison, assignmentId: people.assignDirector, sourceId: source.id, expectedVersion: source.version, idempotencyKey: envelope().idempotencyKey }, "2026-09-10T09:01:00.000Z", people.personDirector, "HUMAN");
  const rule = createRuleEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Public liability evidence may be required.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
    },
    "2026-09-10T09:02:00.000Z",
    people.personCeo,
  );
  reviewRuleEditionOnSnap(snap, { organisationId: people.orgMaison, assignmentId: people.assignDirector, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: envelope().idempotencyKey }, "2026-09-10T09:03:00.000Z", people.personDirector, "HUMAN");
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false }, "2026-09-10T09:04:00.000Z", people.personCeo);
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, "2026-09-10T09:04:30.000Z", people.personCeo);
  evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
}

describe("EOS-S05B dossier lifecycle", () => {
  it("rejects draft-to-publish and collapsed checker publication", () => {
    assert.equal((DOSSIER_TRANSITIONS.DRAFT ?? []).includes("PUBLISHED"), false);
    assert.throws(() => assertLegalTransition(DOSSIER_TRANSITIONS, "DRAFT", "PUBLISHED", "dossier"), PlatformError);
    const { snap } = env();
    prepare(snap);
    const dossier = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
    assert.throws(
      () => transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "PUBLISHED", approvedHash: dossier.contentHash }, "2026-09-10T09:24:00.000Z", people.personCeo, "HUMAN"),
      PlatformError,
    );
    const submitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:24:00.000Z", people.personPlanner, "HUMAN");
    assert.throws(
      () => transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignPlanner }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:24:30.000Z", people.personPlanner, "HUMAN"),
      PlatformError,
    );
    const approved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:25:00.000Z", people.personDirector, "HUMAN");
    assert.throws(
      () => transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector, approvedHash: approved.contentHash }), dossierId: approved.id, expectedVersion: approved.version, to: "PUBLISHED" }, "2026-09-10T09:25:30.000Z", people.personDirector, "HUMAN"),
      PlatformError,
    );
    assert.throws(
      () => transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), dossierId: approved.id, expectedVersion: approved.version, to: "PUBLISHED" }, "2026-09-10T09:26:00.000Z", people.personCeo, "HUMAN"),
      /approved exact hash/,
    );
    const published = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo, approvedHash: approved.contentHash }), dossierId: approved.id, expectedVersion: approved.version, to: "PUBLISHED" }, "2026-09-10T09:26:00.000Z", people.personCeo, "HUMAN");
    assert.equal(published.status, "APPROVED");
    assert.equal(published.dispatched, false);
    assert.equal(snap.riskDossierPublications.filter((item) => item.eventId === people.eventAlphaOne && item.current).length, 1);
    assert.equal(snap.riskDossierPublications.find((item) => item.eventId === people.eventAlphaOne && item.current)?.status, "CURRENT");
    const exported = exportDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), dossierId: published.id, expectedVersion: published.version }, "2026-09-10T09:27:00.000Z", people.personCeo);
    assert.equal(exported.dispatched, false);
    assert.ok(exported.fullHash);
  });

  it("keeps System Administrator out of dossier publication at the service boundary", () => {
    const { service } = env();
    assert.throws(
      () =>
        service.assembleRiskDossier(actor(people.personAdmin), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          assignmentId: people.assignAdmin,
          expectedVersion: 0,
          idempotencyKey: "admin-dossier",
        }),
      PlatformError,
    );
  });
});
