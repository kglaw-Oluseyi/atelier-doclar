export const PLATFORM_ERROR_CODES = [
  "AUTH_REQUIRED",
  "ACCESS_PENDING",
  "FORBIDDEN",
  "SCOPE_MISMATCH",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "VERSION_CONFLICT",
  "TRANSITION_INVALID",
  "ADOPTION_MISMATCH",
  "SEATING_VALIDATION_REJECTED",
  "SEAT_CAPACITY_MISMATCH",
  "IDEMPOTENCY_CONFLICT",
  "DEPENDENCY_UNAVAILABLE",
  "CAPABILITY_NOT_ENABLED",
  "PRODUCTION_ADAPTER_FORBIDDEN",
  "FIXTURE_FORBIDDEN",
  "AI_AUTHORITY_FORBIDDEN",
  "INTERNAL_ERROR",
] as const;

export type PlatformErrorCode = (typeof PLATFORM_ERROR_CODES)[number];

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly field?: string;
  readonly publicMessage: string;
  readonly details?: readonly string[];

  constructor(
    code: PlatformErrorCode,
    message: string,
    options?: { field?: string; publicMessage?: string; details?: readonly string[] },
  ) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.field = options?.field;
    this.publicMessage = options?.publicMessage ?? publicMessageFor(code);
    this.details = options?.details;
  }
}

export function publicMessageFor(code: PlatformErrorCode): string {
  switch (code) {
    case "AUTH_REQUIRED":
      return "Sign in is required.";
    case "ACCESS_PENDING":
      return "Your identity is recognised. An assignment is required before you can continue.";
    case "FORBIDDEN":
      return "You do not have permission to perform this action.";
    case "SCOPE_MISMATCH":
      return "The requested record is not available in this scope.";
    case "NOT_FOUND":
      return "The requested record was not found.";
    case "VALIDATION_FAILED":
      return "The submitted information is not valid.";
    case "VERSION_CONFLICT":
      return "This record changed while you were editing. Reload before saving.";
    case "TRANSITION_INVALID":
      return "That phase change is not permitted.";
    case "ADOPTION_MISMATCH":
      return "The seating run could not be adopted because validation no longer matches.";
    case "SEATING_VALIDATION_REJECTED":
      return "This seating change was rejected by the independent validator.";
    case "SEAT_CAPACITY_MISMATCH":
      return "Physical seat count and declared capacity disagree. Correct the layout before freezing a seating package.";
    case "IDEMPOTENCY_CONFLICT":
      return "This request was already processed with different information.";
    case "DEPENDENCY_UNAVAILABLE":
      return "A required service is unavailable.";
    case "CAPABILITY_NOT_ENABLED":
      return "This capability is not enabled in the Event OS foundation.";
    case "PRODUCTION_ADAPTER_FORBIDDEN":
      return "The non-production identity adapter cannot be used here.";
    case "FIXTURE_FORBIDDEN":
      return "Fixture records are not available in this environment.";
    case "AI_AUTHORITY_FORBIDDEN":
      return "A human authority is required for this action.";
    default:
      return "The request could not be completed.";
  }
}
