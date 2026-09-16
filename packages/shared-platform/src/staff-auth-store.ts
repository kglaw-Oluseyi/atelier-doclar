import type { AuditEvent, Person, StaffSession } from "./schemas.js";
import type { PlatformStore } from "./store.js";

/**
 * Bounded staff-authentication mutation. Touches only identity, session and audit
 * rows — never operational guests, layouts, seating, evidence or unrelated aggregates.
 */
export type StaffAuthMutation = {
  /** Updated person row (version already incremented by the caller). */
  person?: Person;
  /** Expected person.version before this write (for optimistic concurrency). */
  personExpectedVersion?: number;
  sessionInsert?: StaffSession;
  sessionUpdate?: StaffSession;
  /** Expected session.version before this write when updating. */
  sessionExpectedVersion?: number;
  audit: AuditEvent;
};

export type StaffAuthPerfMark = {
  correlationId: string;
  phase: string;
  durationMs: number;
  queryCount?: number;
  rowsTouched?: number;
};

export interface StaffAuthCapableStore {
  findPersonsByNormalizedEmail(email: string): Person[];
  findPersonById(id: string): Person | undefined;
  findStaffSessionById(id: string): StaffSession | undefined;
  applyStaffAuthMutation(mutation: StaffAuthMutation): void;
  /** Optional instrumentation sink; never receives credentials or tokens. */
  recordStaffAuthPerf?(mark: StaffAuthPerfMark): void;
}

export function isStaffAuthCapableStore(store: PlatformStore): store is PlatformStore & StaffAuthCapableStore {
  const candidate = store as PlatformStore & Partial<StaffAuthCapableStore>;
  return (
    typeof candidate.findPersonsByNormalizedEmail === "function" &&
    typeof candidate.findPersonById === "function" &&
    typeof candidate.findStaffSessionById === "function" &&
    typeof candidate.applyStaffAuthMutation === "function"
  );
}

export function normalizeStaffEmail(email: string): string {
  return email.trim().toLowerCase();
}
