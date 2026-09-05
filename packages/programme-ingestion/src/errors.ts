export const INGESTION_FAILURE_CODES = [
  "INVALID_SIGNATURE",
  "MISSING_SIGNATURE",
  "MALFORMED_SIGNATURE",
  "REPLAY",
  "UNAUTHORISED_REPOSITORY",
  "UNAUTHORISED_REF",
  "UNSUPPORTED_EVENT",
  "MALFORMED_PAYLOAD",
  "UNKNOWN_SLICE",
  "METADATA_CONFLICT",
  "UNKNOWN_COMMIT",
  "CI_LINKAGE_FAILURE",
  "UNRECOGNISED_WORKFLOW",
  "PROVIDER_UNAVAILABLE",
  "RATE_LIMITED",
  "RECONCILIATION_INCOMPLETE",
  "LIVE_MODE_DISABLED",
] as const;

export type IngestionFailureCode = (typeof INGESTION_FAILURE_CODES)[number];

export const TRANSIENT_FAILURE_CODES: ReadonlySet<IngestionFailureCode> = new Set([
  "PROVIDER_UNAVAILABLE",
  "RATE_LIMITED",
  "RECONCILIATION_INCOMPLETE",
]);

export function isTransientFailure(code: IngestionFailureCode): boolean {
  return TRANSIENT_FAILURE_CODES.has(code);
}

export class IngestionError extends Error {
  readonly code: IngestionFailureCode;
  readonly retryable: boolean;
  readonly field?: string;
  readonly value?: string;

  constructor(code: IngestionFailureCode, message: string, field?: string, value?: string) {
    super(message);
    this.name = "IngestionError";
    this.code = code;
    this.retryable = isTransientFailure(code);
    if (field !== undefined) this.field = field;
    if (value !== undefined) this.value = value;
  }
}
