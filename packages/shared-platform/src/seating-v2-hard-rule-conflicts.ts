import { PlatformError } from "./errors.js";
import type { SeatingV2RuleEdition, SeatingV2RuleSubject, SeatingV2RuleTarget } from "./seating-v2-state.js";

export const VERIFICATION_HARD_RULE_CONFLICT_RECONCILIATION_REASON =
  "VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD";

/** Explicit HARD pairwise/table contradictions already supported by the V2 taxonomy. */
export const HARD_RULE_CONTRADICTION_PAIRS = [
  ["KEEP_TOGETHER", "KEEP_APART"],
  ["REQUIRE_TABLE", "FORBID_TABLE"],
] as const;

export type HardRuleConflictHit = {
  draftEditionId: string;
  conflictingEditionId: string;
  draftKind: string;
  conflictingKind: string;
  subjectKey: string;
  reason: "HARD_RULE_CONTRADICTION";
};

function normalizedSubjectKey(subjectIds: readonly string[]): string {
  return [...subjectIds].map((id) => id.trim()).filter(Boolean).sort().join("|");
}

function normalizedTargetKey(targets: readonly { type?: string; targetType?: string; idOrCode?: string; targetIdOrCode?: string }[]): string {
  return [...targets]
    .map((item) => `${item.type ?? item.targetType ?? ""}:${item.idOrCode ?? item.targetIdOrCode ?? ""}`)
    .filter((item) => !item.endsWith(":"))
    .sort()
    .join("|");
}

function kindsConflict(left: string, right: string): boolean {
  for (const [a, b] of HARD_RULE_CONTRADICTION_PAIRS) {
    if ((left === a && right === b) || (left === b && right === a)) return true;
  }
  return false;
}

export function subjectIdsForEdition(
  editionId: string,
  subjects: readonly SeatingV2RuleSubject[],
): string[] {
  return subjects
    .filter((item) => item.ruleEditionId === editionId && item.subjectType === "EVENT_GUEST")
    .map((item) => item.subjectId);
}

export function targetKeysForEdition(
  editionId: string,
  targets: readonly SeatingV2RuleTarget[],
): string {
  return normalizedTargetKey(
    targets
      .filter((item) => item.ruleEditionId === editionId)
      .map((item) => ({ targetType: item.targetType, targetIdOrCode: item.targetIdOrCode })),
  );
}

/**
 * Find ACTIVE HARD editions that logically contradict a candidate HARD draft.
 * Guest-pair order does not matter. SOFT / INFORMATIONAL rules are ignored.
 */
export function findHardRuleConflicts(input: {
  draft: Pick<SeatingV2RuleEdition, "id" | "kind" | "hardness" | "scope" | "lifecycle">;
  draftSubjectIds: readonly string[];
  draftTargetKey?: string;
  activeEditions: readonly Pick<SeatingV2RuleEdition, "id" | "kind" | "hardness" | "scope" | "lifecycle">[];
  subjects: readonly SeatingV2RuleSubject[];
  targets?: readonly SeatingV2RuleTarget[];
}): HardRuleConflictHit[] {
  if (input.draft.hardness !== "HARD") return [];
  const draftSubjectKey = normalizedSubjectKey(input.draftSubjectIds);
  if (!draftSubjectKey) return [];
  const draftTargetKey = input.draftTargetKey ?? "";
  const hits: HardRuleConflictHit[] = [];
  for (const active of input.activeEditions) {
    if (active.id === input.draft.id) continue;
    if (active.lifecycle !== "ACTIVE" || active.hardness !== "HARD") continue;
    if (active.scope !== input.draft.scope) continue;
    if (!kindsConflict(input.draft.kind, active.kind)) continue;
    const activeSubjectKey = normalizedSubjectKey(subjectIdsForEdition(active.id, input.subjects));
    if (!activeSubjectKey || activeSubjectKey !== draftSubjectKey) continue;
    if (input.draft.kind === "REQUIRE_TABLE" || input.draft.kind === "FORBID_TABLE") {
      const activeTargetKey = targetKeysForEdition(active.id, input.targets ?? []);
      if (!draftTargetKey || !activeTargetKey || draftTargetKey !== activeTargetKey) continue;
    }
    hits.push({
      draftEditionId: input.draft.id,
      conflictingEditionId: active.id,
      draftKind: input.draft.kind,
      conflictingKind: active.kind,
      subjectKey: draftSubjectKey,
      reason: "HARD_RULE_CONTRADICTION",
    });
  }
  return hits;
}

export function hardRuleConflictPlatformError(hit: HardRuleConflictHit): PlatformError {
  return new PlatformError(
    "SEATING_HARD_RULE_CONFLICT",
    `HARD ${hit.draftKind} contradicts ACTIVE HARD ${hit.conflictingKind}`,
    {
      publicMessage:
        `This draft cannot be activated while an ACTIVE HARD ${hit.conflictingKind.replaceAll("_", " ").toLowerCase()} rule still governs the same guests. Withdraw or supersede the conflicting governing rule (${hit.conflictingEditionId.slice(0, 8)}) through a governed action, then activate this replacement.`,
      details: [
        `draftEditionId:${hit.draftEditionId}`,
        `conflictingEditionId:${hit.conflictingEditionId}`,
        `draftKind:${hit.draftKind}`,
        `conflictingKind:${hit.conflictingKind}`,
        `subjectKey:${hit.subjectKey}`,
      ],
    },
  );
}

export type AnnotatedHardRuleConflict<T extends { id: string }> = {
  edition: T;
  conflictingEditionId: string;
  conflictingKind: string;
  draftKind: string;
};

export function annotateHardRuleConflicts<
  T extends Pick<SeatingV2RuleEdition, "id" | "kind" | "hardness" | "scope" | "lifecycle">,
>(input: {
  editions: readonly T[];
  subjects: readonly SeatingV2RuleSubject[];
  targets?: readonly SeatingV2RuleTarget[];
}): AnnotatedHardRuleConflict<T>[] {
  const actives = input.editions.filter((item) => item.lifecycle === "ACTIVE" && item.hardness === "HARD");
  const out: AnnotatedHardRuleConflict<T>[] = [];
  for (const draft of input.editions) {
    if (draft.lifecycle !== "DRAFT" || draft.hardness !== "HARD") continue;
    const hits = findHardRuleConflicts({
      draft,
      draftSubjectIds: subjectIdsForEdition(draft.id, input.subjects),
      draftTargetKey: targetKeysForEdition(draft.id, input.targets ?? []),
      activeEditions: actives,
      subjects: input.subjects,
      targets: input.targets,
    });
    const hit = hits[0];
    if (!hit) continue;
    out.push({
      edition: draft,
      conflictingEditionId: hit.conflictingEditionId,
      conflictingKind: hit.conflictingKind,
      draftKind: hit.draftKind,
    });
  }
  return out;
}
