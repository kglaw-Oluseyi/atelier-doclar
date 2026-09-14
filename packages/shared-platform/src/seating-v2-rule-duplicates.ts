import type { SeatingV2RuleEdition } from "./seating-v2-state.js";

export const LEGACY_DUPLICATE_RECONCILIATION_REASON =
  "LEGACY_DUPLICATE_RECONCILIATION_AFTER_SEMANTIC_UNIQUENESS_ENFORCEMENT";

export type SeatingRuleDuplicateRole = "AUTHORITATIVE" | "REDUNDANT_HISTORICAL" | "ALREADY_ACTIVE_DRAFT";

/** Coerce Postgres Date / string stamps before lexicographic compare (hydration-safe). */
export function ruleLifecycleStamp(value: unknown, fallback: unknown = ""): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  if (fallback instanceof Date && !Number.isNaN(fallback.getTime())) return fallback.toISOString();
  if (typeof fallback === "string") return fallback;
  return "";
}

/** Deterministic authoritative ACTIVE survivor for one semantic contentHash in event scope. */
export function selectAuthoritativeActiveRule<
  T extends { id: string; createdAt: string | Date; activatedAt?: string | Date | null },
>(actives: readonly T[]): T | undefined {
  if (actives.length === 0) return undefined;
  return [...actives].sort((left, right) => {
    const leftStamp = ruleLifecycleStamp(left.activatedAt, left.createdAt);
    const rightStamp = ruleLifecycleStamp(right.activatedAt, right.createdAt);
    return leftStamp.localeCompare(rightStamp) || left.id.localeCompare(right.id);
  })[0];
}

export function groupActiveRulesByContentHash<T extends { id: string; lifecycle: string; contentHash: string }>(
  editions: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const edition of editions) {
    if (edition.lifecycle !== "ACTIVE" || !edition.contentHash) continue;
    const list = groups.get(edition.contentHash) ?? [];
    list.push(edition);
    groups.set(edition.contentHash, list);
  }
  return groups;
}

export type AnnotatedRuleDuplicate<
  T extends { id: string; lifecycle: string; contentHash: string; createdAt: string | Date; activatedAt?: string | Date | null },
> = {
  edition: T;
  role: SeatingRuleDuplicateRole;
  authoritativeId: string;
  redundantCount: number;
};

export function annotateSemanticRuleDuplicates<
  T extends { id: string; lifecycle: string; contentHash: string; createdAt: string | Date; activatedAt?: string | Date | null },
>(editions: readonly T[]): AnnotatedRuleDuplicate<T>[] {
  const activeGroups = groupActiveRulesByContentHash(editions);
  const authoritativeByHash = new Map<string, string>();
  const redundantCountByHash = new Map<string, number>();
  for (const [hash, actives] of activeGroups) {
    const authoritative = selectAuthoritativeActiveRule(actives);
    if (!authoritative) continue;
    authoritativeByHash.set(hash, authoritative.id);
    redundantCountByHash.set(hash, Math.max(0, actives.length - 1));
  }
  const out: AnnotatedRuleDuplicate<T>[] = [];
  for (const edition of editions) {
    const authoritativeId = authoritativeByHash.get(edition.contentHash);
    if (!authoritativeId) continue;
    if (edition.lifecycle === "ACTIVE") {
      out.push({
        edition,
        role: edition.id === authoritativeId ? "AUTHORITATIVE" : "REDUNDANT_HISTORICAL",
        authoritativeId,
        redundantCount: redundantCountByHash.get(edition.contentHash) ?? 0,
      });
      continue;
    }
    if (edition.lifecycle === "DRAFT") {
      out.push({
        edition,
        role: "ALREADY_ACTIVE_DRAFT",
        authoritativeId,
        redundantCount: redundantCountByHash.get(edition.contentHash) ?? 0,
      });
    }
  }
  return out;
}

export type LegacyDuplicateReconciliationPlan = {
  contentHash: string;
  authoritativeId: string;
  withdrawActiveIds: string[];
  withdrawDraftIds: string[];
  reason: typeof LEGACY_DUPLICATE_RECONCILIATION_REASON;
};

export function planLegacyDuplicateReconciliation(
  editions: readonly SeatingV2RuleEdition[],
  contentHash?: string,
): LegacyDuplicateReconciliationPlan[] {
  const activeGroups = groupActiveRulesByContentHash(editions);
  const plans: LegacyDuplicateReconciliationPlan[] = [];
  const hashes = contentHash ? [contentHash] : [...activeGroups.keys()];
  for (const hash of hashes) {
    const actives = activeGroups.get(hash) ?? editions.filter((item) => item.lifecycle === "ACTIVE" && item.contentHash === hash);
    if (actives.length === 0) continue;
    const authoritative = selectAuthoritativeActiveRule(actives);
    if (!authoritative) continue;
    const withdrawActiveIds = actives.filter((item) => item.id !== authoritative.id).map((item) => item.id).sort();
    const withdrawDraftIds = editions
      .filter((item) => item.lifecycle === "DRAFT" && item.contentHash === hash)
      .map((item) => item.id)
      .sort();
    if (withdrawActiveIds.length === 0 && withdrawDraftIds.length === 0) continue;
    plans.push({
      contentHash: hash,
      authoritativeId: authoritative.id,
      withdrawActiveIds,
      withdrawDraftIds,
      reason: LEGACY_DUPLICATE_RECONCILIATION_REASON,
    });
  }
  return plans.sort((left, right) => left.contentHash.localeCompare(right.contentHash));
}
