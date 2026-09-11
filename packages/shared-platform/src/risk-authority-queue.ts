import { PlatformError } from "./errors.js";
import { roleKeyForId } from "./catalog.js";
import {
  RISK_AUTHORITY_STATES,
  selectEffectiveRiskAuthorities,
  type RiskAuthorityState,
} from "./risk-authority.js";
import { fixtureReceiptForEdition } from "./risk-fixture-provenance.js";
import type { RiskProjectionAudience } from "./risk-disclosure.js";
import { protectionAudienceFromRole } from "./risk-projections.js";
import type { PlatformSnapshot } from "./store.js";

export const RISK_AUTHORITY_QUEUE_ACTIONS = ["REVIEW_SUCCESSOR", "WITHDRAW", "INSPECT_HISTORY"] as const;
export type RiskAuthorityQueueAction = (typeof RISK_AUTHORITY_QUEUE_ACTIONS)[number];

export type RiskAuthorityQueueItem = {
  ruleKey: string;
  governingEditionId?: string;
  governingVersion?: number;
  governingContentHash?: string;
  authorityState: RiskAuthorityState;
  propositionSummary: string;
  sourceSummaries: Array<{
    id: string;
    label: string;
    status: string;
    reviewDueAt?: string;
  }>;
  reviewDueAt?: string;
  isSyntheticFixture: boolean;
  syntheticLineage?: string;
  permittedActions: RiskAuthorityQueueAction[];
  hiddenHistoryCount: number;
};

export type RiskAuthorityQueueQuery = {
  organisationId: string;
  cursor?: string;
  limit?: number;
  authorityState?: RiskAuthorityState;
  ruleKey?: string;
  ruleKeys?: string[];
};

export type RiskAuthorityQueuePage = {
  items: RiskAuthorityQueueItem[];
  nextCursor?: string;
  totalCount: number;
  hiddenHistoryCount: number;
};

export type RiskAuthorityDetail = {
  item: RiskAuthorityQueueItem;
  history: Array<{
    id: string;
    status: string;
    version: number;
    contentHash: string;
    createdAt: string;
    updatedAt: string;
    supersedesEditionId?: string;
    proposition: string;
  }>;
  sources: Array<{
    id: string;
    title: string;
    status: string;
    contentHash: string;
    nextReviewAt: string;
    version: number;
    expired: boolean;
  }>;
};

