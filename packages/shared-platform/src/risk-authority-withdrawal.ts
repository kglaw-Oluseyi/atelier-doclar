import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { assertExpectedVersion, assertProtectedHuman, extractRiskEnvelope, newRiskId, riskStamp } from "./risk-command.js";
import {
  assertProductionAllowsFixtureActions,
  assertRiskGovernanceReviewer,
  isClassifiedFixtureEdition,
} from "./risk-fixture-provenance.js";
import { reviewRuleEditionOnSnap } from "./risk-policy-operations.js";
import {
  RiskAuthorityGovernanceReceiptSchema,
  type RiskAuthorityGovernanceBinding,
  type RiskAuthorityGovernanceReceipt,
  type RiskRuleEdition,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export function withdrawGoverningRuleOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    ruleId: string;
    confirmedHash: string;
    reason: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskRuleEdition {
  extractRiskEnvelope(input);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  assertRiskGovernanceReviewer(snap, input.assignmentId, actorPersonId);
  if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "withdrawal reason is required", { field: "reason" });
  const rule = snap.riskRuleEditions.find((item) => item.id === input.ruleId && item.organisationId === input.organisationId);
  if (!rule) throw new PlatformError("NOT_FOUND", "rule edition not found");
  assertExpectedVersion(rule.version, input.expectedVersion, "rule");
  if (input.confirmedHash !== rule.contentHash) {
    throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
  }
  if (rule.status === "WITHDRAWN") return rule;
  return reviewRuleEditionOnSnap(
    snap,
    {
      organisationId: input.organisationId,
      assignmentId: input.assignmentId,
      expectedVersion: input.expectedVersion,
      idempotencyKey: input.idempotencyKey,
      ruleId: input.ruleId,
      status: "WITHDRAWN",
    },
    now,
    actorPersonId,
    actorKind,
  );
}

export function previewExactSelectionWithdrawal(
  snap: PlatformSnapshot,
  organisationId: string,
  selections: Array<{ editionId: string; expectedVersion: number; contentHash: string }>,
): {
  rows: Array<{ editionId: string; ruleKey: string; version: number; contentHash: string; isSyntheticFixture: boolean }>;
} {
  if (!selections.length) throw new PlatformError("VALIDATION_FAILED", "exact edition IDs are required");
  const rows = selections.map((selection) => {
    const rule = snap.riskRuleEditions.find((item) => item.id === selection.editionId);
    if (!rule || rule.organisationId !== organisationId) {
      throw new PlatformError("SCOPE_MISMATCH", "selected edition is outside this organisation");
    }
    if (rule.version !== selection.expectedVersion || rule.contentHash !== selection.contentHash) {
      throw new PlatformError("VALIDATION_FAILED", "selected edition changed before confirmation");
    }
    if (rule.status !== "APPROVED" && rule.status !== "WITHDRAWN") {
      throw new PlatformError("VALIDATION_FAILED", "selected edition is not a current authority row");
    }
    return {
      editionId: rule.id,
      ruleKey: rule.ruleKey,
      version: rule.version,
      contentHash: rule.contentHash,
      isSyntheticFixture: isClassifiedFixtureEdition(snap, organisationId, rule.id),
    };
  });
  return { rows };
}

export function withdrawExactSelectionBatchOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    selections: Array<{ editionId: string; expectedVersion: number; contentHash: string }>;
    reason: string;
    productionAuthorised?: boolean;
    correlationId?: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): { receipt: RiskAuthorityGovernanceReceipt; withdrawn: RiskRuleEdition[] } {
  extractRiskEnvelope(input);
  assertProductionAllowsFixtureActions(Boolean(input.productionAuthorised));
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  assertRiskGovernanceReviewer(snap, input.assignmentId, actorPersonId);
  if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "withdrawal reason is required", { field: "reason" });
  const preview = previewExactSelectionWithdrawal(snap, input.organisationId, input.selections);
  if (preview.rows.some((row) => !row.isSyntheticFixture)) {
    throw new PlatformError("FORBIDDEN", "exact-selection batch rejects any row not marked synthetic fixture lineage");
  }
  const payloadHash = exactHash({
    organisationId: input.organisationId,
    selections: input.selections
      .map((item) => `${item.editionId}:${item.expectedVersion}:${item.contentHash}`)
      .sort(),
    reason: input.reason,
  });
  const existing = (snap.riskAuthorityGovernanceReceipts ?? []).find(
    (item) =>
      item.organisationId === input.organisationId &&
      item.kind === "EXACT_SELECTION_BATCH" &&
      item.reason === input.reason &&
      exactHash({
        organisationId: item.organisationId,
        selections: item.bindings.map((binding) => `${binding.editionId}:${binding.expectedVersion}:${binding.contentHash}`).sort(),
        reason: item.reason ?? "",
      }) === payloadHash,
  );
  if (existing) {
    const withdrawn = existing.bindings
      .map((binding) => snap.riskRuleEditions.find((item) => item.id === binding.editionId))
      .filter((item): item is RiskRuleEdition => Boolean(item));
    return { receipt: existing, withdrawn };
  }
  const withdrawn = input.selections.map((selection, index) =>
    withdrawGoverningRuleOnSnap(
      snap,
      {
        organisationId: input.organisationId,
        assignmentId: input.assignmentId,
        expectedVersion: selection.expectedVersion,
        idempotencyKey: `${input.idempotencyKey}:${selection.editionId}:${index}`,
        ruleId: selection.editionId,
        confirmedHash: selection.contentHash,
        reason: input.reason,
      },
      now,
      actorPersonId,
      actorKind,
    ),
  );
  const correlationId = input.correlationId ?? randomUUID();
  const bindings: RiskAuthorityGovernanceBinding[] = withdrawn.map((item) => ({
    editionId: item.id,
    editionKind: "RULE",
    ruleKey: item.ruleKey,
    contentHash: item.contentHash,
    expectedVersion: item.version,
  }));
  const receipt = RiskAuthorityGovernanceReceiptSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    kind: "EXACT_SELECTION_BATCH",
    bindings,
    decision: "WITHDRAWN",
    reason: input.reason,
    classifiedByPersonId: actorPersonId,
    correlationId,
    previewedAt: now,
    ...riskStamp(now),
  });
  snap.riskAuthorityGovernanceReceipts = snap.riskAuthorityGovernanceReceipts ?? [];
  snap.riskAuthorityGovernanceReceipts.push(receipt);
  for (const edition of withdrawn) {
    snap.audit.push({
      id: randomUUID(),
      occurredAt: now,
      actorType: "USER",
      actorPersonId,
      service: "shared-platform",
      action: "risk.rule.withdraw",
      outcome: "SUCCESS",
      organisationId: input.organisationId,
      resourceType: "risk_rule_edition",
      resourceId: edition.id,
      correlationId,
      reason: input.reason,
      schemaVersion: SCHEMA_VERSION,
    });
  }
  return { receipt, withdrawn };
}
