import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateEosS05B } from "../src/risk-migration.js";
import { recordRuleCurrentReviewOnSnap, selectEffectiveRiskAuthorities } from "../src/risk-authority.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import {
  assembleDossierOnSnap,
  currentDossierPublication,
  publishedClientDossierProjection,
  publishDossierOnSnap,
  transitionDossierOnSnap,
} from "../src/risk-projections.js";
import { generateDossierAccessToken, hashDossierAccessToken, issueDossierAccessOnSnap, resolveDossierAccessOnSnap, revokeDossierAccessOnSnap } from "../src/risk-dossier-access.js";
import { actor, fixtureService, people } from "./helpers.js";

const FUTURE = "2026-12-10T09:00:00.000Z";

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
    idempotencyKey: `s061-ret-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function retainedHistory(snap: ReturnType<typeof env>["snap"]) {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title: "Historic NSITF",
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Retained historic source.",
      retrievedAt: "2026-01-01T09:00:00.000Z",
      lastVerifiedAt: "2026-01-01T09:00:00.000Z",
      nextReviewAt: FUTURE,
    },
    "2026-01-01T09:00:00.000Z",
    people.personCeo,
  );
  approveSourceEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, sourceId: source.id, expectedVersion: source.version, idempotencyKey: envelope().idempotencyKey },
    "2026-01-01T09:01:00.000Z",
    people.personRiskReviewer,
    "HUMAN",
  );
  const historic = createRuleEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Historic approved public liability rule.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: "2026-09-10T11:00:00.000Z",
    },
    "2026-01-01T09:02:00.000Z",
    people.personCeo,
  );
  reviewRuleEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: historic.id, status: "APPROVED", expectedVersion: historic.version, idempotencyKey: envelope().idempotencyKey },
    "2026-01-01T09:03:00.000Z",
    people.personRiskReviewer,
    "HUMAN",
  );
  createRuleEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Unapproved successor draft.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: FUTURE,
      supersedesEditionId: historic.id,
    },
    "2026-06-01T09:00:00.000Z",
    people.personCeo,
  );
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false }, "2026-09-10T09:04:00.000Z", people.personCeo);
  recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, "2026-09-10T09:04:30.000Z", people.personCeo);
  evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
  const dossier = assembleDossierOnSnap(snap, envelope(), "2026-09-10T09:23:00.000Z", people.personPlanner);
  const submitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: dossier.id, expectedVersion: dossier.version, to: "SUBMITTED" }, "2026-09-10T09:24:00.000Z", people.personPlanner, "HUMAN");
  const approved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T09:25:00.000Z", people.personDirector, "HUMAN");
  const publication = publishDossierOnSnap(
    snap,
    { ...envelope({ assignmentId: people.assignCeo, approvedHash: approved.contentHash }), editionId: approved.id, expectedVersion: approved.version },
    "2026-09-10T09:26:00.000Z",
    people.personCeo,
    "HUMAN",
  );
  assembleDossierOnSnap(snap, envelope({ idempotencyKey: "s061-working-draft" }), "2026-09-10T09:27:00.000Z", people.personPlanner);
  return { source, historic, publication, approved };
}

describe("MD-PR-S061 retained-data regression", () => {
  it("keeps drafts out of authority, preserves history, and recovers through governed review", () => {
    const { snap } = env();
    const { historic, publication } = retainedHistory(snap);
    const beforeCount = snap.riskRuleEditions.length;
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, "2026-09-10T12:00:00.000Z");
    assert.equal(selected[0]?.rule.id, historic.id);
    assert.equal(selected[0]?.authorityState, "STALE_APPROVED");
    assert.equal(selected[0]?.reasons.some((reason) => /expired/.test(reason)), true);
    assert.equal(currentDossierPublication(snap, people.eventAlphaOne)?.id, publication.id);
    assert.equal(publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne).contentHash, publication.approvedHash);

    const successor = recordRuleCurrentReviewOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignRiskReviewer }),
        ruleId: historic.id,
        expectedVersion: historic.version,
        nextReviewAt: FUTURE,
        reason: "Governed successor review of retained Alpha authority.",
        confirmedHash: historic.contentHash,
      },
      "2026-09-10T12:05:00.000Z",
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.equal(snap.riskRuleEditions.length, beforeCount + 1);
    assert.ok(snap.riskRuleEditions.some((item) => item.id === historic.id));
    const after = evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T12:06:00.000Z", people.personCeo);
    assert.deepEqual(after.snapshot.ruleEditionIds, [successor.id]);
    assert.notEqual(after.snapshot.overall, "STALE");
    assert.equal(currentDossierPublication(snap, people.orgMaison && people.eventAlphaOne)?.id, publication.id);

    const working = assembleDossierOnSnap(snap, envelope({ idempotencyKey: "s061-new-working" }), "2026-09-10T12:07:00.000Z", people.personPlanner);
    const submitted = transitionDossierOnSnap(snap, { ...envelope(), dossierId: working.id, expectedVersion: working.version, to: "SUBMITTED" }, "2026-09-10T12:08:00.000Z", people.personPlanner, "HUMAN");
    const approved = transitionDossierOnSnap(snap, { ...envelope({ assignmentId: people.assignDirector }), dossierId: submitted.id, expectedVersion: submitted.version, to: "APPROVED" }, "2026-09-10T12:09:00.000Z", people.personDirector, "HUMAN");
    const nextPublication = publishDossierOnSnap(
      snap,
      { ...envelope({ assignmentId: people.assignCeo, approvedHash: approved.contentHash }), editionId: approved.id, expectedVersion: approved.version },
      "2026-09-10T12:10:00.000Z",
      people.personCeo,
      "HUMAN",
    );
    assert.equal(nextPublication.supersedesPublicationId, publication.id);
    assert.equal(publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne).contentHash, nextPublication.approvedHash);

    const token = generateDossierAccessToken();
    const tokenHash = hashDossierAccessToken(token, "s061-retained-pepper");
    const grant = issueDossierAccessOnSnap(
      snap,
      { ...envelope({ assignmentId: people.assignCeo }), tokenHash, expiresAt: "2026-12-31T00:00:00.000Z" },
      "2026-09-10T12:11:00.000Z",
      people.personCeo,
    );
    const resolved = resolveDossierAccessOnSnap(snap, tokenHash, "2026-09-10T12:12:00.000Z");
    assert.equal(resolved.status, "ACTIVE");
    assert.equal(publishedClientDossierProjection(snap, people.orgMaison, people.eventAlphaOne).contentHash, nextPublication.approvedHash);
    revokeDossierAccessOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), grantId: grant.id, expectedVersion: grant.version }, "2026-09-10T12:13:00.000Z", people.personCeo);
    assert.throws(() => resolveDossierAccessOnSnap(snap, tokenHash, "2026-09-10T12:14:00.000Z"));
  });

  it("does not convert a later draft into a READY bypass", () => {
    const { store, service, snap } = env();
    const { source } = retainedHistory(snap);
    store.replace(snap);
    const ceo = actor(people.personCeo);
    const draft = service.createRiskRule(ceo, {
      organisationId: people.orgMaison,
      assignmentId: people.assignCeo,
      expectedVersion: 0,
      idempotencyKey: "s061-later-draft",
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Later draft after publication.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: FUTURE,
    });
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, "2026-09-10T12:00:00.000Z");
    assert.notEqual(selected[0]?.rule.id, draft.id);
    assert.equal(selected[0]?.authorityState, "STALE_APPROVED");
    assert.equal(currentDossierPublication(snap, people.eventAlphaOne)?.status, "CURRENT");
  });
});
