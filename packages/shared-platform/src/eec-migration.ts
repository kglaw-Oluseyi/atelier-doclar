import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { SYNTHETIC_EVENT_TYPES } from "./eec-coverage.js";
import { exactHash } from "./eec-hash.js";
import { validateS05APersistedCollections } from "./eec-persistence.js";
import type { CoverageCatalogueEdition, CoverageRequirement, S05AMigrationReceipt } from "./eec-schemas.js";
import type { S05AIntelligenceReceipt } from "./eec-intelligence-schemas.js";
import { seedBudgetCatalogueOnSnap } from "./eec-intelligence.js";
import { applyQuantityRulesToCatalogue, retireUnsupportedRulePricesOnSnap, seedBudgetKnowledgeOnSnap } from "./eec-s05a-depth.js";
import { seedCalendarDefinitionOnSnap } from "./eec-s05a-completion.js";
import { migrateEosS05AEvaluationV4 } from "./eec-evaluation-migration.js";
import { resolveArtefactDisclosureClass } from "./eec-discovery-disclosure.js";
import { exactHash as intelligenceHash } from "./eec-hash.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S05A_MIGRATION_ID = "EOS-S05A-DISCOVERY-V1" as const;
export const EOS_S05A_INTELLIGENCE_MIGRATION_ID = "EOS-S05A-INTELLIGENCE-V1" as const;
export const EOS_S05A_INTELLIGENCE_V2_MIGRATION_ID = "EOS-S05A-INTELLIGENCE-V2" as const;
export const EOS_S05A_INTELLIGENCE_V3_MIGRATION_ID = "EOS-S05A-INTELLIGENCE-V3" as const;
export const EOS_S05A_DISCLOSURE_V5_MIGRATION_ID = "EOS-S05A-DISCLOSURE-V5" as const;
export { EOS_S05A_EVALUATION_MIGRATION_ID } from "./eec-evaluation-migration.js";
export const EOS_S05A_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05A_MIGRATION_ID}:additive-discovery-collections:synthetic-coverage-catalogue`)
  .digest("hex");

export type S05AMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S05AMigrationReceipt["createdRecords"];
  receipt?: S05AMigrationReceipt;
  error?: { code: string; message: string };
};

export type S05AIntelligenceMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S05AIntelligenceReceipt["createdRecords"];
  receipt?: S05AIntelligenceReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S05A_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
    nonProductionFixture: true as const,
  };
}

const REQUIREMENT_SEEDS: Array<{
  topicKey: string;
  title: string;
  purpose: string;
  omissionRisk: "LOW" | "MEDIUM" | "HIGH";
  overlays: readonly string[];
  sensitivity: CoverageRequirement["sensitivity"];
  confirmationRequired: boolean;
  earliest: CoverageRequirement["earliestPhase"];
  latest: CoverageRequirement["latestSafePhase"];
  gate: CoverageRequirement["completenessGate"];
}> = [
  {
    topicKey: "event.purpose",
    title: "Event in the client's words",
    purpose: "Capture why the gathering exists before operational assumptions harden.",
    omissionRisk: "HIGH",
    overlays: SYNTHETIC_EVENT_TYPES,
    sensitivity: "STANDARD",
    confirmationRequired: true,
    earliest: "FIRST_CONTACT",
    latest: "DISCOVERY",
    gate: "INDICATIVE",
  },
  {
    topicKey: "event.date",
    title: "Known or intended date",
    purpose: "Date drives venue, roadmap and investment windows.",
    omissionRisk: "HIGH",
    overlays: SYNTHETIC_EVENT_TYPES,
    sensitivity: "STANDARD",
    confirmationRequired: true,
    earliest: "FIRST_CONTACT",
    latest: "WORKING_BRIEF",
    gate: "WORKING",
  },
  {
    topicKey: "guest.target_count",
    title: "Preferred guest target",
    purpose: "Target count is distinct from a hard maximum.",
    omissionRisk: "HIGH",
    overlays: SYNTHETIC_EVENT_TYPES,
    sensitivity: "STANDARD",
    confirmationRequired: true,
    earliest: "DISCOVERY",
    latest: "WORKING_BRIEF",
    gate: "WORKING",
  },
  {
    topicKey: "investment.envelope",
    title: "Investment envelope meaning",
    purpose: "Record what the client wishes to invest without inferring wealth.",
    omissionRisk: "HIGH",
    overlays: SYNTHETIC_EVENT_TYPES,
    sensitivity: "FINANCIAL",
    confirmationRequired: true,
    earliest: "DISCOVERY",
    latest: "APPROVED_BRIEF",
    gate: "APPROVED",
  },
  {
    topicKey: "culture.protocol",
    title: "Cultural or protocol requirements",
    purpose: "Ask only when applicable; never infer from name or location.",
    omissionRisk: "MEDIUM",
    overlays: ["WEDDING", "CHIEFTAINCY", "FUNERAL_MEMORIAL", "DESTINATION"],
    sensitivity: "CULTURAL_RELIGIOUS",
    confirmationRequired: true,
    earliest: "DISCOVERY",
    latest: "WORKING_BRIEF",
    gate: "WORKING",
  },
  {
    topicKey: "access.security",
    title: "Access and confidentiality",
    purpose: "Security questions must explain why they matter.",
    omissionRisk: "MEDIUM",
    overlays: ["CORPORATE", "CHIEFTAINCY", "DESTINATION"],
    sensitivity: "SECURITY",
    confirmationRequired: true,
    earliest: "DISCOVERY",
    latest: "APPROVED_BRIEF",
    gate: "APPROVED",
  },
];

function seedCatalogue(organisationId: string, now: string): {
  edition: CoverageCatalogueEdition;
  requirements: CoverageRequirement[];
} {
  const editionId = deterministicUuid(`catalogue:${organisationId}`);
  const requirements: CoverageRequirement[] = REQUIREMENT_SEEDS.map((seed) => ({
    id: deterministicUuid(`requirement:${organisationId}:${seed.topicKey}`),
    catalogueEditionId: editionId,
    topicKey: seed.topicKey,
    title: seed.title,
    purpose: seed.purpose,
    omissionRisk: seed.omissionRisk,
    applicability:
      seed.overlays.length === SYNTHETIC_EVENT_TYPES.length
        ? { kind: "ALWAYS" as const }
        : { kind: "EVENT_TYPE_IN" as const, values: [...seed.overlays] },
    acceptableEvidence: ["STAFF_NOTE", "TRANSCRIPT", "APPROVED_MESSAGE_INTAKE"],
    confirmationRequired: seed.confirmationRequired,
    sensitivity: seed.sensitivity,
    earliestPhase: seed.earliest,
    latestSafePhase: seed.latest,
    completenessGate: seed.gate,
    eventTypeOverlays: [...seed.overlays],
    organisationId,
    ...versioned(now),
  }));
  const edition: CoverageCatalogueEdition = {
    id: editionId,
    editionLabel: "synthetic-coverage-v1",
    current: true,
    contentHash: exactHash(requirements.map((item) => item.topicKey)),
    organisationId,
    ...versioned(now),
  };
  return { edition, requirements };
}

export function migrateEosS05A(input: PlatformSnapshot, now: string): S05AMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS05APersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s05aMigrationReceipts.find(
    (item) => item.migrationId === EOS_S05A_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  const created: string[] = [];
  for (const organisation of snap.organisations) {
    if (snap.coverageCatalogueEditions.some((item) => item.organisationId === organisation.id && item.current)) {
      continue;
    }
    const seeded = seedCatalogue(organisation.id, now);
    snap.coverageCatalogueEditions.push(seeded.edition);
    snap.coverageRequirements.push(...seeded.requirements);
    created.push(seeded.edition.id, ...seeded.requirements.map((item) => item.id));
  }
  const receipt: S05AMigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S05A_MIGRATION_ID,
    checksum: EOS_S05A_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: created,
    notes: [{ code: "SYNTHETIC_CATALOGUE_ONLY", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    ...versioned(now),
  };
  snap.s05aMigrationReceipts.push(receipt);
  try {
    validateS05APersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid migrated snapshot" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function migrateEosS05AIntelligence(input: PlatformSnapshot, now: string): S05AIntelligenceMigrationResult {
  const snap = normalizeSnapshot(structuredClone(input));
  const existing = snap.s05aIntelligenceReceipts.find((item) => item.migrationId === EOS_S05A_INTELLIGENCE_MIGRATION_ID);
  if (existing) {
    return { status: "REPLAYED", snapshot: snap, created: existing.createdRecords, receipt: existing };
  }
  const created: string[] = [];
  for (const organisation of snap.organisations) {
    seedBudgetCatalogueOnSnap(snap, organisation.id, now);
    created.push(`taxonomy:${organisation.id}`);
  }
  const receipt = {
    id: deterministicUuid("intelligence-receipt"),
    organisationId: snap.organisations[0]?.id ?? "00000000-0000-4000-8000-000000000001",
    migrationId: EOS_S05A_INTELLIGENCE_MIGRATION_ID,
    checksum: intelligenceHash({ id: EOS_S05A_INTELLIGENCE_MIGRATION_ID, created }),
    status: "APPLIED" as const,
    createdRecords: created,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.s05aIntelligenceReceipts.push(receipt);
  validateS05APersistedCollections(snap);
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function migrateEosS05AIntelligenceV2(input: PlatformSnapshot, now: string): S05AIntelligenceMigrationResult {
  const snap = normalizeSnapshot(structuredClone(input));
  const existing = snap.s05aIntelligenceReceipts.find((item) => item.migrationId === EOS_S05A_INTELLIGENCE_V2_MIGRATION_ID);
  if (existing) {
    return { status: "REPLAYED", snapshot: snap, created: existing.createdRecords, receipt: existing };
  }
  const created: string[] = [];
  for (const organisation of snap.organisations) {
    seedBudgetCatalogueOnSnap(snap, organisation.id, now);
    applyQuantityRulesToCatalogue(snap, organisation.id, now);
    retireUnsupportedRulePricesOnSnap(snap, organisation.id, now);
    seedBudgetKnowledgeOnSnap(snap, organisation.id, now);
    created.push(`knowledge:${organisation.id}`);
  }
  const receipt = {
    id: deterministicUuid("intelligence-receipt-v2"),
    organisationId: snap.organisations[0]?.id ?? "00000000-0000-4000-8000-000000000001",
    migrationId: EOS_S05A_INTELLIGENCE_V2_MIGRATION_ID,
    checksum: intelligenceHash({ id: EOS_S05A_INTELLIGENCE_V2_MIGRATION_ID, created }),
    status: "APPLIED" as const,
    createdRecords: created,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.s05aIntelligenceReceipts.push(receipt);
  validateS05APersistedCollections(snap);
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function migrateEosS05AIntelligenceV3(input: PlatformSnapshot, now: string): S05AIntelligenceMigrationResult {
  const snap = normalizeSnapshot(structuredClone(input));
  const existing = snap.s05aIntelligenceReceipts.find((item) => item.migrationId === EOS_S05A_INTELLIGENCE_V3_MIGRATION_ID);
  if (existing) {
    return { status: "REPLAYED", snapshot: snap, created: existing.createdRecords, receipt: existing };
  }
  const created: string[] = [];
  for (const organisation of snap.organisations) {
    seedCalendarDefinitionOnSnap(snap, organisation.id, now);
    created.push(`calendar:${organisation.id}`);
  }
  const receipt = {
    id: deterministicUuid("intelligence-receipt-v3"),
    organisationId: snap.organisations[0]?.id ?? "00000000-0000-4000-8000-000000000001",
    migrationId: EOS_S05A_INTELLIGENCE_V3_MIGRATION_ID,
    checksum: intelligenceHash({ id: EOS_S05A_INTELLIGENCE_V3_MIGRATION_ID, created }),
    status: "APPLIED" as const,
    createdRecords: created,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.s05aIntelligenceReceipts.push(receipt);
  validateS05APersistedCollections(snap);
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function migrateEosS05ADisclosureV5(input: PlatformSnapshot, now: string): S05AIntelligenceMigrationResult {
  const snap = normalizeSnapshot(structuredClone(input));
  const existing = snap.s05aIntelligenceReceipts.find((item) => item.migrationId === EOS_S05A_DISCLOSURE_V5_MIGRATION_ID);
  if (existing) {
    return { status: "REPLAYED", snapshot: snap, created: existing.createdRecords, receipt: existing };
  }
  const created: string[] = [];
  for (const artefact of snap.sourceArtefacts) {
    if (artefact.disclosureClass) continue;
    const segments = snap.sourceSegments.filter((item) => item.artefactId === artefact.id);
    const assertions = snap.candidateAssertions.filter((item) => item.engagementId === artefact.engagementId);
    artefact.disclosureClass = resolveArtefactDisclosureClass(artefact, assertions, segments);
    artefact.disclosureBackfillRule = "ASSERTION_SENSITIVITY_ELSE_OPERATIONAL";
    artefact.version += 1;
    artefact.updatedAt = now;
    created.push(`disclosure:${artefact.id}:${artefact.disclosureClass}`);
  }
  const receipt = {
    id: deterministicUuid("disclosure-receipt-v5"),
    organisationId: snap.organisations[0]?.id ?? "00000000-0000-4000-8000-000000000001",
    migrationId: EOS_S05A_DISCLOSURE_V5_MIGRATION_ID,
    checksum: intelligenceHash({ id: EOS_S05A_DISCLOSURE_V5_MIGRATION_ID, created }),
    status: "APPLIED" as const,
    createdRecords: created,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.s05aIntelligenceReceipts.push(receipt);
  validateS05APersistedCollections(snap);
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function applyEosS05AToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS05ADisclosureV5(
    migrateEosS05AEvaluationV4(
      migrateEosS05AIntelligenceV3(
        migrateEosS05AIntelligenceV2(migrateEosS05AIntelligence(migrateEosS05A(snap, now).snapshot, now).snapshot, now).snapshot,
        now,
      ).snapshot,
      now,
    ).snapshot,
    now,
  ).snapshot;
}

export function rollbackEosS05A(input: PlatformSnapshot, now: string): S05AMigrationResult {
  return {
    status: "FAILED",
    snapshot: input,
    created: [],
    error: { code: "VALIDATION_FAILED", message: `destructive rollback is not authorised at ${now}` },
  };
}
