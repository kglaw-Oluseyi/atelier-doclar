export const EVENT_ERROR_CODES = [
  "SCHEMA_INVALID",
  "UNKNOWN_EVENT_TYPE",
  "UNSUPPORTED_EVENT_VERSION",
  "STALE_REVISION",
  "EVENT_IDENTITY_CONFLICT",
  "SNAPSHOT_EXISTS",
  "UNKNOWN_SNAPSHOT",
  "IMMUTABLE_EVENT",
] as const;

export type EventErrorCode = (typeof EVENT_ERROR_CODES)[number];

export class ProgrammeEventError extends Error {
  readonly code: EventErrorCode;
  readonly field?: string;
  readonly value?: string;

  constructor(code: EventErrorCode, message: string, field?: string, value?: string) {
    super(message);
    this.name = "ProgrammeEventError";
    this.code = code;
    if (field !== undefined) this.field = field;
    if (value !== undefined) this.value = value;
  }
}
