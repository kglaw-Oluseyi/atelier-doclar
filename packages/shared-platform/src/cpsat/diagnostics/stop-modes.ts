/**
 * Operator stop modes: CANCEL vs KEEP_BEST.
 * Preserves prior cancel_requested boolean behaviour; stop_mode is additive.
 */
import { PlatformError } from "../../errors.js";
import type { PgQueryable, PgTransactor } from "../../postgres-schema.js";
import type { CpsatStopMode } from "../contract.js";
import { getCpsatSeatingRun, type CpsatSeatingRunSummary } from "../durable-launch.js";

const ACTIVE = new Set(["QUEUED", "CLAIMED", "RUNNING"]);
const TERMINAL = new Set([
  "CANCELLED",
  "CLOSED_NO_PLAN",
  "FAILED",
  "READY_FOR_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ADOPTED",
  "SUPERSEDED",
]);

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

export type StopRequestActor = {
  personId: string;
  roleKey: string;
  permissions: readonly string[];
};

function canStop(actor: StopRequestActor): boolean {
  if (actor.roleKey === "READ_ONLY_AUDITOR" || actor.roleKey === "AUDITOR") return false;
  return actor.permissions.includes("seating.run.execute");
}

export async function requestCpsatRunStop(
  client: PgQueryable,
  input: {
    eventId: string;
    runId: string;
    mode: CpsatStopMode;
    actor: StopRequestActor;
  },
): Promise<CpsatSeatingRunSummary> {
  if (!canStop(input.actor)) {
    throw new PlatformError("FORBIDDEN", "stop not permitted", {
      publicMessage: "You cannot stop this seating run.",
    });
  }

  const now = new Date().toISOString();
  const work = async (tx: PgQueryable): Promise<CpsatSeatingRunSummary> => {
    const locked = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_runs WHERE id = $1 AND event_id = $2 FOR UPDATE`,
      [input.runId, input.eventId],
    );
    const row = locked.rows[0];
    if (!row) {
      throw new PlatformError("NOT_FOUND", "run was not found", {
        publicMessage: "That seating run could not be found for this event.",
      });
    }
    const lifecycle = String(row.status);
    if (TERMINAL.has(lifecycle)) {
      throw new PlatformError("VALIDATION_FAILED", "terminal run cannot be stopped", {
        publicMessage: "This seating run can no longer be stopped.",
      });
    }
    if (!ACTIVE.has(lifecycle)) {
      throw new PlatformError("VALIDATION_FAILED", "run is not stoppable", {
        publicMessage: "Stop is only available while the run is queued or executing.",
      });
    }
    if (Boolean(row.diagnostic_only)) {
      throw new PlatformError("VALIDATION_FAILED", "diagnostic run cannot KEEP_BEST", {
        publicMessage: "Diagnostic runs cannot use stop-and-keep-best.",
      });
    }

    // Idempotent: same mode already requested.
    if (Boolean(row.cancel_requested) && String(row.stop_mode ?? "CANCEL") === input.mode) {
      return getCpsatSeatingRun(tx, input.eventId, input.runId);
    }

    if (input.mode === "KEEP_BEST") {
      const solutions = Number(row.solutions_found ?? 0);
      const incumbent = Boolean(row.incumbent_present);
      if (solutions <= 0 && !incumbent) {
        throw new PlatformError("VALIDATION_FAILED", "KEEP_BEST requires incumbent", {
          publicMessage: "Stop and keep best is only available after a complete plan has been found.",
        });
      }
    }

    await tx.query(
      `UPDATE cpsat_solver_runs
       SET cancel_requested = TRUE,
           stop_and_keep_best = $4,
           stop_mode = $5,
           stop_requested_at = COALESCE(stop_requested_at, $3::timestamptz),
           updated_at = $3::timestamptz
       WHERE id = $1 AND event_id = $2 AND status = ANY($6::text[])`,
      [
        input.runId,
        input.eventId,
        now,
        input.mode === "KEEP_BEST",
        input.mode,
        [...ACTIVE],
      ],
    );
    await tx.query(
      `INSERT INTO cpsat_solver_run_events (id, run_id, at, kind, payload)
       VALUES ($1, $2, $3::timestamptz, $4, $5::jsonb)`,
      [
        `evt_${input.runId}_${Date.now()}`,
        input.runId,
        now,
        input.mode === "KEEP_BEST" ? "STOP_KEEP_BEST_REQUESTED" : "CANCELLATION_REQUESTED",
        JSON.stringify({
          actorPersonId: input.actor.personId,
          mode: input.mode,
          action: input.mode === "KEEP_BEST" ? "cpsat.run.stop_keep_best" : "cpsat.run.cancel_requested",
          lifecycle,
        }),
      ],
    );
    return getCpsatSeatingRun(tx, input.eventId, input.runId);
  };

  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}

export async function observeStopRequest(
  client: PgQueryable,
  input: { runId: string; leaseOwner: string; leaseEpoch: number },
): Promise<{ stopMode: CpsatStopMode | null; cancelRequested: boolean }> {
  const now = new Date().toISOString();
  const result = await client.query<Record<string, unknown>>(
    `UPDATE cpsat_solver_runs
     SET stop_observed_at = COALESCE(stop_observed_at, $4::timestamptz),
         cancel_observed_at = COALESCE(cancel_observed_at, $4::timestamptz),
         updated_at = $4::timestamptz
     WHERE id = $1 AND lease_owner = $2 AND lease_epoch = $3 AND cancel_requested = TRUE
     RETURNING stop_mode, cancel_requested, stop_and_keep_best, incumbent_present, solutions_found`,
    [input.runId, input.leaseOwner, input.leaseEpoch, now],
  );
  const row = result.rows[0];
  if (!row) return { stopMode: null, cancelRequested: false };
  const mode =
    row.stop_mode != null
      ? (String(row.stop_mode) as CpsatStopMode)
      : Boolean(row.stop_and_keep_best)
        ? "KEEP_BEST"
        : "CANCEL";
  return { stopMode: mode, cancelRequested: true };
}

export async function recordIncumbentProgress(
  client: PgQueryable,
  input: {
    runId: string;
    leaseOwner: string;
    leaseEpoch: number;
    solutionsFound: number;
    incumbentPresent: boolean;
    currentTier?: string | null;
    bestValue?: number | null;
    bestBound?: number | null;
    gap?: number | null;
    deterministicMs?: number | null;
    wallMs?: number | null;
  },
): Promise<void> {
  await client.query(
    `UPDATE cpsat_solver_runs
     SET solutions_found = GREATEST(solutions_found, $4),
         incumbent_present = $5 OR incumbent_present,
         current_tier = COALESCE($6, current_tier),
         best_objective_value = COALESCE($7, best_objective_value),
         best_objective_bound = COALESCE($8, best_objective_bound),
         objective_gap = COALESCE($9, objective_gap),
         deterministic_ms_used = COALESCE($10, deterministic_ms_used),
         wall_ms_used = COALESCE($11, wall_ms_used),
         updated_at = NOW()
     WHERE id = $1 AND lease_owner = $2 AND lease_epoch = $3`,
    [
      input.runId,
      input.leaseOwner,
      input.leaseEpoch,
      input.solutionsFound,
      input.incumbentPresent,
      input.currentTier ?? null,
      input.bestValue ?? null,
      input.bestBound ?? null,
      input.gap ?? null,
      input.deterministicMs ?? null,
      input.wallMs ?? null,
    ],
  );
}
