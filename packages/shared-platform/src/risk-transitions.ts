import { PlatformError } from "./errors.js";

export const POLICY_EVIDENCE_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["SUBMITTED", "SUPERSEDED"],
  SUBMITTED: ["VERIFIED", "REJECTED", "SUPERSEDED"],
  VERIFIED: ["EXPIRED", "SUPERSEDED"],
  REJECTED: ["SUPERSEDED"],
  EXPIRED: ["SUPERSEDED"],
  SUPERSEDED: [],
};

export const APPLICABILITY_TRANSITIONS: Record<string, readonly string[]> = {
  NOT_EVALUATED: ["INDETERMINATE", "APPLIES", "DOES_NOT_APPLY"],
  INDETERMINATE: ["APPLIES", "DOES_NOT_APPLY", "STALE", "SUPERSEDED"],
  APPLIES: ["STALE", "SUPERSEDED"],
  DOES_NOT_APPLY: ["STALE", "SUPERSEDED"],
  STALE: ["SUPERSEDED"],
  SUPERSEDED: [],
};

export const GAP_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["MITIGATION_PROPOSED", "ACCEPTED_RISK", "RESOLVED", "REOPENED"],
  MITIGATION_PROPOSED: ["ACCEPTED_RISK", "RESOLVED", "OPEN", "REOPENED"],
  ACCEPTED_RISK: ["REOPENED"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["MITIGATION_PROPOSED", "ACCEPTED_RISK", "RESOLVED"],
};

export const CLAUSE_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["LEGAL_REVIEW"],
  LEGAL_REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["ISSUED", "SUPERSEDED"],
  ISSUED: ["EXECUTED", "SUPERSEDED"],
  EXECUTED: ["SUPERSEDED"],
  SUPERSEDED: [],
};

export const VENDOR_ASSESSMENT_TRANSITIONS: Record<string, readonly string[]> = {
  INCOMPLETE: ["REVIEW_READY"],
  REVIEW_READY: ["APPROVED", "RESTRICTED", "DECLINED"],
  APPROVED: ["EXPIRED"],
  RESTRICTED: ["EXPIRED", "APPROVED", "DECLINED"],
  DECLINED: ["EXPIRED"],
  EXPIRED: [],
};

export const CHECKIN_TRANSITIONS: Record<string, readonly string[]> = {
  SCHEDULED: ["DUE", "CONFIRMED", "AT_RISK", "MISSED"],
  DUE: ["CONFIRMED", "AT_RISK", "MISSED", "ESCALATED"],
  CONFIRMED: ["CLOSED"],
  AT_RISK: ["CONFIRMED", "MISSED", "ESCALATED"],
  MISSED: ["ESCALATED", "CLOSED"],
  ESCALATED: ["CLOSED"],
  CLOSED: [],
};

export const FALLBACK_TRANSITIONS: Record<string, readonly string[]> = {
  PROPOSED: ["AUTHORISED", "CANCELLED"],
  AUTHORISED: ["INITIATED", "CANCELLED"],
  INITIATED: ["CONFIRMED", "FAILED"],
  CONFIRMED: ["CLOSED"],
  FAILED: ["CLOSED"],
  CANCELLED: [],
  CLOSED: [],
};

export const INCIDENT_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["STABILISED", "CLOSED"],
  STABILISED: ["RECOVERY", "CLOSED"],
  RECOVERY: ["CLOSED"],
  CLOSED: ["POST_INCIDENT_REVIEWED"],
  POST_INCIDENT_REVIEWED: [],
};

export const DOSSIER_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["APPROVED", "WITHDRAWN"],
  APPROVED: ["PUBLISHED", "SUPERSEDED"],
  PUBLISHED: ["SUPERSEDED"],
  WITHDRAWN: [],
  SUPERSEDED: [],
};

export function assertLegalTransition(map: Record<string, readonly string[]>, from: string, to: string, label: string): void {
  if (!(map[from] ?? []).includes(to)) {
    throw new PlatformError("TRANSITION_INVALID", `${label} cannot move from ${from} to ${to}`);
  }
}
