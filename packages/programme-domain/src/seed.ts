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
export const GR1_SEED_TIME = "2026-09-05T20:10:00Z";
export const EOS_S01_ACCEPT_TIME = "2026-09-05T21:10:00Z";
export const EOS_S02_SEED_TIME = "2026-09-05T22:10:00Z";
export const EOS_S02_COMMIT_TIME = "2026-09-05T22:20:00Z";
export const EOS_S02_ACCEPT_TIME = "2026-09-05T23:10:00Z";
export const EOS_S02_COMMIT = "23e8ad98f7a0b8d18ae083f385bfc04cd43ab973";
export const EOS_S02_FINAL_VERIFIED_HEAD = "927ff92908ea25761933a7b24d37396e5e4e0123";
export const EOS_S02_COMMIT_EVIDENCE_ID = "EV-EOS-S02-COMMIT";
export const EOS_S02_ACCEPTANCE_EVENT_ID = "EVT-SEED-EOS-S02-ACCEPT";
export const EOS_S03_SEED_TIME = "2026-09-06T00:10:00Z";
export const EOS_S03_COMMIT_TIME = "2026-09-06T00:20:00Z";
export const EOS_S03_COMMIT = "bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe";
export const EOS_S03_COMMIT_EVIDENCE_ID = "EV-EOS-S03-COMMIT";
export const B0_COMMIT = "f7abb431be9a15ab730b3fdd16baa8e83776c170";
export const EOS_S01_COMMIT = "b815268e939cfbd0fc33ce10df77f1c8a1374d52";
export const EOS_S01_ACCEPTANCE_EVENT_ID = "EVT-SEED-EOS-S01-ACCEPT";
export const EOS_S01_COMMIT_EVIDENCE_ID = "EV-EOS-S01-COMMIT";
export const EOS_S01_REVIEWER = "ChatGPT / AI CTO";

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
    | "MD-GR1"
    | "EOS-S01"
    | "EOS-S02"
    | "EOS-S03",
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
 * Deterministic seed events through Foundation progression, before EOS-S01
 * commit/acceptance facts. Does not manufacture ACCEPTED events for B0/CT0–CT9.
 */
