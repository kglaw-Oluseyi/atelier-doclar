import { PLATFORM_ERROR_CODES, PlatformError, isZodLikeError, type PlatformErrorCode } from "@maison-doclar/shared-platform";

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
  reloadRequired?: boolean;
  actionType?: string;
  actionLabel?: string;
  correlationId?: string;
  resultStatus?: "SUCCESS" | "FAILURE";
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
  ADOPTION_MISMATCH: "conflict",
  SEATING_VALIDATION_REJECTED: "validation",
  SEAT_CAPACITY_MISMATCH: "validation",
  NO_ACTIVE_SEATING_LAYOUT_BINDING: "validation",
  MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS: "validation",
  SEATING_LAYOUT_BINDING_STALE: "validation",
  SEATING_LAYOUT_PUBLICATION_MISMATCH: "validation",
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

export interface ActionFlash {
  code: PlatformErrorCode;
  message: string;
  eventId?: string;
  guestId?: string;
}

function scopedId(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= 80 && !value.includes("\n")
    ? value
    : undefined;
}

export function parseActionFlash(raw: string | undefined): ActionFlash | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; message?: unknown; eventId?: unknown; guestId?: unknown };
    if (typeof parsed.code !== "string" || !isPlatformErrorCode(parsed.code)) return undefined;
    if (typeof parsed.message !== "string" || parsed.message.length > 400) return undefined;
    if (parsed.message.includes("    at ")) return undefined;
    const eventId = scopedId(parsed.eventId);
    const guestId = scopedId(parsed.guestId);
    return {
      code: parsed.code,
      message: parsed.message,
      ...(eventId ? { eventId } : {}),
      ...(guestId ? { guestId } : {}),
    };
  } catch {
    return undefined;
  }
}

export function flashAppliesToDossier(
  flash: ActionFlash | undefined,
  eventId: string,
  guestId: string,
): ActionFlash | undefined {
  if (!flash) return undefined;
  if (flash.guestId && flash.guestId !== guestId) return undefined;
  if (flash.eventId && flash.eventId !== eventId) return undefined;
  return flash;
}

export function guestDossierConflictDecision(input: {
  eventId: string;
  guestId: string;
  flash?: ActionFlash;
  recovered?: { eventId: string; guestId: string };
  refreshed?: boolean;
  queryState?: string;
}): { mutationLocked: boolean; showConflict: boolean } {
  const recoveredHere = input.recovered?.eventId === input.eventId && input.recovered?.guestId === input.guestId;
  const scoped = flashAppliesToDossier(input.flash, input.eventId, input.guestId);
  if (scoped?.code === "VERSION_CONFLICT") {
    return { mutationLocked: true, showConflict: true };
  }
  if (input.refreshed || recoveredHere) {
    return { mutationLocked: false, showConflict: false };
  }
  const showConflict = input.queryState === "VERSION_CONFLICT";
  return { mutationLocked: showConflict, showConflict };
}

export function merchandiseConflictDecision(input: {
  flash?: ActionFlash;
  queryState?: string;
  refreshed?: boolean;
}): { mutationLocked: boolean; showConflict: boolean } {
  if (input.flash?.code === "VERSION_CONFLICT") {
    return { mutationLocked: true, showConflict: true };
  }
  if (input.refreshed) {
    return { mutationLocked: false, showConflict: false };
  }
  const showConflict = input.queryState === "VERSION_CONFLICT";
  return { mutationLocked: showConflict, showConflict };
}

export function merchandiseWorkspacePresentation<T>(input: {
  flash?: ActionFlash;
  queryState?: string;
  queryOk?: string;
  refreshed?: boolean;
  issued?: T;
}): {
  mutationLocked: boolean;
  showConflict: boolean;
  showSuccess: boolean;
  issued: T | undefined;
} {
  const decision = merchandiseConflictDecision(input);
  return {
    ...decision,
    showSuccess: Boolean(input.queryOk) && !decision.showConflict,
    issued: decision.showConflict ? undefined : input.issued,
  };
}

