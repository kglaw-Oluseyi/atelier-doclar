/**
 * M6C — Canonical CP-SAT operational seating read model.
 * Operational current state derives only from CP-SAT tables + worker registry.
 * Legacy seating_v2_* / seating_* publications are not operational authority.
 */
import type { PgQueryable } from "../postgres-schema.js";
import type { SeatingWorkspaceView } from "../seating-workspace.js";
import { CPSAT_MODEL_VERSION, CPSAT_REQUEST_CONTRACT } from "./contract.js";
import { findCompatibleReadyWorkers } from "./worker-registry.js";
import { listCpsatSeatingRuns, type CpsatSeatingRunSummary } from "./durable-launch.js";

export type CanonicalCpsatOperationalPublication = {
  id: string;
  publicationNumber: number;
  editionHash: string;
  status: "CURRENT";
  source: "CPSAT";
  runId: string;
  adoptionId: string;
  productResult: string | null;
  evidenceGrade: string | null;
  adoptedAt: string;
  seatedCount: number;
  unseatedCount: number;
  eligibleCount: number;
};

export type CanonicalCpsatAuthoritySnapshot = {
  currentAdoption: CanonicalCpsatOperationalPublication | null;
  runs: CpsatSeatingRunSummary[];
  workerReadyCount: number;
  assignments: Array<{
    guestToken: string;
    positionToken: string | null;
    tableToken: string | null;
    state: string;
    reasonCode: string | null;
  }>;
};

