/**
 * Milestone 3 — CP-SAT candidate review, maker-checker approval, governed adoption.
 *
 * Authority: cpsat_solver_runs (lifecycle) + sealed candidates + proposals + adoptions.
 * Seating V2 run row remains a projection only.
 *
 * Reuses accepted S06 permission keys and maker-checker separation:
 * - seating.view (review)
 * - seating.plan.submit (maker)
 * - seating.plan.approve (checker)
 * - seating.plan.publish (adoption / operational publication)
 *
 * Explicit boundary: sealed CP-SAT candidate → cpsat_solver_adoptions /
 * cpsat_solver_authority_pointers (operational pointer). Does not weaken V2 controls.
 */
import { randomUUID } from "node:crypto";
import { PlatformError } from "../errors.js";
import type { PermissionKey } from "../schemas.js";
import type { PgQueryable, PgTransactor } from "../postgres-schema.js";
import { seatingV2AssignmentsHash } from "../seating-v2-hash.js";
import { seatingDisclosureForRole, type SeatingDisclosure } from "../seating-workspace.js";
import {
  CPSAT_ENGINE_ID,
  CPSAT_MODEL_VERSION,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_SHORT_REASON_TEXT,
  type CpsatShortReasonCode,
} from "./contract.js";
import { parseFrozenCpsatRequest } from "./authority-snapshot.js";
import { redactExplanationForOrdinaryRole } from "./explanations.js";
import { projectSeatingV2Lifecycle } from "./worker-lifecycle.js";
import { CPSAT_REVIEWABLE_LIFECYCLES } from "./worker-settlement.js";
import { recomputeObjectiveTiers, requiredObjectiveTiers, verifyRequiredObjectiveTiers } from "./tiers.js";
import type { CpsatSolveRequest } from "./compiler.js";
import type {
  CpsatCandidateReviewModel,
  CpsatPlacementMovement,
  CpsatTierVerificationView,
} from "./client-contract.js";

export type { CpsatCandidateReviewModel, CpsatPlacementMovement, CpsatTierVerificationView } from "./client-contract.js";
export { CPSAT_REVIEWABLE_LIFECYCLES };

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

async function insertRunEvent(
  client: PgQueryable,
  runId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO cpsat_solver_run_events (id, run_id, at, kind, payload) VALUES ($1, $2, NOW(), $3, $4::jsonb)`,
    [randomUUID(), runId, kind, JSON.stringify(payload)],
  );
}

export type CpsatGovernanceActor = {
  personId: string;
  roleKey: string;
  permissions: readonly PermissionKey[] | readonly string[];
};

export type CpsatGovernedAuthoritySnapshot = {
  layoutHash: string;
  rulesHash: string;
  guestEditionHash: string;
  objectiveEditionHash: string;
  baselinePlanHash: string | null;
  holderEpoch?: number;
};

function hasPermission(actor: CpsatGovernanceActor, key: PermissionKey): boolean {
  return (actor.permissions as readonly string[]).includes(key);
}

function requirePermission(actor: CpsatGovernanceActor, key: PermissionKey): void {
  if (!hasPermission(actor, key)) {
    throw new PlatformError("FORBIDDEN", `missing permission ${key}`, {
      publicMessage: "You are not authorised for this seating action.",
    });
  }
}

function discretionMode(disclosure: SeatingDisclosure): boolean {
  return disclosure === "AUDITOR" || disclosure === "PLANNER";
}

function notFoundSafe(): never {
  throw new PlatformError("NOT_FOUND", "candidate was not found", {
    publicMessage: "That seating candidate could not be found for this event.",
  });
}

async function lockRunForEvent(
  tx: PgQueryable,
  eventId: string,
  runId: string,
): Promise<Record<string, unknown>> {
  const locked = await tx.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_runs WHERE id = $1 AND event_id = $2 FOR UPDATE`,
    [runId, eventId],
  );
  const row = locked.rows[0];
  if (!row) notFoundSafe();
  return row;
}

