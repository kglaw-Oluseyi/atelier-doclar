import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertIndependentChecker,
  assertProtectedHuman,
  assertSameOrganisation,
  bumpVersion,
  extractRiskEnvelope,
  newRiskId,
  riskStamp,
} from "./risk-command.js";
import {
  RiskRuleEditionSchema,
  RiskSourceEditionSchema,
  type RiskRuleEdition,
  type RiskSourceEdition,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const RISK_AUTHORITY_STATES = [
  "CURRENT_APPROVED",
  "STALE_APPROVED",
  "WITHDRAWN_NO_AUTHORITY",
  "NO_APPROVED_EDITION",
  "AUTHORITY_CONFLICT",
] as const;

export type RiskAuthorityState = (typeof RISK_AUTHORITY_STATES)[number];

export type EffectiveRiskAuthority = {
  rule: RiskRuleEdition;
  sources: RiskSourceEdition[];
  authorityState: RiskAuthorityState;
  reasons: string[];
};

function byId<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function compareIsoDesc(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? 1 : -1;
}

export function compareApprovedNewest(left: RiskRuleEdition, right: RiskRuleEdition): number {
  const approved = compareIsoDesc(left.approvedAt ?? left.createdAt, right.approvedAt ?? right.createdAt);
  if (approved) return approved;
  const created = compareIsoDesc(left.createdAt, right.createdAt);
  if (created) return created;
  if (left.version !== right.version) return right.version - left.version;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

export function reviewIsExpired(nextReviewAt: string, asOf: string): boolean {
  return asOf >= nextReviewAt;
}

export function assertAuthorisedFutureReview(nextReviewAt: string, now: string, lastVerifiedAt?: string): void {
  if (!nextReviewAt.trim()) {
    throw new PlatformError("VALIDATION_FAILED", "Review again by is required", { field: "nextReviewAt" });
  }
  if (nextReviewAt <= now) {
    throw new PlatformError("VALIDATION_FAILED", "Review again by must be later than now", { field: "nextReviewAt" });
  }
  if (lastVerifiedAt && nextReviewAt <= lastVerifiedAt) {
    throw new PlatformError("VALIDATION_FAILED", "Review again by must be later than last verified", { field: "nextReviewAt" });
  }
}

export function reviewOnToIso(reviewOn: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(reviewOn)) return `${reviewOn}T23:59:59.000Z`;
  return reviewOn;
}

export function authorityOperatorLabel(state: RiskAuthorityState, governing?: boolean): string {
  if (state === "CURRENT_APPROVED") return governing === false ? "HISTORY ONLY" : "GOVERNING";
  if (state === "STALE_APPROVED") return "STALE";
  if (state === "AUTHORITY_CONFLICT") return "CONFLICT";
  if (state === "WITHDRAWN_NO_AUTHORITY") return "WITHDRAWN · HISTORY ONLY";
  return "HISTORY ONLY";
}

function reachesPredecessor(from: RiskRuleEdition, targetId: string, rules: Map<string, RiskRuleEdition>): boolean {
  let current: RiskRuleEdition | undefined = from;
  const seen = new Set<string>();
  while (current?.supersedesEditionId && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.supersedesEditionId === targetId) return true;
    current = rules.get(current.supersedesEditionId);
  }
  return false;
}

function isHashBoundApproved(item: { status: string; approvedHash?: string; contentHash: string }): boolean {
  return item.status === "APPROVED" && Boolean(item.approvedHash) && item.approvedHash === item.contentHash;
}

function hasWithdrawnDescendant(edition: RiskRuleEdition, editions: readonly RiskRuleEdition[], rules: Map<string, RiskRuleEdition>): boolean {
  if (edition.status === "WITHDRAWN") return true;
  return editions.some((item) => item.status === "WITHDRAWN" && (item.id === edition.id || reachesPredecessor(item, edition.id, rules)));
}

export function latestApprovedSourceInLineage(
  snap: PlatformSnapshot,
  organisationId: string,
  sourceId: string,
): string {
  const org = snap.riskSourceEditions.filter((item) => item.organisationId === organisationId);
  const children = new Map<string, RiskSourceEdition[]>();
  for (const item of org) {
    if (!item.supersedesEditionId) continue;
    const list = children.get(item.supersedesEditionId) ?? [];
    list.push(item);
    children.set(item.supersedesEditionId, list);
  }
  let currentId = sourceId;
  const seen = new Set<string>();
  while (!seen.has(currentId)) {
    seen.add(currentId);
    const next = (children.get(currentId) ?? [])
      .filter((item) => isHashBoundApproved(item))
      .sort((left, right) =>
        compareApprovedNewest(
          {
            approvedAt: left.approvedAt,
            createdAt: left.createdAt,
            version: left.version,
            id: left.id,
          } as RiskRuleEdition,
          {
            approvedAt: right.approvedAt,
            createdAt: right.createdAt,
            version: right.version,
            id: right.id,
          } as RiskRuleEdition,
        ),
      )[0];
    if (!next) break;
    currentId = next.id;
  }
  const current = org.find((item) => item.id === currentId);
  return current && isHashBoundApproved(current) ? current.id : sourceId;
}

