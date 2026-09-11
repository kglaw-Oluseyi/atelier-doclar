import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { selectEffectiveRiskAuthorities } from "../src/risk-authority.js";
import { projectRiskAuthorityQueue } from "../src/risk-authority-queue.js";
import { classifyFixtureAuthorityOnSnap } from "../src/risk-fixture-provenance.js";
import {
  S061_ADDITIONAL_QA_LINEAGE,
  S061_ADDITIONAL_QA_RULE_KEYS,
  S061_CURRENT_RULE_KEY,
  S059_DISCOVERY_RULE_KEY,
  S063_AUTHORITY_PROMPT_ID,
} from "../src/risk-fixture-provenance.js";
import { previewExactSelectionWithdrawal, withdrawExactSelectionBatchOnSnap } from "../src/risk-authority-withdrawal.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { people } from "./helpers.js";
import { fixtureService } from "./helpers.js";
import type { PlatformSnapshot } from "../src/store.js";
import type { RiskRuleEdition, RiskSourceEdition } from "../src/risk-schemas.js";

const NOW = "2026-09-11T00:00:00.000Z";
const FUTURE = "2026-12-10T09:00:00.000Z";

function env() {
  const { store } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  return { snap: store.snapshot(), store };
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignRiskReviewer,
    expectedVersion: 0,
    idempotencyKey: `s063-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function seedSource(snap: PlatformSnapshot, title = "S061 1789066718655 source"): RiskSourceEdition {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title,
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic S061 source.",
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
      ruleKey: extra?.ruleKey ?? S061_ADDITIONAL_QA_RULE_KEYS[0],
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

function classifyS061(snap: PlatformSnapshot, rule: RiskRuleEdition) {
  return classifyFixtureAuthorityOnSnap(
    snap,
    {
      ...envelope(),
      bindings: [{ editionId: rule.id, editionKind: "RULE", ruleKey: rule.ruleKey, contentHash: rule.contentHash, expectedVersion: rule.version }],
      provenance: {
        environment: "NON_PRODUCTION_FIXTURE",
        testRunId: `s063-${rule.id.slice(0, 8)}`,
        authorityPromptId: S063_AUTHORITY_PROMPT_ID,
        createdByAutomation: true,
      },
      lineage: S061_ADDITIONAL_QA_LINEAGE,
      productionAuthorised: false,
    },
    NOW,
    people.personRiskReviewer,
    "HUMAN",
  );
}

describe("MD-PR-S063 additional S061 QA authority recovery", () => {
  it("filters the exact additional S061 QA keys and leaves the designated authority out of that preview", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const extras = S061_ADDITIONAL_QA_RULE_KEYS.map((ruleKey) => approveRule(snap, draftRule(snap, source, { ruleKey })));
    const keep = approveRule(snap, draftRule(snap, source, { ruleKey: S061_CURRENT_RULE_KEY }));
    extras.forEach((rule) => classifyS061(snap, rule));
    const preview = projectRiskAuthorityQueue(
      snap,
      { organisationId: people.orgMaison, ruleKeys: [...S061_ADDITIONAL_QA_RULE_KEYS] },
      NOW,
      "PUBLIC",
      true,
    );
    assert.deepEqual(preview.items.map((item) => item.ruleKey).sort(), [...S061_ADDITIONAL_QA_RULE_KEYS].sort());
    assert.equal(preview.items.some((item) => item.ruleKey === S061_CURRENT_RULE_KEY), false);
    assert.equal(preview.items.every((item) => item.isSyntheticFixture), true);
    assert.equal(keep.status, "APPROVED");
  });

  it("withdraws the three classified S061 QA authorities atomically and retains the designated S061 authority and S059 history", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const extras = S061_ADDITIONAL_QA_RULE_KEYS.map((ruleKey) => approveRule(snap, draftRule(snap, source, { ruleKey })));
    const keep = approveRule(snap, draftRule(snap, source, { ruleKey: S061_CURRENT_RULE_KEY }));
    draftRule(snap, source, { ruleKey: S059_DISCOVERY_RULE_KEY, proposition: "S059 discovery remains history." });
    extras.forEach((rule) => classifyS061(snap, rule));
    const result = withdrawExactSelectionBatchOnSnap(
      snap,
      {
        ...envelope(),
        selections: extras.map((rule) => ({ editionId: rule.id, expectedVersion: rule.version, contentHash: rule.contentHash })),
        reason: S061_ADDITIONAL_QA_LINEAGE,
        productionAuthorised: false,
      },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.equal(result.withdrawn.length, 3);
    assert.equal(result.withdrawn.every((item) => item.status === "WITHDRAWN"), true);
    const after = selectEffectiveRiskAuthorities(snap, people.orgMaison, NOW);
    for (const ruleKey of S061_ADDITIONAL_QA_RULE_KEYS) {
      assert.equal(after.find((item) => item.rule.ruleKey === ruleKey)?.authorityState, "WITHDRAWN_NO_AUTHORITY");
    }
    assert.equal(after.find((item) => item.rule.id === keep.id)?.authorityState, "CURRENT_APPROVED");
    assert.equal(after.find((item) => item.rule.ruleKey === S059_DISCOVERY_RULE_KEY)?.authorityState, "NO_APPROVED_EDITION");
    assert.equal(snap.riskRuleEditions.find((item) => item.id === keep.id)?.status, "APPROVED");
  });

  it("rejects a batch that includes the designated S061 authority and changes no row", () => {
    const { snap } = env();
    const source = seedSource(snap);
    const extra = approveRule(snap, draftRule(snap, source, { ruleKey: S061_ADDITIONAL_QA_RULE_KEYS[0] }));
    const keep = approveRule(snap, draftRule(snap, source, { ruleKey: S061_CURRENT_RULE_KEY }));
    classifyS061(snap, extra);
    assert.throws(
      () =>
        withdrawExactSelectionBatchOnSnap(
          snap,
          {
            ...envelope(),
            selections: [
              { editionId: extra.id, expectedVersion: extra.version, contentHash: extra.contentHash },
              { editionId: keep.id, expectedVersion: keep.version, contentHash: keep.contentHash },
            ],
            reason: S061_ADDITIONAL_QA_LINEAGE,
            productionAuthorised: false,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /not marked synthetic fixture/,
    );
    assert.equal(snap.riskRuleEditions.find((item) => item.id === extra.id)?.status, "APPROVED");
    assert.equal(snap.riskRuleEditions.find((item) => item.id === keep.id)?.status, "APPROVED");
    assert.throws(
      () => previewExactSelectionWithdrawal(snap, people.orgOther, [{ editionId: extra.id, expectedVersion: extra.version, contentHash: extra.contentHash }]),
      /outside this organisation/,
    );
    assert.throws(
      () =>
        classifyFixtureAuthorityOnSnap(
          snap,
          {
            ...envelope(),
            bindings: [{ editionId: extra.id, editionKind: "RULE", ruleKey: extra.ruleKey, contentHash: extra.contentHash, expectedVersion: extra.version }],
            provenance: { environment: "NON_PRODUCTION_FIXTURE", testRunId: "s063-prod", authorityPromptId: S063_AUTHORITY_PROMPT_ID, createdByAutomation: true },
            lineage: S061_ADDITIONAL_QA_LINEAGE,
            productionAuthorised: true,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      PlatformError,
    );
  });
});