async function loadSealedCandidate(tx: PgQueryable, runId: string): Promise<{
  sealed: boolean;
  assignmentHash: string | null;
  assignmentCount: number | null;
  productResult: string | null;
  movementTier: number | null;
  preferenceTier: number | null;
  verificationPayload: unknown;
  sealedAt: string | null;
}> {
  const cand = await tx.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_candidates WHERE run_id = $1 FOR UPDATE`,
    [runId],
  );
  const row = cand.rows[0];
  if (!row) {
    throw new PlatformError("TRANSITION_INVALID", "sealed candidate required", {
      publicMessage: "This seating run has no sealed candidate to review.",
    });
  }
  return {
    sealed: Boolean(row.sealed),
    assignmentHash: row.assignment_hash == null ? null : String(row.assignment_hash),
    assignmentCount: row.assignment_count == null ? null : Number(row.assignment_count),
    productResult: row.product_result == null ? null : String(row.product_result),
    movementTier: row.movement_tier == null ? null : Number(row.movement_tier),
    preferenceTier: row.preference_tier == null ? null : Number(row.preference_tier),
    verificationPayload: row.verification_payload,
    sealedAt: row.sealed_at == null ? null : String(row.sealed_at),
  };
}

async function recountAndHash(
  tx: PgQueryable,
  runId: string,
): Promise<{ count: number; hash: string }> {
  const stored = await tx.query<{
    guest_token: string;
    position_token: string | null;
    state: string;
    reason_code: string | null;
  }>(`SELECT guest_token, position_token, state, reason_code FROM cpsat_solver_assignments WHERE run_id = $1`, [runId]);
  const seated = stored.rows.filter((r) => r.state === "SEATED");
  const hash = seatingV2AssignmentsHash(
    stored.rows.map((r) => ({
      guestToken: r.guest_token,
      state: r.state as "SEATED" | "UNSEATED",
      positionToken: r.position_token,
      typedReasonCodes: r.reason_code ? [r.reason_code] : [],
    })),
  );
  return { count: seated.length, hash };
}

function assertSealedIntegrity(
  candidate: Awaited<ReturnType<typeof loadSealedCandidate>>,
  recounted: { count: number; hash: string },
  expectedHash?: string,
): void {
  if (!candidate.sealed) {
    throw new PlatformError("TRANSITION_INVALID", "candidate is not sealed", {
      publicMessage: "Only a sealed verified seating candidate may be reviewed or adopted.",
    });
  }
  if (candidate.assignmentCount != null && candidate.assignmentCount !== recounted.count) {
    throw new PlatformError("VERSION_CONFLICT", "assignment row count mismatch", {
      publicMessage: "This seating candidate no longer matches its sealed assignment count.",
    });
  }
  if (candidate.assignmentHash && candidate.assignmentHash !== recounted.hash) {
    throw new PlatformError("VERSION_CONFLICT", "assignment hash mismatch", {
      publicMessage: "This seating candidate no longer matches its sealed assignment hash.",
    });
  }
  if (expectedHash && expectedHash !== recounted.hash) {
    throw new PlatformError("VERSION_CONFLICT", "supplied assignment hash mismatch", {
      publicMessage: "The seating candidate you selected no longer matches the sealed plan.",
    });
  }
}

/**
 * Re-evaluate freshness inside an adoption / submit transaction.
 * Marks STALE on the run when authority diverges; never mutates product_result.
 */
export async function reevaluateCpsatFreshness(
  tx: PgQueryable,
  run: Record<string, unknown>,
  current: CpsatGovernedAuthoritySnapshot | null | undefined,
): Promise<"CURRENT" | "STALE"> {
  if (!current) {
    const existing = String(run.freshness ?? "CURRENT");
    return existing === "STALE" ? "STALE" : "CURRENT";
  }
  const baseline = current.baselinePlanHash ?? "NO_BASELINE";
  const runBaseline = String(run.baseline_plan_hash ?? "NO_BASELINE");
  const matches =
    String(run.layout_hash ?? "") === current.layoutHash &&
    String(run.rules_hash ?? "") === current.rulesHash &&
    String(run.guest_edition_hash ?? "") === current.guestEditionHash &&
    String(run.objective_edition_hash ?? "") === current.objectiveEditionHash &&
    runBaseline === baseline;
  const freshness = matches ? "CURRENT" : "STALE";
  if (freshness === "STALE" && String(run.freshness) !== "STALE") {
    await tx.query(`UPDATE cpsat_solver_runs SET freshness = 'STALE', updated_at = NOW() WHERE id = $1`, [
      String(run.id),
    ]);
  }
  return freshness;
}

function movementFor(
  request: CpsatSolveRequest,
  guestIndex: number,
  seated: { table: number; seat: number } | null,
): CpsatPlacementMovement {
  const base = request.baseline.find((b) => b.guest === guestIndex);
  if (!seated) return base ? "RELEASED" : "UNSEATED";
  if (!base) return "NEW";
  if (base.table === seated.table && base.seat === seated.seat) return "RETAINED";
  return "MOVED";
}

export async function getCpsatCandidateReview(
  client: PgQueryable,
  input: {
    eventId: string;
    runId: string;
    actor: CpsatGovernanceActor;
    guestDisplayNames?: Record<string, string>;
    currentAuthority?: CpsatGovernedAuthoritySnapshot | null;
  },
): Promise<CpsatCandidateReviewModel> {
  requirePermission(input.actor, "seating.view");
  const disclosure = seatingDisclosureForRole(input.actor.roleKey);
  const runResult = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_runs WHERE id = $1 AND event_id = $2 LIMIT 1`,
    [input.runId, input.eventId],
  );
  const run = runResult.rows[0];
  if (!run) notFoundSafe();

  const lifecycle = String(run.status);
  if (!(CPSAT_REVIEWABLE_LIFECYCLES as readonly string[]).includes(lifecycle)) {
    throw new PlatformError("TRANSITION_INVALID", "run is not reviewable in current lifecycle", {
      publicMessage: "This seating run is not ready for review.",
    });
  }

  const cand = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_candidates WHERE run_id = $1`,
    [input.runId],
  );
  const candidateRow = cand.rows[0];
  if (!candidateRow || !Boolean(candidateRow.sealed)) {
    throw new PlatformError("TRANSITION_INVALID", "candidate is not sealed", {
      publicMessage: "Only a sealed verified seating candidate may be reviewed.",
    });
  }

  const recounted = await recountAndHash(client, input.runId);
  const sealedHash = candidateRow.assignment_hash == null ? null : String(candidateRow.assignment_hash);
  if (sealedHash !== recounted.hash) {
    throw new PlatformError("VERSION_CONFLICT", "assignment hash mismatch", {
      publicMessage: "This seating candidate no longer matches its sealed assignment hash.",
    });
  }
  if (
    candidateRow.assignment_count != null &&
    Number(candidateRow.assignment_count) !== recounted.count
  ) {
    throw new PlatformError("VERSION_CONFLICT", "assignment row count mismatch", {
      publicMessage: "This seating candidate no longer matches its sealed assignment count.",
    });
  }

  let freshness = String(run.freshness ?? "CURRENT");
  if (input.currentAuthority) {
    freshness = await reevaluateCpsatFreshness(client, run, input.currentAuthority);
  }

  const requestJson = run.request_json;
  const request = requestJson ? parseFrozenCpsatRequest(requestJson) : null;
  const assignments = await client.query<{
    guest_token: string;
    position_token: string | null;
    table_token: string | null;
    state: string;
    reason_code: string | null;
  }>(`SELECT guest_token, position_token, table_token, state, reason_code FROM cpsat_solver_assignments WHERE run_id = $1`, [
    input.runId,
  ]);
  const explanations = await client.query<{ guest_token: string; code: string; text: string }>(
    `SELECT guest_token, code, text FROM cpsat_solver_explanations WHERE run_id = $1`,
    [input.runId],
  );
  const explByGuest = new Map(explanations.rows.map((e) => [e.guest_token, e]));

  const required = request
    ? requiredObjectiveTiers(request)
    : { movement: false, preferences: false };
  let tierVerification: CpsatTierVerificationView | null = null;
  if (request) {
    const childLike = [
      candidateRow.movement_tier != null
        ? { tier: "A1_movement", value: Number(candidateRow.movement_tier) }
        : null,
      candidateRow.preference_tier != null
        ? { tier: "A2_preferences", value: Number(candidateRow.preference_tier) }
        : null,
    ].filter(Boolean) as Array<{ tier: string; value: number }>;
    const indexed = assignments.rows
      .filter((a) => a.state === "SEATED" && a.position_token)
      .map((a) => {
        const guest = request.guests.find((g) => g.token === a.guest_token);
        const seat = request.seats.find((s) => s.token === a.position_token);
        if (!guest || !seat) return null;
        return { guest: guest.i, table: seat.table, seat: seat.i };
      })
      .filter(Boolean) as Array<{ guest: number; table: number; seat: number }>;
    tierVerification = verifyRequiredObjectiveTiers(request, indexed, childLike);
    if (!tierVerification.ok) {
      throw new PlatformError("TRANSITION_INVALID", tierVerification.fault ?? "tier verification failed", {
        publicMessage: "This seating candidate failed required objective-tier verification.",
      });
    }
  }

  const tableMap = new Map<
    string,
    { capacity: number; occupied: number; reserved: boolean; locked: boolean; guestTokens: string[] }
  >();
  if (request) {
    for (const t of request.tables) {
      tableMap.set(t.token, {
        capacity: t.capacity,
        occupied: 0,
        reserved: request.reservations.some((r) => {
          const seat = request.seats[r.seat];
          return seat?.table === t.i;
        }),
        locked: request.guests.some((g) => g.lockedTable === t.i),
        guestTokens: [],
      });
    }
  }

  const placements: CpsatCandidateReviewModel["placements"] = [];
  let retained = 0;
  let moved = 0;
  let newlySeated = 0;
  let released = 0;
  const eligible = request?.guests.filter((g) => g.eligible) ?? [];
  const assignByToken = new Map(assignments.rows.map((a) => [a.guest_token, a]));

  for (const guest of eligible.length ? eligible : []) {
    const row = assignByToken.get(guest.token);
    const seatIdx =
      row?.position_token != null ? request!.seats.find((s) => s.token === row.position_token) : null;
    const seated =
      row?.state === "SEATED" && seatIdx
        ? { table: seatIdx.table, seat: seatIdx.i }
        : null;
    const movement = movementFor(request!, guest.i, seated);
    if (movement === "RETAINED") retained += 1;
    if (movement === "MOVED") moved += 1;
    if (movement === "NEW") newlySeated += 1;
    if (movement === "RELEASED") released += 1;

    const tableToken = seated ? request!.tables[seated.table]?.token ?? row?.table_token ?? null : null;
    if (tableToken && tableMap.has(tableToken) && seated) {
      const t = tableMap.get(tableToken)!;
      t.occupied += 1;
      t.guestTokens.push(guest.token);
    }

    const expl = explByGuest.get(guest.token);
    const code = (expl?.code ?? row?.reason_code ?? "GLOBAL") as CpsatShortReasonCode;
    const redacted = redactExplanationForOrdinaryRole(
      {
        guest: guest.i,
        code: (CPSAT_SHORT_REASON_TEXT[code] ? code : "GLOBAL") as CpsatShortReasonCode,
        text: expl?.text ?? CPSAT_SHORT_REASON_TEXT.GLOBAL,
        evidence: {},
      },
      discretionMode(disclosure),
    );

    const showName = disclosure !== "AUDITOR";
    placements.push({
      guestToken: guest.token,
      displayName: showName ? input.guestDisplayNames?.[guest.token] ?? null : null,
      partyContext: disclosure === "CEO" || disclosure === "DIRECTOR" || disclosure === "ADMIN" ? null : null,
      tableToken,
      seatToken: row?.position_token ?? null,
      reasonCode: redacted.code,
      reasonText: redacted.text,
      movement,
      warning: null,
    });
  }

  // Fallback when request missing: surface stored assignments only
  if (!request) {
    for (const row of assignments.rows) {
      const expl = explByGuest.get(row.guest_token);
      const code = (expl?.code ?? row.reason_code ?? "GLOBAL") as CpsatShortReasonCode;
      const redacted = redactExplanationForOrdinaryRole(
        {
          guest: 0,
          code: (CPSAT_SHORT_REASON_TEXT[code] ? code : "GLOBAL") as CpsatShortReasonCode,
          text: expl?.text ?? CPSAT_SHORT_REASON_TEXT.GLOBAL,
          evidence: {},
        },
        discretionMode(disclosure),
      );
      placements.push({
        guestToken: row.guest_token,
        displayName: disclosure !== "AUDITOR" ? input.guestDisplayNames?.[row.guest_token] ?? null : null,
        partyContext: null,
        tableToken: row.table_token,
        seatToken: row.position_token,
        reasonCode: redacted.code,
        reasonText: redacted.text,
        movement: row.state === "SEATED" ? "NEW" : "UNSEATED",
        warning: null,
      });
    }
  }

  const proposal = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_proposals
     WHERE run_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.runId],
  );
  const prop = proposal.rows[0];
  const adoption = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_adoptions WHERE run_id = $1 ORDER BY adopted_at DESC LIMIT 1`,
    [input.runId],
  );
  const adopt = adoption.rows[0];
  const pointer = await client.query<{ current_adoption_id: string | null }>(
    `SELECT current_adoption_id FROM cpsat_solver_authority_pointers WHERE event_id = $1`,
    [input.eventId],
  );
  const currentAdoptionId = pointer.rows[0]?.current_adoption_id ?? null;
  let currentAssignmentHash: string | null = null;
  if (currentAdoptionId) {
    const cur = await client.query<{ assignment_hash: string }>(
      `SELECT assignment_hash FROM cpsat_solver_adoptions WHERE id = $1`,
      [currentAdoptionId],
    );
    currentAssignmentHash = cur.rows[0]?.assignment_hash ?? null;
  }

  const seatedGuestCount = recounted.count;
  const eligibleGuestCount = eligible.length || assignments.rows.length;
  const unseatedGuestCount = Math.max(0, eligibleGuestCount - seatedGuestCount);
  const movementValue =
    candidateRow.movement_tier != null
      ? Number(candidateRow.movement_tier)
      : request
        ? recomputeObjectiveTiers(
            request,
            assignments.rows
              .map((a) => {
                const g = request.guests.find((x) => x.token === a.guest_token);
                const s = a.position_token ? request.seats.find((x) => x.token === a.position_token) : null;
                return g && s && a.state === "SEATED" ? { guest: g.i, table: s.table, seat: s.i } : null;
              })
              .filter(Boolean) as Array<{ guest: number; table: number; seat: number }>,
          ).movement
        : null;
  const preferenceValue =
    candidateRow.preference_tier != null ? Number(candidateRow.preference_tier) : null;

  const canSubmit =
    hasPermission(input.actor, "seating.plan.submit") &&
    lifecycle === "READY_FOR_REVIEW" &&
    freshness === "CURRENT";
  const canDecide =
    hasPermission(input.actor, "seating.plan.approve") &&
    lifecycle === "PENDING_APPROVAL" &&
    prop != null &&
    String(prop.status) === "PENDING" &&
    String(prop.maker_actor) !== input.actor.personId;
  const canAdopt =
    hasPermission(input.actor, "seating.plan.publish") &&
    lifecycle === "APPROVED" &&
    freshness === "CURRENT";

  return {
    runId: input.runId,
    candidateId: input.runId,
    assignmentHash: recounted.hash,
    engineIdentity: `${CPSAT_ENGINE_ID}@${CPSAT_ORTOOLS_VERSION}`,
    modelVersion: String(run.model_version ?? CPSAT_MODEL_VERSION),
    resultStatus: run.product_result == null ? null : String(run.product_result),
    lifecycle,
    freshness,
    evidenceGrade: run.evidence_grade == null ? null : String(run.evidence_grade),
    eligibleGuestCount,
    seatedGuestCount,
    unseatedGuestCount,
    hardRuleVerification: "PASS",
    movementTier: {
      value: movementValue,
      required: required.movement,
      proofStatus: required.movement ? (movementValue != null ? "VERIFIED" : "MISSING") : "N_A",
    },
    preferenceTier: {
      value: preferenceValue,
      required: required.preferences,
      proofStatus: required.preferences ? (preferenceValue != null ? "VERIFIED" : "MISSING") : "N_A",
    },
    tierVerification,
    createdAt: run.created_at == null ? null : String(run.created_at),
    startedAt: run.started_at == null ? null : String(run.started_at),
    completedAt: run.sealed_at == null ? null : String(run.sealed_at),
    sealedAt: candidateRow.sealed_at == null ? null : String(candidateRow.sealed_at),
    tables: [...tableMap.entries()].map(([tableToken, t]) => ({
      tableToken,
      capacity: t.capacity,
      occupied: t.occupied,
      available: Math.max(0, t.capacity - t.occupied),
      reserved: t.reserved,
      locked: t.locked,
      guestTokens: t.guestTokens,
    })),
    placements,
    changeComparison: {
      retained,
      moved,
      newlySeated,
      released,
      tableChanges: [...tableMap.entries()].map(([tableToken, t]) => ({
        tableToken,
        delta: t.occupied,
      })),
    },
    ruleAssurance: {
      hardRulesSatisfied: true,
      categories: [
        { category: "HARD", status: "SATISFIED" },
        { category: "CAPACITY", status: "SATISFIED" },
      ],
    },
    approvalHistory: {
      proposalId: prop ? String(prop.id) : null,
      submission: prop
        ? { makerActor: String(prop.maker_actor), at: String(prop.maker_at) }
        : null,
      decision:
        prop && prop.decision
          ? {
              checkerActor: String(prop.checker_actor ?? ""),
              at: String(prop.checker_at ?? ""),
              decision: String(prop.decision),
              reason: prop.rejection_reason == null ? null : String(prop.rejection_reason),
            }
          : null,
      adoption: adopt
        ? {
            adoptionId: String(adopt.id),
            version: Number(adopt.version ?? 1),
            at: String(adopt.adopted_at),
            status: String(adopt.status ?? "CURRENT"),
            supersedesAdoptionId: adopt.supersedes_adoption_id == null ? null : String(adopt.supersedes_adoption_id),
          }
        : null,
    },
    operationalComparison: {
      currentAdoptionId,
      currentAssignmentHash,
      differsFromCandidate:
        currentAssignmentHash == null ? null : currentAssignmentHash !== recounted.hash,
    },
    actions: {
      canSubmit,
      canApprove: canDecide,
      canReject: canDecide,
      canAdopt,
    },
  };
}

