import { canonicalSerialize } from "./venue-geometry.js";
import type { SpatialGeometry, SpatialObject } from "./spatial-schemas.js";
import type { LayoutDiffEntry } from "./layout-assurance-schemas.js";

function box(geometry: SpatialGeometry) {
  if (geometry.kind === "RECTANGLE") {
    return { x: geometry.xMm, y: geometry.yMm, w: geometry.widthMm, h: geometry.heightMm };
  }
  if (geometry.kind === "ELLIPSE") {
    return { x: geometry.cxMm, y: geometry.cyMm, w: geometry.radiusXMm, h: geometry.radiusYMm };
  }
  return { points: geometry.points, width: "widthMm" in geometry ? geometry.widthMm : undefined };
}

function capacityOf(object: SpatialObject): number | undefined {
  const subtype = object.subtype as { declaredCapacity?: number };
  return subtype.declaredCapacity;
}

function sourceOf(object: SpatialObject): string {
  const subtype = object.subtype as { sourceKind?: string; verificationState?: string; governedLocked?: boolean };
  return `${subtype.sourceKind ?? ""}:${subtype.verificationState ?? ""}:${String(subtype.governedLocked ?? "")}`;
}

export function diffLayoutObjects(
  before: readonly SpatialObject[],
  after: readonly SpatialObject[],
): LayoutDiffEntry[] {
  const previous = new Map(before.filter((item) => !item.tombstoned).map((item) => [item.id, item]));
  const next = new Map(after.filter((item) => !item.tombstoned).map((item) => [item.id, item]));
  const entries: LayoutDiffEntry[] = [];
  for (const [id, object] of next) {
    const prior = previous.get(id);
    if (!prior) {
      entries.push({ kind: "ADDED", objectId: id, summary: `Added ${object.objectType} “${object.label}”.` });
      continue;
    }
    if (prior.label !== object.label) {
      entries.push({
        kind: "RELABELLED",
        objectId: id,
        summary: `Relabelled “${prior.label}” to “${object.label}”.`,
      });
      entries.push({
        kind: "DOWNSTREAM_IDENTIFIER",
        objectId: id,
        summary: `Stable downstream identifier ${id} changed display label.`,
      });
    }
    if (prior.objectType !== object.objectType || canonicalSerialize(prior.subtype) !== canonicalSerialize(object.subtype)) {
      entries.push({
        kind: "TYPE_OR_PROPERTY",
        objectId: id,
        summary: `Type or properties changed on ${object.label}.`,
      });
    }
    if (canonicalSerialize(box(prior.geometry)) !== canonicalSerialize(box(object.geometry))) {
      const moved =
        (prior.geometry.kind === "RECTANGLE" && object.geometry.kind === "RECTANGLE" && (prior.geometry.xMm !== object.geometry.xMm || prior.geometry.yMm !== object.geometry.yMm)) ||
        (prior.geometry.kind === "ELLIPSE" && object.geometry.kind === "ELLIPSE" && (prior.geometry.cxMm !== object.geometry.cxMm || prior.geometry.cyMm !== object.geometry.cyMm));
      const resized =
        (prior.geometry.kind === "RECTANGLE" && object.geometry.kind === "RECTANGLE" && (prior.geometry.widthMm !== object.geometry.widthMm || prior.geometry.heightMm !== object.geometry.heightMm)) ||
        (prior.geometry.kind === "ELLIPSE" && object.geometry.kind === "ELLIPSE" && (prior.geometry.radiusXMm !== object.geometry.radiusXMm || prior.geometry.radiusYMm !== object.geometry.radiusYMm));
      if (moved) entries.push({ kind: "MOVED", objectId: id, summary: `Moved ${object.label}.` });
      if (resized) entries.push({ kind: "RESIZED", objectId: id, summary: `Resized ${object.label}.` });
      if (!moved && !resized) entries.push({ kind: "MOVED", objectId: id, summary: `Geometry changed on ${object.label}.` });
    }
    if (prior.rotationMillidegree !== object.rotationMillidegree) {
      entries.push({ kind: "ROTATED", objectId: id, summary: `Rotated ${object.label}.` });
    }
    if (capacityOf(prior) !== capacityOf(object)) {
      entries.push({
        kind: "CAPACITY",
        objectId: id,
        summary: `Capacity changed on ${object.label} from ${capacityOf(prior) ?? "unknown"} to ${capacityOf(object) ?? "unknown"}.`,
      });
    }
    if (prior.locked !== object.locked || sourceOf(prior) !== sourceOf(object)) {
      entries.push({
        kind: "LOCK_OR_SAFETY",
        objectId: id,
        summary: `Lock or safety/governance state changed on ${object.label}.`,
      });
    }
    if (sourceOf(prior) !== sourceOf(object)) {
      entries.push({
        kind: "SOURCE_OR_FACT",
        objectId: id,
        summary: `Source or verification fact changed on ${object.label}.`,
      });
    }
  }
  for (const [id, object] of previous) {
    if (!next.has(id)) {
      entries.push({ kind: "REMOVED", objectId: id, summary: `Removed ${object.objectType} “${object.label}”.` });
      entries.push({
        kind: "DOWNSTREAM_IDENTIFIER",
        objectId: id,
        summary: `Stable downstream identifier ${id} was removed.`,
      });
    }
  }
  return entries;
}

const MATERIAL_DIFF_SUMMARY_MAX = 800;

/** Compact, scale-safe summary for maker/checker — must stay within schema max length. */
export function summarizeDiff(entries: readonly LayoutDiffEntry[], maxLength = MATERIAL_DIFF_SUMMARY_MAX): string {
  if (entries.length === 0) return "No material spatial or semantic changes.";
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.kind;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const tally = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([kind, count]) => `${count} ${kind.toLowerCase().replaceAll("_", " ")}`)
    .join("; ");
  const headline = `${entries.length} material change${entries.length === 1 ? "" : "s"}: ${tally}.`;
  const samples: string[] = [];
  let remaining = Math.max(0, maxLength - headline.length - 1);
  for (const entry of entries.slice(0, 12)) {
    const piece = entry.summary.trim();
    if (!piece) continue;
    const cost = (samples.length ? 1 : 0) + piece.length;
    if (cost > remaining) break;
    samples.push(piece);
    remaining -= cost;
  }
  const detail = samples.length ? ` ${samples.join(" ")}` : "";
  const omitted = entries.length - samples.length;
  const suffix = omitted > 0 && remaining > 24 ? ` (+${omitted} more)` : "";
  const full = `${headline}${detail}${suffix}`;
  return full.length <= maxLength ? full : `${full.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
