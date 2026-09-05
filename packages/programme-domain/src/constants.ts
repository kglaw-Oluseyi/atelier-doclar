/** Prompt identity for this CT1 implementation. */
export const CT1_TRACEABILITY = {
  product: "FOUNDATION",
  promptControlId: "MD-PR-0002",
  nativeId: "CT1",
  sliceId: "MD-CT1",
} as const;

export const PRODUCT_CODES = [
  "FOUNDATION",
  "EVENT_OS",
  "EVENT_DAY",
  "ACADEMY",
  "MARKETING",
  "USHERING",
  "INTEGRATION",
] as const;

export const WORK_STATUSES = [
  "NOT_STARTED",
  "READY",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "ACCEPTED",
  "SUPERSEDED",
] as const;

export const GATE_STATUSES = [
  "NOT_READY",
  "EVIDENCE_INCOMPLETE",
  "READY_FOR_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;

export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export const EVIDENCE_KINDS = [
  "COMMIT",
  "CHECK",
  "TEST",
  "SCREENSHOT",
  "LOG",
  "DOCUMENT",
  "DECISION",
  "APPROVAL",
  "REHEARSAL",
  "PILOT",
] as const;

export const OPEN_ITEM_STATUSES = ["OPEN", "MITIGATED", "RESOLVED", "ACCEPTED_RISK"] as const;

export const CHECK_RESULTS = ["PASS", "FAIL", "PENDING"] as const;

export const DECISION_DISPOSITIONS = ["PROPOSED", "CONTROLLING", "REVERSED"] as const;

export const TIMELINE_EVENT_KINDS = [
  "MANIFEST",
  "COMMIT",
  "CHECK",
  "EVIDENCE",
  "DECISION",
  "GATE",
] as const;

export const SLICE_ID_PATTERN = /^[A-Z]+-[A-Z0-9-]+$/;
export const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

/** Acceptance authority values that must never be treated as a named reviewer. */
export const RESERVED_ACCEPTANCE_AUTHORITIES = ["UNKNOWN", "Cursor", "cursor"] as const;

export const PRODUCT_ORDER = new Map<string, number>(
  PRODUCT_CODES.map((code, index) => [code, index]),
);