export async function submitCpsatCandidateForApproval(
  client: PgQueryable,
  input: {
    eventId: string;
    runId: string;
    candidateId: string;
    assignmentHash: string;
    actor: CpsatGovernanceActor;
    organisationId: string;
    currentAuthority?: CpsatGovernedAuthoritySnapshot | null;
  },
): Promise<{ proposalId: string; lifecycle: string; application: "APPLIED" | "REPLAYED" }> {
  requirePermission(input.actor, "seating.plan.submit");
  if (input.candidateId !== input.runId) {
    throw new PlatformError("VALIDATION_FAILED", "candidate id must match run id", {
      publicMessage: "The seating candidate identity does not match this run.",
    });
  }

  const work = async (tx: PgQueryable) => {
    await tx.query(`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
    const run = await lockRunForEvent(tx, input.eventId, input.runId);
    const candidate = await loadSealedCandidate(tx, input.runId);
    const recounted = await recountAndHash(tx, input.runId);
    assertSealedIntegrity(candidate, recounted, input.assignmentHash);

    if (String(run.status) !== "READY_FOR_REVIEW" && String(run.status) !== "REJECTED") {
      // Idempotent replay when already pending with same hash
      if (String(run.status) === "PENDING_APPROVAL") {
        const existing = await tx.query<Record<string, unknown>>(
          `SELECT * FROM cpsat_solver_proposals
           WHERE run_id = $1 AND assignment_hash = $2 AND status = 'PENDING'
           ORDER BY created_at DESC LIMIT 1`,
          [input.runId, input.assignmentHash],
        );
        if (existing.rows[0]) {
          return {
            proposalId: String(existing.rows[0].id),
            lifecycle: "PENDING_APPROVAL",
            application: "REPLAYED" as const,
          };
        }
      }
      throw new PlatformError("TRANSITION_INVALID", "run is not ready for submission", {
        publicMessage: "This seating candidate cannot be submitted for approval in its current state.",
      });
    }

    const product = String(run.product_result ?? candidate.productResult ?? "");
    if (product !== "OPTIMAL" && product !== "FEASIBLE") {
      throw new PlatformError("TRANSITION_INVALID", "result is not adoptable", {
        publicMessage: "Only an optimal or feasible seating candidate may be submitted.",
      });
    }

    const freshness = await reevaluateCpsatFreshness(tx, run, input.currentAuthority);
    if (freshness !== "CURRENT") {
      throw new PlatformError("TRANSITION_INVALID", "candidate authority is stale", {
        publicMessage: "Governing seating inputs changed. Launch a new run before submitting.",
      });
    }

    const priorSame = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_proposals
       WHERE run_id = $1 AND assignment_hash = $2 AND status IN ('PENDING', 'APPROVED')
       ORDER BY created_at DESC LIMIT 1`,
      [input.runId, input.assignmentHash],
    );
    if (priorSame.rows[0]) {
      return {
        proposalId: String(priorSame.rows[0].id),
        lifecycle: String(run.status) === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : String(run.status),
        application: "REPLAYED" as const,
      };
    }

    // Different hash must not reuse an old pending proposal
    await tx.query(
      `UPDATE cpsat_solver_proposals SET status = 'SUPERSEDED', updated_at = NOW()
       WHERE run_id = $1 AND status = 'PENDING' AND assignment_hash <> $2`,
      [input.runId, input.assignmentHash],
    );

    const proposalId = randomUUID();
    const now = new Date().toISOString();
    await tx.query(
      `INSERT INTO cpsat_solver_proposals (
         id, event_id, organisation_id, run_id, candidate_id, assignment_hash, status,
         maker_actor, maker_at, layout_hash, rules_hash, guest_edition_hash, objective_edition_hash,
         baseline_plan_hash, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,$9,$10,$11,$12,$13,$8,$8)`,
      [
        proposalId,
        input.eventId,
        input.organisationId,
        input.runId,
        input.candidateId,
        recounted.hash,
        input.actor.personId,
        now,
        String(run.layout_hash ?? ""),
        String(run.rules_hash ?? ""),
        String(run.guest_edition_hash ?? ""),
        String(run.objective_edition_hash ?? ""),
        run.baseline_plan_hash == null ? null : String(run.baseline_plan_hash),
      ],
    );

    await tx.query(
      `UPDATE cpsat_solver_runs SET status = 'PENDING_APPROVAL', updated_at = $2 WHERE id = $1`,
      [input.runId, now],
    );
    await projectSeatingV2Lifecycle(tx, {
      runId: input.runId,
      lifecycle: "PENDING_APPROVAL",
      productResult: product,
      leaseOwner: null,
      leaseUntil: null,
      assignmentsHash: recounted.hash,
      completed: true,
    });
    await insertRunEvent(tx, input.runId, "SUBMITTED_FOR_APPROVAL", {
      actorPersonId: input.actor.personId,
      eventId: input.eventId,
      runId: input.runId,
      candidateId: input.candidateId,
      assignmentHash: recounted.hash,
      proposalId,
      action: "cpsat.candidate.submit",
    });

    return { proposalId, lifecycle: "PENDING_APPROVAL", application: "APPLIED" as const };
  };

  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}

