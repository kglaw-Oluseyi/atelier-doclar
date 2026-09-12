import { PlatformError } from "./errors.js";
import type { AuditEvent } from "./schemas.js";
import {
  emptySeatingState,
  SEATING_COLLECTIONS,
  type SeatingCollection,
  type SeatingIdempotencyReceipt,
  type SeatingState,
} from "./seating-schemas.js";

export type SeatingScope = {
  organisationId: string;
  eventId: string;
};

export type ActorContextLike = {
  personId: string;
  correlationId: string;
  now?: string;
  actorKind?: "HUMAN" | "AI" | "SERVICE" | "SYSTEM";
};

export type SeatingWorkspaceProjection = {
  eventId: string;
  organisationId: string;
  currentPublication?: Record<string, unknown>;
  workingEdition?: Record<string, unknown>;
  inputEdition?: Record<string, unknown>;
  blockers: Array<{ code: string; message: string }>;
  counts: {
    eligibleGuests: number;
    seated: number;
    unseated: number;
    hardBlockers: number;
  };
  state?: import("./seating-schemas.js").SeatingState;
};

export type SeatingRunProjection = Record<string, unknown> & { id: string; eventId: string };
export type SeatingPublicationProjection = Record<string, unknown> & { id: string; eventId: string };

export interface SeatingTransaction {
  load<T>(collection: SeatingCollection, id: string, scope: SeatingScope): Promise<T | undefined>;
  list<T>(collection: SeatingCollection, scope: Partial<SeatingScope>): Promise<T[]>;
  insert<T extends { id?: string; organisationId?: string }>(collection: SeatingCollection, record: T): Promise<T>;
  updateVersioned<T extends { id: string; version: number }>(
    collection: SeatingCollection,
    id: string,
    expectedVersion: number,
    patch: Record<string, unknown> & { version: number },
  ): Promise<T>;
  appendAudit(record: AuditEvent): Promise<void>;
  getIdempotency(scope: SeatingScope, action: string, key: string): Promise<SeatingIdempotencyReceipt | undefined>;
  insertIdempotency(receipt: SeatingIdempotencyReceipt): Promise<SeatingIdempotencyReceipt>;
  purgeFixtureRecords(scope: SeatingScope, ids: Partial<Record<SeatingCollection, string[]>>): Promise<number>;
  snapshot(): SeatingState;
}

export interface SeatingRepository {
  transaction<T>(fn: (tx: SeatingTransaction) => Promise<T>): Promise<T>;
  projectEventSeating(actor: ActorContextLike, eventId: string): Promise<SeatingWorkspaceProjection>;
  getRun(actor: ActorContextLike, eventId: string, runId: string): Promise<SeatingRunProjection>;
  getPublication(actor: ActorContextLike, eventId: string, publicationId: string): Promise<SeatingPublicationProjection>;
}

export function cloneSeatingState(state: SeatingState): SeatingState {
  return structuredClone(state);
}

export function replaceCollection<K extends SeatingCollection>(state: SeatingState, collection: K, rows: SeatingState[K]): void {
  state[collection] = rows;
}

export function seatingRowId(record: { id?: string }): string {
  if (!record.id) throw new PlatformError("VALIDATION_FAILED", "seating record requires id");
  return record.id;
}

export function assertSeatingScope(record: { organisationId?: string; eventId?: string }, scope: Partial<SeatingScope>): boolean {
  if (scope.organisationId && record.organisationId && record.organisationId !== scope.organisationId) return false;
  if (scope.eventId && record.eventId && record.eventId !== scope.eventId) return false;
  return true;
}

export function incrementSeatingVersion(current: number): number {
  return current + 1;
}

export function emptySeatingSnapshot(): SeatingState {
  return emptySeatingState();
}

export function countSeatingRows(state: SeatingState): Record<string, number> {
  return Object.fromEntries(SEATING_COLLECTIONS.map((name) => [name, state[name].length]));
}
