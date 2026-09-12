import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import {
  emptySeatingV2State,
  SEATING_V2_COLLECTIONS,
  type SeatingV2Collection,
  type SeatingV2EventCurrent,
  type SeatingV2IdempotencyReceipt,
  type SeatingV2PlanAssignment,
  type SeatingV2RunAssignment,
  type SeatingV2State,
} from "./seating-v2-state.js";

export type SeatingV2Scope = {
  organisationId: string;
  eventId: string;
};

export type SeatingV2ActorContext = {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
};

export type SeatingV2EventProjection = {
  eventId: string;
  organisationId: string;
  workingEditionId?: string;
  submittedEditionId?: string;
  currentPublicationId?: string;
  version?: number;
};

export type SeatingV2CurrentPatch = {
  version: number;
  workingEditionId?: string | null;
  submittedEditionId?: string | null;
  currentPublicationId?: string | null;
};

export type SeatingV2LifecycleCollection = "ruleEditions" | "reservationEditions" | "planEditions";

export type SeatingV2LifecyclePatch = {
  lifecycle?: "DRAFT" | "ACTIVE" | "WITHDRAWN" | "SUPERSEDED" | "RELEASED";
  status?: "WORKING" | "SUBMITTED" | "APPROVED" | "RECALLED" | "SUPERSEDED" | "WITHDRAWN";
  activatedByPersonId?: string | null;
  activatedAt?: string | null;
  withdrawnByPersonId?: string | null;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
  releasedByPersonId?: string | null;
  releasedAt?: string | null;
  releaseDecision?: string | null;
  submittedByPersonId?: string | null;
  submittedAt?: string | null;
  version?: number;
};

export type SeatingV2Lock = "FOR_UPDATE";

export interface SeatingV2Transaction {
  load<T>(collection: SeatingV2Collection, id: string, scope: Partial<SeatingV2Scope>): Promise<T | undefined>;
  list<T>(collection: SeatingV2Collection, scope: Partial<SeatingV2Scope>): Promise<T[]>;
  insert<T extends { id?: string; organisationId?: string }>(collection: SeatingV2Collection, record: T): Promise<T>;
  updateCurrent(scope: SeatingV2Scope, expectedVersion: number, patch: SeatingV2CurrentPatch): Promise<SeatingV2EventCurrent>;
  /** Lifecycle/status only. Meaning-bearing content hashes never change. */
  updateLifecycle<T>(
    collection: SeatingV2LifecycleCollection,
    id: string,
    scope: SeatingV2Scope,
    patch: SeatingV2LifecyclePatch,
  ): Promise<T>;
  appendAudit(record: AuditEvent): Promise<void>;
  getIdempotency(scope: SeatingV2Scope, action: string, key: string): Promise<SeatingV2IdempotencyReceipt | undefined>;
  insertIdempotency(receipt: SeatingV2IdempotencyReceipt): Promise<SeatingV2IdempotencyReceipt>;
  /** Postgres: SELECT ... FROM seating_v2_event_current ... FOR UPDATE. Memory is a no-op read. */
  lockEventCurrent(scope: SeatingV2Scope, lock?: SeatingV2Lock): Promise<SeatingV2EventCurrent | undefined>;
  /** Postgres: SELECT ... FROM seating_v2_run_assignments ... FOR UPDATE. Memory is a no-op read. */
  lockOccupiedRunPosition(
    scope: SeatingV2Scope,
    runId: string,
    positionToken: string,
    lock?: SeatingV2Lock,
  ): Promise<SeatingV2RunAssignment | undefined>;
  /** Postgres: SELECT ... FROM seating_v2_plan_assignments ... FOR UPDATE. Memory is a no-op read. */
  lockOccupiedPlanPosition(
    scope: SeatingV2Scope,
    planEditionId: string,
    logicalPositionId: string,
    lock?: SeatingV2Lock,
  ): Promise<SeatingV2PlanAssignment | undefined>;
  purgeFixtureRecords(
    scope: SeatingV2Scope,
    ids: Partial<Record<SeatingV2Collection, string[]>>,
    confirmation: "CONFIRM_SEATING_V2_SYNTHETIC_PURGE",
  ): Promise<number>;
  snapshot(): SeatingV2State;
}

export interface SeatingV2Repository {
  transaction<T>(fn: (tx: SeatingV2Transaction) => Promise<T>): Promise<T>;
  projectEvent(actor: SeatingV2ActorContext, eventId: string): Promise<SeatingV2EventProjection>;
}

export function cloneSeatingV2State(state: SeatingV2State): SeatingV2State {
  return structuredClone(state);
}

export function seatingV2RowId(record: { id?: string; migrationId?: string }): string {
  const id = record.id ?? record.migrationId;
  if (!id) throw new PlatformError("VALIDATION_FAILED", "seating v2 record requires id");
  return id;
}

export function assertSeatingV2Scope(
  record: { organisationId?: string; eventId?: string },
  scope: Partial<SeatingV2Scope>,
): boolean {
  if (scope.organisationId && record.organisationId && record.organisationId !== scope.organisationId) return false;
  if (scope.eventId && record.eventId && record.eventId !== scope.eventId) return false;
  return true;
}

export function emptySeatingV2Snapshot(): SeatingV2State {
  return emptySeatingV2State();
}

export function countSeatingV2Rows(state: SeatingV2State): Record<string, number> {
  return Object.fromEntries(SEATING_V2_COLLECTIONS.map((name) => [name, state[name].length]));
}