export async function decideCpsatCandidateApproval(
  client: PgQueryable,
  input: {
    eventId: string;
    runId: string;
    candidateId: string;
    assignmentHash: string;
    proposalId: string;
    decision: "APPROVED" | "REJECTED";
    reason?: string;
    actor: CpsatGovernanceActor;
    currentAuthority?: CpsatGovernedAuthoritySnapshot | null;
  },
): Promise<{ proposalId: string; lifecycle: string; decision: "APPROVED" | "REJECTED" }> {
  requirePermission(input.actor, "seating.plan.approve");
  if (input.decision === "REJECTED") {
    const reason = (input.reason ?? "").trim();
    if (reason.length < 3) {
      throw new PlatformError("VALIDATION_FAILED", "rejection reason required", {
        publicMessage: "Provide a concise reason when rejecting a seating candidate.",
      });
    }
  }

  const work = async (tx: PgQueryable) => {
    await tx.query(`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
    const run = await lockRunForEvent(tx, input.eventId, input.runId);
    const candidate = await loadSealedCandidate(tx, input.runId);
    const recounted = await recountAndHash(tx, input.runId);
    assertSealedIntegrity(candidate, recounted, input.assignmentHash);

    if (String(run.status) !== "PENDING_APPROVAL") {
      throw new PlatformError("TRANSITION_INVALID", "proposal is not pending", {
        publicMessage: "This seating candidate is not awaiting approval.",
      });
    }

    const propResult = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_proposals WHERE id = $1 AND run_id = $2 FOR UPDATE`,
      [input.proposalId, input.runId],
    );
    const prop = propResult.rows[0];
    if (!prop || String(prop.status) !== "PENDING") {
      throw new PlatformError("TRANSITION_INVALID", "proposal is not pending", {
        publicMessage: "This approval request is no longer pending.",
      });
    }
    if (String(prop.assignment_hash) !== recounted.hash || String(prop.candidate_id) !== input.candidateId) {
      throw new PlatformError("VERSION_CONFLICT", "proposal binding mismatch", {
        publicMessage: "The approval request no longer matches the sealed seating candidate.",
      });
    }
    if (String(prop.maker_actor) === input.actor.personId) {
      throw new PlatformError("FORBIDDEN", "maker cannot approve own proposal", {
        publicMessage: "A different authorised person must approve this seating candidate.",
      });
    }

    const product = String(run.product_result ?? candidate.productResult ?? "");
    if (product !== "OPTIMAL" && product !== "FEASIBLE") {
      throw new PlatformError("TRANSITION_INVALID", "result is not adoptable", {
        publicMessage: "Only an optimal or feasible seating candidate may be approved.",
      });
    }

    const freshness = await reevaluateCpsatFreshness(tx, run, input.currentAuthority);
    if (input.decision === "APPROVED" && freshness !== "CURRENT") {
      throw new PlatformError("TRANSITION_INVALID", "candidate authority is stale", {
        publicMessage: "Governing seating inputs changed. Approval is blocked.",
      });
    }

    const now = new Date().toISOString();
    if (input.decision === "APPROVED") {
      await tx.query(
        `UPDATE cpsat_solver_proposals
         SET status = 'APPROVED', decision = 'APPROVED', checker_actor = $2, checker_at = $3,
             rejection_reason = NULL, updated_at = $3
         WHERE id = $1`,
        [input.proposalId, input.actor.personId, now],
      );
      await tx.query(`UPDATE cpsat_solver_runs SET status = 'APPROVED', updated_at = $2 WHERE id = $1`, [
        input.runId,
        now,
      ]);
      await projectSeatingV2Lifecycle(tx, {
        runId: input.runId,
        lifecycle: "APPROVED",
        productResult: product,
        leaseOwner: null,
        leaseUntil: null,
        assignmentsHash: recounted.hash,
        completed: true,
      });
      await insertRunEvent(tx, input.runId, "APPROVAL_DECIDED", {
        actorPersonId: input.actor.personId,
        makerActor: String(prop.maker_actor),
        decision: "APPROVED",
        proposalId: input.proposalId,
        assignmentHash: recounted.hash,
        action: "cpsat.candidate.approve",
      });
      return { proposalId: input.proposalId, lifecycle: "APPROVED", decision: "APPROVED" as const };
    }

    const reason = (input.reason ?? "").trim();
    await tx.query(
      `UPDATE cpsat_solver_proposals
       SET status = 'REJECTED', decision = 'REJECTED', checker_actor = $2, checker_at = $3,
           rejection_reason = $4, updated_at = $3
       WHERE id = $1`,
      [input.proposalId, input.actor.personId, now, reason],
    );
    // Preserve sealed candidate; return to reviewable rejected state for governed resubmission.
    await tx.query(`UPDATE cpsat_solver_runs SET status = 'REJECTED', updated_at = $2 WHERE id = $1`, [
      input.runId,
      now,
    ]);
    await projectSeatingV2Lifecycle(tx, {
      runId: input.runId,
      lifecycle: "REJECTED",
      productResult: product,
      leaseOwner: null,
      leaseUntil: null,
      assignmentsHash: recounted.hash,
      completed: true,
    });
    await insertRunEvent(tx, input.runId, "APPROVAL_DECIDED", {
      actorPersonId: input.actor.personId,
      makerActor: String(prop.maker_actor),
      decision: "REJECTED",
      reason,
      proposalId: input.proposalId,
      assignmentHash: recounted.hash,
      action: "cpsat.candidate.reject",
    });
    return { proposalId: input.proposalId, lifecycle: "REJECTED", decision: "REJECTED" as const };
  };

  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}