function inspectCitedSources(
  rule: RiskRuleEdition,
  snap: PlatformSnapshot,
  organisationId: string,
  asOf: string,
): { sources: RiskSourceEdition[]; reasons: string[]; unapproved: boolean; expired: boolean } {
  const reasons: string[] = [];
  const sources: RiskSourceEdition[] = [];
  let unapproved = false;
  let expired = false;
  for (const sourceId of [...rule.sourceEditionIds].sort()) {
    const source = snap.riskSourceEditions.find((item) => item.id === sourceId);
    if (!source || source.organisationId !== organisationId) {
      reasons.push(`cited source ${sourceId} is missing or outside this organisation`);
      unapproved = true;
      continue;
    }
    sources.push(source);
    if (!isHashBoundApproved(source)) {
      reasons.push(`cited source ${source.id} is not approved exact-hash authority`);
      unapproved = true;
    }
    if (reviewIsExpired(source.nextReviewAt, asOf)) {
      reasons.push(`cited source ${source.id} review has expired`);
      expired = true;
    }
  }
  return { sources, reasons, unapproved, expired };
}

function representativeEdition(editions: readonly RiskRuleEdition[]): RiskRuleEdition {
  return [...editions].sort((left, right) => {
    const created = compareIsoDesc(left.createdAt, right.createdAt);
    if (created) return created;
    if (left.version !== right.version) return right.version - left.version;
    return left.id < right.id ? 1 : -1;
  })[0]!;
}

function classifyApproved(
  selected: RiskRuleEdition,
  snap: PlatformSnapshot,
  organisationId: string,
  asOf: string,
): EffectiveRiskAuthority {
  const cited = inspectCitedSources(selected, snap, organisationId, asOf);
  const reasons = [...cited.reasons];
  if (reviewIsExpired(selected.nextReviewAt, asOf)) {
    reasons.push("approved rule review has expired");
  }
  const ruleExpired = reviewIsExpired(selected.nextReviewAt, asOf);
  const authorityState: RiskAuthorityState =
    cited.unapproved || cited.expired || ruleExpired ? "STALE_APPROVED" : "CURRENT_APPROVED";
  return {
    rule: selected,
    sources: cited.sources.filter((item) => isHashBoundApproved(item)),
    authorityState,
    reasons,
  };
}

export function selectEffectiveRiskAuthorities(
  snap: PlatformSnapshot,
  organisationId: string,
  asOf: string,
): EffectiveRiskAuthority[] {
  const orgRules = snap.riskRuleEditions
    .filter((item) => item.organisationId === organisationId)
    .slice()
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const rules = byId(orgRules);
  const keys = [...new Set(orgRules.map((item) => item.ruleKey))].sort();
  const result: EffectiveRiskAuthority[] = [];
  for (const ruleKey of keys) {
    const editions = orgRules.filter((item) => item.ruleKey === ruleKey);
    const withdrawnEligible = editions.filter((item) => item.status === "WITHDRAWN");
    const approvedEligible = editions.filter(
      (item) => isHashBoundApproved(item) && !hasWithdrawnDescendant(item, editions, rules),
    );
    const tips = approvedEligible.filter(
      (item) => !approvedEligible.some((other) => other.id !== item.id && reachesPredecessor(other, item.id, rules)),
    );
    if (tips.length === 1) {
      result.push(classifyApproved(tips[0]!, snap, organisationId, asOf));
      continue;
    }
    if (tips.length > 1) {
      const lineagePresent = editions.some((item) => Boolean(item.supersedesEditionId));
      if (lineagePresent) {
        const representative = [...tips].sort(compareApprovedNewest)[0]!;
        result.push({
          rule: representative,
          sources: inspectCitedSources(representative, snap, organisationId, asOf).sources,
          authorityState: "AUTHORITY_CONFLICT",
          reasons: [
            "ambiguous competing approved editions",
            ...tips
              .slice()
              .sort(compareApprovedNewest)
              .map((item) => item.id),
          ],
        });
        continue;
      }
      const newest = [...tips].sort(compareApprovedNewest)[0]!;
      result.push(classifyApproved(newest, snap, organisationId, asOf));
      continue;
    }
    const withdrawnTips = withdrawnEligible.filter(
      (item) => !withdrawnEligible.some((other) => other.id !== item.id && reachesPredecessor(other, item.id, rules)),
    );
    if (withdrawnTips.length || editions.some((item) => hasWithdrawnDescendant(item, editions, rules) && isHashBoundApproved({ ...item, status: "APPROVED", approvedHash: item.approvedHash ?? item.contentHash, contentHash: item.contentHash }))) {
      const withdrawn = withdrawnTips[0] ?? editions.find((item) => item.status === "WITHDRAWN") ?? representativeEdition(editions);
      result.push({
        rule: withdrawn,
        sources: inspectCitedSources(withdrawn, snap, organisationId, asOf).sources,
        authorityState: "WITHDRAWN_NO_AUTHORITY",
        reasons: ["explicit withdrawal removes current authority; no fallback to a superseded edition"],
      });
      continue;
    }
    const everApprovedThenWithdrawn = editions.some((item) => item.status === "WITHDRAWN" && item.approvedHash);
    if (everApprovedThenWithdrawn) {
      const withdrawn = editions.find((item) => item.status === "WITHDRAWN") ?? representativeEdition(editions);
      result.push({
        rule: withdrawn,
        sources: inspectCitedSources(withdrawn, snap, organisationId, asOf).sources,
        authorityState: "WITHDRAWN_NO_AUTHORITY",
        reasons: ["explicit withdrawal removes current authority; no fallback to a superseded edition"],
      });
      continue;
    }
    result.push({
      rule: representativeEdition(editions),
      sources: [],
      authorityState: "NO_APPROVED_EDITION",
      reasons: ["no approved exact-hash edition; drafts do not govern"],
    });
  }
  return result;
}

