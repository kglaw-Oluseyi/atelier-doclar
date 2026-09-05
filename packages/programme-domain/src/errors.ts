export const VALIDATION_ERROR_CODES = [
  "SCHEMA_INVALID",
  "REFERENCE_NOT_FOUND",
  "DUPLICATE_ID",
  "DEPENDENCY_CYCLE",
  "ACCEPTANCE_EVIDENCE_MISSING",
  "MAPPING_INCONSISTENT",
  "DUPLICATE_EDGE",
  "INVALID_IDENTITY",
] as const;

export type ValidationErrorCode = (typeof VALIDATION_ERROR_CODES)[number];

export const ENTITY_TYPES = [
  "product",
  "phase",
  "slice_manifest",
  "slice_record",
  "open_item",
  "gate",
  "dependency",
  "evidence",
  "decision",
  "approval",
  "check",
  "timeline_event",
  "programme_snapshot",
  "programme",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export interface ProgrammeValidationError {
  code: ValidationErrorCode;
  entityType: EntityType;
  entityId?: string;
  field?: string;
  value?: string;
  message: string;
  sourceFile?: string;
}

export function validationError(
  input: ProgrammeValidationError,
): ProgrammeValidationError {
  const error: ProgrammeValidationError = {
    code: input.code,
    entityType: input.entityType,
    message: input.message,
  };
  if (input.entityId !== undefined) error.entityId = input.entityId;
  if (input.field !== undefined) error.field = input.field;
  if (input.value !== undefined) error.value = input.value;
  if (input.sourceFile !== undefined) error.sourceFile = input.sourceFile;
  return error;
}

export function compareErrors(
  a: ProgrammeValidationError,
  b: ProgrammeValidationError,
): number {
  return (
    a.code.localeCompare(b.code) ||
    a.entityType.localeCompare(b.entityType) ||
    (a.entityId ?? "").localeCompare(b.entityId ?? "") ||
    (a.field ?? "").localeCompare(b.field ?? "") ||
    (a.sourceFile ?? "").localeCompare(b.sourceFile ?? "") ||
    a.message.localeCompare(b.message)
  );
}

export function formatError(error: ProgrammeValidationError): string {
  const parts = [
    error.code,
    error.entityType,
    error.entityId ?? "-",
    error.field ?? "-",
    error.value ?? "-",
    error.message,
  ];
  if (error.sourceFile) parts.push(error.sourceFile);
  return parts.join(" | ");
}

export function formatCyclePath(path: string[]): string {
  return path.join(" → ");
}