export function corpusSeedEventsThroughProgression(): ProgrammeEvent[] {
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
    envelope("EVT-SEED-GR1-IMPL", "SLICE_IMPLEMENTATION_OBSERVED", "MD-GR1", GR1_SEED_TIME, {
      summary: "Dependency semantics reconciled; Foundation slices remain unaccepted; production not authorised",
    }),
    envelope("EVT-SEED-GR1-REVIEW", "REVIEW_REQUESTED", "MD-GR1", GR1_SEED_TIME, {
      summary: "MD-GR1 in review; not accepted; production not authorised",
    }),
    envelope("EVT-SEED-GR1-EV-RECON", "EVIDENCE_ATTACHED", "MD-GR1", GR1_SEED_TIME, {
      evidence: {
        id: "EV-GR1-RECONCILIATION",
        kind: "DOCUMENT",
        uri: "docs/control/DEPENDENCY_SEMANTICS_RECONCILIATION.md",
        createdAt: GR1_SEED_TIME,
        sourceSystem: "programme-control",
        immutable: true,
        summary: "MD-GR1 dependency semantics reconciliation record",
      },
    }),
    envelope("EVT-SEED-GR1-EV-DEC", "EVIDENCE_ATTACHED", "MD-GR1", GR1_SEED_TIME, {
      evidence: {
        id: "EV-GR1-DECISION",
        kind: "DECISION",
        uri: "programme/decisions/DEC-MD-GR1-DEPENDENCY-SEMANTICS.yaml",
        createdAt: GR1_SEED_TIME,
        sourceSystem: "programme-control",
        immutable: true,
        summary: "DEC-MD-GR1-DEPENDENCY-SEMANTICS controlling decision",
      },
    }),
    envelope(
      "EVT-SEED-EOS-S01-EV-ENTRY",
      "EVIDENCE_ATTACHED",
      "EOS-S01",
      GR1_SEED_TIME,
      {
        evidence: {
          id: "EV-GR1-ENTRY-GATE",
          kind: "DOCUMENT",
          uri: "docs/control/EVENT_OS_ENTRY_GATE.md",
          createdAt: GR1_SEED_TIME,
          sourceSystem: "programme-control",
          immutable: true,
          summary: "Event OS entry gate: Foundation progression authorised; slices not accepted",
        },
      },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S01-EV-HV1",
      "EVIDENCE_ATTACHED",
      "EOS-S01",
      GR1_SEED_TIME,
      {
        evidence: {
          id: "EV-GR1-HUMAN-VERIFY",
          kind: "DOCUMENT",
          uri: "docs/control/HUMAN_LIVE_VERIFICATION.md",
          createdAt: GR1_SEED_TIME,
          sourceSystem: "programme-control",
          immutable: true,
          summary: "CEO human live verification PASS; not formal acceptance or production authorisation",
        },
      },
      "EVENT_OS",
    ),
    parseProgrammeEvent({
      eventId: "EVT-SEED-GR1-PROGRESSION-CT0-EOS-S01",
      eventType: "PROGRESSION_AUTHORISED",
      schemaVersion: 1,
      aggregateType: "programme",
      aggregateId: "MD-CT0->EOS-S01",
      product: "EVENT_OS",
      sliceId: "EOS-S01",
      occurredAt: GR1_SEED_TIME,
      recordedAt: GR1_SEED_TIME,
      actor: { id: "CEO", role: "CEO" },
      source: "ceo-progression-authorisation",
      idempotencyKey: "seed:EVT-SEED-GR1-PROGRESSION-CT0-EOS-S01",
      payload: {
        predecessorId: "MD-CT0",
        successorId: "EOS-S01",
        authorisedAt: GR1_SEED_TIME,
        authorisedBy: "CEO",
        authorityRole: "CEO",
        evidenceIds: [
          "EV-GR1-RECONCILIATION",
          "EV-GR1-DECISION",
          "EV-GR1-ENTRY-GATE",
          "EV-GR1-HUMAN-VERIFY",
        ],
        reason:
          "Foundation technically reviewed, closed out, live-deployed and CEO-verified; Event OS entry was authorised without formal Foundation acceptance; production remains unauthorised",
      },
    }),
  ];
}

function eosS01AcceptanceEvents(): ProgrammeEvent[] {
  return [
    envelope(
      "EVT-SEED-EOS-S01-COMMIT",
      "COMMIT_LINKED",
      "EOS-S01",
      EOS_S01_ACCEPT_TIME,
      { sha: EOS_S01_COMMIT },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S01-EV-COMMIT",
      "EVIDENCE_ATTACHED",
      "EOS-S01",
      EOS_S01_ACCEPT_TIME,
      {
        evidence: {
          id: EOS_S01_COMMIT_EVIDENCE_ID,
          kind: "COMMIT",
          uri: `git:${EOS_S01_COMMIT}`,
          createdAt: EOS_S01_ACCEPT_TIME,
          sourceSystem: "github",
          immutable: true,
          summary: `EOS-S01 implementation commit ${EOS_S01_COMMIT}`,
        },
      },
      "EVENT_OS",
    ),
    parseProgrammeEvent({
      eventId: EOS_S01_ACCEPTANCE_EVENT_ID,
      eventType: "ACCEPTANCE_RECORDED",
      schemaVersion: 1,
      aggregateType: "slice",
      aggregateId: "EOS-S01",
      product: "EVENT_OS",
      sliceId: "EOS-S01",
      occurredAt: EOS_S01_ACCEPT_TIME,
      recordedAt: EOS_S01_ACCEPT_TIME,
      actor: { id: "ai-cto", role: "REVIEWER" },
      source: "ai-cto-technical-acceptance",
      idempotencyKey: `seed:${EOS_S01_ACCEPTANCE_EVENT_ID}`,
      payload: {
        acceptedAt: EOS_S01_ACCEPT_TIME,
        acceptedBy: EOS_S01_REVIEWER,
        authorityRole: "REVIEWER",
      },
    }),
  ];
}

