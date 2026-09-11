import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { selectEffectiveRiskAuthorities } from "../src/risk-authority.js";
import { projectRiskAuthorityDetail, projectRiskAuthorityQueue } from "../src/risk-authority-queue.js";
import {
  classifyFixtureAuthorityOnSnap,
  recoverFixtureAuthoritiesOnSnap,
  unfinishedFixtureLineage,
} from "../src/risk-fixture-provenance.js";
import { previewExactSelectionWithdrawal, withdrawExactSelectionBatchOnSnap, withdrawGoverningRuleOnSnap } from "../src/risk-authority-withdrawal.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { actor, fixtureService, people } from "./helpers.js";
import type { PlatformSnapshot } from "../src/store.js";
import type { RiskRuleEdition, RiskSourceEdition } from "../src/risk-schemas.js";

const NOW = "2026-09-10T12:00:00.000Z";
const FUTURE = "2026-12-10T09:00:00.000Z";

function env() {
  const { store, service } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { snap: store.snapshot(), store, service };
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignRiskReviewer,
    expectedVersion: 0,
    idempotencyKey: `s062-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function seedSource(snap: PlatformSnapshot, title = "S062 source"): RiskSourceEdition {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title,
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic S062 source.",
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

function draftRule(snap: PlatformSnapshot, source: RiskSourceEdition, extra?: Partial<Parameters<typeof createRuleEditionOnSnap>[1]>): RiskRuleEdition {
  return createRuleEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      ruleKey: extra?.ruleKey ?? "s062-canonical-public-liability",
      jurisdiction: "NG",
      proposition: extra?.proposition ?? "Public liability evidence may be required.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: FUTURE,
      ...extra,
    },
    "2026-09-10T09:02:00.000Z",
    people.personCeo,
  );
}

function approveRule(snap: PlatformSnapshot, rule: RiskRuleEdition): RiskRuleEdition {
  return reviewRuleEditionOnSnap(
    snap,
    { organisationId: people.orgMaison, assignmentId: people.assignRiskReviewer, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: envelope().idempotencyKey },
    "2026-09-10T09:03:00.000Z",
    people.personRiskReviewer,
    "HUMAN",
  );
}

function classify(snap: PlatformSnapshot, rule: RiskRuleEdition, testRunId = "s062-run-1") {
  return classifyFixtureAuthorityOnSnap(
    snap,
    {
      ...envelope(),
      bindings: [{ editionId: rule.id, editionKind: "RULE", ruleKey: rule.ruleKey, contentHash: rule.contentHash, expectedVersion: rule.version }],
      provenance: { environment: "NON_PRODUCTION_FIXTURE", testRunId, authorityPromptId: "MD-PR-S062", createdByAutomation: true },
      lineage: "Obsolete S060 synthetic QA authority created by S060 live maker/checker tests.",
      productionAuthorised: false,
    },
    NOW,
    people.personRiskReviewer,
    "HUMAN",
  );
}

describe("MD-PR-S062 authority queue and fixture withdrawal", () => {
  it("paginates and filters the authority queue deterministically", () => {
    const { snap } = env();
    const source = seedSource(snap);
    for (const key of ["alpha-rule", "beta-rule", "gamma-rule"]) {
      approveRule(snap, draftRule(snap, source, { ruleKey: key, proposition: `${key} proposition` }));
    }
    const first = projectRiskAuthorityQueue(snap, { organisationId: people.orgMaison, limit: 2 }, NOW, "PUBLIC", true);
    assert.deepEqual(first.items.map((item) => item.ruleKey), ["alpha-rule", "beta-rule"]);
    assert.ok(first.nextCursor);
    const second = projectRiskAuthorityQueue(snap, { organisationId: people.orgMaison, limit: 2, cursor: first.nextCursor }, NOW, "PUBLIC", true);
    assert.deepEqual(second.items.map((item) => item.ruleKey), ["gamma-rule"]);
    const filtered = projectRiskAuthorityQueue(snap, { organisationId: people.orgMaison, ruleKey: "beta-rule" }, NOW, "PUBLIC", true);
    assert.equal(filtered.items.length, 1);
    assert.equal(filtered.items[0]?.ruleKey, "beta-rule");
    const reversed = { ...snap, riskRuleEditions: [...snap.riskRuleEditions].reverse() };
    const again = projectRiskAuthorityQueue(reversed, { organisationId: people.orgMaison, limit: 2 }, NOW, "PUBLIC", true);
    assert.deepEqual(again.items.map((item) => item.ruleKey), first.items.map((item) => item.ruleKey));
  });

  it("does not load or expose unrelated authority on the focused detail", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const keep = approveRule(snap, draftRule(snap, source, { ruleKey: "keep-rule", proposition: "Keep this lineage." }));
    approveRule(snap, draftRule(snap, source, { ruleKey: "other-rule", proposition: "Do not expose this proposition." }));
    const detail = projectRiskAuthorityDetail(snap, people.orgMaison, keep.id, NOW, "PUBLIC", true);
    assert.equal(detail.item.ruleKey, "keep-rule");
    assert.equal(detail.history.some((row) => row.proposition.includes("Do not expose")), false);
    assert.equal(detail.history.every((row) => row.id === keep.id || row.proposition.includes("Keep")), true);
  });

  it("withdraws exact synthetic authority while retaining immutable history and S061 authority", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const s060 = approveRule(snap, draftRule(snap, source, { ruleKey: "s060-public-liability-1789063488182" }));
    const s061 = approveRule(snap, draftRule(snap, source, { ruleKey: "s061-public-liability-1789066558518" }));
    draftRule(snap, source, { ruleKey: "CLAUDE-S05B-S059-B-RULE", proposition: "S059 discovery remains history." });
    classify(snap, s060);
    const before = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(before.find((item) => item.rule.ruleKey === s060.ruleKey)?.authorityState, "CURRENT_APPROVED");
    const withdrawn = withdrawGoverningRuleOnSnap(
      snap,
      { ...envelope(), ruleId: s060.id, expectedVersion: s060.version, confirmedHash: s060.contentHash, reason: "Obsolete S060 synthetic QA authority from S060 live tests." },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.equal(withdrawn.status, "WITHDRAWN");
    const after = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    assert.equal(after.find((item) => item.rule.ruleKey === s060.ruleKey)?.authorityState, "WITHDRAWN_NO_AUTHORITY");
    assert.equal(after.find((item) => item.rule.id === s061.id)?.authorityState, "CURRENT_APPROVED");
    assert.equal(after.find((item) => item.rule.ruleKey === "CLAUDE-S05B-S059-B-RULE")?.authorityState, "NO_APPROVED_EDITION");
    assert.equal(snap.riskRuleEditions.some((item) => item.id === s060.id), true);
    const replay = withdrawGoverningRuleOnSnap(
      snap,
      { ...envelope(), ruleId: s060.id, expectedVersion: withdrawn.version, confirmedHash: s060.contentHash, reason: "Obsolete S060 synthetic QA authority from S060 live tests." },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.equal(replay.id, withdrawn.id);
    assert.equal(replay.status, "WITHDRAWN");
  });

  it("rejects wrong ID, version, hash, cross-org and non-fixture batch rows atomically", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const fixture = approveRule(snap, draftRule(snap, source, { ruleKey: "s060-public-liability-1789063488182" }));
    const genuine = approveRule(snap, draftRule(snap, source, { ruleKey: "s061-public-liability-1789066558518" }));
    classify(snap, fixture);
    assert.throws(
      () => previewExactSelectionWithdrawal(snap, people.orgOther, [{ editionId: fixture.id, expectedVersion: fixture.version, contentHash: fixture.contentHash }]),
      /outside this organisation/,
    );
    assert.throws(
      () =>
        withdrawExactSelectionBatchOnSnap(
          snap,
          {
            ...envelope(),
            selections: [
              { editionId: fixture.id, expectedVersion: fixture.version, contentHash: fixture.contentHash },
              { editionId: genuine.id, expectedVersion: genuine.version, contentHash: genuine.contentHash },
            ],
            reason: "Obsolete S060 synthetic QA authority from S060 live tests.",
            productionAuthorised: false,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /not marked synthetic fixture/,
    );
    assert.equal(snap.riskRuleEditions.find((item) => item.id === fixture.id)?.status, "APPROVED");
    assert.equal(snap.riskRuleEditions.find((item) => item.id === genuine.id)?.status, "APPROVED");
    assert.throws(
      () =>
        withdrawGoverningRuleOnSnap(
          snap,
          { ...envelope(), ruleId: fixture.id, expectedVersion: fixture.version + 1, confirmedHash: fixture.contentHash, reason: "stale" },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      PlatformError,
    );
    assert.throws(
      () =>
        withdrawGoverningRuleOnSnap(
          snap,
          { ...envelope(), ruleId: fixture.id, expectedVersion: fixture.version, confirmedHash: "0".repeat(64), reason: "hash" },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /exact-hash/,
    );
  });

  it("denies Auditor and System Administrator withdrawal and review", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const rule = approveRule(snap, draftRule(snap, source));
    classify(snap, rule);
    assert.throws(
      () =>
        withdrawGoverningRuleOnSnap(
          snap,
          { ...envelope({ assignmentId: people.assignAuditor }), ruleId: rule.id, expectedVersion: rule.version, confirmedHash: rule.contentHash, reason: "no" },
          NOW,
          people.personAuditor,
          "HUMAN",
        ),
      /Risk Governance Reviewer/,
    );
    assert.throws(
      () =>
        withdrawGoverningRuleOnSnap(
          snap,
          { ...envelope({ assignmentId: people.assignAdmin }), ruleId: rule.id, expectedVersion: rule.version, confirmedHash: rule.contentHash, reason: "no" },
          NOW,
          people.personAdmin,
          "HUMAN",
        ),
      /System Administrator|Risk Governance Reviewer/,
    );
    assert.throws(
      () => projectRiskAuthorityQueue(snap, { organisationId: people.orgMaison }, NOW, "SYSTEM_ADMINISTRATOR", false),
      /System Administrator/,
    );
    const auditor = projectRiskAuthorityQueue(snap, { organisationId: people.orgMaison }, NOW, "AUDITOR", false);
    assert.equal(auditor.items[0]?.permittedActions.includes("WITHDRAW"), false);
    assert.equal(auditor.items[0]?.governingContentHash, undefined);
  });

  it("excludes withdrawn rows from effective authority and keeps S061 governing", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const withdrawn = approveRule(snap, draftRule(snap, source, { ruleKey: "s060-public-liability-1789063559605" }));
    const current = approveRule(snap, draftRule(snap, source, { ruleKey: "s061-public-liability-1789066558518" }));
    classify(snap, withdrawn);
    withdrawGoverningRuleOnSnap(
      snap,
      { ...envelope(), ruleId: withdrawn.id, expectedVersion: withdrawn.version, confirmedHash: withdrawn.contentHash, reason: "Obsolete S060 synthetic QA authority from S060 live tests." },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false }, NOW, people.personCeo);
    recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, NOW, people.personCeo);
    const evaluated = evaluateApplicabilityOnSnap(snap, { organisationId: people.orgMaison, eventId: people.eventAlphaOne, assignmentId: people.assignCeo, expectedVersion: 0, idempotencyKey: envelope().idempotencyKey }, NOW, people.personCeo);
    assert.equal((evaluated.snapshot.ruleEditionIds ?? []).includes(withdrawn.id), false);
    assert.equal((evaluated.snapshot.ruleEditionIds ?? []).includes(current.id), true);
  });

  it("forbids fixture actions in production-authorised mode and recovery cannot touch non-fixture data", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const fixture = approveRule(snap, draftRule(snap, source, { ruleKey: "s060-public-liability-1789063730645" }));
    const genuine = approveRule(snap, draftRule(snap, source, { ruleKey: "s061-public-liability-1789066558518" }));
    assert.throws(
      () =>
        classifyFixtureAuthorityOnSnap(
          snap,
          {
            ...envelope(),
            bindings: [{ editionId: fixture.id, editionKind: "RULE", contentHash: fixture.contentHash, expectedVersion: fixture.version }],
            provenance: { environment: "NON_PRODUCTION_FIXTURE", testRunId: "x", authorityPromptId: "MD-PR-S062", createdByAutomation: true },
            lineage: "S060",
            productionAuthorised: true,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /production-authorised/,
    );
    classify(snap, fixture);
    assert.throws(
      () =>
        recoverFixtureAuthoritiesOnSnap(
          snap,
          { ...envelope(), editionIds: [genuine.id], productionAuthorised: false },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
          () => genuine,
        ),
      /non-fixture/,
    );
  });

  it("does not let two interrupted fixture runs accumulate governing rules", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const first = approveRule(snap, draftRule(snap, source, { ruleKey: "s062-canonical-public-liability" }));
    classify(snap, first, "s062-canonical-run");
    const unfinished = unfinishedFixtureLineage(snap, people.orgMaison, "MD-PR-S062", "s062-canonical-run");
    assert.ok(unfinished);
    assert.deepEqual(unfinished.governingEditionIds, [first.id]);
    const secondAttempt = unfinishedFixtureLineage(snap, people.orgMaison, "MD-PR-S062", "s062-canonical-run");
    assert.deepEqual(secondAttempt?.governingEditionIds, [first.id]);
    const governing = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW).filter((item) => item.rule.ruleKey === "s062-canonical-public-liability" && item.authorityState === "CURRENT_APPROVED");
    assert.equal(governing.length, 1);
  });

  it("does not infer fixture status from a name prefix", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const named = approveRule(snap, draftRule(snap, source, { ruleKey: "s060-public-liability-lookalike" }));
    const queue = projectRiskAuthorityQueue(snap, { organisationId: people.orgMaison, ruleKey: named.ruleKey }, NOW, "PUBLIC", true);
    assert.equal(queue.items[0]?.isSyntheticFixture, false);
    assert.throws(
      () =>
        withdrawExactSelectionBatchOnSnap(
          snap,
          {
            ...envelope(),
            selections: [{ editionId: named.id, expectedVersion: named.version, contentHash: named.contentHash }],
            reason: "name prefix is not provenance",
            productionAuthorised: false,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /not marked synthetic fixture/,
    );
  });

  it("exposes withdraw only to the Risk Governance Reviewer on the queue", () => {
    const { snap, store, service } = env();
    const source = seedSource(snap);
    approveRule(snap, draftRule(snap, source, { ruleKey: "s062-canonical-public-liability" }));
    store.replace(snap);
    const reviewer = service.listRiskAuthorityQueue(actor(people.personRiskReviewer), { organisationId: people.orgMaison, ruleKey: "s062-canonical-public-liability" });
    assert.equal(reviewer.items[0]?.permittedActions.includes("WITHDRAW"), true);
    const ceo = service.listRiskAuthorityQueue(actor(people.personCeo), { organisationId: people.orgMaison, ruleKey: "s062-canonical-public-liability" });
    assert.equal(ceo.items[0]?.permittedActions.includes("WITHDRAW"), false);
  });

  it("denies CEO self-withdrawal on the governed path", async () => {
    const { snap, store, service } = env();
    const source = seedSource(snap);
    const rule = approveRule(snap, draftRule(snap, source));
    store.replace(snap);
    await assert.rejects(
      () =>
        service.withdrawRiskRuleAuthority(actor(people.personCeo), {
          organisationId: people.orgMaison,
          assignmentId: people.assignCeo,
          expectedVersion: rule.version,
          idempotencyKey: envelope().idempotencyKey,
          ruleId: rule.id,
          confirmedHash: rule.contentHash,
          reason: "CEO must not self-withdraw",
        }),
      /Risk Governance Reviewer|FORBIDDEN/,
    );
  });
});
