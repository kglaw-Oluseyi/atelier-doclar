import { PlatformError } from "./errors.js";

/**
 * @deprecated Milestone 5 — durable queue is the sole product seating entry.
 * Always returns true. `SOLVER_QUEUE_ENABLED` is ignored and must not select solvers.
 */
export function isSolverQueueEnabled(_env: NodeJS.ProcessEnv = process.env): boolean {
  return true;
}

/**
 * EOS-S06 V2 is the only writable Seating implementation (default on).
 * `EVENT_OS_SEATING_V2_REPLACEMENT=0` fails closed for mutations and may only
 * preserve read access to historic V1 / last-known-good publication labels.
 * It must not reactivate legacy snapshot-based writers.
 */
export function seatingV2ReplacementEnabled(): boolean {
  return process.env.EVENT_OS_SEATING_V2_REPLACEMENT !== "0";
}

/** Fail closed before any Seating mutation when V2 writing is disabled. */
export function requireSeatingV2Writable(): void {
  if (seatingV2ReplacementEnabled()) return;
  throw new PlatformError("CAPABILITY_NOT_ENABLED", "seating V2 writing is disabled", {
    publicMessage: "Seating mutations are unavailable while V2 replacement is disabled.",
  });
}
