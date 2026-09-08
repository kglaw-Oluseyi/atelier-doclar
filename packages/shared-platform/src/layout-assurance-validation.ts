import { randomUUID } from "node:crypto";
import {
  LAYOUT_VALIDATION_ENGINE_ID,
  LAYOUT_VALIDATION_ENGINE_VERSION,
  SCHEMA_VERSION,
} from "./constants.js";
import { buildCapacityReport } from "./layout-assurance-capacity.js";
import { LAYOUT_VALIDATION_RULES, type LayoutValidationFinding } from "./layout-assurance-schemas.js";
import type { SpatialGeometry, SpatialObject } from "./spatial-schemas.js";
import type { PlatformSnapshot } from "./store.js";
import type { Layout, LayoutRevision } from "./venue-schemas.js";

type DraftFinding = Omit<
  LayoutValidationFinding,
  "id" | "runId" | "revisionId" | "contentHash" | "recordedByPersonId" | "schemaVersion" | "version" | "createdAt" | "updatedAt" | "status" | "organisationId" | "clientId" | "eventId" | "layoutId"
> & { objectIds: string[] };

function boundingBox(geometry: SpatialGeometry): { minX: number; minY: number; maxX: number; maxY: number } {
  if (geometry.kind === "RECTANGLE") {
    return { minX: geometry.xMm, minY: geometry.yMm, maxX: geometry.xMm + geometry.widthMm, maxY: geometry.yMm + geometry.heightMm };
  }
  if (geometry.kind === "ELLIPSE") {
    return {
      minX: geometry.cxMm - geometry.radiusXMm,
      minY: geometry.cyMm - geometry.radiusYMm,
      maxX: geometry.cxMm + geometry.radiusXMm,
      maxY: geometry.cyMm + geometry.radiusYMm,
    };
  }
  const xs = geometry.points.map((point) => point.xMm);
  const ys = geometry.points.map((point) => point.yMm);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function overlaps(left: SpatialGeometry, right: SpatialGeometry): boolean {
  const a = boundingBox(left);
  const b = boundingBox(right);
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function live(objects: readonly SpatialObject[]): SpatialObject[] {
  return objects.filter((item) => !item.tombstoned);
}

function ruleMeta(id: (typeof LAYOUT_VALIDATION_RULES)[number]["id"]) {
  const rule = LAYOUT_VALIDATION_RULES.find((item) => item.id === id);
  if (!rule) throw new Error(`unknown rule ${id}`);
  return rule;
}

function finding(
  ruleId: (typeof LAYOUT_VALIDATION_RULES)[number]["id"],
  input: {
    objectIds: string[];
    evidence: string;
    explanation: string;
    recommendedAction: string;
    sourceKind: LayoutValidationFinding["sourceKind"];
    applicability: LayoutValidationFinding["applicability"];
    ownerLabel: string;
    requiredAuthority: LayoutValidationFinding["requiredAuthority"];
  },
): DraftFinding {
  const rule = ruleMeta(ruleId);
  return {
    ruleId: rule.id,
    ruleVersion: rule.version,
    severity: rule.severity,
    objectIds: input.objectIds,
    evidence: input.evidence,
    explanation: input.explanation,
    recommendedAction: input.recommendedAction,
    sourceKind: input.sourceKind,
    applicability: input.applicability,
    ownerLabel: input.ownerLabel,
    requiredAuthority: input.requiredAuthority,
  };
}

export function evaluateLayoutValidation(snap: PlatformSnapshot, layout: Layout, revision: LayoutRevision): DraftFinding[] {
  const objects = live(revision.objects);
  const findings: DraftFinding[] = [];
  const bounds = layout.bounds;
  for (const object of objects) {
    const box = boundingBox(object.geometry);
    if (box.minX < bounds.minXMm || box.minY < bounds.minYMm || box.maxX > bounds.maxXMm || box.maxY > bounds.maxYMm) {
      findings.push(
        finding("RULE-S05-GEOM-BOUNDS", {
          objectIds: [object.id],
          evidence: `Bounds ${box.minX},${box.minY}–${box.maxX},${box.maxY} vs layout ${bounds.widthMm}×${bounds.heightMm} mm.`,
          explanation: `${object.label} sits outside the layout bounds. This is a geometry error, not a safety certificate.`,
          recommendedAction: "Move or resize the object so it stays inside the stored millimetre bounds.",
          sourceKind: "STAFF_OBSERVED",
          applicability: "ALWAYS",
          ownerLabel: "Layout author",
          requiredAuthority: "PLANNER",
        }),
      );
    }
  }

  const governed = objects.filter((item) => item.objectType === "RESTRICTED_AREA" || item.objectType === "CLEARANCE_AREA");
  const occupiers = objects.filter((item) => item.objectType === "TABLE" || item.objectType === "FIXTURE");
  for (const area of governed) {
    const areaSubtype = area.subtype as { governedLocked?: boolean; sourceKind?: string };
    for (const occupier of occupiers) {
      if (!overlaps(area.geometry, occupier.geometry)) continue;
      findings.push(
        finding("RULE-S05-OVERLAP-GOVERNED", {
          objectIds: [occupier.id, area.id],
          evidence: `${occupier.label} overlaps ${area.label} (${area.objectType}).`,
          explanation: "A table or fixture overlaps a governed restricted or clearance area. Software does not certify fire or crowd safety.",
          recommendedAction: "Move the occupier or record an authorised override with evidence and expiry.",
          sourceKind: (areaSubtype.sourceKind as DraftFinding["sourceKind"]) ?? "STAFF_OBSERVED",
          applicability: "ALWAYS",
          ownerLabel: "Layout author",
          requiredAuthority: areaSubtype.governedLocked ? "QUALIFIED_AUTHORITY" : "EVENT_DIRECTOR",
        }),
      );
    }
  }

  const routes = objects.filter((item) => item.objectType === "ROUTE");
  for (const route of routes) {
    const blockers = occupiers.filter((item) => overlaps(route.geometry, item.geometry));
    if (blockers.length === 0) continue;
    findings.push(
      finding("RULE-S05-ROUTE-OBSTRUCTED", {
        objectIds: [route.id, ...blockers.map((item) => item.id)],
        evidence: `${route.label} bounding box intersects ${blockers.map((item) => item.label).join(", ")}.`,
        explanation: "A route or access point may be obstructed by a table or fixture. This is a geometric overlap warning, not a certified escape-route assessment.",
        recommendedAction: "Clear the route or document why the overlap is operationally acceptable.",
        sourceKind: "STAFF_OBSERVED",
        applicability: "ALWAYS",
        ownerLabel: "Layout author",
        requiredAuthority: "PLANNER",
      }),
    );
  }

  const eventVenue = snap.eventVenues.find((item) => item.id === layout.eventVenueId);
  const eventFacts = eventVenue
    ? snap.eventVenueFacts.filter((item) => item.eventVenueId === eventVenue.id)
    : [];
  const stepFreeRequired = eventFacts.some(
    (item) =>
      item.factType === "ACCESS" &&
      item.subtype === "STEP_FREE" &&
      item.verificationState === "VERIFIED",
  );
  if (stepFreeRequired) {
    const accessible = routes.filter((item) => (item.subtype as { purpose?: string }).purpose === "ACCESSIBLE");
    const continuous = accessible.filter((route) => !governed.some((area) => overlaps(route.geometry, area.geometry)));
    if (accessible.length === 0 || continuous.length === 0) {
      findings.push(
        finding("RULE-S05-ACCESSIBLE-ROUTE", {
          objectIds: accessible.map((item) => item.id),
          evidence: "A verified STEP_FREE access fact exists on the event venue.",
          explanation: "A verified event requirement for step-free access is present, and a continuous accessible route is missing. No accessibility certification is claimed.",
          recommendedAction: "Add a sourced accessible route that does not cross a governed restricted or clearance area, or record an authorised override.",
          sourceKind: "QUALIFIED_AUTHORITY",
          applicability: "CONDITIONAL",
          ownerLabel: "Event director",
          requiredAuthority: "QUALIFIED_AUTHORITY",
        }),
      );
    }
  }

  const verifiedWidths = eventFacts.filter(
    (item) => item.subtype === "EXIT_WIDTH" && item.verificationState === "VERIFIED" && item.unit === "MILLIMETRE" && item.valueIntegerMm !== undefined,
  );
  for (const widthFact of verifiedWidths) {
    const threshold = widthFact.valueIntegerMm ?? 0;
    for (const route of routes) {
      const routeWidth = route.geometry.kind === "POLYLINE" ? route.geometry.widthMm : undefined;
      if (routeWidth === undefined || routeWidth >= threshold) continue;
      findings.push(
        finding("RULE-S05-VERIFIED-WIDTH", {
          objectIds: [route.id],
          evidence: `Route width ${routeWidth} mm is below verified EXIT_WIDTH ${threshold} mm from ${widthFact.sourceLabel}.`,
          explanation: "A sourced verified width is breached. The software did not invent this threshold.",
          recommendedAction: "Widen the route to the verified measurement or attach an authorised override with that source.",
          sourceKind: widthFact.sourceKind,
          applicability: "CONDITIONAL",
          ownerLabel: widthFact.sourceLabel,
          requiredAuthority: "QUALIFIED_AUTHORITY",
        }),
      );
    }
  }

  const capacity = buildCapacityReport(snap, layout, objects);
  for (const table of capacity.tableBreakdown) {
    if (table.physicalSeatCount === 0 || table.physicalSeatCount === table.declaredCapacity) continue;
    findings.push(
      finding("RULE-S05-SEAT-COUNT", {
        objectIds: [table.objectId],
        evidence: `${table.label}: ${table.physicalSeatCount} physical seats vs declared/design ${table.declaredCapacity}.`,
        explanation: "Physical seat count is inconsistent with the table declared/design capacity. Seats are not guest assignments.",
        recommendedAction: "Align generated seats with table capacity or update the table declared capacity.",
        sourceKind: "STAFF_OBSERVED",
        applicability: "ALWAYS",
        ownerLabel: "Layout author",
        requiredAuthority: "PLANNER",
      }),
    );
  }

  if (
    capacity.operationalCapacity.present &&
    capacity.operationalCapacity.quantity !== undefined &&
    ((capacity.declaredVenueCapacity.quantity !== undefined && capacity.operationalCapacity.quantity > capacity.declaredVenueCapacity.quantity) ||
      (capacity.geometricCapacity.quantity !== undefined && capacity.operationalCapacity.quantity > capacity.geometricCapacity.quantity))
  ) {
    findings.push(
      finding("RULE-S05-OPS-ABOVE-DESIGN", {
        objectIds: [],
        evidence: `Operational ${capacity.operationalCapacity.quantity}; declared ${capacity.declaredVenueCapacity.quantity ?? "unknown"}; geometric ${capacity.geometricCapacity.quantity ?? "unknown"}.`,
        explanation: "Operational capacity is above declared or geometric design capacity. Products remain separate; none was overwritten.",
        recommendedAction: "Reduce operational capacity or record a verified higher declared/design basis.",
        sourceKind: "STAFF_OBSERVED",
        applicability: "ALWAYS",
        ownerLabel: capacity.operationalCapacity.ownerLabel ?? "Operational owner",
        requiredAuthority: "EVENT_DIRECTOR",
      }),
    );
  }

  if (
    capacity.expectedAttendance.present &&
    capacity.expectedAttendance.quantity !== undefined &&
    capacity.operationalCapacity.present &&
    capacity.operationalCapacity.quantity !== undefined &&
    capacity.expectedAttendance.quantity > capacity.operationalCapacity.quantity
  ) {
    findings.push(
      finding("RULE-S05-ATTENDANCE-ABOVE-OPS", {
        objectIds: [],
        evidence: `Expected attendance ${capacity.expectedAttendance.quantity} exceeds operational capacity ${capacity.operationalCapacity.quantity}. RSVP ${capacity.observedRsvp.quantity ?? "unknown"} was not substituted.`,
        explanation: "Expected attendance (forecast) is above operational capacity. RSVP, provision and observed attendance were not mutated.",
        recommendedAction: "Change operational capacity with a named owner, or reduce expected attendance through the forecast ledger — not here.",
        sourceKind: "STAFF_OBSERVED",
        applicability: "ALWAYS",
        ownerLabel: "Event director",
        requiredAuthority: "EVENT_DIRECTOR",
      }),
    );
  }

  const ops = snap.layoutCapacityStatements.find((item) => item.layoutId === layout.id && !item.supersededById);
  if (
    !ops ||
    ops.verificationState === "UNKNOWN" ||
    ops.verificationState === "STALE" ||
    ops.verificationState === "CONFLICTING"
  ) {
    findings.push(
      finding("RULE-S05-CAPACITY-SOURCE", {
        objectIds: [],
        evidence: ops
          ? `Operational capacity source ${ops.sourceLabel} is ${ops.verificationState}.`
          : "No operational capacity statement exists.",
        explanation: "Capacity source is missing, stale, conflicting or inapplicable. The gap remains visible.",
        recommendedAction: "Record operational capacity with owner, source, verification and rationale.",
        sourceKind: ops?.sourceKind ?? "UNVERIFIED_REPORT",
        applicability: "ALWAYS",
        ownerLabel: ops?.ownerLabel ?? "Unassigned",
        requiredAuthority: "PLANNER",
      }),
    );
  }

  const restrictedRequired = eventFacts.some(
    (item) => item.subtype === "RESTRICTED_ZONE" && item.verificationState === "VERIFIED",
  );
  if (restrictedRequired && !objects.some((item) => item.objectType === "RESTRICTED_AREA")) {
    findings.push(
      finding("RULE-S05-REQUIRED-OBJECTS", {
        objectIds: [],
        evidence: "A verified RESTRICTED_ZONE fact exists on the event venue profile.",
        explanation: "The selected sourced profile requires a restricted area object. No other objects were invented.",
        recommendedAction: "Add a sourced restricted area or record that the profile no longer applies.",
        sourceKind: "QUALIFIED_AUTHORITY",
        applicability: "CONDITIONAL",
        ownerLabel: "Event director",
        requiredAuthority: "EVENT_DIRECTOR",
      }),
    );
  }

  const currentPublication = snap.layoutPublications.find(
    (item) => item.layoutId === layout.id && item.status === "CURRENT",
  );
  if (currentPublication) {
    const published = snap.layoutRevisions.find((item) => item.id === currentPublication.revisionId);
    if (published) {
      const publishedLive = live(published.objects);
      const currentById = new Map(objects.map((item) => [item.id, item]));
      for (const object of publishedLive) {
        const current = currentById.get(object.id);
        if (!current) {
          findings.push(
            finding("RULE-S05-DOWNSTREAM-ID", {
              objectIds: [object.id],
              evidence: `Published identifier ${object.id} (${object.label}) is absent from the current draft.`,
              explanation: "A stable downstream identifier from the current publication was removed.",
              recommendedAction: "Restore the identifier or publish a new version that records the removal after approval.",
              sourceKind: "STAFF_OBSERVED",
              applicability: "ALWAYS",
              ownerLabel: "Layout author",
              requiredAuthority: "EVENT_DIRECTOR",
            }),
          );
        } else if (current.label !== object.label) {
          findings.push(
            finding("RULE-S05-DOWNSTREAM-ID", {
              objectIds: [object.id],
              evidence: `Published label “${object.label}” is now “${current.label}”.`,
              explanation: "A stable downstream identifier was relabelled after publication.",
              recommendedAction: "Restore the published label or submit the relabel for a new approval.",
              sourceKind: "STAFF_OBSERVED",
              applicability: "ALWAYS",
              ownerLabel: "Layout author",
              requiredAuthority: "EVENT_DIRECTOR",
            }),
          );
        }
      }
    }
  }

  const missing: string[] = [];
  if (!capacity.declaredVenueCapacity.present) missing.push("declared venue capacity");
  if (!capacity.operationalCapacity.present) missing.push("operational capacity");
  if (!snap.layoutAssetCalibrations.some((item) => item.layoutId === layout.id && item.spatiallyAuthoritative)) {
    missing.push("verified floor-plan calibration");
  }
  if (missing.length > 0) {
    findings.push(
      finding("RULE-S05-INTELLIGENCE-GAPS", {
        objectIds: [],
        evidence: `Missing facts: ${missing.join(", ")}.`,
        explanation: "Layout intelligence can only advise from recorded facts. Missing values were not inferred, and this recommendation cannot approve, publish or override.",
        recommendedAction: "Record the missing sourced facts before treating the plan as complete.",
        sourceKind: "UNVERIFIED_REPORT",
        applicability: "ALWAYS",
        ownerLabel: "Layout author",
        requiredAuthority: "PLANNER",
      }),
    );
  }

  return findings;
}

export function stampFindings(
  drafts: readonly DraftFinding[],
  input: {
    runId: string;
    layout: Layout;
    revision: LayoutRevision;
    actorPersonId: string;
    now: string;
  },
): LayoutValidationFinding[] {
  return drafts.map((draft) => ({
    id: randomUUID(),
    organisationId: input.layout.organisationId,
    clientId: input.layout.clientId,
    eventId: input.layout.eventId,
    layoutId: input.layout.id,
    runId: input.runId,
    status: "OPEN",
    revisionId: input.revision.id,
    contentHash: input.revision.contentHash,
    recordedByPersonId: input.actorPersonId,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
    ...draft,
  }));
}

export { LAYOUT_VALIDATION_ENGINE_ID, LAYOUT_VALIDATION_ENGINE_VERSION };
