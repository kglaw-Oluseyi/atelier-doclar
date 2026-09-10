import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { assembleDossierOnSnap, transitionDossierOnSnap } from "../src/risk-projections.js";
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

describe("EOS-S05B concurrency and idempotency", () => {
  it("replays identical policy create keys and rejects a stale dossier version", () => {
    const { store, service, snap } = env();
    const input = {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "policy-replay-key-01",
      policyType: "PUBLIC_LIABILITY" as const,
      insurerPartyId: "00000000-0000-4000-8000-000000000202",
      insurerLabel: "Replay insurer",
    };
    const first = service.createRiskPolicy(actor(people.personCeo), input);
    const replay = service.createRiskPolicy(actor(people.personCeo), input);
    assert.equal(replay.id, first.id);
    assert.equal(store.snapshot().riskPolicies.filter((item) => item.insurerLabel === "Replay insurer").length, 1);

    const source = createSourceEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "conc-source-01",
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
      "2026-09-10T09:01:00.000Z",
      people.personCeo,
    );
    approveSourceEditionOnSnap(
      snap,
      { organisationId: people.orgMaison, assignmentId: people.assignDirector, sourceId: source.id, expectedVersion: source.version, idempotencyKey: "conc-source-approve-01" },
      "2026-09-10T09:01:30.000Z",
      people.personDirector,
      "HUMAN",
    );
    const rule = createRuleEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "conc-rule-01",
        ruleKey: "public-liability-event",
        jurisdiction: "NG",
        proposition: "Public liability evidence may be required.",
        sourceEditionIds: [source.id],
        requirementKey: "PUBLIC_LIABILITY",
        policyType: "PUBLIC_LIABILITY",
        mandatory: true,
        nextReviewAt: "2026-12-10T09:00:00.000Z",
      },
      "2026-09-10T09:02:00.000Z",
      people.personCeo,
    );
    reviewRuleEditionOnSnap(
      snap,
      { organisationId: people.orgMaison, assignmentId: people.assignDirector, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: "conc-rule-approve-01" },
      "2026-09-10T09:02:30.000Z",
      people.personDirector,
      "HUMAN",
    );
    recordFactEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "conc-fact-01",
        factKey: "jurisdiction",
        value: "NG",
        unknown: false,
      },
      "2026-09-10T09:03:00.000Z",
      people.personCeo,
    );
    evaluateApplicabilityOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "conc-eval-01",
      },
      "2026-09-10T09:04:00.000Z",
      people.personCeo,
    );
    const dossier = assembleDossierOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignPlanner,
        expectedVersion: 0,
        idempotencyKey: "conc-dossier-01",
      },
      "2026-09-10T09:23:00.000Z",
      people.personPlanner,
    );
    const staleVersion = dossier.version;
    transitionDossierOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
        assignmentId: people.assignPlanner,
        dossierId: dossier.id,
        expectedVersion: dossier.version,
        to: "SUBMITTED",
        idempotencyKey: "conc-dossier-submit-01",
      },
      "2026-09-10T09:23:30.000Z",
      people.personPlanner,
      "HUMAN",
    );
    assert.throws(
      () =>
        transitionDossierOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            eventId: people.eventAlphaOne,
            assignmentId: people.assignDirector,
            dossierId: dossier.id,
            expectedVersion: staleVersion,
            to: "APPROVED",
            idempotencyKey: "conc-dossier-stale-01",
          },
          "2026-09-10T09:24:00.000Z",
          people.personDirector,
          "HUMAN",
        ),
      PlatformError,
    );
  });
});

describe("MD-PR-S061 authority concurrency", () => {
  it("rejects a stale review decision and competing current authority", () => {
    const { snap } = env();
    const source = createSourceEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "s061-conc-source",
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
      "2026-09-10T09:01:00.000Z",
      people.personCeo,
    );
    approveSourceEditionOnSnap(
      snap,
      { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, sourceId: source.id, expectedVersion: source.version, idempotencyKey: "s061-conc-source-approve" },
      "2026-09-10T09:01:30.000Z",
      people.personRiskReviewer,
      "HUMAN",
    );
    const first = createRuleEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "s061-conc-rule-1",
        ruleKey: "public-liability-event",
        jurisdiction: "NG",
        proposition: "First draft.",
        sourceEditionIds: [source.id],
        requirementKey: "PUBLIC_LIABILITY",
        policyType: "PUBLIC_LIABILITY",
        mandatory: true,
        nextReviewAt: "2026-12-10T09:00:00.000Z",
      },
      "2026-09-10T09:02:00.000Z",
      people.personCeo,
    );
    const second = createRuleEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignCeo,
        expectedVersion: 0,
        idempotencyKey: "s061-conc-rule-2",
        ruleKey: "public-liability-event",
        jurisdiction: "NG",
        proposition: "Second draft.",
        sourceEditionIds: [source.id],
        requirementKey: "PUBLIC_LIABILITY",
        policyType: "PUBLIC_LIABILITY",
        mandatory: true,
        nextReviewAt: "2026-12-10T09:00:00.000Z",
      },
      "2026-09-10T09:02:10.000Z",
      people.personCeo,
    );
    reviewRuleEditionOnSnap(
      snap,
      { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: first.id, status: "APPROVED", expectedVersion: first.version, idempotencyKey: "s061-conc-approve-1" },
      "2026-09-10T09:03:00.000Z",
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.throws(
      () =>
        reviewRuleEditionOnSnap(
          snap,
          { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: second.id, status: "APPROVED", expectedVersion: second.version, idempotencyKey: "s061-conc-approve-2" },
          "2026-09-10T09:03:10.000Z",
          people.personRiskReviewer,
          "HUMAN",
        ),
      /competing current authority/,
    );
    assert.throws(
      () =>
        reviewRuleEditionOnSnap(
          snap,
          { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: first.id, status: "WITHDRAWN", expectedVersion: 1, idempotencyKey: "s061-conc-stale-review" },
          "2026-09-10T09:03:20.000Z",
          people.personRiskReviewer,
          "HUMAN",
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
  });
});
