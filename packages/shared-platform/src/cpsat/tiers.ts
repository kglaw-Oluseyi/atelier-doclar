/**
 * Independent objective-tier recomputation from frozen request + assignments.
 * Does not import the Python model.
 */
import type { CpsatSolveRequest } from "./compiler.js";

export type RecomputedTiers = {
  movement: number;
  preference: number;
};

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

export function tiersMatchChildReport(
  recomputed: RecomputedTiers,
  childTiers: Array<{ tier?: string; name?: string; value?: number | null }> | undefined,
): boolean {
  if (!childTiers || childTiers.length === 0) {
    return true;
  }
  const movement =
    childTiers.find((t) => String(t.tier ?? t.name ?? "") === "A1_movement") ??
    childTiers.find((t) => /^A1_/i.test(String(t.tier ?? t.name ?? "")) && /movement/i.test(String(t.tier ?? t.name ?? "")));
  const preference =
    childTiers.find((t) => String(t.tier ?? t.name ?? "") === "A2_preferences") ??
    childTiers.find((t) => /^A2_/i.test(String(t.tier ?? t.name ?? "")) && /pref/i.test(String(t.tier ?? t.name ?? "")));
  if (movement && movement.value != null && Number.isFinite(Number(movement.value)) && Number(movement.value) !== recomputed.movement) {
    return false;
  }
  if (
    preference &&
    preference.value != null &&
    Number.isFinite(Number(preference.value)) &&
    Number(preference.value) !== recomputed.preference
  ) {
    return false;
  }
  return true;
}
