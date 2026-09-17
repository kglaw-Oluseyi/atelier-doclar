/**
 * Milestone 4 settlement pipeline: static certs → confirmation → L4 diagnostics.
 */
import type { PgQueryable } from "../../postgres-schema.js";
import type { SeatingV2CompiledRequest } from "../../seating-v2-schemas.js";
import type { CpsatSolveRequest } from "../compiler.js";
import { certifyOrFault } from "./certificates.js";
import {
  confirmFullModelInfeasibility,
  isDiagnosticOrRestrictedPurpose,
} from "./confirmation.js";
import { runDiagCore, runDiagMcs, runDiagMaxSeat, type FeasibilityProbe } from "./models.js";
import {
  insertCpsatIncident,
  persistCertifiedCertificate,
  upsertInfeasibilityEvidence,
} from "./persist.js";
import type { CoreDiagnosticResult, McsDiagnosticResult, MaxSeatDiagnosticResult } from "./models.js";
import type { StaticCertificate } from "./certificates.js";

export type AbnormalSettlement = {
  productResult: "INFEASIBLE" | "SOLVER_FAULT";
  lifecycle: "CLOSED_NO_PLAN" | "FAILED";
  evidenceGrade: string | null;
  faultCode: string | null;
  stopReason: string;
  certificate: StaticCertificate | null;
  core: CoreDiagnosticResult | null;
  mcs: McsDiagnosticResult | null;
  maxSeat: MaxSeatDiagnosticResult | null;
  /** When confirmation found a feasible plan — caller should verify/seal instead. */
  recoveredAssignments?: Array<{ guest: number; table: number; seat: number }>;
};

