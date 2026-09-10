import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import {
  assembleDossierOnSnap,
  publishedClientDossierProjection,
  transitionDossierOnSnap,
} from "../src/risk-projections.js";
import { calculateBudgetScenarioOnSnap, decideBudgetScenarioOnSnap } from "../src/eec-intelligence.js";
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
    idempotencyKey: `s060-${Math.random().toString(36).slice(2)}`,
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
  approveSourceEditionOnSnap(
    snap,
    {
      organisationId: people.orgMaison,
      assignmentId: people.assignDirector,
      sourceId: source.id,
      expectedVersion: source.version,
      idempotencyKey: envelope().idempotencyKey,
    },
    "2026-09-10T09:01:00.000Z",
    people.personDirector,
    "HUMAN",
  );
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
  reviewRuleEditionOnSnap(
    snap,
    {
      organisationId: people.orgMaison,
      assignmentId: people.assignDirector,
      ruleId: rule.id,
      status: "APPROVED",
      expectedVersion: rule.version,
      idempotencyKey: envelope().idempotencyKey,
    },
    "2026-09-10T09:03:00.000Z",
    people.personDirector,
    "HUMAN",
  );
  recordFactEditionOnSnap(
    snap,
    { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false },
    "2026-09-10T09:04:00.000Z",
    people.personCeo,
  );
  recordFactEditionOnSnap(
    snap,
    { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false },
    "2026-09-10T09:04:30.000Z",
    people.personCeo,
  );
  evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
}

function publishApproved(snap: ReturnType<typeof env>["snap"]) {
  prepare(snap);
  const dossier = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
  const submitted = transitionDossierOnSnap(
    snap,
    { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" },
    "2026-09-10T09:24:00.000Z",
    people.personPlanner,
    "HUMAN",
  );
  const approved = transitionDossierOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignDirector }),
      dossierId: submitted.id,
      expectedVersion: submitted.version,
      to: "APPROVED",
    },
    "2026-09-10T09:25:00.000Z",
    people.personDirector,
    "HUMAN",
  );
  return transitionDossierOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo, approvedHash: approved.contentHash }),
      dossierId: approved.id,
      expectedVersion: approved.version,
      to: "PUBLISHED",
    },
    "2026-09-10T09:26:00.000Z",
    people.personCeo,
    "HUMAN",
  );
}

describe("MD-PR-S060 first-run blockers", () => {
  it("denies Auditor dossier assemble without changing durable state", () => {
    const { service, store } = env();
    const beforeEditions = store.snapshot().riskDossierEditions.length;
    const beforePublications = store.snapshot().riskDossierPublications.length;
    const beforeSuccess = store.snapshot().audit.filter((item) => item.action === "risk.dossier.assemble" && item.outcome === "SUCCESS").length;
    const beforeReceipts = store.snapshot().idempotency.filter((item) => item.action === "risk.dossier.assemble").length;
    assert.throws(
      () =>
        service.assembleRiskDossier(actor(people.personAuditor), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          assignmentId: people.assignAuditor,
          expectedVersion: 0,
          idempotencyKey: "auditor-assemble-s060",
        }),
      (error: unknown) => {
        assert.ok(error instanceof PlatformError);
        assert.ok(error.code === "FORBIDDEN" || error.code === "AUTH_REQUIRED");
        assert.equal(/contentHash|limitations|NSITF|componentHashes/i.test(error.message), false);
        return true;
      },
    );
    const after = store.snapshot();
    assert.equal(after.riskDossierEditions.length, beforeEditions);
    assert.equal(after.riskDossierPublications.length, beforePublications);
    assert.equal(
      after.audit.filter((item) => item.action === "risk.dossier.assemble" && item.outcome === "SUCCESS").length,
      beforeSuccess,
    );
    assert.equal(after.idempotency.filter((item) => item.key === "auditor-assemble-s060").length, beforeReceipts);
  });

  it("keeps the last-known-good client publication after a new working draft", () => {
    const { snap } = env();
    const published = publishApproved(snap);
    const publication = snap.riskDossierPublications.find((item) => item.eventId === people.eventAlphaOne && item.current);
    assert.ok(publication);
    const before = publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne);
    assert.equal(before.published, true);
    assert.equal(before.contentHash, published.contentHash);
    assembleDossierOnSnap(snap, envelope({ idempotencyKey: "draft-after-publish" }), "2026-09-10T10:00:00.000Z", people.personPlanner);
    const after = publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne);
    assert.equal(after.published, true);
    assert.equal(after.contentHash, published.contentHash);
    assert.equal(after.publicationNumber, before.publicationNumber);
    assert.equal(after.publishedAt, before.publishedAt);
    assert.equal(
      snap.riskDossierPublications.filter((item) => item.eventId === people.eventAlphaOne && item.current).length,
      1,
    );
  });

  it("classifies a real concurrent Budget change as VERSION_CONFLICT without applying a successor", () => {
    const shared = env();
    const draft = calculateBudgetScenarioOnSnap(
      shared.snap,
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
    const governing = decideBudgetScenarioOnSnap(
      shared.snap,
      { organisationId: people.orgMaison, scenarioId: draft.id, expectedVersion: draft.version },
      "2026-09-10T08:05:00.000Z",
      people.personDirector,
    );
    const loadedHash = governing.resultHash;
    const loadedVersion = governing.version;
    decideBudgetScenarioOnSnap(
      shared.snap,
      { organisationId: people.orgMaison, scenarioId: governing.id, expectedVersion: loadedVersion },
      "2026-09-10T08:12:00.000Z",
      people.personDirector,
    );
    shared.store.replace(shared.snap);
    const changed = shared.store.snapshot().budgetScenarioEditions.find((item) => item.id === governing.id);
    assert.ok(changed);
    assert.notEqual(changed.version, loadedVersion);
    const beforeScenarios = shared.store.snapshot().budgetScenarioEditions.length;
    const beforeProjections = shared.store.snapshot().riskBudgetProjections.length;
    assert.throws(
      () =>
        shared.service.projectRiskBudget(actor(people.personCeo), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          assignmentId: people.assignCeo,
          expectedVersion: 0,
          idempotencyKey: "budget-context-a-stale",
          governingScenarioHash: loadedHash,
          expectedScenarioVersion: loadedVersion,
          drivers: [{ kind: "UNQUANTIFIED_EXPOSURE", reason: "context A stale submit", evidenceIds: [] }],
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const after = shared.store.snapshot();
    assert.equal(after.budgetScenarioEditions.length, beforeScenarios);
    assert.equal(after.riskBudgetProjections.length, beforeProjections);
    const liveGoverning = after.budgetScenarioEditions.find((item) => item.id === governing.id);
    assert.equal(liveGoverning?.version, changed.version);
    assert.equal(liveGoverning?.resultHash, changed.resultHash);
  });
});
