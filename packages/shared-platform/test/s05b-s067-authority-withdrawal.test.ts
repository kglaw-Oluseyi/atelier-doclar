import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError, PlatformService, PostgresPlatformStore, MemoryPlatformPg, eventProtectionProjection } from "../src/index.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { selectEffectiveRiskAuthorities } from "../src/risk-authority.js";
import { classifyFixtureAuthorityOnSnap } from "../src/risk-fixture-provenance.js";
import {
  S061_ADDITIONAL_QA_LINEAGE,
  S061_ADDITIONAL_QA_RULE_KEYS,
  S061_ADDITIONAL_QA_EDITION_IDS,
  S061_CURRENT_RULE_KEY,
  S061_CURRENT_EDITION_ID,
  S059_DISCOVERY_RULE_KEY,
  S060_SYNTHETIC_RULE_KEYS,
  S063_AUTHORITY_PROMPT_ID,
} from "../src/risk-fixture-provenance.js";
import { withdrawExactSelectionBatchOnSnap, withdrawGoverningRuleOnSnap } from "../src/risk-authority-withdrawal.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { actor, fixtureService, people } from "./helpers.js";
import type { PlatformSnapshot } from "../src/store.js";
import type { RiskRuleEdition, RiskSourceEdition } from "../src/risk-schemas.js";

