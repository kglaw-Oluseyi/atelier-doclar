/**
 * Persist infeasibility / diagnostic evidence and immutable solver incidents.
 */
import { randomUUID } from "node:crypto";
import type { PgQueryable } from "../../postgres-schema.js";
import type { StaticCertificate } from "./certificates.js";

export async function insertCpsatIncident(
  client: PgQueryable,
  input: {
    runId: string | null;
    kind: string;
    detail: Record<string, unknown>;
    at?: string;
  },
): Promise<string> {
  const id = randomUUID();
  const at = input.at ?? new Date().toISOString();
  await client.query(
    `INSERT INTO cpsat_solver_incidents (id, run_id, at, kind, detail)
     VALUES ($1, $2, $3::timestamptz, $4, $5::jsonb)`,
    [id, input.runId, at, input.kind, JSON.stringify(input.detail)],
  );
  return id;
}

export type InfeasibilityEvidenceRow = {
  runId: string;
  grade: string;
  certificateType: string | null;
  layer: string | null;
  evidenceGrade: string | null;
  certificatePayload: Record<string, unknown>;
  typescriptCheck: string | null;
  confirmationSeed?: number | null;
  confirmationResult?: string | null;
  coreRuleRefs?: unknown;
  coreMinimality?: string | null;
  correctionRuleRefs?: unknown;
  correctionOptimality?: string | null;
  maxSeatCount?: number | null;
  eligibleTotal?: number | null;
  diagnosticAssignmentHash?: string | null;
  diagnosticOnly?: boolean;
  budgetExhausted?: boolean;
  unseatedUnitRefs?: unknown;
};

export async function upsertInfeasibilityEvidence(
  client: PgQueryable,
  row: InfeasibilityEvidenceRow,
): Promise<void> {
  const now = new Date().toISOString();
  await client.query(
    `INSERT INTO cpsat_solver_infeasibility (
       run_id, grade, certificate_type, payload,
       layer, certificate_type_v2, evidence_grade, certificate_payload,
       typescript_check, confirmation_seed, confirmation_result,
       core_rule_refs, core_minimality, correction_rule_refs, correction_optimality,
       max_seat_count, eligible_total, diagnostic_assignment_hash, diagnostic_only,
       budget_exhausted, unseated_unit_refs, created_at
     ) VALUES (
       $1, $2, $3, $4::jsonb,
       $5, $6, $7, $8::jsonb,
       $9, $10, $11,
       $12::jsonb, $13, $14::jsonb, $15,
       $16, $17, $18, $19,
       $20, $21::jsonb, $22::timestamptz
     )
     ON CONFLICT (run_id) DO UPDATE SET
       grade = EXCLUDED.grade,
       certificate_type = EXCLUDED.certificate_type,
       payload = EXCLUDED.payload,
       layer = EXCLUDED.layer,
       certificate_type_v2 = EXCLUDED.certificate_type_v2,
       evidence_grade = EXCLUDED.evidence_grade,
       certificate_payload = EXCLUDED.certificate_payload,
       typescript_check = EXCLUDED.typescript_check,
       confirmation_seed = EXCLUDED.confirmation_seed,
       confirmation_result = EXCLUDED.confirmation_result,
       core_rule_refs = EXCLUDED.core_rule_refs,
       core_minimality = EXCLUDED.core_minimality,
       correction_rule_refs = EXCLUDED.correction_rule_refs,
       correction_optimality = EXCLUDED.correction_optimality,
       max_seat_count = EXCLUDED.max_seat_count,
       eligible_total = EXCLUDED.eligible_total,
       diagnostic_assignment_hash = EXCLUDED.diagnostic_assignment_hash,
       diagnostic_only = EXCLUDED.diagnostic_only,
       budget_exhausted = EXCLUDED.budget_exhausted,
       unseated_unit_refs = EXCLUDED.unseated_unit_refs`,
    [
      row.runId,
      row.grade,
      row.certificateType,
      JSON.stringify(row.certificatePayload),
      row.layer,
      row.certificateType,
      row.evidenceGrade,
      JSON.stringify(row.certificatePayload),
      row.typescriptCheck,
      row.confirmationSeed ?? null,
      row.confirmationResult ?? null,
      JSON.stringify(row.coreRuleRefs ?? null),
      row.coreMinimality ?? null,
      JSON.stringify(row.correctionRuleRefs ?? null),
      row.correctionOptimality ?? null,
      row.maxSeatCount ?? null,
      row.eligibleTotal ?? null,
      row.diagnosticAssignmentHash ?? null,
      row.diagnosticOnly !== false,
      row.budgetExhausted === true,
      JSON.stringify(row.unseatedUnitRefs ?? null),
      now,
    ],
  );
}

export async function persistCertifiedCertificate(
  client: PgQueryable,
  runId: string,
  certificate: StaticCertificate,
  typescriptCheck: "PASS" | "FAIL",
): Promise<void> {
  await upsertInfeasibilityEvidence(client, {
    runId,
    grade: certificate.evidenceGrade,
    certificateType: certificate.type,
    layer: certificate.layer,
    evidenceGrade: certificate.evidenceGrade,
    certificatePayload: {
      type: certificate.type,
      layer: certificate.layer,
      facts: certificate.facts,
      ruleRefs: certificate.ruleRefs,
    },
    typescriptCheck,
  });
}

export async function loadInfeasibilityEvidence(
  client: PgQueryable,
  runId: string,
): Promise<Record<string, unknown> | null> {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_infeasibility WHERE run_id = $1`,
    [runId],
  );
  return result.rows[0] ?? null;
}