export function isPlatformErrorLike(error: unknown): error is PlatformError {
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
  if (isZodLikeError(error)) {
    return {
      kind: "validation",
      code: "VALIDATION_FAILED",
      message: "The submitted information is not valid.",
    };
  }
  if (isPlatformErrorLike(error)) {
    if (error.code === "VALIDATION_FAILED") {
      const message = platformErrorMessage(error);
      const looksInternal = /invalid uuid|invalid_type|too_small|expected |received |\{|\[/.test(message) || message.includes("    at ");
      return {
        kind: "validation",
        code: error.code,
        message: looksInternal ? "The submitted information is not valid." : message,
      };
    }
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
      message: "The request could not be completed.",
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
    case "SEAT_CAPACITY_MISMATCH":
      return view(
        "validation",
        code,
        "The published layout capacity needs correction",
        "Physical seat count and declared capacity disagree. Correct and republish the layout before freezing seating inputs.",
        "no",
        "Correct and republish the layout, then freeze seating inputs once.",
        true,
        "danger",
        "assertive",
        message,
      );
    case "NO_ACTIVE_SEATING_LAYOUT_BINDING":
      return view(
        "validation",
        code,
        "A seating layout binding is required",
        "Activate a seating layout binding before freezing seating inputs.",
        "no",
        "Propose a binding to one current layout publication, then have an independent checker activate it.",
        true,
        "danger",
        "assertive",
        message,
      );
    case "MULTIPLE_ACTIVE_SEATING_LAYOUT_BINDINGS":
      return view(
        "validation",
        code,
        "Seating layout bindings need resolution",
        "More than one seating layout binding is active for this event. Resolve the binding before freezing seating inputs.",
        "no",
        "Withdraw the extra active binding, then activate exactly one.",
        false,
        "danger",
        "assertive",
        message,
      );
    case "SEATING_LAYOUT_BINDING_STALE":
      return view(
        "validation",
        code,
        "The seating layout binding is stale",
        "The seating layout binding is stale. Propose and activate a successor binding for the current publication.",
        "no",
        "Propose and activate a successor binding for the current publication before freezing again.",
        true,
        "warn",
        "assertive",
        message,
      );
    case "SEATING_LAYOUT_PUBLICATION_MISMATCH":
      return view(
        "validation",
        code,
        "The seating layout binding could not be verified",
        "The seating layout binding does not match a current publication. Resolve the layout record before freezing seating inputs.",
        "no",
        "Propose and activate a binding to an exact current layout publication.",
        false,
        "danger",
        "assertive",
        message,
      );
    case "VERSION_CONFLICT":
      return {
        ...view(
          "conflict",
          code,
          "The record changed elsewhere",
          "Another approved write landed first. Your attempted edit was not saved. The rejected values are not the durable record.",
          "no",
          "Reload the current record before editing again. Retry without refresh is not safe and is disabled.",
          false,
          "warn",
          "assertive",
        ),
        reloadRequired: true,
      };
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
  if (input.state === "VERSION_CONFLICT" || isVersionConflictMessage(input.error)) {
    return operationalStateFromCode("VERSION_CONFLICT", input.error);
  }
  if (isPlatformErrorCode(input.state)) {
    return operationalStateFromCode(input.state, input.error);
  }
  if (input.ok) {
    return operationalStateFromCode("SUCCESS", successCopy(input.ok));
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
    case "forecast-run":
      return "The attendance forecast was recorded. RSVP and guest records were not changed.";
    case "forecast-override":
      return "The forecast override was proposed. The original model result is preserved.";
    case "forecast-override-decided":
      return "The forecast override was decided. History was not rewritten.";
    case "provision-proposed":
      return "The operational provision recommendation was proposed. It is not attendance truth.";
    case "provision-decided":
      return "The operational provision recommendation was decided. No vendor order was placed.";
    case "host-projection":
      return "The calm host projection was approved.";
    case "calibration":
      return "The shadow observation was recorded. The original forecast was preserved.";
    case "evaluation":
      return "Forecast evaluation was recorded without automated model release.";
    case "forecast-parameters":
      return "A new event-scoped parameter set was recorded. Existing forecast runs were not rewritten.";
    case "amend":
      return "The guest amendment was recorded.";
    case "already-applied":
      return "This amendment was already recorded. No second write was applied.";
    case "access-granted":
      return "The assignment was recorded.";
    case "phase":
      return "The ceremony was added. Guest identities were not duplicated.";
    case "phase-assignment":
      return "The guest was assigned to the selected phase only.";
    case "checkpoint":
      return "The checkpoint was recorded. It does not admit anyone on its own.";
    case "route":
      return "The arrival route was recorded. Fast-track remains routing, not authority.";
    case "vehicle":
      return "The vehicle was registered. Occupants remain independent identities.";
    case "package":
      return "A signed access plan was published. Canonical programme truth was not rewritten.";
    case "consumed":
      return "The offline projection was consumed. Attendance was not written.";
    case "resolve":
      return "Checkpoint resolution completed without writing attendance.";
    case "collection":
      return "The merchandise collection was recorded.";
    case "item":
      return "The merchandise item was recorded.";
    case "cohort":
      return "The host-assigned cohort was recorded. Identities were not merged.";
    case "preview":
      return "The resolved target set is shown below. Identities were not merged.";
    case "offer":
      return "The merchandise offer was recorded.";
    case "issue":
      return "The merchandise offer was issued to independent guests.";
    case "withdraw":
      return "The merchandise offer was withdrawn.";
    case "guest-access":
      return "Private merchandise guest access was issued or already active.";
    case "guest-renew":
      return "Private merchandise guest access was renewed. Prior sessions lost authority.";
    case "guest-revoke":
      return "Private merchandise guest access was revoked.";
    case "vendor":
      return "Synthetic vendor access was issued.";
    case "vendor-renew":
      return "Synthetic vendor access was renewed. Prior sessions lost authority.";
    case "vendor-revoke":
      return "Vendor access was revoked and fails closed.";
    case "review":
      return "The vendor report was reviewed as attributed evidence.";
    case "exception":
      return "The merchandise exception was recorded without payment data.";
    case "choice":
      return "The private guest choice was recorded.";
    case "atelier-published":
      return "The private Atelier was published. Canonical Event OS records were not rewritten.";
    case "narrative-published":
      return "A new narrative edition was published. Earlier editions remain preserved.";
    case "narrative-first":
      return "This is the first published narrative edition. No earlier published edition existed.";
    case "narrative-superseded":
      return "A new narrative edition was published. The earlier published edition remains preserved.";
    case "narrative-revision":
      return "A revision draft was opened from the current published edition.";
    case "atelier-access":
      return "A single-use host invitation was issued. Staff, guest and vendor sessions were not reused.";
    case "atelier-step-up":
      return "A single-use step-up confirmation was issued. It cannot be reused for another action.";
    case "atelier-renewed":
      return "Host Atelier access was renewed. The prior grant remains as history and lost authority.";
    case "atelier-revoked":
      return "Host Atelier access was revoked and fails closed.";
    case "decision-published":
      return "A host decision request was published. Canonical Event OS records were not rewritten.";
    case "decision-reviewed":
      return "The host decision was reviewed. Canonical Event OS records remain unchanged.";
    case "venue-created":
      return "The organisation venue was recorded. It is synthetic and has not been adopted into an event.";
    case "venue-fact":
      return "The venue fact was recorded with provenance. Binary evidence was not uploaded.";
    case "venue-fact-verified":
      return "The venue fact was verified. This is not a safety certification.";
    case "venue-adopted":
      return "The venue was adopted into this event. The reusable organisation record was not changed.";
    case "venue-override":
      return "An event-only fact override was recorded. The reusable venue fact was not rewritten.";
    case "layout-created":
      return "The blank layout was persisted in millimetres. Screen pixels were not stored.";
    case "layout-updated":
      return "The layout setup was saved as a new immutable revision.";
    case "layout-commanded":
      return "The spatial command was acknowledged as a new immutable revision. Rejected values are not shown as saved.";
    case "layout-leased":
      return "The editor lease was acquired or renewed. Collaborators remain read-only until it expires.";
    default:
      return "The change was recorded.";
  }
}

export function isVersionConflictMessage(message?: string): boolean {
  if (!message) return false;
  return /changed while you were editing|changed elsewhere|reload before saving|attempted edit was not saved|expected version/i.test(
    message,
  );
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