/**
 * EOS-S02 implementation evidence only. Does not record acceptance.
 */
function eosS02ImplementationEvents(): ProgrammeEvent[] {
  return [
    envelope(
      "EVT-SEED-EOS-S02-IMPL",
      "SLICE_IMPLEMENTATION_OBSERVED",
      "EOS-S02",
      EOS_S02_SEED_TIME,
      { summary: "Event OS guest intake and operational directory implemented; not accepted; production not authorised" },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S02-REVIEW",
      "REVIEW_REQUESTED",
      "EOS-S02",
      EOS_S02_SEED_TIME,
      { summary: "EOS-S02 in review; not accepted; production not authorised" },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S02-EV-IMPL",
      "EVIDENCE_ATTACHED",
      "EOS-S02",
      EOS_S02_SEED_TIME,
      {
        evidence: {
          id: "EV-EOS-S02-IMPL",
          kind: "DOCUMENT",
          uri: "docs/control/EOS_S02_IMPLEMENTATION_REPORT.md",
          createdAt: EOS_S02_SEED_TIME,
          sourceSystem: "programme-control",
          immutable: true,
          summary: "EOS-S02 guest intake and operational directory implementation report",
        },
      },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S02-EV-ARCH",
      "EVIDENCE_ATTACHED",
      "EOS-S02",
      EOS_S02_SEED_TIME,
      {
        evidence: {
          id: "EV-EOS-S02-ARCH",
          kind: "DOCUMENT",
          uri: "docs/control/EVENT_OS_GUEST_DIRECTORY.md",
          createdAt: EOS_S02_SEED_TIME,
          sourceSystem: "programme-control",
          immutable: true,
          summary: "EOS-S02 guest directory boundary and intake model",
        },
      },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S02-COMMIT",
      "COMMIT_LINKED",
      "EOS-S02",
      EOS_S02_COMMIT_TIME,
      { sha: EOS_S02_COMMIT },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S02-EV-COMMIT",
      "EVIDENCE_ATTACHED",
      "EOS-S02",
      EOS_S02_COMMIT_TIME,
      {
        evidence: {
          id: EOS_S02_COMMIT_EVIDENCE_ID,
          kind: "COMMIT",
          uri: `git:${EOS_S02_COMMIT}`,
          createdAt: EOS_S02_COMMIT_TIME,
          sourceSystem: "github",
          immutable: true,
          summary: `EOS-S02 implementation commit ${EOS_S02_COMMIT}`,
        },
      },
      "EVENT_OS",
    ),
  ];
}

function eosS02AcceptanceEvents(): ProgrammeEvent[] {
  return [
    parseProgrammeEvent({
      eventId: EOS_S02_ACCEPTANCE_EVENT_ID,
      eventType: "ACCEPTANCE_RECORDED",
      schemaVersion: 1,
      aggregateType: "slice",
      aggregateId: "EOS-S02",
      product: "EVENT_OS",
      sliceId: "EOS-S02",
      occurredAt: EOS_S02_ACCEPT_TIME,
      recordedAt: EOS_S02_ACCEPT_TIME,
      actor: { id: "ai-cto", role: "REVIEWER" },
      source: "ai-cto-technical-acceptance",
      idempotencyKey: `seed:${EOS_S02_ACCEPTANCE_EVENT_ID}`,
      payload: {
        acceptedAt: EOS_S02_ACCEPT_TIME,
        acceptedBy: EOS_S01_REVIEWER,
        authorityRole: "REVIEWER",
      },
    }),
  ];
}

