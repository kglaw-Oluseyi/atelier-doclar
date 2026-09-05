import { CT2_TRACEABILITY } from "./constants.js";
import { parseProgrammeEvent, type ProgrammeEvent } from "./events.js";
import { loadProgrammeCorpus } from "./load.js";
import type { DeclarationBaseline } from "./projection-types.js";
import type { EvidenceRef } from "./schemas.js";
import { validateLoadedProgramme } from "./validate.js";

export const CORPUS_SEED_TIME = "2026-09-05T05:10:00Z";
export const CT2_SEED_TIME = "2026-09-05T07:10:00Z";
export const CT3_SEED_TIME = "2026-09-05T08:10:00Z";
export const CT4_SEED_TIME = "2026-09-05T10:10:00Z";
export const CT5_SEED_TIME = "2026-09-05T11:10:00Z";
export const CT6_SEED_TIME = "2026-09-05T12:10:00Z";
export const CT7_SEED_TIME = "2026-09-05T13:10:00Z";
export const CT8_SEED_TIME = "2026-09-05T14:10:00Z";
export const CT9_SEED_TIME = "2026-09-05T15:10:00Z";
export const FC1_SEED_TIME = "2026-09-05T16:10:00Z";
export const LV1_SEED_TIME = "2026-09-05T17:10:00Z";
export const HV1_SEED_TIME = "2026-09-05T18:10:00Z";
export const EOS_S01_SEED_TIME = "2026-09-05T19:10:00Z";
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
  sliceId:
    | "MD-B0"
    | "MD-CT0"
    | "MD-CT1"
    | "MD-CT2"
    | "MD-CT3"
    | "MD-CT4"
    | "MD-CT5"
    | "MD-CT6"
    | "MD-CT7"
    | "MD-CT8"
    | "MD-CT9"
    | "MD-FC1"
    | "MD-LV1"
    | "MD-HV1"
    | "EOS-S01",
  occurredAt: string,
  payload: ProgrammeEvent["payload"],
  product: "FOUNDATION" | "EVENT_OS" = "FOUNDATION",
): ProgrammeEvent {
  return parseProgrammeEvent({
    eventId,
    eventType,
    schemaVersion: 1,
    aggregateType: "slice",
    aggregateId: sliceId,
    product,
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
 * Does not manufacture ACCEPTED events for B0/CT0–CT9.
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
    envelope("EVT-SEED-CT3-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT3", CT3_SEED_TIME, {
      summary: "CT3 repository and CI ingestion implemented",
    }),
    envelope("EVT-SEED-CT3-REVIEW", "REVIEW_REQUESTED", "MD-CT3", CT3_SEED_TIME, {
      summary: "CT3 in review; not accepted",
    }),
    envelope("EVT-SEED-CT4-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT4", CT4_SEED_TIME, {
      summary: "CT4 Control Tower shell and executive portfolio implemented",
    }),
    envelope("EVT-SEED-CT4-REVIEW", "REVIEW_REQUESTED", "MD-CT4", CT4_SEED_TIME, {
      summary: "CT4 in review; not accepted",
    }),
    envelope("EVT-SEED-CT5-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT5", CT5_SEED_TIME, {
      summary: "CT5 roadmap and drill-down implemented",
    }),
    envelope("EVT-SEED-CT5-REVIEW", "REVIEW_REQUESTED", "MD-CT5", CT5_SEED_TIME, {
      summary: "CT5 in review; not accepted",
    }),
    envelope("EVT-SEED-CT6-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT6", CT6_SEED_TIME, {
      summary: "CT6 controlled workflows implemented",
    }),
    envelope("EVT-SEED-CT6-REVIEW", "REVIEW_REQUESTED", "MD-CT6", CT6_SEED_TIME, {
      summary: "CT6 in review; not accepted",
    }),
    envelope("EVT-SEED-CT7-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT7", CT7_SEED_TIME, {
      summary: "CT7 grounded programme assistant implemented",
    }),
    envelope("EVT-SEED-CT7-REVIEW", "REVIEW_REQUESTED", "MD-CT7", CT7_SEED_TIME, {
      summary: "CT7 in review; not accepted",
    }),
    envelope("EVT-SEED-CT8-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT8", CT8_SEED_TIME, {
      summary: "CT8 charts, notifications and freshness implemented",
    }),
    envelope("EVT-SEED-CT8-REVIEW", "REVIEW_REQUESTED", "MD-CT8", CT8_SEED_TIME, {
      summary: "CT8 in review; not accepted",
    }),
    envelope("EVT-SEED-CT9-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-CT9", CT9_SEED_TIME, {
      summary: "CT9 operations and evidence pack implemented",
    }),
    envelope("EVT-SEED-CT9-REVIEW", "REVIEW_REQUESTED", "MD-CT9", CT9_SEED_TIME, {
      summary: "CT9 in review; not accepted; production not authorised",
    }),
    envelope("EVT-SEED-FC1-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-FC1", FC1_SEED_TIME, {
      summary: "Foundation closeout reconciled Control Tower technical debt",
    }),
    envelope("EVT-SEED-FC1-REVIEW", "REVIEW_REQUESTED", "MD-FC1", FC1_SEED_TIME, {
      summary: "Foundation closeout in review; not accepted; production not authorised",
    }),
    envelope("EVT-SEED-LV1-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-LV1", LV1_SEED_TIME, {
      summary: "Control Tower live deployment and automated verification implemented",
    }),
    envelope("EVT-SEED-LV1-REVIEW", "REVIEW_REQUESTED", "MD-LV1", LV1_SEED_TIME, {
      summary: "Live deployment in review; human verification pending; production not authorised",
    }),
    envelope("EVT-SEED-HV1-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-HV1", HV1_SEED_TIME, {
      summary: "CEO human live verification recorded; production not authorised",
    }),
    envelope("EVT-SEED-HV1-REVIEW", "REVIEW_REQUESTED", "MD-HV1", HV1_SEED_TIME, {
      summary: "Human verification closeout in review; not accepted; production not authorised",
    }),
    parseProgrammeEvent({
      eventId: "EVT-SEED-HV1-OI-FC1-001",
      eventType: "OPEN_ITEM_STATUS_CHANGED",
      schemaVersion: 1,
      aggregateType: "open_item",
      aggregateId: "OI-FC1-001",
      product: "FOUNDATION",
      sliceId: "MD-FC1",
      occurredAt: HV1_SEED_TIME,
      recordedAt: HV1_SEED_TIME,
      actor: { id: "CEO", role: "CEO" },
      source: "ceo-human-verification",
      idempotencyKey: "seed:EVT-SEED-HV1-OI-FC1-001",
      payload: {
        openItemId: "OI-FC1-001",
        status: "RESOLVED",
        blocker: false,
      },
    }),
    envelope(
      "EVT-SEED-EOS-S01-IMPL",
      "SLICE_IMPLEMENTATION_OBSERVED",
      "EOS-S01",
      EOS_S01_SEED_TIME,
      { summary: "Event OS shared platform foundation implemented; production not authorised" },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S01-REVIEW",
      "REVIEW_REQUESTED",
      "EOS-S01",
      EOS_S01_SEED_TIME,
      { summary: "EOS-S01 in review; not accepted; production not authorised" },
      "EVENT_OS",
    ),
    parseProgrammeEvent({
      eventId: "EVT-SEED-EOS-S01-OI-FC1-004",
      eventType: "OPEN_ITEM_STATUS_CHANGED",
      schemaVersion: 1,
      aggregateType: "open_item",
      aggregateId: "OI-FC1-004",
      product: "EVENT_OS",
      sliceId: "EOS-S01",
      occurredAt: EOS_S01_SEED_TIME,
      recordedAt: EOS_S01_SEED_TIME,
      actor: { id: "corpus-seed", role: "SYSTEM" },
      source: "corpus-seed",
      idempotencyKey: "seed:EVT-SEED-EOS-S01-OI-FC1-004",
      payload: {
        openItemId: "OI-FC1-004",
        status: "RESOLVED",
        blocker: false,
      },
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
      decisions: loaded.decisions,
    },
  };
}

export function corpusProjectionTrace() {
  return CT2_TRACEABILITY;
}
