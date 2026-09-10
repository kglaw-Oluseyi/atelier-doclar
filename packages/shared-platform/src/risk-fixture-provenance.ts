import { PlatformError } from "./errors.js";
import { roleKeyForId } from "./catalog.js";
import { assertProtectedHuman, extractRiskEnvelope, newRiskId, riskStamp } from "./risk-command.js";
import {
  RiskAuthorityGovernanceReceiptSchema,
  type RiskAuthorityGovernanceBinding,
  type RiskAuthorityGovernanceReceipt,
  type RiskFixtureProvenance,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const S060_SYNTHETIC_RULE_KEYS = [
  "s060-public-liability-1789063488182",
  "s060-public-liability-1789063559605",
  "s060-public-liability-1789063730645",
  "s060-public-liability-1789063780841",
] as const;

export const S060_REPORTED_EDITION_IDS = [
  "e7ef2ced-8670-443d-aee1-2354fea9fd42",
  "85431a29-828e-47b2-8791-1170caf2fa73",
  "a1e7a811-821c-4131-b4de-ab3e1e303d00",
  "54326e94-75e4-4eba-a3be-a8b3052d872c",
] as const;

export const S059_DISCOVERY_RULE_KEY = "CLAUDE-S05B-S059-B-RULE";
export const S061_CURRENT_RULE_KEY = "s061-public-liability-1789066558518";
export const S061_CURRENT_EDITION_ID = "64d4a54b-c833-4826-8756-76699ec794c2";
export const S062_CANONICAL_FIXTURE_RULE_KEY = "s062-canonical-public-liability";
export const S062_AUTHORITY_PROMPT_ID = "MD-PR-S062";

export function assertProductionAllowsFixtureActions(productionAuthorised: boolean): void {
  if (productionAuthorised) {
    throw new PlatformError("FORBIDDEN", "production-authorised mode forbids fixture-provenance creation and synthetic batch withdrawal");
  }
}

export function assertRiskGovernanceReviewer(snap: PlatformSnapshot, assignmentId: string, actorPersonId: string): void {
  const assignment = snap.assignments.find((item) => item.id === assignmentId && item.personId === actorPersonId);
  if (!assignment) throw new PlatformError("FORBIDDEN", "current assignment is required");
  const roleKey = snap.roles.find((item) => item.id === assignment.roleId)?.key ?? roleKeyForId(assignment.roleId);
  if (roleKey === "SYSTEM_ADMINISTRATOR") {
    throw new PlatformError("FORBIDDEN", "System Administrator cannot decide governing authority");
  }
  if (roleKey !== "RISK_GOVERNANCE_REVIEWER") {
    throw new PlatformError("FORBIDDEN", "only the Risk Governance Reviewer may decide governing authority withdrawal");
  }
}

export function fixtureReceipts(snap: PlatformSnapshot, organisationId: string): RiskAuthorityGovernanceReceipt[] {
  return (snap.riskAuthorityGovernanceReceipts ?? []).filter(
    (item) => item.organisationId === organisationId && item.kind === "FIXTURE_CLASSIFICATION",
  );
}

export function fixtureReceiptForEdition(
  snap: PlatformSnapshot,
  organisationId: string,
  editionId: string,
): RiskAuthorityGovernanceReceipt | undefined {
  return fixtureReceipts(snap, organisationId).find((item) => item.bindings.some((binding) => binding.editionId === editionId));
}

export function isClassifiedFixtureEdition(snap: PlatformSnapshot, organisationId: string, editionId: string): boolean {
  return Boolean(fixtureReceiptForEdition(snap, organisationId, editionId));
}

export function unfinishedFixtureLineage(
  snap: PlatformSnapshot,
  organisationId: string,
  authorityPromptId: string,
  testRunId?: string,
): { receipt: RiskAuthorityGovernanceReceipt; governingEditionIds: string[] } | undefined {
  const receipts = fixtureReceipts(snap, organisationId).filter(
    (item) =>
      item.provenance?.authorityPromptId === authorityPromptId &&
      (!testRunId || item.provenance.testRunId === testRunId),
  );
  for (const receipt of [...receipts].sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))) {
    const governingEditionIds = receipt.bindings
      .filter((binding) => {
        const edition = snap.riskRuleEditions.find((item) => item.id === binding.editionId && item.organisationId === organisationId);
        return edition && edition.status === "APPROVED";
      })
      .map((binding) => binding.editionId);
    if (governingEditionIds.length) return { receipt, governingEditionIds };
  }
  return undefined;
}

export function classifyFixtureAuthorityOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    bindings: RiskAuthorityGovernanceBinding[];
    provenance: RiskFixtureProvenance;
    lineage: string;
    productionAuthorised?: boolean;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskAuthorityGovernanceReceipt {
  extractRiskEnvelope(input);
  assertProductionAllowsFixtureActions(Boolean(input.productionAuthorised));
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  assertRiskGovernanceReviewer(snap, input.assignmentId, actorPersonId);
  if (!input.bindings.length) throw new PlatformError("VALIDATION_FAILED", "exact edition bindings are required");
  if (input.provenance.environment !== "NON_PRODUCTION_FIXTURE") {
    throw new PlatformError("VALIDATION_FAILED", "fixture provenance must be NON_PRODUCTION_FIXTURE");
  }
  const signature = input.bindings
    .map((binding) => `${binding.editionId}:${binding.contentHash}:${binding.expectedVersion}`)
    .sort()
    .join("|");
  for (const binding of input.bindings) {
    const edition =
      binding.editionKind === "SOURCE"
        ? snap.riskSourceEditions.find((item) => item.id === binding.editionId && item.organisationId === input.organisationId)
        : snap.riskRuleEditions.find((item) => item.id === binding.editionId && item.organisationId === input.organisationId);
    if (!edition) throw new PlatformError("NOT_FOUND", "edition is not in this organisation");
    if (edition.contentHash !== binding.contentHash) {
      throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
    }
    if (edition.version !== binding.expectedVersion) {
      throw new PlatformError("VERSION_CONFLICT", "edition version changed before classification");
    }
  }
  const replayed = fixtureReceipts(snap, input.organisationId).find(
    (item) =>
      item.provenance?.testRunId === input.provenance.testRunId &&
      item.provenance.authorityPromptId === input.provenance.authorityPromptId &&
      item.bindings
        .map((binding) => `${binding.editionId}:${binding.contentHash}:${binding.expectedVersion}`)
        .sort()
        .join("|") === signature,
  );
  if (replayed) return replayed;
  const record = RiskAuthorityGovernanceReceiptSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    kind: "FIXTURE_CLASSIFICATION",
    bindings: input.bindings,
    provenance: input.provenance,
    lineage: input.lineage,
    decision: "CLASSIFIED",
    classifiedByPersonId: actorPersonId,
    correlationId: newRiskId(),
    ...riskStamp(now),
  });
  snap.riskAuthorityGovernanceReceipts = snap.riskAuthorityGovernanceReceipts ?? [];
  snap.riskAuthorityGovernanceReceipts.push(record);
  return record;
}

export function recoverFixtureAuthoritiesOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    editionIds: string[];
    productionAuthorised?: boolean;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
  withdraw: (editionId: string) => { id: string; status: string } = () => {
    throw new PlatformError("VALIDATION_FAILED", "recovery withdraw is not bound");
  },
): { recoveredIds: string[]; skippedIds: string[] } {
  extractRiskEnvelope(input);
  assertProductionAllowsFixtureActions(Boolean(input.productionAuthorised));
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  assertRiskGovernanceReviewer(snap, input.assignmentId, actorPersonId);
  const recoveredIds: string[] = [];
  const skippedIds: string[] = [];
  for (const editionId of input.editionIds) {
    if (!isClassifiedFixtureEdition(snap, input.organisationId, editionId)) {
      throw new PlatformError("FORBIDDEN", "test-fixture recovery cannot touch non-fixture data");
    }
    const edition = snap.riskRuleEditions.find((item) => item.id === editionId && item.organisationId === input.organisationId);
    if (!edition) throw new PlatformError("NOT_FOUND", "fixture edition is not in this organisation");
    if (edition.status === "WITHDRAWN") {
      skippedIds.push(editionId);
      continue;
    }
    withdraw(editionId);
    recoveredIds.push(editionId);
  }
  void now;
  return { recoveredIds, skippedIds };
}