function eosS03ImplementationEvents(): ProgrammeEvent[] {
  return [
    envelope(
      "EVT-SEED-EOS-S03-IMPL",
      "SLICE_IMPLEMENTATION_OBSERVED",
      "EOS-S03",
      EOS_S03_SEED_TIME,
      { summary: "Event OS RSVP and guest self-service implemented; not accepted; production not authorised" },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S03-REVIEW",
      "REVIEW_REQUESTED",
      "EOS-S03",
      EOS_S03_SEED_TIME,
      { summary: "EOS-S03 in review; not accepted; production not authorised" },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S03-EV-IMPL",
      "EVIDENCE_ATTACHED",
      "EOS-S03",
      EOS_S03_SEED_TIME,
      {
        evidence: {
          id: "EV-EOS-S03-IMPL",
          kind: "DOCUMENT",
          uri: "docs/control/EOS_S03_IMPLEMENTATION_REPORT.md",
          createdAt: EOS_S03_SEED_TIME,
          sourceSystem: "programme-control",
          immutable: true,
          summary: "EOS-S03 RSVP and guest self-service implementation report",
        },
      },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S03-EV-ARCH",
      "EVIDENCE_ATTACHED",
      "EOS-S03",
      EOS_S03_SEED_TIME,
      {
        evidence: {
          id: "EV-EOS-S03-ARCH",
          kind: "DOCUMENT",
          uri: "docs/control/EVENT_OS_RSVP_SELF_SERVICE.md",
          createdAt: EOS_S03_SEED_TIME,
          sourceSystem: "programme-control",
          immutable: true,
          summary: "EOS-S03 RSVP and guest self-service boundary",
        },
      },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S03-COMMIT",
      "COMMIT_LINKED",
      "EOS-S03",
      EOS_S03_COMMIT_TIME,
      { sha: EOS_S03_COMMIT },
      "EVENT_OS",
    ),
    envelope(
      "EVT-SEED-EOS-S03-EV-COMMIT",
      "EVIDENCE_ATTACHED",
      "EOS-S03",
      EOS_S03_COMMIT_TIME,
      {
        evidence: {
          id: EOS_S03_COMMIT_EVIDENCE_ID,
          kind: "COMMIT",
          uri: `git:${EOS_S03_COMMIT}`,
          createdAt: EOS_S03_COMMIT_TIME,
          sourceSystem: "github",
          immutable: true,
          summary: `EOS-S03 implementation commit ${EOS_S03_COMMIT}`,
        },
      },
      "EVENT_OS",
    ),
  ];
}

/**
 * Corpus through EOS-S02 implementation evidence, before EOS-S02 acceptance.
 * EOS-S01 is ACCEPTED. EOS-S02 remains IN_REVIEW. Foundation remains unaccepted.
 */
export function corpusSeedEventsThroughS02Implementation(): ProgrammeEvent[] {
  return [...corpusSeedEventsThroughProgression(), ...eosS01AcceptanceEvents(), ...eosS02ImplementationEvents()];
}

/**
 * Corpus through governed EOS-S02 acceptance, before EOS-S03 implementation.
 */
export function corpusSeedEventsThroughS02Acceptance(): ProgrammeEvent[] {
  return [...corpusSeedEventsThroughS02Implementation(), ...eosS02AcceptanceEvents()];
}

/**
 * Corpus through EOS-S03 implementation evidence. Does not record EOS-S03 acceptance.
 */
export function corpusSeedEventsThroughS03Implementation(): ProgrammeEvent[] {
  return [...corpusSeedEventsThroughS02Acceptance(), ...eosS03ImplementationEvents()];
}

/**
 * Full corpus seed, including governed EOS-S01 and EOS-S02 technical acceptance
 * and EOS-S03 implementation evidence. Does not manufacture ACCEPTED events for
 * Foundation slices or EOS-S03.
 */
export function corpusSeedEvents(): ProgrammeEvent[] {
  return corpusSeedEventsThroughS03Implementation();
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
