import { PlatformError } from "./errors.js";
import type { EventPhase, EventRecord } from "./schemas.js";

const ALLOWED: Record<EventPhase, readonly EventPhase[]> = {
  DISCOVER: ["DESIGN"],
  DESIGN: ["PREPARE", "DISCOVER"],
  PREPARE: ["READY", "DESIGN"],
  READY: ["LIVE", "PREPARE"],
  LIVE: ["CLOSE"],
  CLOSE: ["LEARN"],
  LEARN: [],
};

const SCAFFOLDED_TARGETS = new Set<EventPhase>(["READY", "LIVE"]);

export function allowedNextPhases(phase: EventPhase): readonly EventPhase[] {
  return ALLOWED[phase];
}

export function assertPhaseTransition(
  event: EventRecord,
  toPhase: EventPhase,
  options?: { allowScaffoldedTransitions?: boolean },
): void {
  if (event.status === "ARCHIVED" || event.status === "CANCELLED") {
    throw new PlatformError("TRANSITION_INVALID", `event ${event.id} is ${event.status} and cannot change phase`);
  }
  const allowed = ALLOWED[event.phase];
  if (!allowed.includes(toPhase)) {
    throw new PlatformError(
      "TRANSITION_INVALID",
      `cannot transition ${event.phase} to ${toPhase}`,
      { details: [`allowed:${allowed.join(",") || "none"}`] },
    );
  }
  if (SCAFFOLDED_TARGETS.has(toPhase) && !options?.allowScaffoldedTransitions) {
    throw new PlatformError(
      "CAPABILITY_NOT_ENABLED",
      `${toPhase} remains scaffolded until a later authorised slice`,
    );
  }
}

export function eventStatusAfterPhase(phase: EventPhase, current: EventRecord["status"]): EventRecord["status"] {
  if (current === "CANCELLED" || current === "ARCHIVED") return current;
  if (phase === "LEARN") return "COMPLETED";
  if (phase === "DISCOVER") return current === "DRAFT" ? "DRAFT" : "ACTIVE";
  return "ACTIVE";
}
