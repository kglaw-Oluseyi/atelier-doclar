import { PLATFORM_ERROR_CODES, PlatformError, type PlatformErrorCode } from "@maison-doclar/shared-platform";

export const OPERATIONAL_STATE_KINDS = [
  "loading",
  "refreshing",
  "empty",
  "partial",
  "stale",
  "forbidden",
  "not_found",
  "validation",
  "server_failure",
  "postgres_unavailable",
  "readiness_unavailable",
  "conflict",
  "invalid_transition",
  "duplicate",
  "success",
  "retry",
  "session_expired",
  "assignment_revoked",
  "permission_changed",
] as const;

export type OperationalStateKind = (typeof OPERATIONAL_STATE_KINDS)[number];

export interface OperationalStateView {
  kind: OperationalStateKind;
  code?: PlatformErrorCode | "SUCCESS" | "EMPTY" | "PARTIAL" | "STALE" | "LOADING" | "REFRESHING";
  title: string;
  whatHappened: string;
  dataChanged: "yes" | "no" | "unknown" | "not_applicable";
  nextStep: string;
  retrySafe: boolean;
  message?: string;
  tone: "ok" | "warn" | "danger" | "brass";
  live: "assertive" | "polite" | "off";
}

const KIND_BY_CODE: Record<PlatformErrorCode, OperationalStateKind> = {
  AUTH_REQUIRED: "session_expired",
  ACCESS_PENDING: "assignment_revoked",
  FORBIDDEN: "forbidden",
  SCOPE_MISMATCH: "not_found",
  NOT_FOUND: "not_found",
  VALIDATION_FAILED: "validation",
  VERSION_CONFLICT: "conflict",
  TRANSITION_INVALID: "invalid_transition",
  IDEMPOTENCY_CONFLICT: "duplicate",
  DEPENDENCY_UNAVAILABLE: "postgres_unavailable",
  CAPABILITY_NOT_ENABLED: "readiness_unavailable",
  PRODUCTION_ADAPTER_FORBIDDEN: "forbidden",
  FIXTURE_FORBIDDEN: "forbidden",
  AI_AUTHORITY_FORBIDDEN: "forbidden",
  INTERNAL_ERROR: "server_failure",
};

export function isPlatformErrorCode(value: string | undefined): value is PlatformErrorCode {
  return Boolean(value && (PLATFORM_ERROR_CODES as readonly string[]).includes(value));
}

function isPlatformErrorLike(error: unknown): error is PlatformError {
  if (error instanceof PlatformError) return true;
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && isPlatformErrorCode(code);
}

function platformErrorMessage(error: PlatformError): string {
  const parts = [error.publicMessage, error.message, ...(error.details ?? [])].filter(Boolean);
  return [...new Set(parts)].join(" ");
}

export function classifyActionError(error: unknown): {
  kind: OperationalStateKind;
  code: PlatformErrorCode;
  message: string;
} {
  if (isPlatformErrorLike(error)) {
    return {
      kind: KIND_BY_CODE[error.code],
      code: error.code,
      message: platformErrorMessage(error),
    };
  }
  if (error instanceof Error && error.message && !error.message.includes("NEXT_REDIRECT")) {
    const lowered = error.message.toLowerCase();
    if (lowered.includes("postgres") || lowered.includes("database") || lowered.includes("not ready")) {
      return {
        kind: "postgres_unavailable",
        code: "DEPENDENCY_UNAVAILABLE",
        message: "Durable storage is not available. Canonical records were not changed.",
      };
    }
    return {
      kind: "server_failure",
      code: "INTERNAL_ERROR",
      message: error.message.includes("    at ") ? "The request could not be completed." : error.message,
    };
  }
  return {
    kind: "server_failure",
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
  };
}

