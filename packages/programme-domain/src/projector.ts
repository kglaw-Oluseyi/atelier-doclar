import { progressionKey } from "./dependencies.js";
import type { ProgrammeEvent } from "./events.js";
import type { DeclarationBaseline, ProgrammeProjection, SliceFacts } from "./projection-types.js";
import type { OpenItem } from "./schemas.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function emptySliceFacts(id: string, updatedAt: string): SliceFacts {
  return {
    id,
    implementationObserved: false,
    reviewRequested: false,
    superseded: false,
    commits: [],
    evidence: [],
    openItemIds: [],
    checks: [],
    updatedAt,
    version: "0",
  };
}

export function createInitialProjection(baseline: DeclarationBaseline, updatedAt: string): ProgrammeProjection {
  const slices: Record<string, SliceFacts> = {};
  for (const manifest of baseline.manifests) {
    slices[manifest.id] = emptySliceFacts(manifest.id, updatedAt);
  }
  const openItems: Record<string, OpenItem> = {};
  for (const item of baseline.openItems) {
    openItems[item.id] = clone(item);
    const facts = slices[item.sliceId];
    if (facts && !facts.openItemIds.includes(item.id)) {
      facts.openItemIds.push(item.id);
    }
  }
  const gates: ProgrammeProjection["gates"] = {};
  for (const gate of baseline.gates) gates[gate.id] = clone(gate);
  const decisions: ProgrammeProjection["decisions"] = {};
  for (const decision of baseline.decisions) decisions[decision.id] = clone(decision);

  return {
    eventPosition: 0,
    aggregateRevisions: {},
    manifests: baseline.manifests.map((item) => clone(item)),
    products: baseline.products.map((item) => clone(item)),
    phases: baseline.phases.map((item) => clone(item)),
    slices,
    openItems,
    gates,
    decisions,
    progressions: {},
  };
}

function touch(facts: SliceFacts, at: string, revision: number): void {
  facts.updatedAt = at;
  facts.version = String(revision);
}

function uniquePush(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

/**
 * Pure projector. Does not mutate the input projection.
 */
export function applyEvent(current: ProgrammeProjection, event: ProgrammeEvent): ProgrammeProjection {
  const next = clone(current);
  const key = `${event.aggregateType}:${event.aggregateId}`;
  next.aggregateRevisions[key] = (next.aggregateRevisions[key] ?? 0) + 1;
  next.eventPosition += 1;
  const revision = next.aggregateRevisions[key] ?? 1;
  const sliceId = event.sliceId ?? (event.aggregateType === "slice" ? event.aggregateId : undefined);
  const facts = sliceId ? next.slices[sliceId] : undefined;

  switch (event.eventType) {
    case "SLICE_IMPLEMENTATION_OBSERVED":
      if (facts) {
        facts.implementationObserved = true;
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "COMMIT_LINKED":
      if (facts) {
        uniquePush(facts.commits, event.payload.sha);
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "CHECK_RECORDED":
      if (facts && !facts.checks.some((item) => item.id === event.payload.check.id)) {
        facts.checks.push(event.payload.check);
        facts.implementationObserved = true;
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "EVIDENCE_ATTACHED":
      if (facts && !facts.evidence.some((item) => item.id === event.payload.evidence.id)) {
        facts.evidence.push(event.payload.evidence);
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "OPEN_ITEM_CREATED": {
      const item = event.payload.openItem;
      next.openItems[item.id] = item;
      const target = next.slices[item.sliceId];
      if (target) uniquePush(target.openItemIds, item.id);
      break;
    }
    case "OPEN_ITEM_STATUS_CHANGED": {
      const item = next.openItems[event.payload.openItemId];
      if (item) {
        item.status = event.payload.status;
        if (event.payload.blocker !== undefined) item.blocker = event.payload.blocker;
      }
      break;
    }
    case "REVIEW_REQUESTED":
      if (facts) {
        facts.reviewRequested = true;
        facts.implementationObserved = true;
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "ACCEPTANCE_RECORDED":
      if (facts) {
        facts.acceptedAt = event.payload.acceptedAt;
        facts.acceptedBy = event.payload.acceptedBy;
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "PROGRESSION_AUTHORISED": {
      next.progressions[progressionKey(event.payload.predecessorId, event.payload.successorId)] = {
        predecessorId: event.payload.predecessorId,
        successorId: event.payload.successorId,
        authorisedAt: event.payload.authorisedAt,
        authorisedBy: event.payload.authorisedBy,
        authorityRole: event.payload.authorityRole,
        evidenceIds: [...event.payload.evidenceIds],
        reason: event.payload.reason,
      };
      break;
    }
    case "GATE_STATUS_CHANGED": {
      const gate = next.gates[event.payload.gateId];
      if (gate) {
        gate.status = event.payload.status;
        gate.authority = event.payload.authority;
        gate.requiredEvidenceIds = [...event.payload.evidenceIds];
      }
      break;
    }
    case "DECISION_RECORDED":
      next.decisions[event.payload.decision.id] = event.payload.decision;
      break;
    case "SLICE_SUPERSEDED":
      if (facts) {
        facts.superseded = true;
        facts.supersessionDecisionId = event.payload.decisionId;
        if (event.payload.supersededBy !== undefined) facts.supersededBy = event.payload.supersededBy;
        touch(facts, event.occurredAt, revision);
      }
      break;
    case "SNAPSHOT_PRODUCED":
    case "CORRECTION_APPENDED":
      break;
  }

  return next;
}

export function replay(events: ProgrammeEvent[], baseline: DeclarationBaseline, updatedAt: string): ProgrammeProjection {
  let state = createInitialProjection(baseline, updatedAt);
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

export function replayFrom(
  projection: ProgrammeProjection,
  events: ProgrammeEvent[],
): ProgrammeProjection {
  let state = clone(projection);
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}