export function effectiveAuthorityHashPayload(authorities: readonly EffectiveRiskAuthority[]): {
  governingRuleIds: string[];
  governingRuleHashes: string[];
  governingSourceIds: string[];
  governingSourceHashes: string[];
  authority: { ruleKey: string; ruleId: string; state: RiskAuthorityState; reasons: string[] }[];
} {
  const governing = authorities.filter(
    (item) => item.authorityState === "CURRENT_APPROVED" || item.authorityState === "STALE_APPROVED" || item.authorityState === "AUTHORITY_CONFLICT",
  );
  const sources = governing
    .flatMap((item) => item.sources)
    .slice()
    .sort((left, right) => (left.id < right.id ? -1 : 1));
  const uniqueSources = [...new Map(sources.map((item) => [item.id, item])).values()];
  return {
    governingRuleIds: governing.map((item) => item.rule.id).sort(),
    governingRuleHashes: governing
      .map((item) => item.rule)
      .slice()
      .sort((left, right) => (left.id < right.id ? -1 : 1))
      .map((item) => item.contentHash),
    governingSourceIds: uniqueSources.map((item) => item.id),
    governingSourceHashes: uniqueSources.map((item) => item.contentHash),
    authority: authorities
      .map((item) => ({
        ruleKey: item.rule.ruleKey,
        ruleId: item.rule.id,
        state: item.authorityState,
        reasons: [...item.reasons].sort(),
      }))
      .sort((left, right) => (left.ruleKey < right.ruleKey ? -1 : left.ruleKey > right.ruleKey ? 1 : left.ruleId < right.ruleId ? -1 : 1)),
  };
}

export function assertNoCompetingCurrentRule(
  snap: PlatformSnapshot,
  organisationId: string,
  ruleKey: string,
  incomingId: string,
  supersedesEditionId?: string,
): void {
  const others = snap.riskRuleEditions.filter(
    (item) =>
      item.organisationId === organisationId &&
      item.ruleKey === ruleKey &&
      item.id !== incomingId &&
      isHashBoundApproved(item) &&
      item.id !== supersedesEditionId,
  );
  if (others.length) {
    throw new PlatformError("VALIDATION_FAILED", "competing current authority cannot be approved silently");
  }
}

function supersedePredecessor<T extends { id: string; status: string; version: number; updatedAt: string }>(
  predecessor: T | undefined,
  now: string,
): void {
  if (!predecessor || predecessor.status === "SUPERSEDED" || predecessor.status === "WITHDRAWN") return;
  Object.assign(predecessor, { ...predecessor, status: "SUPERSEDED", ...bumpVersion(predecessor, now) });
}

export function createRuleReviewSuccessorOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    ruleId: string;
    nextReviewAt: string;
    reason: string;
    confirmedHash: string;
  },
  now: string,
  actorPersonId: string,
): RiskRuleEdition {
  const parsed = extractRiskEnvelope(input);
  assertSameOrganisation(parsed.organisationId, input.organisationId);
  if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "review reason is required", { field: "reason" });
  const rule = snap.riskRuleEditions.find((item) => item.id === input.ruleId && item.organisationId === input.organisationId);
  if (!rule) throw new PlatformError("NOT_FOUND", "rule edition not found");
  assertExpectedVersion(rule.version, input.expectedVersion, "rule");
  if (input.confirmedHash !== rule.contentHash) {
    throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
  }
  assertAuthorisedFutureReview(input.nextReviewAt, now, now);
  const record = RiskRuleEditionSchema.parse({
    ...rule,
    id: newRiskId(),
    lastVerifiedAt: now,
    nextReviewAt: input.nextReviewAt,
    status: "DISCOVERY",
    approvedByPersonId: undefined,
    approvedAt: undefined,
    approvedHash: undefined,
    reviewedByPersonId: undefined,
    submittedByPersonId: actorPersonId,
    submittedAt: now,
    contentHash: exactHash({ ruleKey: rule.ruleKey, proposition: rule.proposition, sources: rule.sourceEditionIds }),
    supersedesEditionId: rule.id,
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskRuleEditions.push(record);
  return record;
}

export function recordRuleCurrentReviewOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    ruleId: string;
    nextReviewAt: string;
    reason: string;
    confirmedHash: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskRuleEdition {
  const parsed = extractRiskEnvelope(input);
  assertSameOrganisation(parsed.organisationId, input.organisationId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "review reason is required", { field: "reason" });
  const rule = snap.riskRuleEditions.find((item) => item.id === input.ruleId && item.organisationId === input.organisationId);
  if (!rule) throw new PlatformError("NOT_FOUND", "rule edition not found");
  assertExpectedVersion(rule.version, input.expectedVersion, "rule");
  if (input.confirmedHash !== rule.contentHash) {
    throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
  }
  assertIndependentChecker({
    actorPersonId,
    authorPersonId: rule.createdByPersonId,
    submitterPersonId: rule.submittedByPersonId ?? rule.createdByPersonId,
    action: "approve",
  });
  assertAuthorisedFutureReview(input.nextReviewAt, now, now);
  assertNoCompetingCurrentRule(snap, input.organisationId, rule.ruleKey, rule.id, rule.id);
  const sourceEditionIds = [...new Set(rule.sourceEditionIds.map((sourceId) => latestApprovedSourceInLineage(snap, input.organisationId, sourceId)))].sort();
  const contentHash = exactHash({ ruleKey: rule.ruleKey, proposition: rule.proposition, sources: sourceEditionIds });
  const successor = RiskRuleEditionSchema.parse({
    ...rule,
    id: newRiskId(),
    lastVerifiedAt: now,
    nextReviewAt: input.nextReviewAt,
    status: "APPROVED",
    approvedByPersonId: actorPersonId,
    approvedAt: now,
    approvedHash: contentHash,
    reviewedByPersonId: actorPersonId,
    submittedByPersonId: rule.submittedByPersonId ?? rule.createdByPersonId,
    submittedAt: now,
    contentHash,
    sourceEditionIds,
    supersedesEditionId: rule.id,
    createdByPersonId: rule.createdByPersonId,
    ...riskStamp(now),
  });
  supersedePredecessor(rule, now);
  snap.riskRuleEditions.push(successor);
  return successor;
}

export function recordSourceCurrentReviewOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    sourceId: string;
    nextReviewAt: string;
    reason: string;
    confirmedHash: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskSourceEdition {
  const parsed = extractRiskEnvelope(input);
  assertSameOrganisation(parsed.organisationId, input.organisationId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  if (!input.reason.trim()) throw new PlatformError("VALIDATION_FAILED", "review reason is required", { field: "reason" });
  const source = snap.riskSourceEditions.find((item) => item.id === input.sourceId && item.organisationId === input.organisationId);
  if (!source) throw new PlatformError("NOT_FOUND", "source edition not found");
  assertExpectedVersion(source.version, input.expectedVersion, "source");
  if (input.confirmedHash !== source.contentHash) {
    throw new PlatformError("VALIDATION_FAILED", "exact-hash confirmation does not match the selected edition", { field: "confirmedHash" });
  }
  assertIndependentChecker({
    actorPersonId,
    authorPersonId: source.authorPersonId,
    submitterPersonId: source.submittedByPersonId,
    action: "approve",
  });
  assertAuthorisedFutureReview(input.nextReviewAt, now, now);
  const contentHash = exactHash({ title: source.title, locator: source.locator, summary: source.summary });
  const successor = RiskSourceEditionSchema.parse({
    ...source,
    id: newRiskId(),
    lastVerifiedAt: now,
    nextReviewAt: input.nextReviewAt,
    status: "APPROVED",
    discoveryOnly: false,
    approvedByPersonId: actorPersonId,
    approvedAt: now,
    approvedHash: contentHash,
    submittedByPersonId: source.submittedByPersonId ?? source.authorPersonId,
    submittedAt: now,
    contentHash,
    supersedesEditionId: source.id,
    authorPersonId: source.authorPersonId,
    ...riskStamp(now),
  });
  supersedePredecessor(source, now);
  snap.riskSourceEditions.push(successor);
  return successor;
}
