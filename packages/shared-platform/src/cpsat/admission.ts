/**
 * Milestone 5 — launch admission (compatible READY worker + queue backpressure).
 * Never invokes heuristic or in-process CP-SAT.
 */
import { randomUUID } from "node:crypto";
import { PlatformError } from "../errors.js";
import type { PgQueryable } from "../postgres-schema.js";
import {
  CPSAT_MODEL_VERSION,
  CPSAT_REQUEST_CONTRACT,
} from "./contract.js";
import { CPSAT_ENGINE_EXPECTATION, type CpsatFrozenAuthority, type CpsatLaunchPurpose } from "./durable-launch.js";
import { findCompatibleReadyWorkers } from "./worker-registry.js";

export const CPSAT_DEFAULT_PER_EVENT_ACTIVE_RUN_LIMIT = 2;
export const CPSAT_DEFAULT_GLOBAL_QUEUED_DEPTH_LIMIT = 50;
export const CPSAT_DEFAULT_QUALIFICATION_QUEUED_DEPTH_LIMIT = 10;

export const WORKER_UNAVAILABLE_PUBLIC_MESSAGE =
  "Seating generation is temporarily unavailable. Your event data has not been changed. Please try again when the solver service is ready." as const;

export const QUEUE_BUSY_PUBLIC_MESSAGE =
  "Seating generation is busy. No run was started. Please try again shortly." as const;

export type CpsatAdmissionOutcome =
  | { ok: true; compatibleWorkerIds: string[] }
  | {
      ok: false;
      reasonCode:
        | "WORKER_UNAVAILABLE"
        | "WORKER_INCOMPATIBLE"
        | "WORKER_DRAINING_ONLY"
        | "QUEUE_DEPTH_EXCEEDED"
        | "PER_EVENT_ACTIVE_LIMIT"
        | "SCALE_OUTSIDE_ENVELOPE";
      publicMessage: typeof WORKER_UNAVAILABLE_PUBLIC_MESSAGE | typeof QUEUE_BUSY_PUBLIC_MESSAGE;
    };

export type CpsatAdmissionLimits = {
  perEventActiveLimit?: number;
  globalQueuedDepthLimit?: number;
  qualificationQueuedDepthLimit?: number;
  freshnessMs?: number;
};

async function countRows(client: PgQueryable, sql: string, values: unknown[]): Promise<number> {
  const result = await client.query<{ c: string | number }>(sql, values);
  return Number(result.rows[0]?.c ?? 0);
}

