/**
 * Milestone 2 — validate child response, verify, explain, seal, and fenced settle.
 */
import { createHash, randomUUID } from "node:crypto";
import { exactHash } from "../eec-hash.js";
import type { PgQueryable, PgTransactor } from "../postgres-schema.js";
import { seatingV2AssignmentsHash } from "../seating-v2-hash.js";
import type { SeatingV2CompiledRequest } from "../seating-v2-schemas.js";
import { verifyCpsatAssignments } from "../cpsat-verifier/verify.js";
import { mapChildAssignmentsToV2, toChildPayload } from "./child-payload.js";
import type { CpsatSolveRequest } from "./compiler.js";
import {
  CPSAT_ENGINE_ID,
  CPSAT_MODEL_VERSION,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_REQUEST_CONTRACT,
  CPSAT_RESPONSE_CONTRACT,
  type CpsatProductResult,
} from "./contract.js";
import { CPSAT_ENGINE_EXPECTATION } from "./durable-launch.js";
import { buildExplanations, CPSAT_EXPLANATION_EDITION } from "./explanations.js";
import { verifyExplanations } from "./explanation-verifier.js";
import { canonicalizeSymmetricAssignments } from "./canonicalize.js";
import { recomputeObjectiveTiers, verifyRequiredObjectiveTiers } from "./tiers.js";
import { parseAuthoredAuthority, parseFrozenCpsatRequest } from "./authority-snapshot.js";
import { fencedSettleCpsatRun } from "./worker-lifecycle.js";

/** Lifecycles that may open a sealed candidate for review / history (Milestone 3). */
export const CPSAT_REVIEWABLE_LIFECYCLES = [
  "READY_FOR_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ADOPTED",
  "SUPERSEDED",
] as const;

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

export type ChildFinalPayload = {
  result?: string;
  faultCode?: string;
  runId?: string;
  requestHash?: string;
  contractVersion?: string;
  modelVersion?: string;
  engine?: { id?: string; ortools?: string; python?: string };
  assignments?: Array<{ guest: number; table: number; seat: number }>;
  tiers?: Array<{ tier?: string; name?: string; value?: number; proven?: boolean }>;
  byteLength?: number;
  sha256?: string;
};

export type ValidatedChildResponse =
  | { ok: true; productResult: CpsatProductResult; payload: ChildFinalPayload; responseHash: string }
  | { ok: false; fault: string; productResult: CpsatProductResult };

export function validateChildResponse(input: {
  runId: string;
  requestHash: string;
  finalPayload: ChildFinalPayload | null | undefined;
  rawFinalJson?: string;
  maxResponseBytes?: number;
}): ValidatedChildResponse {
  const payload = input.finalPayload;
  if (!payload) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):missing_final", productResult: "SOLVER_FAULT" };
  }
  const raw = input.rawFinalJson ?? JSON.stringify(payload);
  if (input.maxResponseBytes != null && Buffer.byteLength(raw, "utf8") > input.maxResponseBytes) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):oversized", productResult: "SOLVER_FAULT" };
  }
  if (payload.byteLength != null && payload.byteLength !== Buffer.byteLength(raw, "utf8")) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):byte_length_mismatch", productResult: "SOLVER_FAULT" };
  }
  if (payload.sha256) {
    const digest = createHash("sha256").update(raw).digest("hex");
    if (digest !== payload.sha256) {
      return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):sha256_mismatch", productResult: "SOLVER_FAULT" };
    }
  }
  if (payload.runId && payload.runId !== input.runId) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):run_id_mismatch", productResult: "SOLVER_FAULT" };
  }
  if (payload.requestHash && payload.requestHash !== input.requestHash) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):request_hash_mismatch", productResult: "SOLVER_FAULT" };
  }
  if (payload.contractVersion && payload.contractVersion !== CPSAT_RESPONSE_CONTRACT && payload.contractVersion !== CPSAT_REQUEST_CONTRACT) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):contract_mismatch", productResult: "SOLVER_FAULT" };
  }
  if (payload.modelVersion && payload.modelVersion !== CPSAT_MODEL_VERSION) {
    return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):model_version", productResult: "SOLVER_FAULT" };
  }
  if (payload.engine?.ortools && payload.engine.ortools !== CPSAT_ORTOOLS_VERSION) {
    // Soft: allow missing; hard-reject wrong engine when present and mismatched against expectation label.
    const expectation = `${CPSAT_ENGINE_ID}@${CPSAT_ORTOOLS_VERSION}`;
    if (payload.engine.id && !expectation.startsWith(String(payload.engine.id))) {
      return { ok: false, fault: "SOLVER_FAULT(CHILD_RESPONSE):engine_mismatch", productResult: "SOLVER_FAULT" };
    }
  }
  const productResult = String(payload.result ?? "SOLVER_FAULT") as CpsatProductResult;
  if (productResult === "SOLVER_FAULT" || productResult === "INVALID_INPUT") {
    return {
      ok: false,
      fault: `SOLVER_FAULT(${String(payload.faultCode ?? productResult)})`,
      productResult,
    };
  }
  return {
    ok: true,
    productResult,
    payload,
    responseHash: exactHash(payload),
  };
}

