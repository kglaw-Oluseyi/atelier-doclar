/**
 * Independent objective-tier recomputation from frozen request + assignments.
 * Does not import the Python model.
 *
 * Milestone 3: required-tier validation at settlement / review-read must not
 * vacuous-pass merely because the child omitted a required tier field.
 */
import type { CpsatSolveRequest } from "./compiler.js";

export type RecomputedTiers = {
  movement: number;
  preference: number;
};

export type RequiredObjectiveTiers = {
  movement: boolean;
  preferences: boolean;
};

export type TierVerificationEvidence = {
  required: RequiredObjectiveTiers;
  present: { A1_movement: boolean; A2_preferences: boolean };
  recomputed: RecomputedTiers;
  reported: { A1_movement: number | null; A2_preferences: number | null };
  ok: boolean;
  fault: string | null;
};

export type ChildTierRow = { tier?: string; name?: string; value?: number | null; proven?: boolean };

/**
 * Determine which objective tiers are mandatory for the frozen request / objective edition.
 * Movement applies when a baseline adoption exists; preferences apply when preference rows exist.
 * Inapplicable tiers must not be required.
 */
export function requiredObjectiveTiers(request: CpsatSolveRequest): RequiredObjectiveTiers {
  return {
    movement: Array.isArray(request.baseline) && request.baseline.length > 0,
    preferences: Array.isArray(request.preferences) && request.preferences.length > 0,
  };
}

export function recomputeObjectiveTiers(
  request: CpsatSolveRequest,
  assignments: Array<{ guest: number; table: number; seat: number }>,
): RecomputedTiers {
  const byGuest = new Map(assignments.map((a) => [a.guest, a]));
  const baseline = new Map(request.baseline.map((b) => [b.guest, b]));
  let movement = 0;
  for (const [guest, base] of baseline) {
    const a = byGuest.get(guest);
    if (!a) {
      movement += 1;
      continue;
    }
    if (a.table !== base.table || a.seat !== base.seat) movement += 1;
  }
  let preference = 0;
  for (const pref of request.preferences) {
    const a = byGuest.get(pref.guest);
    if (a && a.table === pref.table) preference += pref.weight;
  }
  return { movement, preference };
}

function findTier(
  childTiers: ChildTierRow[] | undefined,
  exact: string,
  prefix: RegExp,
  hint: RegExp,
): ChildTierRow | undefined {
  if (!childTiers?.length) return undefined;
  return (
    childTiers.find((t) => String(t.tier ?? t.name ?? "") === exact) ??
    childTiers.find((t) => prefix.test(String(t.tier ?? t.name ?? "")) && hint.test(String(t.tier ?? t.name ?? "")))
  );
}

function reportedValue(row: ChildTierRow | undefined): number | null {
  if (!row || row.value == null || !Number.isFinite(Number(row.value))) return null;
  return Number(row.value);
}

/**
 * Full required/present/recomputed comparison for settlement and review-read.
 */
export function verifyRequiredObjectiveTiers(
  request: CpsatSolveRequest,
  assignments: Array<{ guest: number; table: number; seat: number }>,
  childTiers: ChildTierRow[] | undefined,
): TierVerificationEvidence {
  const required = requiredObjectiveTiers(request);
  const recomputed = recomputeObjectiveTiers(request, assignments);
  const movementRow = findTier(childTiers, "A1_movement", /^A1_/i, /movement/i);
  const preferenceRow = findTier(childTiers, "A2_preferences", /^A2_/i, /pref/i);
  const reportedMovement = reportedValue(movementRow);
  const reportedPreference = reportedValue(preferenceRow);
  const present = {
    A1_movement: reportedMovement != null,
    A2_preferences: reportedPreference != null,
  };

  if (required.movement && !present.A1_movement) {
    return {
      required,
      present,
      recomputed,
      reported: { A1_movement: reportedMovement, A2_preferences: reportedPreference },
      ok: false,
      fault: "REQUIRED_TIER_MISSING:A1_movement",
    };
  }
  if (required.preferences && !present.A2_preferences) {
    return {
      required,
      present,
      recomputed,
      reported: { A1_movement: reportedMovement, A2_preferences: reportedPreference },
      ok: false,
      fault: "REQUIRED_TIER_MISSING:A2_preferences",
    };
  }
  if (present.A1_movement && reportedMovement !== recomputed.movement) {
    return {
      required,
      present,
      recomputed,
      reported: { A1_movement: reportedMovement, A2_preferences: reportedPreference },
      ok: false,
      fault: "TIER_MISMATCH:A1_movement",
    };
  }
  if (present.A2_preferences && reportedPreference !== recomputed.preference) {
    return {
      required,
      present,
      recomputed,
      reported: { A1_movement: reportedMovement, A2_preferences: reportedPreference },
      ok: false,
      fault: "TIER_MISMATCH:A2_preferences",
    };
  }

  return {
    required,
    present,
    recomputed,
    reported: { A1_movement: reportedMovement, A2_preferences: reportedPreference },
    ok: true,
    fault: null,
  };
}

/**
 * @deprecated Prefer verifyRequiredObjectiveTiers. Kept for callers that only
 * need a boolean; now refuses vacuous pass when mandatory tiers are omitted.
 */
export function tiersMatchChildReport(
  recomputed: RecomputedTiers,
  childTiers: Array<{ tier?: string; name?: string; value?: number | null }> | undefined,
  required?: RequiredObjectiveTiers,
): boolean {
  const req = required ?? { movement: true, preferences: true };
  const movement = findTier(childTiers, "A1_movement", /^A1_/i, /movement/i);
  const preference = findTier(childTiers, "A2_preferences", /^A2_/i, /pref/i);
  const movementValue = reportedValue(movement);
  const preferenceValue = reportedValue(preference);

  if (req.movement && movementValue == null) return false;
  if (req.preferences && preferenceValue == null) return false;
  if (movementValue != null && movementValue !== recomputed.movement) return false;
  if (preferenceValue != null && preferenceValue !== recomputed.preference) return false;
  return true;
}
