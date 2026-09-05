import {
  progressionSatisfied,
  resolveDependencyKind,
  type ProgressionAuthorisation,
} from "./dependencies.js";
import { projectSliceRecord } from "./mapping.js";
import type { ProgrammeProjection, SliceFacts } from "./projection-types.js";
import { SliceRecordSchema, type Gate, type OpenItem, type SliceManifest, type WorkStatus } from "./schemas.js";

export function hasImplementationEvidence(facts: SliceFacts): boolean {
  return (
    facts.implementationObserved ||
    facts.commits.length > 0 ||
    facts.evidence.length > 0 ||
    facts.checks.length > 0
  );
}

export function isBlockingOpenItem(item: OpenItem): boolean {
  return item.status === "OPEN" && item.blocker;
}

export function acceptanceSatisfied(manifest: SliceManifest, facts: SliceFacts): boolean {
  if (!facts.acceptedAt || !facts.acceptedBy) return false;
  const candidate = projectSliceRecord(manifest, {
    status: "ACCEPTED",
    commits: facts.commits,
    evidence: facts.evidence,
    openItems: facts.openItemIds,
    acceptedAt: facts.acceptedAt,
    acceptedBy: facts.acceptedBy,
    updatedAt: facts.updatedAt,
    version: facts.version,
  });
  return SliceRecordSchema.safeParse(candidate).success;
}

export function predecessorSatisfied(input: {
  dependencyId: string;
  successorId: string;
  manifest: SliceManifest;
  statuses: ReadonlyMap<string, WorkStatus>;
  gates: Readonly<Record<string, Gate>>;
  progressions: Readonly<Record<string, ProgressionAuthorisation>>;
}): boolean {
  const kind = resolveDependencyKind(input.manifest, input.dependencyId, input.gates);
  if (kind === "GATE") {
    return input.gates[input.dependencyId]?.status === "APPROVED";
  }
  if (kind === "PROGRESSION") {
    return progressionSatisfied(input.dependencyId, input.successorId, input.progressions);
  }
  return input.statuses.get(input.dependencyId) === "ACCEPTED";
}

export function dependenciesSatisfied(
  manifest: SliceManifest,
  statuses: ReadonlyMap<string, WorkStatus>,
  gates: Readonly<Record<string, Gate>>,
  progressions: Readonly<Record<string, ProgressionAuthorisation>>,
): boolean {
  return manifest.dependsOn.every((dep) =>
    predecessorSatisfied({
      dependencyId: dep,
      successorId: manifest.id,
      manifest,
      statuses,
      gates,
      progressions,
    }),
  );
}

export function calculateSliceStatus(input: {
  manifest: SliceManifest;
  facts: SliceFacts;
  openItems: OpenItem[];
  predecessorStatuses: ReadonlyMap<string, WorkStatus>;
  gates: Readonly<Record<string, Gate>>;
  progressions: Readonly<Record<string, ProgressionAuthorisation>>;
}): WorkStatus {
  if (input.facts.superseded) return "SUPERSEDED";

  const sliceItems = input.openItems.filter((item) => input.facts.openItemIds.includes(item.id));
  if (sliceItems.some(isBlockingOpenItem)) return "BLOCKED";

  const depsOk = dependenciesSatisfied(input.manifest, input.predecessorStatuses, input.gates, input.progressions);
  if (acceptanceSatisfied(input.manifest, input.facts) && depsOk) return "ACCEPTED";
  if (input.facts.reviewRequested && hasImplementationEvidence(input.facts)) return "IN_REVIEW";
  if (hasImplementationEvidence(input.facts)) return "IN_PROGRESS";
  if (depsOk) return "READY";
  return "NOT_STARTED";
}

export function calculateAllStatuses(projection: ProgrammeProjection): Map<string, WorkStatus> {
  const statuses = new Map<string, WorkStatus>();
  for (const manifest of projection.manifests) {
    statuses.set(manifest.id, "NOT_STARTED");
  }

  const openItems = Object.values(projection.openItems);
  let changed = true;
  let guard = 0;
  while (changed && guard < projection.manifests.length + 2) {
    changed = false;
    guard += 1;
    for (const manifest of projection.manifests) {
      const facts = projection.slices[manifest.id];
      if (!facts) continue;
      const next = calculateSliceStatus({
        manifest,
        facts,
        openItems,
        predecessorStatuses: statuses,
        gates: projection.gates,
        progressions: projection.progressions,
      });
      if (statuses.get(manifest.id) !== next) {
        statuses.set(manifest.id, next);
        changed = true;
      }
    }
  }
  return statuses;
}