export async function adoptApprovedCpsatCandidate(
  client: PgQueryable,
  input: {
    eventId: string;
    runId: string;
    candidateId: string;
    approvalId: string;
    assignmentHash?: string;
    actor: CpsatGovernanceActor;
    organisationId: string;
    currentAuthority: CpsatGovernedAuthoritySnapshot;
  },
): Promise<{
  adoptionId: string;
  version: number;
  assignmentHash: string;
  adoptedAt: string;
  makerActor: string;
  checkerActor: string;
  adoptingActor: string;
  supersededAdoptionId: string | null;
  freshnessAtAdoption: string;
  productResult: string;
  evidenceGrade: string | null;
  application: "APPLIED" | "REPLAYED";
}> {
  requirePermission(input.actor, "seating.plan.publish");

  const work = async (tx: PgQueryable) => {
    await tx.query(`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
    const run = await lockRunForEvent(tx, input.eventId, input.runId);
    const candidate = await loadSealedCandidate(tx, input.runId);
    const recounted = await recountAndHash(tx, input.runId);
    assertSealedIntegrity(candidate, recounted, input.assignmentHash);

    const propResult = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_proposals WHERE id = $1 AND run_id = $2 FOR UPDATE`,
      [input.approvalId, input.runId],
    );
    const prop = propResult.rows[0];
    if (!prop) {
      throw new PlatformError("NOT_FOUND", "approval not found", {
        publicMessage: "That seating approval could not be found.",
      });
    }

    // Idempotent: already adopted for this proposal
    const existingAdoption = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_adoptions WHERE proposal_id = $1 AND status = 'CURRENT' LIMIT 1`,
      [input.approvalId],
    );
    if (existingAdoption.rows[0] && String(run.status) === "ADOPTED") {
      const row = existingAdoption.rows[0];
      return {
        adoptionId: String(row.id),
        version: Number(row.version ?? 1),
        assignmentHash: String(row.assignment_hash),
        adoptedAt: String(row.adopted_at),
        makerActor: String(row.maker_actor),
        checkerActor: String(row.checker_actor),
        adoptingActor: String(row.adopting_actor ?? row.checker_actor),
        supersededAdoptionId: row.supersedes_adoption_id == null ? null : String(row.supersedes_adoption_id),
        freshnessAtAdoption: String(row.freshness_at_adoption ?? "CURRENT"),
        productResult: String(row.product_result ?? run.product_result ?? ""),
        evidenceGrade: row.evidence_grade == null ? null : String(row.evidence_grade),
        application: "REPLAYED" as const,
      };
    }

    if (String(prop.status) !== "APPROVED" || String(prop.decision) !== "APPROVED") {
      throw new PlatformError("TRANSITION_INVALID", "proposal is not approved", {
        publicMessage: "Only an approved seating candidate may be adopted.",
      });
    }
    if (String(run.status) !== "APPROVED") {
      throw new PlatformError("TRANSITION_INVALID", "run is not approved", {
        publicMessage: "This seating candidate is not in an adoptable state.",
      });
    }
    if (String(prop.assignment_hash) !== recounted.hash || String(prop.candidate_id) !== input.candidateId) {
      throw new PlatformError("VERSION_CONFLICT", "approval binding mismatch", {
        publicMessage: "The approval no longer matches the sealed seating candidate.",
      });
    }
    if (String(prop.maker_actor) === String(prop.checker_actor)) {
      throw new PlatformError("FORBIDDEN", "maker and checker must differ", {
        publicMessage: "Maker and checker must be different people.",
      });
    }

    const product = String(run.product_result ?? candidate.productResult ?? "");
    if (product !== "OPTIMAL" && product !== "FEASIBLE") {
      throw new PlatformError("TRANSITION_INVALID", "result is not adoptable", {
        publicMessage: "Only an optimal or feasible seating candidate may be adopted.",
      });
    }

    const pointer = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_authority_pointers WHERE event_id = $1 FOR UPDATE`,
      [input.eventId],
    );
    const pointerRow = pointer.rows[0];
    const holderEpoch = Number(pointerRow?.holder_epoch ?? 0);
    if (input.currentAuthority.holderEpoch != null && input.currentAuthority.holderEpoch !== holderEpoch) {
      throw new PlatformError("VERSION_CONFLICT", "holder epoch mismatch", {
        publicMessage: "Another seating publication changed while adopting. Retry against current authority.",
      });
    }

    const freshness = await reevaluateCpsatFreshness(tx, run, input.currentAuthority);
    if (freshness !== "CURRENT") {
      throw new PlatformError("TRANSITION_INVALID", "candidate authority is stale", {
        publicMessage: "Governing seating inputs changed. The previous operational plan remains active.",
      });
    }

    // Verify frozen identities still match governed snapshot
    const baseline = input.currentAuthority.baselinePlanHash ?? "NO_BASELINE";
    const runBaseline = String(run.baseline_plan_hash ?? "NO_BASELINE");
    if (
      String(run.layout_hash ?? "") !== input.currentAuthority.layoutHash ||
      String(run.rules_hash ?? "") !== input.currentAuthority.rulesHash ||
      String(run.guest_edition_hash ?? "") !== input.currentAuthority.guestEditionHash ||
      String(run.objective_edition_hash ?? "") !== input.currentAuthority.objectiveEditionHash ||
      runBaseline !== baseline
    ) {
      await tx.query(`UPDATE cpsat_solver_runs SET freshness = 'STALE', updated_at = NOW() WHERE id = $1`, [
        input.runId,
      ]);
      throw new PlatformError("TRANSITION_INVALID", "authority changed after approval", {
        publicMessage: "Governing seating inputs changed after approval. The previous operational plan remains active.",
      });
    }

    const priorCurrent = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_adoptions WHERE event_id = $1 AND status = 'CURRENT' FOR UPDATE`,
      [input.eventId],
    );
    const previous = priorCurrent.rows[0] ?? null;
    const version = previous ? Number(previous.version ?? 1) + 1 : 1;
    const adoptionId = randomUUID();
    const now = new Date().toISOString();
    const evidenceGrade = run.evidence_grade == null ? null : String(run.evidence_grade);

    if (previous) {
      await tx.query(
        `UPDATE cpsat_solver_adoptions SET status = 'SUPERSEDED' WHERE id = $1 AND status = 'CURRENT'`,
        [String(previous.id)],
      );
    }

    await tx.query(
      `INSERT INTO cpsat_solver_adoptions (
         id, run_id, event_id, organisation_id, candidate_id, proposal_id, approval_id,
         adopted_at, assignment_hash, maker_actor, checker_actor, adopting_actor,
         holder_epoch, status, version, supersedes_adoption_id, freshness_at_adoption,
         product_result, evidence_grade, layout_hash, rules_hash, guest_edition_hash,
         objective_edition_hash, baseline_plan_hash
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$11,$12,'CURRENT',$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
       )`,
      [
        adoptionId,
        input.runId,
        input.eventId,
        input.organisationId,
        input.candidateId,
        input.approvalId,
        now,
        recounted.hash,
        String(prop.maker_actor),
        String(prop.checker_actor),
        input.actor.personId,
        holderEpoch,
        version,
        previous ? String(previous.id) : null,
        freshness,
        product,
        evidenceGrade,
        String(run.layout_hash ?? ""),
        String(run.rules_hash ?? ""),
        String(run.guest_edition_hash ?? ""),
        String(run.objective_edition_hash ?? ""),
        run.baseline_plan_hash == null ? null : String(run.baseline_plan_hash),
      ],
    );

    if (pointerRow) {
      await tx.query(
        `UPDATE cpsat_solver_authority_pointers
         SET current_adoption_id = $2, holder_epoch = holder_epoch + 1, updated_at = $3
         WHERE event_id = $1`,
        [input.eventId, adoptionId, now],
      );
    } else {
      await tx.query(
        `INSERT INTO cpsat_solver_authority_pointers (event_id, current_adoption_id, holder, holder_epoch, updated_at)
         VALUES ($1, $2, 'CENTRAL', 1, $3)`,
        [input.eventId, adoptionId, now],
      );
    }

    // Supersede prior adopted CP-SAT runs for this event (lifecycle only; rows retained).
    if (previous && String(previous.run_id) !== input.runId) {
      await tx.query(
        `UPDATE cpsat_solver_runs SET status = 'SUPERSEDED', updated_at = $2
         WHERE id = $1 AND status = 'ADOPTED'`,
        [String(previous.run_id), now],
      );
    }

    await tx.query(`UPDATE cpsat_solver_runs SET status = 'ADOPTED', updated_at = $2 WHERE id = $1`, [
      input.runId,
      now,
    ]);
    await projectSeatingV2Lifecycle(tx, {
      runId: input.runId,
      lifecycle: "ADOPTED",
      productResult: product,
      leaseOwner: null,
      leaseUntil: null,
      assignmentsHash: recounted.hash,
      completed: true,
    });
    await insertRunEvent(tx, input.runId, "ADOPTED", {
      actorPersonId: input.actor.personId,
      makerActor: String(prop.maker_actor),
      checkerActor: String(prop.checker_actor),
      adoptionId,
      proposalId: input.approvalId,
      assignmentHash: recounted.hash,
      supersededAdoptionId: previous ? String(previous.id) : null,
      action: "cpsat.candidate.adopt",
    });

    return {
      adoptionId,
      version,
      assignmentHash: recounted.hash,
      adoptedAt: now,
      makerActor: String(prop.maker_actor),
      checkerActor: String(prop.checker_actor),
      adoptingActor: input.actor.personId,
      supersededAdoptionId: previous ? String(previous.id) : null,
      freshnessAtAdoption: freshness,
      productResult: product,
      evidenceGrade,
      application: "APPLIED" as const,
    };
  };

  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}