export async function recordCpsatAdmissionEvent(
  client: PgQueryable,
  input: {
    eventId: string;
    organisationId: string;
    outcome: "ADMITTED" | "REFUSED";
    reasonCode: string;
    purpose?: string;
    guestCount?: number;
    tableCount?: number;
    actorPersonId?: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO cpsat_solver_admission_events (
      id, at, event_id, organisation_id, outcome, reason_code, purpose,
      guest_count, table_count, actor_person_id, detail
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [
      randomUUID(),
      new Date().toISOString(),
      input.eventId,
      input.organisationId,
      input.outcome,
      input.reasonCode,
      input.purpose ?? null,
      input.guestCount ?? null,
      input.tableCount ?? null,
      input.actorPersonId ?? null,
      JSON.stringify(input.detail ?? {}),
    ],
  );
}

/**
 * Check for at least one fresh compatible READY worker and queue capacity.
 * Does not enqueue. Does not spawn Python. Does not call the heuristic.
 */
export async function admitCpsatSeatingLaunch(
  client: PgQueryable,
  frozen: Pick<
    CpsatFrozenAuthority,
    "eventId" | "organisationId" | "purpose" | "engineExpectation" | "modelVersion" | "authoredAuthority"
  >,
  options: CpsatAdmissionLimits & { actorPersonId?: string } = {},
): Promise<CpsatAdmissionOutcome> {
  const guestCount = frozen.authoredAuthority.guests?.length ?? 0;
  const tableCount = new Set(
    (frozen.authoredAuthority.positions ?? []).map((p) => p.tableToken),
  ).size;
  const purpose = frozen.purpose as CpsatLaunchPurpose;
  const perEventLimit = options.perEventActiveLimit ?? CPSAT_DEFAULT_PER_EVENT_ACTIVE_RUN_LIMIT;
  const globalDepth = options.globalQueuedDepthLimit ?? CPSAT_DEFAULT_GLOBAL_QUEUED_DEPTH_LIMIT;
  const qualDepth = options.qualificationQueuedDepthLimit ?? CPSAT_DEFAULT_QUALIFICATION_QUEUED_DEPTH_LIMIT;

  const activeForEvent = await countRows(
    client,
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs
     WHERE event_id = $1 AND status IN ('QUEUED', 'CLAIMED', 'RUNNING') AND cancel_requested = FALSE`,
    [frozen.eventId],
  );
  if (activeForEvent >= perEventLimit) {
    await recordCpsatAdmissionEvent(client, {
      eventId: frozen.eventId,
      organisationId: frozen.organisationId,
      outcome: "REFUSED",
      reasonCode: "PER_EVENT_ACTIVE_LIMIT",
      purpose,
      guestCount,
      tableCount,
      actorPersonId: options.actorPersonId,
      detail: { activeForEvent, perEventLimit },
    });
    return { ok: false, reasonCode: "PER_EVENT_ACTIVE_LIMIT", publicMessage: QUEUE_BUSY_PUBLIC_MESSAGE };
  }

  const queuedGlobal = await countRows(
    client,
    `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs
     WHERE status = 'QUEUED' AND cancel_requested = FALSE`,
    [],
  );
  if (queuedGlobal >= globalDepth) {
    await recordCpsatAdmissionEvent(client, {
      eventId: frozen.eventId,
      organisationId: frozen.organisationId,
      outcome: "REFUSED",
      reasonCode: "QUEUE_DEPTH_EXCEEDED",
      purpose,
      guestCount,
      tableCount,
      actorPersonId: options.actorPersonId,
      detail: { queuedGlobal, globalDepth },
    });
    return { ok: false, reasonCode: "QUEUE_DEPTH_EXCEEDED", publicMessage: QUEUE_BUSY_PUBLIC_MESSAGE };
  }

  if (purpose === "QUALIFICATION" || purpose === "SHADOW") {
    const queuedQual = await countRows(
      client,
      `SELECT COUNT(*)::int AS c FROM cpsat_solver_runs
       WHERE status = 'QUEUED' AND cancel_requested = FALSE
         AND purpose IN ('QUALIFICATION', 'SHADOW')`,
      [],
    );
    // Qualification/shadow must not starve operational planning — refuse when soft cap exceeded.
    if (queuedQual >= qualDepth) {
      await recordCpsatAdmissionEvent(client, {
        eventId: frozen.eventId,
        organisationId: frozen.organisationId,
        outcome: "REFUSED",
        reasonCode: "QUEUE_DEPTH_EXCEEDED",
        purpose,
        guestCount,
        tableCount,
        actorPersonId: options.actorPersonId,
        detail: { queuedQual, qualDepth },
      });
      return { ok: false, reasonCode: "QUEUE_DEPTH_EXCEEDED", publicMessage: QUEUE_BUSY_PUBLIC_MESSAGE };
    }
  }

  const compatible = await findCompatibleReadyWorkers(client, {
    contractVersion: CPSAT_REQUEST_CONTRACT,
    modelVersion: frozen.modelVersion || CPSAT_MODEL_VERSION,
    engineExpectation: frozen.engineExpectation || CPSAT_ENGINE_EXPECTATION,
    guestCount,
    tableCount,
    freshnessMs: options.freshnessMs,
  });

  if (compatible.length === 0) {
    await recordCpsatAdmissionEvent(client, {
      eventId: frozen.eventId,
      organisationId: frozen.organisationId,
      outcome: "REFUSED",
      reasonCode: "WORKER_UNAVAILABLE",
      purpose,
      guestCount,
      tableCount,
      actorPersonId: options.actorPersonId,
    });
    return {
      ok: false,
      reasonCode: "WORKER_UNAVAILABLE",
      publicMessage: WORKER_UNAVAILABLE_PUBLIC_MESSAGE,
    };
  }

  await recordCpsatAdmissionEvent(client, {
    eventId: frozen.eventId,
    organisationId: frozen.organisationId,
    outcome: "ADMITTED",
    reasonCode: "COMPATIBLE_WORKER",
    purpose,
    guestCount,
    tableCount,
    actorPersonId: options.actorPersonId,
    detail: { workerIds: compatible.map((w) => w.workerId) },
  });
  return { ok: true, compatibleWorkerIds: compatible.map((w) => w.workerId) };
}

export function throwAdmissionRefusal(outcome: Extract<CpsatAdmissionOutcome, { ok: false }>): never {
  const code =
    outcome.reasonCode === "QUEUE_DEPTH_EXCEEDED" || outcome.reasonCode === "PER_EVENT_ACTIVE_LIMIT"
      ? "DEPENDENCY_UNAVAILABLE"
      : "DEPENDENCY_UNAVAILABLE";
  throw new PlatformError(code, `cpsat admission refused: ${outcome.reasonCode}`, {
    publicMessage: outcome.publicMessage,
  });
}
