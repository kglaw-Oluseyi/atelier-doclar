import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import {
  assembleDossierOnSnap,
  currentDossierPublication,
  currentWorkingDossier,
  publishedClientDossierProjection,
  publishDossierOnSnap,
  transitionDossierOnSnap,
} from "../src/risk-projections.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
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
    idempotencyKey: `pub-${Math.random().toString(36).slice(2)}`,
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
  const rule = createRuleEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), ruleKey: "public-liability-event", jurisdiction: "NG", proposition: "Public liability evidence may be required.", sourceEditionIds: [source.id], requirementKey: "PUBLIC_LIABILITY", policyType: "PUBLIC_LIABILITY", mandatory: true, nextReviewAt: "2026-12-10T09:00:00.000Z" }, "2026-09-10T09:02:00.000Z", people.personCeo);
  reviewRuleEditionOnSnap(snap, { organisationId: people.orgMaison, assignmentId: people.assignDirector, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: envelope().idempotencyKey }, "2026-09-10T09:03:00.000Z", people.personDirector, "HUMAN");
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false }, "2026-09-10T09:04:00.000Z", people.personCeo);
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, "2026-09-10T09:04:30.000Z", people.personCeo);
  evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
}

describe("MD-PR-S060 publication sequence", () => {
  it("walks planner submit, director approve, CEO publish, and last-known-good", () => {
    const { snap } = env();
    prepare(snap);
    const dossier = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
    assert.throws(
      () => transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "APPROVED" }, "2026-09-10T09:23:30.000Z", people.personPlanner, "HUMAN"),
      PlatformError,
    );
    const submitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:24:00.000Z", people.personPlanner, "HUMAN");
    const approved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:25:00.000Z", people.personDirector, "HUMAN");
    assert.throws(
      () =>
        publishDossierOnSnap(
          snap,
          { ...envelope({ assignmentId: people.assignDirector, approvedHash: approved.contentHash }), editionId: approved.id, expectedVersion: approved.version },
          "2026-09-10T09:25:30.000Z",
          people.personDirector,
          "HUMAN",
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const liveApproved = snap.riskDossierEditions.find((item) => item.id === approved.id)!;
    const first = publishDossierOnSnap(
      snap,
      { ...envelope({ assignmentId: people.assignCeo, approvedHash: liveApproved.contentHash }), editionId: liveApproved.id, expectedVersion: liveApproved.version },
      "2026-09-10T09:26:00.000Z",
      people.personCeo,
      "HUMAN",
    );
    assert.equal(first.status, "CURRENT");
    const replay = publishDossierOnSnap(
      snap,
      { ...envelope({ assignmentId: people.assignCeo, approvedHash: liveApproved.contentHash }), editionId: liveApproved.id, expectedVersion: liveApproved.version },
      "2026-09-10T09:26:30.000Z",
      people.personCeo,
      "HUMAN",
    );
    assert.equal(replay.id, first.id);
    assembleDossierOnSnap(snap, envelope({ idempotencyKey: "after-publish" }), "2026-09-10T10:00:00.000Z", people.personPlanner);
    const client = publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne);
    assert.equal(client.published, true);
    assert.equal(client.contentHash, first.approvedHash);
    const failedSnap = structuredClone(snap);
    assert.throws(
      () =>
        publishDossierOnSnap(
          failedSnap,
          { ...envelope({ assignmentId: people.assignCeo, approvedHash: "0".repeat(64) }), editionId: approved.id, expectedVersion: 99 },
          "2026-09-10T10:05:00.000Z",
          people.personCeo,
          "HUMAN",
        ),
      PlatformError,
    );
    assert.equal(currentDossierPublication(failedSnap, people.eventAlphaOne)?.id, first.id);
    const successorDraft = currentWorkingDossier(snap, people.eventAlphaOne)!;
    const successorSubmitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: successorDraft.id, expectedVersion: successorDraft.version, to: "SUBMITTED" }, "2026-09-10T10:10:00.000Z", people.personPlanner, "HUMAN");
    const successorApproved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: successorSubmitted.id, expectedVersion: successorSubmitted.version, to: "APPROVED" }, "2026-09-10T10:11:00.000Z", people.personDirector, "HUMAN");
    const successor = publishDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo, approvedHash: successorApproved.contentHash }), editionId: successorApproved.id, expectedVersion: successorApproved.version }, "2026-09-10T10:12:00.000Z", people.personCeo, "HUMAN");
    assert.equal(successor.status, "CURRENT");
    assert.notEqual(successor.id, first.id);
    assert.equal(successor.supersedesPublicationId, first.id);
    assert.equal(currentDossierPublication(snap, people.eventAlphaOne)?.id, successor.id);
    assert.equal(publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne).contentHash, successor.approvedHash);
    assert.equal(snap.riskDossierPublications.find((item) => item.id === first.id)?.status, "SUPERSEDED");
  });

  it("denies Event Director publish at the service permission boundary", () => {
    const { store, service } = env();
    const snap = store.snapshot();
    prepare(snap);
    const dossier = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
    const submitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:24:00.000Z", people.personPlanner, "HUMAN");
    const approved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:25:00.000Z", people.personDirector, "HUMAN");
    store.replace(snap);
    assert.throws(
      () =>
        service.publishRiskDossier(actor(people.personDirector), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          assignmentId: people.assignDirector,
          expectedVersion: approved.version,
          idempotencyKey: envelope().idempotencyKey,
          editionId: approved.id,
          approvedHash: approved.contentHash,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.equal(currentDossierPublication(store.snapshot(), people.eventAlphaOne), undefined);
  });
});