const NOW = "2026-09-11T12:00:00.000Z";
const FUTURE = "2026-12-10T09:00:00.000Z";
const CREATED = "2026-08-01T09:00:00.000Z";
const EXPIRED = "2026-08-15T09:00:00.000Z";

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignRiskReviewer,
    expectedVersion: 0,
    idempotencyKey: `s067-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function seedSource(snap: PlatformSnapshot, title = "S067 retained-history source"): RiskSourceEdition {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title,
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic S067 source.",
      retrievedAt: "2026-09-10T09:00:00.000Z",
      lastVerifiedAt: "2026-09-10T09:00:00.000Z",
      nextReviewAt: FUTURE,
    },
    "2026-09-10T09:00:00.000Z",
    people.personCeo,
  );
  return approveSourceEditionOnSnap(
    snap,
    {
      organisationId: people.orgMaison,
      assignmentId: people.assignRiskReviewer,
      sourceId: source.id,
      expectedVersion: source.version,
      idempotencyKey: envelope().idempotencyKey,
    },
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
      requirementKey: extra?.requirementKey ?? "PUBLIC_LIABILITY",
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
    {
      organisationId: people.orgMaison,
      assignmentId: people.assignRiskReviewer,
      ruleId: rule.id,
      status: "APPROVED",
      expectedVersion: rule.version,
      idempotencyKey: envelope().idempotencyKey,
    },
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
        testRunId: `s067-${rule.id.slice(0, 8)}`,
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

function seedObsoleteAndKeep(snap: PlatformSnapshot) {
  const source = seedSource(snap);
  const extras = S061_ADDITIONAL_QA_RULE_KEYS.map((ruleKey, index) => {
    const rule = approveRule(snap, draftRule(snap, source, { ruleKey }));
    Object.assign(rule, { id: S061_ADDITIONAL_QA_EDITION_IDS[index]! });
    classifyS061(snap, rule);
    return rule;
  });
  const keep = approveRule(snap, draftRule(snap, source, { ruleKey: S061_CURRENT_RULE_KEY }));
  Object.assign(keep, { id: S061_CURRENT_EDITION_ID });
  draftRule(snap, source, { ruleKey: S059_DISCOVERY_RULE_KEY, proposition: "S059 discovery remains history." });
  return { extras, keep, source };
}

async function seededPostgres(prepare: (snap: PlatformSnapshot) => void) {
  const pg = new MemoryPlatformPg();
  const { store } = fixtureService();
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  const snap = store.snapshot();
  prepare(snap);
  store.replace(snap);
  await PostgresPlatformStore.migrate(pg);
  const postgres = await PostgresPlatformStore.open(pg);
  await postgres.replaceAsync(store.snapshot());
  const service = new PlatformService(postgres);
  return { pg, postgres, service };
}

describe("MD-PR-S067 durable authority withdrawal", () => {
  it("applies withdrawal when a prior exact-selection receipt exists but rows are still APPROVED", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    const { extras } = seedObsoleteAndKeep(snap);
    snap.riskAuthorityGovernanceReceipts = snap.riskAuthorityGovernanceReceipts ?? [];
    snap.riskAuthorityGovernanceReceipts.push({
      ...snap.riskAuthorityGovernanceReceipts[0]!,
      id: "00000000-0000-4000-8000-000000000067",
      kind: "EXACT_SELECTION_BATCH",
      decision: "WITHDRAWN",
      reason: S061_ADDITIONAL_QA_LINEAGE,
      bindings: extras.map((item) => ({
        editionId: item.id,
        editionKind: "RULE" as const,
        ruleKey: item.ruleKey,
        contentHash: item.contentHash,
        expectedVersion: item.version + 1,
      })),
    });
    assert.equal(extras.every((item) => item.status === "APPROVED"), true);
    const result = withdrawExactSelectionBatchOnSnap(
      snap,
      {
        ...envelope(),
        selections: extras.map((item) => ({ editionId: item.id, expectedVersion: item.version, contentHash: item.contentHash })),
        reason: S061_ADDITIONAL_QA_LINEAGE,
        productionAuthorised: false,
      },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.equal(result.withdrawn.every((item) => item.status === "WITHDRAWN"), true);
    assert.equal(result.receipt.id, "00000000-0000-4000-8000-000000000067");
  });

  it("persists exact-hash withdrawal through Postgres reload and keeps designated S061, S059 and S060 states", async () => {
    const { pg, postgres, service } = await seededPostgres((snap) => {
      seedObsoleteAndKeep(snap);
    });
    const before = postgres.snapshot();
    const selections = S061_ADDITIONAL_QA_EDITION_IDS.map((editionId) => {
      const row = before.riskRuleEditions.find((item) => item.id === editionId)!;
      return { editionId, expectedVersion: row.version, contentHash: row.contentHash };
    });
    const receipt = await service.withdrawExactRiskAuthorities(actor(people.personRiskReviewer, { now: NOW }), {
      ...envelope(),
      selections,
      reason: S061_ADDITIONAL_QA_LINEAGE,
    });
    assert.equal(receipt.kind, "EXACT_SELECTION_BATCH");
    const successAudits = postgres.snapshot().audit.filter((item) => item.action === "risk.rule.withdraw" && item.outcome === "SUCCESS");
    assert.equal(successAudits.length >= 3, true);
    assert.equal(postgres.snapshot().idempotency.some((item) => item.action === "risk.rule.withdraw.batch"), true);
    const replay = await service.withdrawExactRiskAuthorities(actor(people.personRiskReviewer, { now: NOW }), {
      ...envelope({ idempotencyKey: receipt.id }),
      selections: selections.map((item) => {
        const row = postgres.snapshot().riskRuleEditions.find((rule) => rule.id === item.editionId)!;
        return { editionId: item.editionId, expectedVersion: row.version, contentHash: row.contentHash };
      }),
      reason: S061_ADDITIONAL_QA_LINEAGE,
    });
    assert.equal(replay.application, "REPLAYED");
    const afterReplayAudits = postgres.snapshot().audit.filter((item) => item.action === "risk.rule.withdraw" && item.outcome === "SUCCESS");
    assert.equal(afterReplayAudits.length, successAudits.length);
    let reopened: PostgresPlatformStore;
    try {
      reopened = await PostgresPlatformStore.open(pg);
    } catch (error) {
      const details = error instanceof PlatformError ? error.details : undefined;
      assert.fail(`hydrate failed: ${error instanceof Error ? error.message : String(error)} ${JSON.stringify(details)}`);
    }
    for (const editionId of S061_ADDITIONAL_QA_EDITION_IDS) {
      const row = reopened.snapshot().riskRuleEditions.find((item) => item.id === editionId);
      assert.equal(row?.status, "WITHDRAWN");
    }
    const keep = reopened.snapshot().riskRuleEditions.find((item) => item.id === S061_CURRENT_EDITION_ID);
    assert.equal(keep?.status, "APPROVED");
    const effective = selectEffectiveRiskAuthorities(reopened.snapshot(), people.orgMaison, NOW);
    for (const editionId of S061_ADDITIONAL_QA_EDITION_IDS) {
      assert.equal(effective.find((item) => item.rule.id === editionId)?.authorityState, "WITHDRAWN_NO_AUTHORITY");
    }
    assert.equal(effective.find((item) => item.rule.id === S061_CURRENT_EDITION_ID)?.authorityState, "CURRENT_APPROVED");
    assert.equal(effective.find((item) => item.rule.ruleKey === S059_DISCOVERY_RULE_KEY)?.authorityState, "NO_APPROVED_EDITION");
    for (const ruleKey of S060_SYNTHETIC_RULE_KEYS) {
      const row = effective.find((item) => item.rule.ruleKey === ruleKey);
      if (row) assert.equal(row.authorityState, "WITHDRAWN_NO_AUTHORITY");
    }
    const working = reopened.snapshot();
    evaluateApplicabilityOnSnap(working, envelope({ assignmentId: people.assignCeo }), NOW, people.personCeo);
    const afterEvaluate = selectEffectiveRiskAuthorities(working, people.orgMaison, NOW);
    assert.equal(
      afterEvaluate.filter((item) => item.authorityState === "CURRENT_APPROVED" || item.authorityState === "STALE_APPROVED").some((item) => (S061_ADDITIONAL_QA_EDITION_IDS as readonly string[]).includes(item.rule.id)),
      false,
    );
    const workspace = eventProtectionProjection(working, people.orgMaison, people.eventAlphaOne, "PUBLIC", NOW);
    const publicLiability = workspace.gaps.filter((item) => item.requirementKey === "PUBLIC_LIABILITY");
    assert.equal(publicLiability.length <= 1, true);
  });

  it("does not apply a stale exact-hash withdrawal and leaves rows unchanged", async () => {
    const { postgres, service } = await seededPostgres((snap) => {
      seedObsoleteAndKeep(snap);
    });
    const target = postgres.snapshot().riskRuleEditions.find((item) => item.id === S061_ADDITIONAL_QA_EDITION_IDS[0])!;
    await assert.rejects(
      () =>
        service.withdrawRiskRuleAuthority(actor(people.personRiskReviewer, { now: NOW }), {
          ...envelope(),
          ruleId: target.id,
          expectedVersion: target.version + 8,
          confirmedHash: target.contentHash,
          reason: S061_ADDITIONAL_QA_LINEAGE,
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "VERSION_CONFLICT" || error.code === "VALIDATION_FAILED"),
    );
    assert.equal(postgres.snapshot().riskRuleEditions.find((item) => item.id === target.id)?.status, "APPROVED");
  });

  it("rejects a forged hash and a cross-organisation withdrawal", async () => {
    const { postgres, service } = await seededPostgres((snap) => {
      seedObsoleteAndKeep(snap);
    });
    const snap = postgres.snapshot();
    const target = snap.riskRuleEditions.find((item) => item.id === S061_ADDITIONAL_QA_EDITION_IDS[0])!;
    assert.throws(
      () =>
        withdrawGoverningRuleOnSnap(
          snap,
          {
            ...envelope(),
            ruleId: target.id,
            expectedVersion: target.version,
            confirmedHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            reason: S061_ADDITIONAL_QA_LINEAGE,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /exact-hash confirmation/,
    );
    assert.equal(postgres.snapshot().riskRuleEditions.find((item) => item.id === target.id)?.status, "APPROVED");
    void service;
  });
});

describe("MD-PR-S067 Reviewer source approval", () => {
  it("denies CEO maker approval and accepts Reviewer approval with an explicit future review date", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    const source = createSourceEditionOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignCeo }),
        title: "S067 uniquely labelled discovery source",
        publisher: "NSITF",
        locator: "https://nsitf.gov.ng/",
        authority: "REGULATOR",
        jurisdiction: "NG",
        summary: "Fresh S067 source.",
        retrievedAt: CREATED,
        lastVerifiedAt: CREATED,
        nextReviewAt: EXPIRED,
      },
      CREATED,
      people.personCeo,
    );
    assert.throws(
      () =>
        approveSourceEditionOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignCeo,
            sourceId: source.id,
            expectedVersion: source.version,
            idempotencyKey: envelope().idempotencyKey,
            nextReviewAt: FUTURE,
          },
          NOW,
          people.personCeo,
          "HUMAN",
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    assert.throws(
      () =>
        approveSourceEditionOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignRiskReviewer,
            sourceId: source.id,
            expectedVersion: source.version,
            idempotencyKey: envelope().idempotencyKey,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /Review again by must be later than now/,
    );
    const approved = approveSourceEditionOnSnap(
      snap,
      {
        organisationId: people.orgMaison,
        assignmentId: people.assignRiskReviewer,
        sourceId: source.id,
        expectedVersion: source.version,
        idempotencyKey: envelope().idempotencyKey,
        nextReviewAt: FUTURE,
      },
      NOW,
      people.personRiskReviewer,
      "HUMAN",
    );
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.nextReviewAt, FUTURE);
    assert.equal(approved.approvedByPersonId, people.personRiskReviewer);
  });

  it("rejects a missing, expired, stale or cross-org Reviewer approval without writing", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    const source = createSourceEditionOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignCeo }),
        title: "S067 validation source",
        publisher: "NSITF",
        locator: "https://nsitf.gov.ng/",
        authority: "REGULATOR",
        jurisdiction: "NG",
        summary: "Validation source.",
        retrievedAt: CREATED,
        lastVerifiedAt: CREATED,
        nextReviewAt: EXPIRED,
      },
      CREATED,
      people.personCeo,
    );
    const before = source.version;
    assert.throws(
      () =>
        approveSourceEditionOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignRiskReviewer,
            sourceId: source.id,
            expectedVersion: source.version,
            idempotencyKey: envelope().idempotencyKey,
            nextReviewAt: "",
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /Review again by is required/,
    );
    assert.throws(
      () =>
        approveSourceEditionOnSnap(
          snap,
          {
            organisationId: people.orgMaison,
            assignmentId: people.assignRiskReviewer,
            sourceId: source.id,
            expectedVersion: source.version + 4,
            idempotencyKey: envelope().idempotencyKey,
            nextReviewAt: FUTURE,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      PlatformError,
    );
    assert.throws(
      () =>
        approveSourceEditionOnSnap(
          snap,
          {
            organisationId: people.orgOther,
            assignmentId: people.assignRiskReviewer,
            sourceId: source.id,
            expectedVersion: source.version,
            idempotencyKey: envelope().idempotencyKey,
            nextReviewAt: FUTURE,
          },
          NOW,
          people.personRiskReviewer,
          "HUMAN",
        ),
      /not found|FORBIDDEN|SCOPE_MISMATCH|assignment is outside/,
    );
    assert.equal(snap.riskSourceEditions.find((item) => item.id === source.id)?.status, "DISCOVERY");
    assert.equal(snap.riskSourceEditions.find((item) => item.id === source.id)?.version, before);
  });
});
