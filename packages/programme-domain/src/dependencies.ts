import type { DependencyKind, Gate, SliceManifest } from "./schemas.js";

export interface ProgressionAuthorisation {
  predecessorId: string;
  successorId: string;
  authorisedAt: string;
  authorisedBy: string;
  authorityRole: "REVIEWER" | "CEO" | "SPECIALIST" | "INDEPENDENT";
  evidenceIds: readonly string[];
  reason: string;
}

export function progressionKey(predecessorId: string, successorId: string): string {
  return `${predecessorId}->${successorId}`;
}

/**
 * Legacy dependsOn remains ACCEPTANCE unless an explicit kind is declared.
 * Undeclared gate IDs keep the historical GATE lookup.
 */
export function resolveDependencyKind(
  manifest: SliceManifest,
  dependencyId: string,
  gates: Readonly<Record<string, Gate>>,
): DependencyKind {
  const declared = manifest.dependencyKinds?.[dependencyId];
  if (declared) return declared;
  if (gates[dependencyId]) return "GATE";
  return "ACCEPTANCE";
}

export function progressionSatisfied(
  predecessorId: string,
  successorId: string,
  progressions: Readonly<Record<string, ProgressionAuthorisation>>,
): boolean {
  const auth = progressions[progressionKey(predecessorId, successorId)];
  return Boolean(auth && auth.authorisedBy.trim() && auth.evidenceIds.length > 0);
}