function encodeCursor(ruleKey: string): string {
  return Buffer.from(ruleKey, "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined;
  try {
    return Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw new PlatformError("VALIDATION_FAILED", "authority queue cursor is not stable");
  }
}

function summarise(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 160 ? `${compact.slice(0, 157)}…` : compact;
}

function permittedActions(
  state: RiskAuthorityState,
  audience: RiskProjectionAudience,
  canDecide: boolean,
): RiskAuthorityQueueAction[] {
  if (audience === "SYSTEM_ADMINISTRATOR") return [];
  const inspect: RiskAuthorityQueueAction[] = ["INSPECT_HISTORY"];
  if (!canDecide || audience === "AUDITOR") return inspect;
  if (state === "STALE_APPROVED" || state === "AUTHORITY_CONFLICT") {
    return ["REVIEW_SUCCESSOR", "WITHDRAW", "INSPECT_HISTORY"];
  }
  if (state === "CURRENT_APPROVED") return ["WITHDRAW", "INSPECT_HISTORY"];
  return inspect;
}

export function authorityProjectionSnapshot(snap: PlatformSnapshot, organisationId: string): PlatformSnapshot {
  return {
    ...snap,
    riskRuleEditions: snap.riskRuleEditions.filter((item) => item.organisationId === organisationId),
    riskSourceEditions: snap.riskSourceEditions.filter((item) => item.organisationId === organisationId),
    riskAuthorityGovernanceReceipts: (snap.riskAuthorityGovernanceReceipts ?? []).filter((item) => item.organisationId === organisationId),
  };
}

export function projectRiskAuthorityQueueItems(
  snap: PlatformSnapshot,
  organisationId: string,
  asOf: string,
  audience: RiskProjectionAudience,
  canDecide: boolean,
): RiskAuthorityQueueItem[] {
  const scoped = authorityProjectionSnapshot(snap, organisationId);
  const authorities = selectEffectiveRiskAuthorities(scoped, organisationId, asOf);
  return authorities
    .map((authority) => {
      const editions = scoped.riskRuleEditions.filter((item) => item.ruleKey === authority.rule.ruleKey);
      const receipt = fixtureReceiptForEdition(scoped, organisationId, authority.rule.id);
      const item: RiskAuthorityQueueItem = {
        ruleKey: authority.rule.ruleKey,
        governingEditionId: authority.rule.id,
        governingVersion: authority.rule.version,
        governingContentHash: canDecide && audience !== "AUDITOR" ? authority.rule.contentHash : undefined,
        authorityState: authority.authorityState,
        propositionSummary: summarise(authority.rule.proposition),
        sourceSummaries: authority.sources.map((source) => ({
          id: source.id,
          label: source.title,
          status: source.status,
          reviewDueAt: source.nextReviewAt,
        })),
        reviewDueAt: authority.rule.nextReviewAt,
        isSyntheticFixture: Boolean(receipt),
        syntheticLineage: receipt?.lineage,
        permittedActions: permittedActions(authority.authorityState, audience, canDecide),
        hiddenHistoryCount: Math.max(0, editions.length - 1),
      };
      if (audience === "AUDITOR") {
        return {
          ...item,
          syntheticLineage: receipt ? "classified non-production fixture" : undefined,
        };
      }
      return item;
    })
    .sort((left, right) => (left.ruleKey < right.ruleKey ? -1 : left.ruleKey > right.ruleKey ? 1 : 0));
}

export function projectRiskAuthorityQueue(
  snap: PlatformSnapshot,
  query: RiskAuthorityQueueQuery,
  asOf: string,
  audience: RiskProjectionAudience,
  canDecide: boolean,
): RiskAuthorityQueuePage {
  if (audience === "SYSTEM_ADMINISTRATOR") {
    throw new PlatformError("FORBIDDEN", "System Administrator cannot open the authority queue");
  }
  if (query.authorityState && !RISK_AUTHORITY_STATES.includes(query.authorityState)) {
    throw new PlatformError("VALIDATION_FAILED", "unknown authority state filter");
  }
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
  const after = decodeCursor(query.cursor);
  const all = projectRiskAuthorityQueueItems(snap, query.organisationId, asOf, audience, canDecide).filter((item) => {
    if (query.authorityState && item.authorityState !== query.authorityState) return false;
    if (query.ruleKey && item.ruleKey !== query.ruleKey) return false;
    if (query.ruleKeys?.length && !query.ruleKeys.includes(item.ruleKey)) return false;
    if (after && item.ruleKey <= after) return false;
    return true;
  });
  const items = all.slice(0, limit);
  const hiddenHistoryCount = projectRiskAuthorityQueueItems(snap, query.organisationId, asOf, audience, canDecide).reduce(
    (sum, item) => sum + item.hiddenHistoryCount,
    0,
  );
  return {
    items,
    nextCursor: all.length > limit ? encodeCursor(items[items.length - 1]!.ruleKey) : undefined,
    totalCount: all.length + (after ? projectRiskAuthorityQueueItems(snap, query.organisationId, asOf, audience, canDecide).filter((item) => item.ruleKey <= after && (!query.authorityState || item.authorityState === query.authorityState) && (!query.ruleKey || item.ruleKey === query.ruleKey) && (!query.ruleKeys?.length || query.ruleKeys.includes(item.ruleKey))).length : 0),
    hiddenHistoryCount,
  };
}

export function projectRiskAuthorityDetail(
  snap: PlatformSnapshot,
  organisationId: string,
  ruleEditionId: string,
  asOf: string,
  audience: RiskProjectionAudience,
  canDecide: boolean,
): RiskAuthorityDetail {
  if (audience === "SYSTEM_ADMINISTRATOR") {
    throw new PlatformError("FORBIDDEN", "System Administrator cannot open authority detail");
  }
  const scoped = authorityProjectionSnapshot(snap, organisationId);
  const edition = scoped.riskRuleEditions.find((item) => item.id === ruleEditionId);
  if (!edition) throw new PlatformError("NOT_FOUND", "rule edition not found");
  const item =
    projectRiskAuthorityQueueItems(scoped, organisationId, asOf, audience, canDecide).find((row) => row.ruleKey === edition.ruleKey) ??
    ({
      ruleKey: edition.ruleKey,
      governingEditionId: edition.id,
      governingVersion: edition.version,
      authorityState: "NO_APPROVED_EDITION",
      propositionSummary: summarise(edition.proposition),
      sourceSummaries: [],
      reviewDueAt: edition.nextReviewAt,
      isSyntheticFixture: Boolean(fixtureReceiptForEdition(scoped, organisationId, edition.id)),
      permittedActions: ["INSPECT_HISTORY"],
      hiddenHistoryCount: 0,
    } satisfies RiskAuthorityQueueItem);
  const history = scoped.riskRuleEditions
    .filter((row) => row.ruleKey === edition.ruleKey)
    .slice()
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
    .map((row) => ({
      id: row.id,
      status: row.status,
      version: row.version,
      contentHash: audience === "AUDITOR" ? "" : row.contentHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      supersedesEditionId: row.supersedesEditionId,
      proposition: summarise(row.proposition),
    }));
  const sources = edition.sourceEditionIds
    .map((sourceId) => scoped.riskSourceEditions.find((item) => item.id === sourceId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((source) => ({
      id: source.id,
      title: source.title,
      status: source.status,
      contentHash: audience === "AUDITOR" ? "" : source.contentHash,
      nextReviewAt: source.nextReviewAt,
      version: source.version,
      expired: asOf >= source.nextReviewAt,
    }));
  return { item, history, sources };
}

export function projectRiskSourceDetail(
  snap: PlatformSnapshot,
  organisationId: string,
  sourceEditionId: string,
  asOf: string,
) {
  const source = snap.riskSourceEditions.find((item) => item.id === sourceEditionId && item.organisationId === organisationId);
  if (!source) throw new PlatformError("NOT_FOUND", "source edition not found");
  const history = snap.riskSourceEditions
    .filter((item) => item.organisationId === organisationId && (item.id === source.id || item.supersedesEditionId === source.id || source.supersedesEditionId === item.id))
    .slice()
    .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))
    .map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      version: item.version,
      contentHash: item.contentHash,
      nextReviewAt: item.nextReviewAt,
      expired: asOf >= item.nextReviewAt,
    }));
  return { source, history, expired: asOf >= source.nextReviewAt };
}

export function audienceAndDecision(roleKey: string | undefined): { audience: RiskProjectionAudience; canDecide: boolean } {
  const audience = protectionAudienceFromRole(roleKey);
  return {
    audience,
    canDecide: roleKey === "RISK_GOVERNANCE_REVIEWER",
  };
}

export function roleKeyFromActor(snap: PlatformSnapshot, personId: string): string | undefined {
  const assignment = snap.assignments.find((item) => item.personId === personId && item.status === "ACTIVE");
  if (!assignment) return undefined;
  return snap.roles.find((item) => item.id === assignment.roleId)?.key ?? roleKeyForId(assignment.roleId);
}