export type SealReadyResult = {
  lifecycle: "READY_FOR_REVIEW";
  productResult: "OPTIMAL" | "FEASIBLE";
  freshness: "CURRENT" | "STALE";
  evidenceGrade: string;
  assignmentsHash: string;
  assignmentCount: number;
  explanations: ReturnType<typeof buildExplanations>["explanations"];
  v2Assignments: ReturnType<typeof mapChildAssignmentsToV2>;
  verificationPayload: Record<string, unknown>;
};

export type ProcessChildOutcome =
  | { kind: "ready"; seal: SealReadyResult }
  | { kind: "terminal"; lifecycle: string; productResult: string; faultCode: string | null; stopReason: string; evidenceGrade: string | null }
  | { kind: "fault"; faultCode: string; stopReason: string };

export function processVerifiedCandidate(input: {
  request: CpsatSolveRequest;
  authored: SeatingV2CompiledRequest;
  productResult: CpsatProductResult;
  childAssignments: Array<{ guest: number; table: number; seat: number }>;
  childTiers?: Array<{ tier?: string; name?: string; value?: number; proven?: boolean }>;
  governedAuthorityCurrent: boolean;
}): ProcessChildOutcome {
  if (input.productResult !== "OPTIMAL" && input.productResult !== "FEASIBLE") {
    const lifecycle =
      input.productResult === "CANCELLED"
        ? "CANCELLED"
        : input.productResult === "INFEASIBLE" ||
            input.productResult === "SEARCH_INCOMPLETE" ||
            input.productResult === "TIMED_OUT" ||
            input.productResult === "INVALID_INPUT"
          ? "CLOSED_NO_PLAN"
          : "FAILED";
    return {
      kind: "terminal",
      lifecycle,
      productResult: input.productResult,
      faultCode: input.productResult === "SOLVER_FAULT" ? "SOLVER_FAULT" : null,
      stopReason: input.productResult,
      evidenceGrade: input.productResult === "INFEASIBLE" ? "PROOF" : null,
    };
  }

  if (!Array.isArray(input.childAssignments) || input.childAssignments.length === 0) {
    return { kind: "fault", faultCode: "SOLVER_FAULT(CHILD_RESPONSE):empty_assignment", stopReason: "EMPTY_ASSIGNMENT" };
  }

  const tierEvidence = verifyRequiredObjectiveTiers(input.request, input.childAssignments, input.childTiers);
  const recomputed = tierEvidence.recomputed;
  if (!tierEvidence.ok) {
    return {
      kind: "fault",
      faultCode: `SOLVER_FAULT(VERIFICATION_FAILED):${tierEvidence.fault ?? "tier_mismatch"}`,
      stopReason: "TIER_MISMATCH",
    };
  }

  const expl = buildExplanations(input.request, input.childAssignments);
  if (!expl.ok) {
    return {
      kind: "fault",
      faultCode: expl.fault ?? "SOLVER_FAULT(EXPLANATION_INVALID)",
      stopReason: "EXPLANATION_INVALID",
    };
  }
  const explCheck = verifyExplanations(input.request, input.childAssignments, expl.explanations);
  if (!explCheck.ok) {
    return { kind: "fault", faultCode: explCheck.fault, stopReason: "EXPLANATION_INVALID" };
  }

  const v2 = mapChildAssignmentsToV2(
    input.request,
    input.childAssignments,
    expl.explanations.map((e) => ({ guest: e.guest, code: e.code })),
  );
  const first = verifyCpsatAssignments(input.authored, v2);
  if (!first.ok) {
    return { kind: "fault", faultCode: "SOLVER_FAULT(VERIFICATION_FAILED)", stopReason: "VERIFICATION_FAILED" };
  }

  const canonicalChild = canonicalizeSymmetricAssignments(input.request, input.childAssignments);
  const canonicalExpl = buildExplanations(input.request, canonicalChild);
  if (!canonicalExpl.ok) {
    return {
      kind: "fault",
      faultCode: canonicalExpl.fault ?? "SOLVER_FAULT(EXPLANATION_INVALID)",
      stopReason: "EXPLANATION_INVALID",
    };
  }
  const canonicalV2 = mapChildAssignmentsToV2(
    input.request,
    canonicalChild,
    canonicalExpl.explanations.map((e) => ({ guest: e.guest, code: e.code })),
  );
  const second = verifyCpsatAssignments(input.authored, canonicalV2);
  if (!second.ok) {
    return { kind: "fault", faultCode: "SOLVER_FAULT(VERIFICATION_FAILED):canonical", stopReason: "VERIFICATION_FAILED" };
  }
  const canonicalTiers = recomputeObjectiveTiers(input.request, canonicalChild);
  if (canonicalTiers.movement !== recomputed.movement || canonicalTiers.preference !== recomputed.preference) {
    return { kind: "fault", faultCode: "SOLVER_FAULT(VERIFICATION_FAILED):tier_changed", stopReason: "TIER_MISMATCH" };
  }

  return {
    kind: "ready",
    seal: {
      lifecycle: "READY_FOR_REVIEW",
      productResult: input.productResult,
      freshness: input.governedAuthorityCurrent ? "CURRENT" : "STALE",
      evidenceGrade: input.productResult === "OPTIMAL" ? "OPTIMAL_PROOF" : "FEASIBLE_VERIFIED",
      assignmentsHash: second.assignmentsHash,
      assignmentCount: canonicalV2.filter((a) => a.state === "SEATED").length,
      explanations: canonicalExpl.explanations,
      v2Assignments: canonicalV2,
      verificationPayload: {
        firstOk: first.ok,
        secondOk: second.ok,
        seatedEligible: second.seatedEligible,
        eligibleCount: second.eligibleCount,
        tiers: canonicalTiers,
        tierVerification: verifyRequiredObjectiveTiers(input.request, canonicalChild, input.childTiers),
        engineExpectation: CPSAT_ENGINE_EXPECTATION,
      },
    },
  };
}