export function operationalStateFromCode(
  code: PlatformErrorCode | "SUCCESS" | "EMPTY" | "PARTIAL" | "STALE" | "LOADING" | "REFRESHING",
  message?: string,
): OperationalStateView {
  switch (code) {
    case "LOADING":
      return view("loading", code, "Loading this record", "The workspace is fetching the latest approved projection.", "not_applicable", "Wait for the record to appear. Do not submit again.", false, "brass", "polite", message);
    case "REFRESHING":
      return view("refreshing", code, "Refreshing this record", "A background refresh is replacing the visible projection.", "not_applicable", "Wait for the refresh to finish. Do not assume the previous values are current.", false, "brass", "polite", message);
    case "EMPTY":
      return view("empty", code, "Nothing is recorded yet", "No approved records exist for this surface.", "no", "Create a record if your assignment allows it, or return to the directory.", true, "brass", "polite", message);
    case "PARTIAL":
      return view("partial", code, "Some sections could not be loaded", "The identity record is shown. One or more related sections were withheld after a safe failure.", "no", "Refresh the record. Retry is safe. Do not treat missing sections as empty truth.", true, "warn", "assertive", message);
    case "STALE":
      return view("stale", code, "This view may be out of date", "The record was last confirmed earlier in this session.", "unknown", "Refresh before editing. Saving against a stale version will be refused.", true, "warn", "polite", message);
    case "SUCCESS":
      return view("success", code, "The change was recorded", "The durable record was updated. This page now shows the saved projection.", "yes", "Review the updated record. A further identical save is not required.", false, "ok", "polite", message);
    case "AUTH_REQUIRED":
      return view("session_expired", code, "Your session is no longer valid", "Sign-in expired or was revoked. The last attempted change was not applied.", "no", "Sign in again, then retry only if you still need the change.", true, "danger", "assertive", message);
    case "ACCESS_PENDING":
      return view("assignment_revoked", code, "This assignment is no longer active", "There is no active assignment for this identity. The last attempted change was not applied.", "no", "Ask an authorised operator to restore an assignment. Do not retry until that happens.", false, "danger", "assertive", message);
    case "FORBIDDEN":
    case "PRODUCTION_ADAPTER_FORBIDDEN":
    case "FIXTURE_FORBIDDEN":
    case "AI_AUTHORITY_FORBIDDEN":
      return view("forbidden", code, "This action is not permitted", "The server refused the request. Hidden controls are not authority. Canonical data was not changed.", "no", "Return to a permitted record. Retrying the same action will be refused.", false, "danger", "assertive", message);
    case "SCOPE_MISMATCH":
    case "NOT_FOUND":
      return view("not_found", code, "This record is not available", "The requested guest, party or event is outside this assignment, or it does not exist.", "no", "Return to the directory. Do not retry against another event identifier.", false, "warn", "assertive", message);
    case "VALIDATION_FAILED":
      return view("validation", code, "The submitted information is not valid", "The server rejected the values. Canonical data was not changed.", "no", "Correct the highlighted fields and submit once. Retry is safe after correction.", true, "danger", "assertive", message);
    case "VERSION_CONFLICT":
      return view("conflict", code, "The record changed while you were editing", "Another approved write landed first. Your submission was not applied.", "no", "Reload the current record, then apply the change again if it is still required. Retry without reload is not safe.", false, "warn", "assertive", message);
    case "TRANSITION_INVALID":
      return view("invalid_transition", code, "That change is not permitted from this state", "The current lifecycle does not allow the requested transition. Canonical data was not changed.", "no", "Review the current status. Do not retry the same transition.", false, "warn", "assertive", message);
    case "IDEMPOTENCY_CONFLICT":
      return view("duplicate", code, "This request was already processed differently", "An earlier submission used the same key with different information. The latest values were not applied.", "unknown", "Reload the record and inspect the stored result before sending a new request.", false, "warn", "assertive", message);
    case "DEPENDENCY_UNAVAILABLE":
      return view("postgres_unavailable", code, "Durable storage is unavailable", "Postgres or a required store could not be reached. Canonical data was not changed.", "no", "Wait until readiness is restored, then retry once. Retry is safe.", true, "danger", "assertive", message);
    case "CAPABILITY_NOT_ENABLED":
      return view("readiness_unavailable", code, "This capability is not ready", "Migration or a required platform capability is unavailable. Canonical data was not changed.", "no", "Do not retry until readiness is restored.", false, "danger", "assertive", message);
    default:
      return view("server_failure", code, "The request could not be completed", "An unexpected server failure occurred. No stack trace or raw record is shown. Canonical data was not changed.", "no", "Retry once after a short wait if the work is still required. Retry is safe.", true, "danger", "assertive", message);
  }
}

export function operationalStateFromQuery(input: {
  error?: string;
  state?: string;
  ok?: string;
  demo?: string;
}): OperationalStateView | undefined {
  if (input.demo === "loading") return operationalStateFromCode("LOADING");
  if (input.demo === "refreshing") return operationalStateFromCode("REFRESHING");
  if (input.demo === "empty") return operationalStateFromCode("EMPTY");
  if (input.ok) {
    return operationalStateFromCode("SUCCESS", successCopy(input.ok));
  }
  if (isPlatformErrorCode(input.state)) {
    return operationalStateFromCode(input.state, input.error);
  }
  if (input.state === "PERMISSION_CHANGED") {
    return {
      ...operationalStateFromCode("FORBIDDEN", input.error),
      kind: "permission_changed",
      title: "Your permission changed during this session",
      whatHappened: "The server refused an action that this screen previously offered. Canonical data was not changed.",
      nextStep: "Refresh the record. Only use controls that remain after refresh.",
      retrySafe: false,
    };
  }
  if (input.error) {
    return operationalStateFromCode("VALIDATION_FAILED", input.error);
  }
  return undefined;
}

export function successCopy(ok: string): string {
  switch (ok) {
    case "intake":
      return "The operational guest record was created.";
    case "addressing":
      return "Structured addressing was saved.";
    case "party":
      return "The party record was created. It is not a person.";
    case "member":
      return "Party membership was updated.";
    case "relationship":
      return "The declared relationship was recorded.";
    case "child":
      return "The responsible-adult link was updated. Child readiness was recalculated on the server.";
    case "entitlement":
      return "Companion entitlement administration was recorded.";
    case "nominate":
      return "Companion nomination was recorded. An unnamed allowance is never treated as a person.";
    case "reconcile":
      return "Free-text companion names were recorded without creating guests.";
    case "academy":
      return "Training evidence was recorded. Course completion does not grant Event OS authority.";
    default:
      return "The change was recorded.";
  }
}

function view(
  kind: OperationalStateKind,
  code: OperationalStateView["code"],
  title: string,
  whatHappened: string,
  dataChanged: OperationalStateView["dataChanged"],
  nextStep: string,
  retrySafe: boolean,
  tone: OperationalStateView["tone"],
  live: OperationalStateView["live"],
  message?: string,
): OperationalStateView {
  return { kind, code, title, whatHappened, dataChanged, nextStep, retrySafe, tone, live, ...(message ? { message } : {}) };
}
