import { CALCULATION_VERSION, PRODUCT_ORDER } from "./constants.js";
import { projectSliceRecord } from "./mapping.js";
import { sortGates, sortManifests, sortOpenItems, sortProducts, sortRecords } from "./normalize.js";
import { calculateOutstandingWork } from "./outstanding.js";
import type { ControlSnapshot, ProgrammeProjection, SliceWeights } from "./projection-types.js";
import { calculateAllStatuses } from "./status.js";
import type { SliceRecord } from "./schemas.js";

export function projectSliceRecords(
  projection: ProgrammeProjection,
  statuses: ReadonlyMap<string, import("./schemas.js").WorkStatus>,
): SliceRecord[] {
  const records: SliceRecord[] = [];
  for (const manifest of sortManifests(projection.manifests)) {
    const facts = projection.slices[manifest.id];
    if (!facts) continue;
    const status = statuses.get(manifest.id) ?? "NOT_STARTED";
    const operational = {
      status,
      commits: [...facts.commits],
      evidence: facts.evidence.map((item) => ({ ...item })),
      openItems: [...facts.openItemIds],
      updatedAt: facts.updatedAt,
      version: facts.version,
    };
    const record = projectSliceRecord(manifest, {
      ...operational,
      ...(facts.acceptedAt !== undefined ? { acceptedAt: facts.acceptedAt } : {}),
      ...(facts.acceptedBy !== undefined ? { acceptedBy: facts.acceptedBy } : {}),
    });
    records.push(record);
  }
  return sortRecords(records);
}

export function generateControlSnapshot(input: {
  snapshotId: string;
  generatedAt: string;
  projection: ProgrammeProjection;
  source?: string;
  sourceCommit?: string;
  weights?: SliceWeights;
}): ControlSnapshot {
  const statuses = calculateAllStatuses(input.projection);
  const slices = projectSliceRecords(input.projection, statuses);
  const outstanding = calculateOutstandingWork(input.projection, statuses, input.weights);
  const statusRecord: ControlSnapshot["statuses"] = {};
  for (const [id, status] of [...statuses.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    statusRecord[id] = status;
  }

  const snapshot: ControlSnapshot = {
    snapshotId: input.snapshotId,
    revision: input.projection.eventPosition,
    generatedAt: input.generatedAt,
    sourceEventPosition: input.projection.eventPosition,
    calculationVersion: CALCULATION_VERSION,
    products: sortProducts(input.projection.products).map((product) => ({
      code: product.code,
      name: product.name,
      route: product.route,
      order: PRODUCT_ORDER.get(product.code) ?? 99,
    })),
    phases: [...input.projection.phases]
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .map((phase) => ({ id: phase.id, title: phase.title, order: phase.order })),
    slices,
    openItems: sortOpenItems(Object.values(input.projection.openItems)),
    gates: sortGates(Object.values(input.projection.gates)),
    decisions: Object.values(input.projection.decisions).sort((a, b) => a.id.localeCompare(b.id)),
    statuses: statusRecord,
    outstanding,
    freshness: {
      source: input.source ?? "programme-domain",
      eventPosition: input.projection.eventPosition,
    },
  };
  if (input.sourceCommit !== undefined) snapshot.sourceCommit = input.sourceCommit;
  return snapshot;
}