export async function settleAbnormalInfeasibility(input: {
  client: PgQueryable;
  runId: string;
  authored: SeatingV2CompiledRequest;
  request: CpsatSolveRequest;
  probe: FeasibilityProbe;
  allowLockRelaxation: boolean;
  /** When true, skip real confirmation/diag probes (static-only path). */
  staticOnly?: boolean;
}): Promise<AbnormalSettlement> {
  await input.client.query(
    `UPDATE cpsat_solver_runs SET diagnostic_phase = $2, updated_at = NOW() WHERE id = $1`,
    [input.runId, "L0_STATIC"],
  );

  const { certificate, check } = certifyOrFault(input.authored);
  if (certificate && check) {
    if (!check.ok) {
      await insertCpsatIncident(input.client, {
        runId: input.runId,
        kind: "CERTIFICATE_CHECK_FAILURE",
        detail: { fault: check.fault, detail: check.detail, type: certificate.type },
      });
      return {
        productResult: "SOLVER_FAULT",
        lifecycle: "FAILED",
        evidenceGrade: null,
        faultCode: check.fault,
        stopReason: "INCONSISTENT_PROOF",
        certificate: null,
        core: null,
        mcs: null,
        maxSeat: null,
      };
    }
    await persistCertifiedCertificate(input.client, input.runId, check.certificate, "PASS");
    const core = await runDiagCore({
      authored: input.authored,
      probe: input.probe,
      allowLockRelaxation: input.allowLockRelaxation,
      seedCertificate: check.certificate,
      runId: input.runId,
    });
    const mcs = await runDiagMcs({
      authored: input.authored,
      probe: input.probe,
      allowLockRelaxation: input.allowLockRelaxation,
      seedCertificate: check.certificate,
      runId: input.runId,
    });
    const maxSeat = input.staticOnly
      ? null
      : await runDiagMaxSeat({ authored: input.authored, probe: input.probe, runId: input.runId });
    await upsertInfeasibilityEvidence(input.client, {
      runId: input.runId,
      grade: "CERTIFIED",
      certificateType: check.certificate.type,
      layer: check.certificate.layer,
      evidenceGrade: "CERTIFIED",
      certificatePayload: {
        type: check.certificate.type,
        layer: check.certificate.layer,
        facts: check.certificate.facts,
        ruleRefs: check.certificate.ruleRefs,
      },
      typescriptCheck: "PASS",
      coreRuleRefs: core.coreRules,
      coreMinimality: core.minimality,
      correctionRuleRefs: mcs.correctionRules,
      correctionOptimality: mcs.optimality,
      maxSeatCount: maxSeat?.maxSeatCount ?? null,
      eligibleTotal: maxSeat?.eligibleTotal ?? null,
      diagnosticAssignmentHash: maxSeat?.diagnosticAssignmentHash ?? mcs.diagnosticAssignmentHash,
      diagnosticOnly: true,
      budgetExhausted: core.budgetExhausted,
      unseatedUnitRefs: maxSeat?.unseatedUnitRefs ?? null,
    });
    await input.client.query(
      `UPDATE cpsat_solver_runs SET diagnostic_phase = $2, updated_at = NOW() WHERE id = $1`,
      [input.runId, "CERTIFIED_STATIC"],
    );
    return {
      productResult: "INFEASIBLE",
      lifecycle: "CLOSED_NO_PLAN",
      evidenceGrade: "CERTIFIED",
      faultCode: null,
      stopReason: check.certificate.type,
      certificate: check.certificate,
      core,
      mcs,
      maxSeat,
    };
  }

  // No static certificate — only unrestricted full-model INFEASIBLE may continue.
  if (isDiagnosticOrRestrictedPurpose(input.request.purpose)) {
    await insertCpsatIncident(input.client, {
      runId: input.runId,
      kind: "RESTRICTED_INFEASIBLE_REJECTED",
      detail: { purpose: input.request.purpose },
    });
    return {
      productResult: "SOLVER_FAULT",
      lifecycle: "FAILED",
      evidenceGrade: null,
      faultCode: "SOLVER_FAULT(NON_AUTHORITATIVE_INFEASIBLE)",
      stopReason: "RESTRICTED_MODEL",
      certificate: null,
      core: null,
      mcs: null,
      maxSeat: null,
    };
  }

  if (input.staticOnly) {
    // Pre-search gate: no static certificate found — continue to full model.
    return {
      productResult: "SOLVER_FAULT",
      lifecycle: "FAILED",
      evidenceGrade: null,
      faultCode: null,
      stopReason: "NO_STATIC_CERTIFICATE",
      certificate: null,
      core: null,
      mcs: null,
      maxSeat: null,
    };
  }

  await input.client.query(
    `UPDATE cpsat_solver_runs SET diagnostic_phase = $2, updated_at = NOW() WHERE id = $1`,
    [input.runId, "L3_CONFIRMATION"],
  );

  const confirmation = await confirmFullModelInfeasibility({
    authored: input.authored,
    request: input.request,
    probe: input.probe,
  });

  await input.client.query(
    `UPDATE cpsat_solver_runs
     SET confirmation_seed = $2,
         confirmation_request_hash = $3,
         confirmation_response_hash = $4,
         confirmation_result = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [
      input.runId,
      confirmation.confirmationSeed,
      confirmation.confirmationRequestHash,
      confirmation.confirmationResponseHash,
      confirmation.confirmationResult,
    ],
  );

  if (confirmation.kind === "INCONSISTENT_PROOF") {
    await insertCpsatIncident(input.client, {
      runId: input.runId,
      kind: "INCONSISTENT_INFEASIBILITY_CONFIRMATION",
      detail: {
        fault: confirmation.fault,
        confirmationResult: confirmation.confirmationResult,
      },
    });
    return {
      productResult: "SOLVER_FAULT",
      lifecycle: "FAILED",
      evidenceGrade: null,
      faultCode: confirmation.fault,
      stopReason: "INCONSISTENT_PROOF",
      certificate: null,
      core: null,
      mcs: null,
      maxSeat: null,
      recoveredAssignments: confirmation.assignments,
    };
  }

  const evidenceGrade = confirmation.evidenceGrade;
  await input.client.query(
    `UPDATE cpsat_solver_runs SET diagnostic_phase = $2, updated_at = NOW() WHERE id = $1`,
    [input.runId, "L4_DIAGNOSTICS"],
  );

  const core = await runDiagCore({
    authored: input.authored,
    probe: input.probe,
    allowLockRelaxation: input.allowLockRelaxation,
    runId: input.runId,
  });
  if (core.independentCheck === "FAIL") {
    await insertCpsatIncident(input.client, {
      runId: input.runId,
      kind: "CORE_RECHECK_DISAGREEMENT",
      detail: { coreRules: core.coreRules },
    });
  }
  const mcs = await runDiagMcs({
    authored: input.authored,
    probe: input.probe,
    allowLockRelaxation: input.allowLockRelaxation,
    runId: input.runId,
  });
  const maxSeat = await runDiagMaxSeat({
    authored: input.authored,
    probe: input.probe,
    runId: input.runId,
  });

  await upsertInfeasibilityEvidence(input.client, {
    runId: input.runId,
    grade: evidenceGrade,
    certificateType: null,
    layer: "L2",
    evidenceGrade,
    certificatePayload: {
      layer: "L2",
      type: "INFEASIBLE",
      confirmation: confirmation.kind,
      limitation: confirmation.kind === "CONFIRMATION_LIMITED" ? confirmation.limitation : null,
    },
    typescriptCheck: null,
    confirmationSeed: confirmation.confirmationSeed,
    confirmationResult: confirmation.confirmationResult,
    coreRuleRefs: core.coreRules,
    coreMinimality: core.minimality,
    correctionRuleRefs: mcs.correctionRules,
    correctionOptimality: mcs.optimality,
    maxSeatCount: maxSeat.maxSeatCount,
    eligibleTotal: maxSeat.eligibleTotal,
    diagnosticAssignmentHash: maxSeat.diagnosticAssignmentHash ?? mcs.diagnosticAssignmentHash,
    diagnosticOnly: true,
    budgetExhausted: core.budgetExhausted,
    unseatedUnitRefs: maxSeat.unseatedUnitRefs,
  });

  return {
    productResult: "INFEASIBLE",
    lifecycle: "CLOSED_NO_PLAN",
    evidenceGrade,
    faultCode: null,
    stopReason: "INFEASIBLE",
    certificate: null,
    core,
    mcs,
    maxSeat,
  };
}
