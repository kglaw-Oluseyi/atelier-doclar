import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import {
  compareApprovedNewest,
  recordRuleCurrentReviewOnSnap,
  recordSourceCurrentReviewOnSnap,
  selectEffectiveRiskAuthorities,
} from "../src/risk-authority.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { fixtureService, people } from "./helpers.js";
import type { PlatformSnapshot } from "../src/store.js";
import type { RiskRuleEdition, RiskSourceEdition } from "../src/risk-schemas.js";

const NOW = "2026-09-10T12:00:00.000Z";
const FUTURE = "2026-12-10T09:00:00.000Z";
const PAST = "2026-01-01T00:00:00.000Z";

function env() {
  const { store } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { snap: store.snapshot() };
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignCeo,
    expectedVersion: 0,
    idempotencyKey: `s061-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function seedSource(snap: PlatformSnapshot, title = "NSITF selector"): RiskSourceEdition {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope(),
      title,
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic selector source.",
      retrievedAt: "2026-09-10T09:00:00.000Z",
      lastVerifiedAt: "2026-09-10T09:00:00.000Z",
      nextReviewAt: FUTURE,
    },
    "2026-09-10T09:00:00.000Z",
    people.personCeo,
  );
  return approveSourceEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, sourceId: source.id, expectedVersion: source.version, idempotencyKey: envelope().idempotencyKey },
    "2026-09-10T09:01:00.000Z",
    people.personRiskReviewer,
    "HUMAN",
  );
}

function draftRule(
  snap: PlatformSnapshot,
  source: RiskSourceEdition,
  extra?: Partial<Parameters<typeof createRuleEditionOnSnap>[1]>,
  now = "2026-09-10T09:02:00.000Z",
): RiskRuleEdition {
  return createRuleEditionOnSnap(
    snap,
    {
      ...envelope(),
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Public liability evidence may be required.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: FUTURE,
      ...extra,
    },
    now,
    people.personCeo,
  );
}

function approveRule(snap: PlatformSnapshot, rule: RiskRuleEdition, now = "2026-09-10T09:03:00.000Z"): RiskRuleEdition {
  return reviewRuleEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: envelope().idempotencyKey },
    now,
    people.personRiskReviewer,
    "HUMAN",
  );
}

describe("MD-PR-S061 effective authority selector", () => {
  it("lets one approved edition govern among many DISCOVERY editions", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const approved = approveRule(snap, draftRule(snap, source));
    draftRule(snap, source, { proposition: "Draft A" }, "2026-09-10T09:04:00.000Z");
    draftRule(snap, source, { proposition: "Draft B" }, "2026-09-10T09:05:00.000Z");
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected.length, 1);
    assert.equal(selected[0]?.rule.id, approved.id);
    assert.equal(selected[0]?.authorityState, "CURRENT_APPROVED");
  });

  it("does not let a newer DISCOVERY hide the approved edition", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const approved = approveRule(snap, draftRule(snap, source));
    const newer = draftRule(snap, source, { proposition: "Newer draft", supersedesEditionId: approved.id }, "2026-09-10T10:00:00.000Z");
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.rule.id, approved.id);
    assert.notEqual(selected[0]?.rule.id, newer.id);
  });

  it("lets an approved successor supersede the approved predecessor", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const first = approveRule(snap, draftRule(snap, source));
    const successorDraft = draftRule(snap, source, { proposition: "Successor", supersedesEditionId: first.id }, "2026-09-10T09:06:00.000Z");
    const successor = approveRule(snap, successorDraft, "2026-09-10T09:07:00.000Z");
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.rule.id, successor.id);
    assert.equal(snap.riskRuleEditions.find((item) => item.id === first.id)?.status, "SUPERSEDED");
  });

  it("does not fall back after an explicit withdrawal", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const first = approveRule(snap, draftRule(snap, source));
    const successorDraft = draftRule(snap, source, { proposition: "Withdrawn successor", supersedesEditionId: first.id }, "2026-09-10T09:06:00.000Z");
    reviewRuleEditionOnSnap(
      snap,
      { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: successorDraft.id, status: "WITHDRAWN", expectedVersion: successorDraft.version, idempotencyKey: envelope().idempotencyKey },
      "2026-09-10T09:07:00.000Z",
      people.personRiskReviewer,
      "HUMAN",
    );
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.authorityState, "WITHDRAWN_NO_AUTHORITY");
    assert.notEqual(selected[0]?.rule.id, first.id);
  });

  it("marks one STALE authority when the approved review has expired", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const approved = approveRule(snap, draftRule(snap, source, { nextReviewAt: "2026-09-10T11:00:00.000Z" }));
    draftRule(snap, source, { proposition: "Historic draft" }, "2026-09-10T09:08:00.000Z");
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected.length, 1);
    assert.equal(selected[0]?.rule.id, approved.id);
    assert.equal(selected[0]?.authorityState, "STALE_APPROVED");
  });

  it("does not treat a rule with an unapproved source as current", () => {
    const { snap } = env();
    const source = createSourceEditionOnSnap(
      snap,
      {
        ...envelope(),
        title: "Unapproved source",
        publisher: "NSITF",
        locator: "https://nsitf.gov.ng/draft",
        authority: "REGULATOR",
        jurisdiction: "NG",
        summary: "Still discovery.",
        retrievedAt: "2026-09-10T09:00:00.000Z",
        lastVerifiedAt: "2026-09-10T09:00:00.000Z",
        nextReviewAt: FUTURE,
      },
      "2026-09-10T09:00:00.000Z",
      people.personCeo,
    );
    const rule = draftRule(snap, source);
    Object.assign(rule, { status: "APPROVED", approvedHash: rule.contentHash, approvedAt: "2026-09-10T09:03:00.000Z" });
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.authorityState, "STALE_APPROVED");
    assert.ok(selected[0]?.reasons.some((reason) => /not approved/.test(reason)));
  });

  it("restores eligibility after a source successor is approved", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const rule = approveRule(snap, draftRule(snap, source));
    Object.assign(rule, { nextReviewAt: PAST });
    const selectedBefore = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selectedBefore[0]?.authorityState, "STALE_APPROVED");
    const refreshed = recordRuleCurrentReviewOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignRiskReviewer }),
        ruleId: selectedBefore[0]!.rule.id,
        expectedVersion: selectedBefore[0]!.rule.version,
        nextReviewAt: FUTURE,
        reason: "Restore current review.",
        confirmedHash: selectedBefore[0]!.rule.contentHash,
      },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.rule.id, refreshed.id);
    assert.equal(selected[0]?.authorityState, "CURRENT_APPROVED");
  });

  it("rebinds a reviewed rule to the current approved source successor", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const rule = approveRule(snap, draftRule(snap, source));
    Object.assign(source, { nextReviewAt: PAST });
    Object.assign(rule, { nextReviewAt: PAST });
    const sourceSuccessor = recordSourceCurrentReviewOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignRiskReviewer }),
        sourceId: source.id,
        expectedVersion: source.version,
        nextReviewAt: FUTURE,
        reason: "Refresh expired source.",
        confirmedHash: source.contentHash,
      },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    const afterSource = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(afterSource[0]?.authorityState, "STALE_APPROVED");
    const refreshed = recordRuleCurrentReviewOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignRiskReviewer }),
        ruleId: afterSource[0]!.rule.id,
        expectedVersion: afterSource[0]!.rule.version,
        nextReviewAt: FUTURE,
        reason: "Rebind to current approved source.",
        confirmedHash: afterSource[0]!.rule.contentHash,
      },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.authorityState, "CURRENT_APPROVED");
    assert.deepEqual(refreshed.sourceEditionIds, [sourceSuccessor.id]);
    assert.equal(selected[0]?.sources[0]?.id, sourceSuccessor.id);
  });

  it("fails closed on ambiguous competing approved editions", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const first = approveRule(snap, draftRule(snap, source));
    const secondDraft = draftRule(snap, source, { proposition: "Competing", supersedesEditionId: "00000000-0000-4000-8000-000000000099" }, "2026-09-10T09:06:00.000Z");
    Object.assign(secondDraft, { status: "APPROVED", approvedHash: secondDraft.contentHash, approvedAt: "2026-09-10T09:07:00.000Z", approvedByPersonId: people.personRiskReviewer });
    void first;
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected[0]?.authorityState, "AUTHORITY_CONFLICT");
  });

  it("is deterministic when array order changes", () => {
    const { snap } = env();
    const source = seedSource(snap);
    approveRule(snap, draftRule(snap, source));
    draftRule(snap, source, { proposition: "Draft" }, "2026-09-10T09:08:00.000Z");
    const first = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    snap.riskRuleEditions.reverse();
    snap.riskSourceEditions.reverse();
    const second = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.deepEqual(
      first.map((item) => ({ id: item.rule.id, state: item.authorityState })),
      second.map((item) => ({ id: item.rule.id, state: item.authorityState })),
    );
    const evalA = evaluateApplicabilityOnSnap(snap, { ...envelope({ eventId: people.eventAlphaOne }), expectedVersion: 0 }, NOW, people.personCeo);
    snap.riskRuleEditions.reverse();
    const evalB = evaluateApplicabilityOnSnap(snap, { ...envelope({ eventId: people.eventAlphaOne }), expectedVersion: 0 }, NOW, people.personCeo);
    assert.deepEqual(evalA.snapshot.ruleEditionIds, evalB.snapshot.ruleEditionIds);
    assert.equal(evalA.snapshot.contentHash, evalB.snapshot.contentHash);
  });

  it("never includes a cross-organisation edition", () => {
    const { snap } = env();
    const source = seedSource(snap);
    approveRule(snap, draftRule(snap, source));
    const foreign = draftRule(snap, source, { ruleKey: "foreign-rule" });
    Object.assign(foreign, { status: "APPROVED", approvedHash: foreign.contentHash, organisationId: people.orgOther });
    const selected = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(selected.every((item) => item.rule.organisationId === people.orgMaison), true);
    assert.equal(selected.some((item) => item.rule.id === foreign.id), false);
  });

  it("does not hash DISCOVERY history as governing input", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const approved = approveRule(snap, draftRule(snap, source));
    const draft = draftRule(snap, source, { proposition: "Irrelevant draft" }, "2026-09-10T09:08:00.000Z");
    recordFactEditionOnSnap(snap, { ...envelope({ eventId: people.eventAlphaOne }), factKey: "jurisdiction", value: "NG", unknown: false }, NOW, people.personCeo);
    recordFactEditionOnSnap(snap, { ...envelope({ eventId: people.eventAlphaOne }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, NOW, people.personCeo);
    const evaluated = evaluateApplicabilityOnSnap(snap, { ...envelope({ eventId: people.eventAlphaOne }) }, NOW, people.personCeo);
    assert.deepEqual(evaluated.snapshot.ruleEditionIds, [approved.id]);
    assert.equal(evaluated.snapshot.ruleEditionIds.includes(draft.id), false);
  });

  it("rejects inventing a review date on create and a silent extension on approve", () => {
    const { snap } = env();
    const source = seedSource(snap);
    assert.throws(
      () => draftRule(snap, source, { nextReviewAt: "2026-09-10T09:02:00.000Z" }),
      (error: unknown) => error instanceof PlatformError && error.field === "nextReviewAt",
    );
    const rule = draftRule(snap, source, { nextReviewAt: "2026-09-10T09:02:30.000Z" });
    assert.throws(
      () => approveRule(snap, rule, "2026-09-10T09:03:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.field === "nextReviewAt",
    );
  });

  it("sorts approved editions deterministically", () => {
    const left = { approvedAt: "2026-09-10T09:00:00.000Z", createdAt: "2026-09-10T08:00:00.000Z", version: 1, id: "a" } as RiskRuleEdition;
    const right = { approvedAt: "2026-09-10T09:00:00.000Z", createdAt: "2026-09-10T08:00:00.000Z", version: 1, id: "b" } as RiskRuleEdition;
    assert.equal(compareApprovedNewest(left, right) > 0, true);
  });
});
