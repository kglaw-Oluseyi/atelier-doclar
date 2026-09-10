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
