import {
  createEngine,
  parseProgrammeEvent,
  type DeclarationBaseline,
  type ProgrammeEvent,
  type ProgrammeEvent as Event,
} from "../src/index.js";
import { MemoryProgrammeStore } from "../src/store.js";
import {
  VALID_COMMIT,
  VALID_TIME,
  smallestManifest,
  validEvidence,
  validGate,
  validOpenItem,
  validPhase,
  validProduct,
} from "./helpers.js";

let seq = 0;

export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

export function resetIds(): void {
  seq = 0;
}

export function testBaseline(extra?: Partial<DeclarationBaseline>): DeclarationBaseline {
  const manifests = extra?.manifests ?? [
    smallestManifest({ id: "MD-AA", order: 0, dependsOn: [] }),
    smallestManifest({ id: "MD-BB", order: 1, dependsOn: ["MD-AA"], title: "B" }),
  ];
  return {
    products: extra?.products ?? [validProduct()],
    phases: extra?.phases ?? [validPhase()],
    manifests,
    gates: extra?.gates ?? [validGate()],
    openItems: extra?.openItems ?? [],
    decisions: extra?.decisions ?? [],
  };
}

export function testEngine(baseline?: DeclarationBaseline) {
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline ?? testBaseline(), VALID_TIME);
  return { store, engine, baseline: baseline ?? testBaseline() };
}

export function makeEvent(partial: {
  eventId?: string;
  eventType: Event["eventType"];
  aggregateType?: Event["aggregateType"];
  aggregateId?: string;
  sliceId?: string;
  expectedRevision?: number;
  idempotencyKey?: string;
  actor?: Event["actor"];
  payload: Event["payload"];
  occurredAt?: string;
}): ProgrammeEvent {
  return parseProgrammeEvent({
    eventId: partial.eventId ?? nextId("EVT"),
    eventType: partial.eventType,
    schemaVersion: 1,
    aggregateType: partial.aggregateType ?? "slice",
    aggregateId: partial.aggregateId ?? "MD-AA",
    product: "FOUNDATION",
    sliceId: partial.sliceId ?? partial.aggregateId ?? "MD-AA",
    occurredAt: partial.occurredAt ?? VALID_TIME,
    recordedAt: partial.occurredAt ?? VALID_TIME,
    actor: partial.actor ?? { id: "tester", role: "IMPLEMENTER" },
    source: "test",
    idempotencyKey: partial.idempotencyKey ?? nextId("IDEM"),
    expectedRevision: partial.expectedRevision,
    payload: partial.payload,
  });
}

export function impl(sliceId = "MD-AA") {
  return makeEvent({
    eventType: "SLICE_IMPLEMENTATION_OBSERVED",
    aggregateId: sliceId,
    sliceId,
    payload: { summary: `implemented ${sliceId}` },
  });
}

export function review(sliceId = "MD-AA") {
  return makeEvent({
    eventType: "REVIEW_REQUESTED",
    aggregateId: sliceId,
    sliceId,
    payload: { summary: `review ${sliceId}` },
  });
}

export function commit(sliceId = "MD-AA", sha = VALID_COMMIT) {
  return makeEvent({
    eventType: "COMMIT_LINKED",
    aggregateId: sliceId,
    sliceId,
    payload: { sha },
  });
}

export function evidence(sliceId = "MD-AA") {
  return makeEvent({
    eventType: "EVIDENCE_ATTACHED",
    aggregateId: sliceId,
    sliceId,
    payload: { evidence: validEvidence() },
  });
}

export function accept(sliceId = "MD-AA") {
  return makeEvent({
    eventType: "ACCEPTANCE_RECORDED",
    aggregateId: sliceId,
    sliceId,
    actor: { id: "named-reviewer", role: "REVIEWER" },
    payload: {
      acceptedAt: VALID_TIME,
      acceptedBy: "Named Reviewer",
      authorityRole: "REVIEWER",
    },
  });
}

export function blocker(sliceId = "MD-AA", id = "OI-BLOCK") {
  return makeEvent({
    eventType: "OPEN_ITEM_CREATED",
    aggregateType: "open_item",
    aggregateId: id,
    sliceId,
    payload: {
      openItem: validOpenItem({ id, sliceId, blocker: true, status: "OPEN" }),
    },
  });
}