export async function sealAndSettleCandidate(
  client: PgQueryable,
  input: {
    runId: string;
    leaseOwner: string;
    leaseEpoch: number;
    request: CpsatSolveRequest;
    seal: SealReadyResult;
    indexMap?: Record<string, unknown>;
  },
): Promise<{ settled: boolean; reason?: string }> {
    const work = async (tx: PgQueryable): Promise<{ settled: boolean; reason?: string }> => {
    await tx.query(`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
    const locked = await tx.query<Record<string, unknown>>(
      `SELECT id, status, lease_owner, lease_epoch, request_hash, sealed_at
       FROM cpsat_solver_runs WHERE id = $1 FOR UPDATE`,
      [input.runId],
    );
    const row = locked.rows[0];
    if (!row) return { settled: false, reason: "MISSING_RUN" };
    if (String(row.status) !== "CLAIMED" && String(row.status) !== "RUNNING") {
      return { settled: false, reason: "ALREADY_TERMINAL" };
    }
    if (String(row.lease_owner) !== input.leaseOwner || Number(row.lease_epoch) !== input.leaseEpoch) {
      return { settled: false, reason: "STALE_LEASE" };
    }

    // Insert candidate + assignments + explanations before seal; failure rolls back.
    await tx.query(
      `INSERT INTO cpsat_solver_candidates (
         run_id, sealed, assignment_hash, assignment_count, payload,
         sealed_at, product_result, movement_tier, preference_tier, verification_payload
       ) VALUES ($1, FALSE, $2, $3, $4::jsonb, NULL, $5, $6, $7, $8::jsonb)
       ON CONFLICT (run_id) DO NOTHING`,
      [
        input.runId,
        input.seal.assignmentsHash,
        input.seal.assignmentCount,
        JSON.stringify({ assignments: input.seal.v2Assignments }),
        input.seal.productResult,
        (input.seal.verificationPayload.tiers as { movement: number }).movement,
        (input.seal.verificationPayload.tiers as { preference: number }).preference,
        JSON.stringify(input.seal.verificationPayload),
      ],
    );

    for (const a of input.seal.v2Assignments) {
      await tx.query(
        `INSERT INTO cpsat_solver_assignments (run_id, guest_token, position_token, table_token, state, reason_code)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (run_id, guest_token) DO NOTHING`,
        [
          input.runId,
          a.guestToken,
          a.positionToken,
          a.positionToken
            ? input.request.seats.find((s) => s.token === a.positionToken)
              ? input.request.tables[
                  input.request.seats.find((s) => s.token === a.positionToken)!.table
                ]?.token ?? null
              : null
            : null,
          a.state,
          a.typedReasonCodes[0] ?? "GLOBAL",
        ],
      );
    }

    for (const e of input.seal.explanations) {
      const guestToken = input.request.guests[e.guest]?.token;
      if (!guestToken) continue;
      await tx.query(
        `INSERT INTO cpsat_solver_explanations (run_id, guest_token, code, text, evidence, edition)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (run_id, guest_token) DO NOTHING`,
        [input.runId, guestToken, e.code, e.text, JSON.stringify(e.evidence), CPSAT_EXPLANATION_EDITION],
      );
    }

    if (input.indexMap) {
      await tx.query(
        `INSERT INTO cpsat_solver_index_maps (run_id, map_json, map_hash)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (run_id) DO NOTHING`,
        [input.runId, JSON.stringify(input.indexMap), input.request.indexMapHash],
      );
    }

    const countResult = await tx.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM cpsat_solver_assignments WHERE run_id = $1 AND state = 'SEATED'`,
      [input.runId],
    );
    const storedCount = Number(countResult.rows[0]?.n ?? 0);
    if (storedCount !== input.seal.assignmentCount) {
      throw new Error("ASSIGNMENT_COUNT_MISMATCH");
    }

    const stored = await tx.query<{ guest_token: string; position_token: string | null; state: string; reason_code: string | null }>(
      `SELECT guest_token, position_token, state, reason_code FROM cpsat_solver_assignments WHERE run_id = $1`,
      [input.runId],
    );
    const recomputedHash = seatingV2AssignmentsHash(
      stored.rows.map((r) => ({
        guestToken: r.guest_token,
        state: r.state as "SEATED" | "UNSEATED",
        positionToken: r.position_token,
        typedReasonCodes: r.reason_code ? [r.reason_code] : [],
      })),
    );
    if (recomputedHash !== input.seal.assignmentsHash) {
      throw new Error("ASSIGNMENT_HASH_MISMATCH");
    }

    await tx.query(
      `UPDATE cpsat_solver_candidates
       SET sealed = TRUE, sealed_at = NOW(), assignment_hash = $2, assignment_count = $3
       WHERE run_id = $1`,
      [input.runId, input.seal.assignmentsHash, input.seal.assignmentCount],
    );

    const settled = await fencedSettleCpsatRun(tx, {
      runId: input.runId,
      leaseOwner: input.leaseOwner,
      leaseEpoch: input.leaseEpoch,
      lifecycle: "READY_FOR_REVIEW",
      productResult: input.seal.productResult,
      stopReason: "VERIFIED_SEALED",
      freshness: input.seal.freshness,
      evidenceGrade: input.seal.evidenceGrade,
      faultCode: null,
      progressPhase: "sealed",
      assignmentsHash: input.seal.assignmentsHash,
    });
    if (!settled.settled) {
      throw new Error(settled.reason ?? "SETTLE_REJECTED");
    }
    return settled;
  };

  try {
    if (hasTransaction(client)) return await client.transaction(work);
    return await work(client);
  } catch (error) {
    return { settled: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function isCandidateReviewable(clientRow: {
  sealed: boolean | null | undefined;
  lifecycle: string;
}): boolean {
  return Boolean(clientRow.sealed) && (CPSAT_REVIEWABLE_LIFECYCLES as readonly string[]).includes(clientRow.lifecycle);
}

export async function loadReviewableCandidate(
  client: PgQueryable,
  runId: string,
): Promise<{ reviewable: boolean; assignmentHash: string | null; sealed: boolean }> {
  const run = await client.query<{ status: string }>(`SELECT status FROM cpsat_solver_runs WHERE id = $1`, [runId]);
  const cand = await client.query<{ sealed: boolean; assignment_hash: string | null }>(
    `SELECT sealed, assignment_hash FROM cpsat_solver_candidates WHERE run_id = $1`,
    [runId],
  );
  const sealed = Boolean(cand.rows[0]?.sealed);
  const lifecycle = String(run.rows[0]?.status ?? "");
  return {
    reviewable: isCandidateReviewable({ sealed, lifecycle }),
    assignmentHash: cand.rows[0]?.assignment_hash ?? null,
    sealed,
  };
}

export function buildChildRequestPayload(request: CpsatSolveRequest): Record<string, unknown> {
  return toChildPayload(request);
}

export function prepareRunForExecution(rawRequest: unknown, rawAuthority: unknown): {
  request: CpsatSolveRequest;
  authored: SeatingV2CompiledRequest;
  childPayload: Record<string, unknown>;
} {
  const request = parseFrozenCpsatRequest(rawRequest);
  if (request.contractVersion !== CPSAT_REQUEST_CONTRACT) {
    throw new Error("INVALID_INPUT:contract");
  }
  if (request.modelVersion !== CPSAT_MODEL_VERSION) {
    throw new Error("INVALID_INPUT:model_version");
  }
  const authored = parseAuthoredAuthority(rawAuthority, request);
  return { request, authored, childPayload: toChildPayload(request) };
}

export async function settleFaultOrTerminal(
  client: PgQueryable,
  input: {
    runId: string;
    leaseOwner: string;
    leaseEpoch: number;
    lifecycle: string;
    productResult: string;
    faultCode: string | null;
    stopReason: string;
    freshness?: "CURRENT" | "STALE" | "FRESH";
    evidenceGrade?: string | null;
  },
): Promise<{ settled: boolean; reason?: string }> {
  return fencedSettleCpsatRun(client, {
    runId: input.runId,
    leaseOwner: input.leaseOwner,
    leaseEpoch: input.leaseEpoch,
    lifecycle: input.lifecycle,
    productResult: input.productResult,
    stopReason: input.stopReason,
    freshness: input.freshness ?? "CURRENT",
    evidenceGrade: input.evidenceGrade ?? null,
    faultCode: input.faultCode,
    progressPhase: input.lifecycle === "CANCELLED" ? "cancelled" : "fault",
  });
}

export function incidentId(): string {
  return randomUUID();
}
