import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import { validateS05BPersistedCollections } from "./risk-persistence.js";
import { RiskCheckpointTemplateSchema, S05BMigrationReceiptSchema, type S05BMigrationReceipt } from "./risk-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S05B_MIGRATION_ID = "EOS-S05B-PROTECTION-V1" as const;
export const EOS_S05B_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05B_MIGRATION_ID}:additive-risk-protection-collections:synthetic-checkpoint-templates`)
  .digest("hex");
export const EOS_S05B_PROTECTION_V3_ID = "EOS-S05B-PROTECTION-V3" as const;
export const EOS_S05B_PROTECTION_V3_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05B_PROTECTION_V3_ID}:working-edition-publication-separation:backfill-current-publications`)
  .digest("hex");

export type S05BMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  receipt?: S05BMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S05B_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function migrateEosS05B(snapshot: PlatformSnapshot, now = "2026-09-10T09:00:00.000Z"): S05BMigrationResult {
  const original = normalizeSnapshot(snapshot);
  try {
    validateS05BPersistedCollections(original);
  } catch (error) {
    return { status: "FAILED", snapshot: original, error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" } };
  }
  const existing = original.s05bMigrationReceipts.find((item) => item.migrationId === EOS_S05B_MIGRATION_ID && item.status === "APPLIED");
  if (existing) {
    return migrateEosS05BPublicationModel(original, now, { status: "REPLAYED", receipt: existing });
  }
  const snap = structuredClone(original);
  const orgId = snap.organisations[0]?.id;
  let createdTemplates = 0;
  if (orgId) {
    for (const offsetHours of [72, 24, 6]) {
      const id = deterministicUuid(`checkpoint-${orgId}-${offsetHours}`);
      if (snap.riskCheckpointTemplates.some((item) => item.id === id)) continue;
      snap.riskCheckpointTemplates.push(
        RiskCheckpointTemplateSchema.parse({
          id,
          organisationId: orgId,
          offsetHours,
          title: `${offsetHours}h checkpoint template`,
          requiredEvidence: "Vendor confirmation of readiness. This template is an approved starting edition, not universal law.",
          status: "APPROVED",
          createdByPersonId: snap.persons[0]?.id ?? deterministicUuid("system"),
          schemaVersion: SCHEMA_VERSION,
          version: 1,
          createdAt: now,
          updatedAt: now,
          nonProductionFixture: true,
        }),
      );
      createdTemplates += 1;
    }
  }
  const receipt = S05BMigrationReceiptSchema.parse({
    id: deterministicUuid("receipt"),
    organisationId: orgId,
    migrationId: EOS_S05B_MIGRATION_ID,
    checksum: EOS_S05B_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: { riskCheckpointTemplates: createdTemplates },
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
    nonProductionFixture: true,
  });
  snap.s05bMigrationReceipts.push(receipt);
  validateS05BPersistedCollections(snap);
  return migrateEosS05BPublicationModel(snap, now, { status: "APPLIED", receipt });
}

export function migrateEosS05BPublicationModel(
  snapshot: PlatformSnapshot,
  now = "2026-09-10T09:00:00.000Z",
  prior?: { status: "APPLIED" | "REPLAYED"; receipt?: S05BMigrationReceipt },
): S05BMigrationResult {
  const snap = structuredClone(snapshot);
  const existing = snap.s05bMigrationReceipts.find((item) => item.migrationId === EOS_S05B_PROTECTION_V3_ID && item.status === "APPLIED");
  if (existing) {
    return { status: prior?.status ?? "REPLAYED", snapshot: snap, receipt: prior?.receipt ?? existing };
  }
  let createdPublications = 0;
  for (const edition of snap.riskDossierEditions) {
    if (!edition.authorPersonId) edition.authorPersonId = edition.submittedByPersonId;
    if (!edition.versionNumber) {
      const peers = snap.riskDossierEditions.filter((item) => item.eventId === edition.eventId);
      edition.versionNumber = peers.findIndex((item) => item.id === edition.id) + 1;
    }
    if (edition.status === "PUBLISHED" && !edition.approvedHash) edition.approvedHash = edition.contentHash;
    const hasPublication = snap.riskDossierPublications.some(
      (item) => item.dossierId === edition.id || item.editionId === edition.id,
    );
    if (edition.status === "PUBLISHED" && !hasPublication) {
      const publicationNumber = snap.riskDossierPublications.filter((item) => item.eventId === edition.eventId).length + 1;
      snap.riskDossierPublications.push({
        id: deterministicUuid(`publication-${edition.id}`),
        organisationId: edition.organisationId,
        eventId: edition.eventId,
        dossierId: edition.id,
        editionId: edition.id,
        contentHash: edition.contentHash,
        approvedHash: edition.contentHash,
        publicationNumber,
        status: edition.current ? "CURRENT" : "SUPERSEDED",
        publishedAt: edition.publishedAt ?? edition.updatedAt,
        publishedByPersonId: edition.publishedByPersonId ?? edition.approvedByPersonId ?? edition.submittedByPersonId,
        current: Boolean(edition.current),
        dispatched: false,
        clientMessages: [],
        schemaVersion: edition.schemaVersion,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      createdPublications += 1;
    }
  }
  for (const publication of snap.riskDossierPublications) {
    if (!publication.status) publication.status = publication.current ? "CURRENT" : "SUPERSEDED";
    if (!publication.contentHash) publication.contentHash = publication.approvedHash;
    if (!publication.editionId) publication.editionId = publication.dossierId;
  }
  const receipt = S05BMigrationReceiptSchema.parse({
    id: deterministicUuid("receipt-v3"),
    organisationId: snap.organisations[0]?.id,
    migrationId: EOS_S05B_PROTECTION_V3_ID,
    checksum: EOS_S05B_PROTECTION_V3_CHECKSUM,
    status: "APPLIED",
    createdRecords: { riskDossierPublications: createdPublications },
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
    nonProductionFixture: true,
  });
  snap.s05bMigrationReceipts.push(receipt);
  validateS05BPersistedCollections(snap);
  return { status: prior?.status ?? "APPLIED", snapshot: snap, receipt: prior?.receipt ?? receipt };
}

export function s05bMigrationIdentityHash(): string {
  return exactHash({ id: EOS_S05B_MIGRATION_ID, checksum: EOS_S05B_MIGRATION_CHECKSUM });
}
