import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import { validateS05APersistedCollections } from "./eec-persistence.js";
import { S05AEvaluationMigrationReceiptSchema, type S05AEvaluationMigrationReceipt } from "./eec-evaluation-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S05A_EVALUATION_MIGRATION_ID = "EOS-S05A-EVALUATION-V4" as const;
export const EOS_S05A_EVALUATION_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05A_EVALUATION_MIGRATION_ID}:additive-evaluation-collections:legacy-incompatible`)
  .digest("hex");

export type S05AEvaluationMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: string[];
  receipt?: S05AEvaluationMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S05A_EVALUATION_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function migrateEosS05AEvaluationV4(input: PlatformSnapshot, now: string): S05AEvaluationMigrationResult {
  const snap = normalizeSnapshot(structuredClone(input));
  const existing = snap.s05aEvaluationMigrationReceipts.find((item) => item.migrationId === EOS_S05A_EVALUATION_MIGRATION_ID);
  if (existing) {
    return { status: "REPLAYED", snapshot: snap, created: existing.createdRecords, receipt: existing };
  }
  const created: string[] = [];
  const annotatedLegacyRunIds: string[] = [];
  for (const run of snap.aiEvaluationRuns) {
    const hasCaseResults = snap.aiEvaluationCaseResults.some((item) => item.runId === run.id);
    if (!hasCaseResults || !run.corpusHash || !run.evaluationContractVersion) {
      run.compatibilityStatus = "INCOMPATIBLE";
      run.version += 1;
      run.updatedAt = now;
      annotatedLegacyRunIds.push(run.id);
      created.push(`legacy-run:${run.id}`);
    }
  }
  const receipt = S05AEvaluationMigrationReceiptSchema.parse({
    id: deterministicUuid("evaluation-receipt-v4"),
    organisationId: snap.organisations[0]?.id,
    migrationId: EOS_S05A_EVALUATION_MIGRATION_ID,
    checksum: exactHash({ id: EOS_S05A_EVALUATION_MIGRATION_ID, created, annotatedLegacyRunIds }),
    status: "APPLIED",
    createdRecords: created,
    annotatedLegacyRunIds,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  snap.s05aEvaluationMigrationReceipts.push(receipt);
  try {
    validateS05APersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: input,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid migrated snapshot" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created, receipt };
}
