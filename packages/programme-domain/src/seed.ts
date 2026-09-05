import { CT2_TRACEABILITY } from "./constants.js";
import { parseProgrammeEvent, type ProgrammeEvent } from "./events.js";
import { loadProgrammeCorpus } from "./load.js";
import type { DeclarationBaseline } from "./projection-types.js";
import type { EvidenceRef } from "./schemas.js";
import { validateLoadedProgramme } from "./validate.js";

export const CORPUS_SEED_TIME = "2026-09-05T05:10:00Z";
export const CT2_SEED_TIME = "2026-09-05T07:10:00Z";
export const B0_COMMIT = "f7abb431be9a15ab730b3fdd16baa8e83776c170";

const B0_EVIDENCE: EvidenceRef = {
  id: "EV-B0-001",
  kind: "COMMIT",
  uri: `git:${B0_COMMIT}`,
  createdAt: "2026-09-05T04:37:00Z",
  sourceSystem: "github",
  immutable: true,
  summary: "B0 baseline commit",
};

const systemActor = { id: "corpus-seed", role: "SYSTEM" as const };

function envelope(
  eventId: string,
  eventType: ProgrammeEvent["eventType"],
  sliceId: "MD-B0" | "MD-CT0" | "MD-CT1" | "MD-CT2",
  occurredAt: string,
  payload: ProgrammeEvent["payload"],
): ProgrammeEvent {
  return parseProgrammeEvent({
    eventId,
    eventType,
    schemaVersion: 1,
    aggregateType: "slice",
    aggregateId: sliceId,
    product: "FOUNDATION",
    sliceId,
    occurredAt,
    recordedAt: occurredAt,
    actor: systemActor,
    source: "corpus-seed",
    idempotencyKey: `seed:${eventId}`,
    payload,
  });
}

/**
 * Deterministic seed events reflecting documented review state.
 * Does not manufacture ACCEPTED events for B0/CT0/CT1/CT2.
 */
export function corpusSeedEvents(): ProgrammeEvent[] {
  return [
    envelope("EVT-SEED-B0-COMMIT", "COMMIT_LINKED", "MD-B0", CORPUS_SEED_TIME, { sha: B0_COMMIT }),
    envelope("EVT-SEED-B0-EVIDENCE", "EVIDENCE_ATTACHED", "MD-B0", CORPUS_SEED_TIME, { evidence: B0_EVIDENCE }),
    envelope("EVT-SEED-B0-REVIEW", "REVIEW_REQUESTED", "MD-B0", CORPUS_SEED_TIME, {
      summary: "B0 committed and in review; not accepted",
    }),
    envelope("EVT-SEED-CT0-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT0", CORPUS_SEED_TIME, {
      summary: "CT0 planning artefacts committed",
    }),
    envelope("EVT-SEED-CT0-REVIEW", "REVIEW_REQUESTED", "MD-CT0", CORPUS_SEED_TIME, {
      summary: "CT0 in review; not accepted",
    }),
    envelope("EVT-SEED-CT1-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT1", CORPUS_SEED_TIME, {
      summary: "CT1 validator package committed",
    }),
    envelope("EVT-SEED-CT1-REVIEW", "REVIEW_REQUESTED", "MD-CT1", CORPUS_SEED_TIME, {
      summary: "CT1 in review; not accepted",
    }),
    envelope("EVT-SEED-CT2-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT2", CT2_SEED_TIME, {
      summary: "CT2 persistence and status calculator implemented",
    }),
    envelope("EVT-SEED-CT2-REVIEW", "REVIEW_REQUESTED", "MD-CT2", CT2_SEED_TIME, {
      summary: "CT2 in review; not accepted",
    }),
  ];
}

export function loadCorpusBaseline(root?: string): {
  baseline: DeclarationBaseline;
} {
  const loaded = loadProgrammeCorpus(root);
  const validated = validateLoadedProgramme(loaded);
  if (!validated.ok) {
    throw new Error(
      `cannot project an invalid corpus: ${validated.errors.map((error) => error.message).join("; ")}`,
    );
  }
  return {
    baseline: {
      products: loaded.products,
      phases: loaded.phases,
      manifests: loaded.catalogManifests,
      gates: loaded.gates,
      openItems: loaded.openItems,
    },
  };
}

export function corpusProjectionTrace() {
  return CT2_TRACEABILITY;
}