export async function loadCanonicalCpsatAuthority(
  client: PgQueryable,
  eventId: string,
): Promise<CanonicalCpsatAuthoritySnapshot> {
  const listed = await listCpsatSeatingRuns(client, eventId, { limit: 50 });
  const pointer = await client.query<{ current_adoption_id: string | null }>(
    `SELECT current_adoption_id FROM cpsat_solver_authority_pointers WHERE event_id = $1`,
    [eventId],
  );
  const currentAdoptionId = pointer.rows[0]?.current_adoption_id ?? null;
  let currentAdoption: CanonicalCpsatOperationalPublication | null = null;
  let assignments: CanonicalCpsatAuthoritySnapshot["assignments"] = [];

  if (currentAdoptionId) {
    const adopt = await client.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_adoptions WHERE id = $1 AND event_id = $2 AND status = 'CURRENT' LIMIT 1`,
      [currentAdoptionId, eventId],
    );
    const row = adopt.rows[0];
    if (row) {
      const runId = String(row.run_id);
      const seated = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM cpsat_solver_assignments WHERE run_id = $1 AND state = 'SEATED'`,
        [runId],
      );
      const total = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM cpsat_solver_assignments WHERE run_id = $1`,
        [runId],
      );
      const seatedCount = Number(seated.rows[0]?.n ?? 0);
      const eligibleCount = Number(total.rows[0]?.n ?? 0);
      const unseatedCount = Math.max(0, eligibleCount - seatedCount);
      currentAdoption = {
        id: String(row.id),
        publicationNumber: Number(row.version ?? 1),
        editionHash: String(row.assignment_hash),
        status: "CURRENT",
        source: "CPSAT",
        runId,
        adoptionId: String(row.id),
        productResult: row.product_result == null ? null : String(row.product_result),
        evidenceGrade: row.evidence_grade == null ? null : String(row.evidence_grade),
        adoptedAt: String(row.adopted_at),
        seatedCount,
        unseatedCount,
        eligibleCount,
      };
      const asg = await client.query<{
        guest_token: string;
        position_token: string | null;
        table_token: string | null;
        state: string;
        reason_code: string | null;
      }>(
        `SELECT guest_token, position_token, table_token, state, reason_code
         FROM cpsat_solver_assignments WHERE run_id = $1`,
        [runId],
      );
      assignments = asg.rows.map((a) => ({
        guestToken: a.guest_token,
        positionToken: a.position_token,
        tableToken: a.table_token,
        state: a.state,
        reasonCode: a.reason_code,
      }));
    }
  }

  let workerReadyCount = 0;
  try {
    const ready = await findCompatibleReadyWorkers(client, {
      modelVersion: CPSAT_MODEL_VERSION,
      contractVersion: CPSAT_REQUEST_CONTRACT,
    });
    workerReadyCount = ready.length;
  } catch {
    workerReadyCount = 0;
  }

  return {
    currentAdoption,
    runs: listed.runs,
    workerReadyCount,
    assignments,
  };
}

/**
 * Overlay CP-SAT operational authority onto a seating workspace.
 * Removes legacy publication as current when a CP-SAT adoption exists;
 * when no CP-SAT adoption exists, clears legacy publication so UI shows
 * an honest CP-SAT empty state (not a legacy fallback).
 */
export function applyCanonicalCpsatAuthorityToWorkspace(
  workspace: SeatingWorkspaceView,
  authority: CanonicalCpsatAuthoritySnapshot,
  options?: { guestTokenToId?: Map<string, string>; guestLabels?: Map<string, string> },
): SeatingWorkspaceView {
  const adoptedRunId = authority.currentAdoption?.runId;

  const runsFromCpsat = authority.runs.map((cpsat) => {
    const prior = workspace.runs.find((r) => r.id === cpsat.runId);
    const extended = cpsat as CpsatSeatingRunSummary & { seed?: number | string; assignmentHash?: string | null };
    return {
      id: cpsat.runId,
      status: cpsat.lifecycle,
      seed: prior?.seed ?? String(extended.seed ?? ""),
      resultHash: extended.assignmentHash ?? prior?.resultHash,
      seated: cpsat.runId === adoptedRunId ? authority.currentAdoption?.seatedCount : prior?.seated,
      unseated: cpsat.runId === adoptedRunId ? authority.currentAdoption?.unseatedCount : prior?.unseated,
      stale: cpsat.freshness === "STALE",
      current: cpsat.runId === adoptedRunId,
      validatorVerdict: cpsat.resultStatus ?? undefined,
      startedAt: cpsat.startedAt ?? cpsat.queuedAt ?? cpsat.createdAt,
      cancelRequested: cpsat.cancelRequested,
      lifecycle: cpsat.lifecycle,
      resultStatus: cpsat.resultStatus,
      freshnessGrade: cpsat.freshness,
      evidenceGrade: cpsat.evidenceGrade,
      purpose: cpsat.purpose,
      mode: cpsat.mode,
      completedAt: cpsat.sealedAt ?? prior?.completedAt,
      progressPhase: cpsat.progressPhase,
      assignmentsHash: extended.assignmentHash ?? prior?.assignmentsHash,
      faultCode: null as string | null,
    };
  });

  // Prefer CP-SAT run list; keep non-overlapping historic rows only if they are not operational mirrors
  const cpsatIds = new Set(runsFromCpsat.map((r) => r.id));
  const historicOnly = workspace.runs.filter((r) => !cpsatIds.has(r.id)).map((r) => ({ ...r, current: false }));
  const runs = [...historicOnly, ...runsFromCpsat].sort((a, b) =>
    String(a.startedAt ?? "").localeCompare(String(b.startedAt ?? "")),
  );

  let currentPublication: Record<string, unknown> | undefined;
  let workingEdition: Record<string, unknown> | undefined = workspace.workingEdition;
  let currentRunId = workspace.currentRunId;
  let counts = { ...workspace.counts };
  let workingAssignments = workspace.workingAssignments;
  let guests = workspace.guests;

  if (authority.currentAdoption) {
    const pub = authority.currentAdoption;
    currentPublication = {
      id: pub.id,
      publicationNumber: pub.publicationNumber,
      editionHash: pub.editionHash,
      status: "CURRENT",
      source: "CPSAT",
      runId: pub.runId,
      adoptionId: pub.adoptionId,
      productResult: pub.productResult,
      evidenceGrade: pub.evidenceGrade,
      adoptedAt: pub.adoptedAt,
      seatedCount: pub.seatedCount,
      unseatedCount: pub.unseatedCount,
    };
    workingEdition = {
      id: pub.adoptionId,
      status: "PUBLISHED",
      contentHash: pub.editionHash,
      sourceRunId: pub.runId,
      version: pub.publicationNumber,
      stale: false,
      source: "CPSAT",
    };
    currentRunId = pub.runId;
    counts = {
      ...counts,
      seated: pub.seatedCount,
      unseated: pub.unseatedCount,
      eligibleGuests: Math.max(counts.eligibleGuests, pub.eligibleCount),
    };
    workingAssignments = authority.assignments.map((a) => {
      const guestId = options?.guestTokenToId?.get(a.guestToken) ?? a.guestToken;
      const guestLabel = options?.guestLabels?.get(a.guestToken) ?? a.guestToken.slice(0, 8);
      return {
        guestId,
        guestLabel,
        positionId: a.positionToken ?? undefined,
        tableId: a.tableToken ?? undefined,
        state: a.state,
        lockState: "PUBLISHED",
      };
    });
    const seatedTokens = new Set(
      authority.assignments.filter((a) => a.state === "SEATED").map((a) => a.guestToken),
    );
    guests = workspace.guests.map((g) => {
      const mappedToken =
        [...(options?.guestTokenToId?.entries() ?? [])].find(([, id]) => id === g.id)?.[0] ?? null;
      const token = mappedToken ?? (seatedTokens.has(g.id) ? g.id : null);
      const seated = token ? seatedTokens.has(token) : false;
      const asg = token
        ? authority.assignments.find((a) => a.guestToken === token && a.state === "SEATED")
        : undefined;
      return {
        ...g,
        seated: Boolean(seated),
        tableLabel: asg?.tableToken ?? g.tableLabel,
      };
    });
    // Recompute table occupancy from adopted CP-SAT assignments
  } else {
    // Honest empty: do not surface legacy publication as current
    currentPublication = undefined;
    workingEdition =
      workingEdition && (workingEdition as { source?: string }).source === "CPSAT"
        ? workingEdition
        : undefined;
  }

  const tables =
    authority.currentAdoption && authority.assignments.length
      ? workspace.tables.map((table) => ({
          ...table,
          seated: authority.assignments.filter(
            (a) =>
              a.state === "SEATED" &&
              (a.tableToken === table.id || a.tableToken === table.label),
          ).length,
        }))
      : workspace.tables;

  const attention = [...workspace.attention].filter(
    (item) =>
      !/legacy|LEGACY S06|No venue layout tables are available for seating\. Bind/i.test(item.message) ||
      item.kind === "blocker",
  );
  if (authority.currentAdoption) {
    attention.unshift({
      kind: "review" as const,
      message: `Current operational publication is CP-SAT adoption ${authority.currentAdoption.adoptionId.slice(0, 8)} (${authority.currentAdoption.seatedCount}/${authority.currentAdoption.eligibleCount} seated).`,
      href: "#publication",
    });
  } else if (authority.workerReadyCount === 0) {
    attention.unshift({
      kind: "warning" as const,
      message: "No ready solver worker is available. Seating launches remain fail-closed until a worker registers.",
      href: "#runs",
    });
  }

  const nextAction = authority.currentAdoption
    ? "Inspect the current CP-SAT operational publication."
    : workspace.nextAction?.includes("Publish the approved")
      ? "Submit a sealed CP-SAT candidate for maker-checker approval, then adopt."
      : workspace.nextAction;

  return {
    ...workspace,
    currentPublication,
    workingEdition,
    currentRunId,
    runs,
    counts,
    workingAssignments,
    guests,
    tables,
    attention,
    nextAction,
    cpsatWorkerReadyCount: authority.workerReadyCount,
    cpsatAuthoritySource: "CPSAT" as const,
  } as SeatingWorkspaceView & {
    cpsatWorkerReadyCount: number;
    cpsatAuthoritySource: "CPSAT";
  };
}

/** Idempotent cutover repair: no-op when pointer already CURRENT; used for audit receipt. */
export async function recordCanonicalCutoverRepairReceipt(
  client: PgQueryable,
  input: {
    eventId: string;
    organisationId: string;
    adoptionId: string;
    runId: string;
    correlationId: string;
  },
): Promise<{ application: "APPLIED" | "REPLAYED"; receiptId: string }> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM cpsat_cutover_repair_receipts
     WHERE event_id = $1 AND adoption_id = $2
     LIMIT 1`,
    [input.eventId, input.adoptionId],
  );
  if (existing.rows[0]) {
    return { application: "REPLAYED", receiptId: existing.rows[0].id };
  }
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO cpsat_cutover_repair_receipts (
       id, organisation_id, event_id, adoption_id, run_id, correlation_id, created_at, kind
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'CANONICAL_CPSAT_CUTOVER_REPAIR')`,
    [id, input.organisationId, input.eventId, input.adoptionId, input.runId, input.correlationId],
  );
  return { application: "APPLIED", receiptId: id };
}
