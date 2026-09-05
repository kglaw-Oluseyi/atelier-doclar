import type { OutstandingWork, PercentageResult, ProgrammeProjection, SliceWeights } from "./projection-types.js";
import { acceptanceSatisfied, dependenciesSatisfied, isBlockingOpenItem } from "./status.js";
import type { WorkStatus } from "./schemas.js";

export function calculatePercentage(
  statuses: ReadonlyMap<string, WorkStatus>,
  weights: SliceWeights | undefined,
): PercentageResult {
  if (!weights || Object.keys(weights).length === 0) {
    return { available: false, reason: "WEIGHTS_ABSENT" };
  }
  let acceptedWeight = 0;
  let totalWeight = 0;
  for (const [sliceId, weight] of Object.entries(weights)) {
    if (weight <= 0) continue;
    totalWeight += weight;
    if (statuses.get(sliceId) === "ACCEPTED") acceptedWeight += weight;
  }
  if (totalWeight === 0) {
    return { available: false, reason: "WEIGHTS_ABSENT" };
  }
  return {
    available: true,
    acceptedWeight,
    totalWeight,
    value: acceptedWeight / totalWeight,
  };
}

export function calculateOutstandingWork(
  projection: ProgrammeProjection,
  statuses: ReadonlyMap<string, WorkStatus>,
  weights?: SliceWeights,
): OutstandingWork {
  const unacceptedMandatorySlices: string[] = [];
  const unlockedUnacceptedSlices: string[] = [];
  const blockedSlices: string[] = [];
  const missingRequiredEvidence: string[] = [];

  for (const manifest of projection.manifests) {
    const status = statuses.get(manifest.id) ?? "NOT_STARTED";
    const facts = projection.slices[manifest.id];
    if (status !== "ACCEPTED" && status !== "SUPERSEDED") {
      unacceptedMandatorySlices.push(manifest.id);
      if (dependenciesSatisfied(manifest, statuses, projection.gates)) {
        unlockedUnacceptedSlices.push(manifest.id);
      }
    }
    if (status === "BLOCKED") blockedSlices.push(manifest.id);
    if (status === "IN_REVIEW" && facts && !acceptanceSatisfied(manifest, facts)) {
      missingRequiredEvidence.push(manifest.id);
    }
  }

  const blockingOpenItems = Object.values(projection.openItems)
    .filter(isBlockingOpenItem)
    .map((item) => item.id)
    .sort();
  const incompleteGates = Object.values(projection.gates)
    .filter((gate) => gate.status !== "APPROVED")
    .map((gate) => gate.id)
    .sort();
  const blockingDecisions = Object.values(projection.decisions)
    .filter((decision) => decision.blocker && decision.disposition !== "REVERSED")
    .map((decision) => decision.id)
    .sort();

  return {
    unacceptedMandatorySlices: unacceptedMandatorySlices.sort(),
    unlockedUnacceptedSlices: unlockedUnacceptedSlices.sort(),
    blockedSlices: blockedSlices.sort(),
    blockingOpenItems,
    incompleteGates,
    blockingDecisions,
    missingRequiredEvidence: missingRequiredEvidence.sort(),
    percentage: calculatePercentage(statuses, weights),
  };
}
