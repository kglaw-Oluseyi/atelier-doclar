import { validationError, type ProgrammeValidationError } from "./errors.js";
import type { SliceManifest, SliceRecord, WorkStatus, EvidenceRef } from "./schemas.js";

export interface OperationalState {
  status: WorkStatus;
  commits: string[];
  evidence: EvidenceRef[];
  openItems: string[];
  acceptedAt?: string;
  acceptedBy?: string;
  updatedAt: string;
  version: string;
}

const PLANNING_FIELDS = [
  "id",
  "product",
  "title",
  "phaseId",
  "order",
  "outcome",
] as const;

function sameStringList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

/**
 * Project a SliceRecord from a valid manifest plus explicit operational state.
 * Verification remains declaration-only and is never copied onto the record.
 */
export function projectSliceRecord(
  manifest: SliceManifest,
  operational: OperationalState,
): SliceRecord {
  const record: SliceRecord = {
    id: manifest.id,
    product: manifest.product,
    title: manifest.title,
    phaseId: manifest.phaseId,
    order: manifest.order,
    status: operational.status,
    dependsOn: [...manifest.dependsOn],
    canonicalRefs: [...manifest.canonicalRefs],
    outcome: manifest.outcome,
    entryCriteria: [...manifest.entryCriteria],
    exitCriteria: [...manifest.exitCriteria],
    expectedFiles: [...manifest.expectedFiles],
    commits: [...operational.commits],
    evidence: operational.evidence.map((item) => ({ ...item })),
    openItems: [...operational.openItems],
    updatedAt: operational.updatedAt,
    version: operational.version,
  };
  if (operational.acceptedAt !== undefined) record.acceptedAt = operational.acceptedAt;
  if (operational.acceptedBy !== undefined) record.acceptedBy = operational.acceptedBy;
  return record;
}

export function emptyOperationalState(input: {
  updatedAt: string;
  version: string;
  status?: WorkStatus;
}): OperationalState {
  return {
    status: input.status ?? "NOT_STARTED",
    commits: [],
    evidence: [],
    openItems: [],
    updatedAt: input.updatedAt,
    version: input.version,
  };
}

export function assertMappingConsistency(
  manifest: SliceManifest,
  record: SliceRecord,
  sourceFile?: string,
): ProgrammeValidationError[] {
  const errors: ProgrammeValidationError[] = [];

  for (const field of PLANNING_FIELDS) {
    if (manifest[field] !== record[field]) {
      errors.push(
        validationError({
          code: "MAPPING_INCONSISTENT",
          entityType: "slice_record",
          entityId: record.id,
          field,
          value: String(record[field]),
          message: `projection ${field} does not match manifest declaration`,
          sourceFile,
        }),
      );
    }
  }

  const listFields = [
    ["dependsOn", manifest.dependsOn, record.dependsOn],
    ["canonicalRefs", manifest.canonicalRefs, record.canonicalRefs],
    ["entryCriteria", manifest.entryCriteria, record.entryCriteria],
    ["exitCriteria", manifest.exitCriteria, record.exitCriteria],
    ["expectedFiles", manifest.expectedFiles, record.expectedFiles],
  ] as const;

  for (const [field, declared, projected] of listFields) {
    if (!sameStringList(declared, projected)) {
      errors.push(
        validationError({
          code: "MAPPING_INCONSISTENT",
          entityType: "slice_record",
          entityId: record.id,
          field,
          message: `projection ${field} does not match manifest declaration`,
          sourceFile,
        }),
      );
    }
  }

  if ("verification" in record) {
    errors.push(
      validationError({
        code: "MAPPING_INCONSISTENT",
        entityType: "slice_record",
        entityId: record.id,
        field: "verification",
        message: "verification is declaration-only and must not appear on SliceRecord",
        sourceFile,
      }),
    );
  }

  return errors;
}

export function assertManifestParity(
  left: SliceManifest,
  right: SliceManifest,
  leftSource: string,
  rightSource: string,
): ProgrammeValidationError[] {
  const projected = projectSliceRecord(
    right,
    emptyOperationalState({ updatedAt: "2020-01-01T00:00:00Z", version: "parity" }),
  );
  const kindsLeft = JSON.stringify(left.dependencyKinds ?? {});
  const kindsRight = JSON.stringify(right.dependencyKinds ?? {});
  if (kindsLeft !== kindsRight) {
    return [
      validationError({
        code: "MAPPING_INCONSISTENT",
        entityType: "slice_manifest",
        entityId: left.id,
        field: "dependencyKinds",
        message: "YAML/catalog declaration mismatch: dependencyKinds must be identical",
        sourceFile: `${leftSource} ↔ ${rightSource}`,
      }),
    ];
  }
  const base = assertMappingConsistency(left, projected, rightSource);
  return base.map((error) =>
    validationError({
      ...error,
      entityType: "slice_manifest",
      sourceFile: `${leftSource} ↔ ${rightSource}`,
      message: `YAML/catalog declaration mismatch: ${error.message}`,
    }),
  );
}
