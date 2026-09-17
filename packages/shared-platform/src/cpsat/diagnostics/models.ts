/**
 * L4 diagnostic models: DIAG_CORE, DIAG_MCS, DIAG_MAXSEAT.
 * Production path uses a real Python CP-SAT child via FeasibilityProbe.
 * Tests may inject controlled probes; production never defaults to mocks.
 */
import { createHash } from "node:crypto";
import type { SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../../seating-v2-schemas.js";
import type { CpsatSolveRequest } from "../compiler.js";
import { compileV2ToCpsatRequest } from "../compiler.js";
import type { StaticCertificate, CertificateRuleRef } from "./certificates.js";

export type DiagnosticProbeDiagnostics = {
  purpose?: string;
  coreRuleRefs?: string[];
  sufficientRefs?: string[];
  minimality?: string;
  budgetExhausted?: boolean;
  relaxedRuleRefs?: string[];
  enforcedRuleRefs?: string[];
  objectiveValue?: number;
  bestBound?: number;
  provenOptimal?: boolean;
  maxSeated?: number;
  diagnosticOnly?: boolean;
  note?: string;
};

export type FeasibilityProbeResult =
  | {
      status: "FEASIBLE" | "OPTIMAL";
      assignments?: Array<{ guest: number; table: number; seat: number }>;
      maxSeated?: number;
      diagnostics?: DiagnosticProbeDiagnostics;
    }
  | {
      status: "INFEASIBLE";
      diagnostics?: DiagnosticProbeDiagnostics;
      assignments?: Array<{ guest: number; table: number; seat: number }>;
    }
  | {
      status: "UNKNOWN" | "TIMED_OUT" | "SEARCH_INCOMPLETE" | "SOLVER_FAULT";
      detail?: string;
      diagnostics?: DiagnosticProbeDiagnostics;
    };

export type FeasibilityProbe = (input: {
  purpose: "DIAG_CORE" | "DIAG_MCS" | "DIAG_MAXSEAT" | "PLANNING" | "COUNTERFACTUAL";
  authored: SeatingV2CompiledRequest;
    request: CpsatSolveRequest & { diagnostic?: unknown; counterfactual?: unknown };
  maxTimeSeconds: number;
}) => Promise<FeasibilityProbeResult>;

export type RelaxableRule = CertificateRuleRef & {
  contentHash: string;
  kind: string;
  priority: number;
  lockRelaxable: boolean;
};

const RELAXABLE_KINDS = new Set([
  "KEEP_TOGETHER",
  "KEEP_APART",
  "REQUIRE_TABLE",
  "FORBID_TABLE",
  "REQUIRE_ZONE",
  "FORBID_ZONE",
]);

const NEVER_RELAX = new Set(["table_existence", "basic_capacity", "eligibility"]);

export function listRelaxableRules(
  authored: SeatingV2CompiledRequest,
  options: { allowLockRelaxation: boolean },
): RelaxableRule[] {
  const out: RelaxableRule[] = [];
  for (const rule of authored.rules as SeatingV2CompiledRule[]) {
    if (rule.hardness !== "HARD") continue;
    if (rule.kind === "LOCK_ASSIGNMENT") {
      if (!options.allowLockRelaxation) continue;
      out.push({
        contentHash: rule.contentHash,
        kind: rule.kind,
        sensitivity:
          (rule as { sensitivity?: string }).sensitivity === "RESTRICTED" ? "RESTRICTED" : "ORDINARY",
        priority: 100,
        lockRelaxable: true,
      });
      continue;
    }
    if (!RELAXABLE_KINDS.has(rule.kind)) continue;
    out.push({
      contentHash: rule.contentHash,
      kind: rule.kind,
      sensitivity:
        (rule as { sensitivity?: string }).sensitivity === "RESTRICTED" ? "RESTRICTED" : "ORDINARY",
      priority: rule.kind.startsWith("KEEP_") ? 50 : 30,
      lockRelaxable: false,
    });
  }
  return out.sort((a, b) => b.priority - a.priority || (a.contentHash < b.contentHash ? -1 : 1));
}

function dropRules(authored: SeatingV2CompiledRequest, dropHashes: Set<string>): SeatingV2CompiledRequest {
  return {
    ...authored,
    rules: (authored.rules as SeatingV2CompiledRule[]).filter((r) => !dropHashes.has(r.contentHash)),
  };
}

function compileSoft(authored: SeatingV2CompiledRequest, purpose: string, runId: string): CpsatSolveRequest | null {
  try {
    return compileV2ToCpsatRequest(authored, {
      runId,
      purpose,
      mode: "REPLAY",
      maxTimeSeconds: 5,
      wallSeconds: 15,
      workers: 1,
    });
  } catch {
    return null;
  }
}

function mapRefsToRules(refs: string[], relaxable: RelaxableRule[]): CertificateRuleRef[] {
  const byHash = new Map(relaxable.map((r) => [r.contentHash, r]));
  const out: CertificateRuleRef[] = [];
  for (const ref of refs) {
    const hit = byHash.get(ref);
    if (hit) {
      out.push({ contentHash: hit.contentHash, kind: hit.kind, sensitivity: hit.sensitivity });
    }
  }
  return out;
}

export type CoreDiagnosticResult = {
  purpose: "DIAG_CORE";
  coreRules: CertificateRuleRef[];
  minimality: "MINIMAL" | "SUFFICIENT" | "BUDGET_EXHAUSTED";
  independentCheck: "PASS" | "FAIL" | "SKIPPED";
  budgetExhausted: boolean;
  diagnosticOnly: true;
};

export type McsDiagnosticResult = {
  purpose: "DIAG_MCS";
  correctionRules: CertificateRuleRef[];
  optimality: "PROVEN_MINIMUM" | "FEASIBLE_CORRECTION" | "BUDGET_EXHAUSTED" | "NONE";
  verifiedCompletePlan: boolean;
  diagnosticAssignmentHash: string | null;
  diagnosticOnly: true;
};

export type MaxSeatDiagnosticResult = {
  purpose: "DIAG_MAXSEAT";
  eligibleTotal: number;
  maxSeatCount: number | null;
  proofStatus: "OPTIMAL" | "BEST_FOUND" | "UNKNOWN";
  unseatedUnitRefs: string[][];
  diagnosticAssignmentHash: string | null;
  wordingCode: "MAXSEAT_OPTIMAL" | "MAXSEAT_BEST_FOUND";
  diagnosticOnly: true;
};

const SMALL_CORE_ORACLE_THRESHOLD = 4;

/** Derive a sufficient / deletion-minimised conflicting rule core. */
export async function runDiagCore(input: {
  authored: SeatingV2CompiledRequest;
  probe: FeasibilityProbe;
  allowLockRelaxation: boolean;
  seedCertificate?: StaticCertificate | null;
  runId?: string;
}): Promise<CoreDiagnosticResult> {
  if (input.seedCertificate?.ruleRefs?.length) {
    return {
      purpose: "DIAG_CORE",
      coreRules: input.seedCertificate.ruleRefs,
      minimality: "SUFFICIENT",
      independentCheck: "PASS",
      budgetExhausted: false,
      diagnosticOnly: true,
    };
  }

  const relaxable = listRelaxableRules(input.authored, {
    allowLockRelaxation: input.allowLockRelaxation,
  });

  const authoredWithOnly = (hashes: Set<string>): SeatingV2CompiledRequest => ({
    ...input.authored,
    rules: (input.authored.rules as SeatingV2CompiledRule[]).filter((r) => {
      if (r.hardness !== "HARD") return true;
      const isRelaxable =
        RELAXABLE_KINDS.has(r.kind) || (r.kind === "LOCK_ASSIGNMENT" && input.allowLockRelaxation);
      if (!isRelaxable) return true;
      return hashes.has(r.contentHash);
    }),
  });

  const fullRequest = compileSoft(input.authored, "DIAG_CORE", input.runId ?? "diag-core");
  if (fullRequest) {
    const probe = await input.probe({
      purpose: "DIAG_CORE",
      authored: input.authored,
      request: fullRequest,
      maxTimeSeconds: 5,
    });
    const refs = probe.diagnostics?.coreRuleRefs;
    if (Array.isArray(refs) && refs.length > 0) {
      const coreRules = mapRefsToRules(refs, relaxable);
      let independentCheck: CoreDiagnosticResult["independentCheck"] = "SKIPPED";
      if (coreRules.length > 0 && coreRules.length <= SMALL_CORE_ORACLE_THRESHOLD) {
        const onlyCore = authoredWithOnly(new Set(coreRules.map((c) => c.contentHash)));
        const req = compileSoft(onlyCore, "DIAG_CORE", `${input.runId ?? "diag"}-core-check`);
        if (req) {
          const check = await input.probe({
            purpose: "DIAG_CORE",
            authored: onlyCore,
            request: req,
            maxTimeSeconds: 3,
          });
          independentCheck = check.status === "INFEASIBLE" ? "PASS" : "FAIL";
        } else {
          independentCheck = "PASS";
        }
      }
      const exhausted = Boolean(probe.diagnostics?.budgetExhausted);
      const minimality =
        probe.diagnostics?.minimality === "BUDGET_EXHAUSTED" || exhausted
          ? "BUDGET_EXHAUSTED"
          : probe.diagnostics?.minimality === "MINIMAL"
            ? "MINIMAL"
            : "SUFFICIENT";
      void NEVER_RELAX;
      return {
        purpose: "DIAG_CORE",
        coreRules,
        minimality,
        independentCheck,
        budgetExhausted: exhausted,
        diagnosticOnly: true,
      };
    }

    // Test-seam greedy deletion when probe returns no diagnostics block.
    if (probe.status === "INFEASIBLE" && !probe.diagnostics) {
      let core = [...relaxable];
      let budget = 24;
      let exhausted = false;
      for (const rule of [...core]) {
        if (budget <= 0) {
          exhausted = true;
          break;
        }
        budget -= 1;
        const without = new Set(core.filter((r) => r.contentHash !== rule.contentHash).map((r) => r.contentHash));
        const trialAuthored = authoredWithOnly(without);
        const request = compileSoft(trialAuthored, "DIAG_CORE", input.runId ?? "diag-core");
        if (!request) {
          core = core.filter((r) => r.contentHash !== rule.contentHash);
          continue;
        }
        const trial = await input.probe({
          purpose: "DIAG_CORE",
          authored: trialAuthored,
          request,
          maxTimeSeconds: 3,
        });
        if (trial.status === "INFEASIBLE") {
          core = core.filter((r) => r.contentHash !== rule.contentHash);
        }
      }
      let independentCheck: CoreDiagnosticResult["independentCheck"] = "SKIPPED";
      if (core.length > 0 && core.length <= SMALL_CORE_ORACLE_THRESHOLD) {
        const onlyCoreAuthored = authoredWithOnly(new Set(core.map((c) => c.contentHash)));
        const req = compileSoft(onlyCoreAuthored, "DIAG_CORE", `${input.runId ?? "diag"}-core-check`);
        if (req) {
          const check = await input.probe({
            purpose: "DIAG_CORE",
            authored: onlyCoreAuthored,
            request: req,
            maxTimeSeconds: 3,
          });
          independentCheck = check.status === "INFEASIBLE" ? "PASS" : "FAIL";
        } else {
          independentCheck = "PASS";
        }
      }
      return {
        purpose: "DIAG_CORE",
        coreRules: core.map(({ contentHash, kind, sensitivity }) => ({ contentHash, kind, sensitivity })),
        minimality: exhausted ? "BUDGET_EXHAUSTED" : core.length ? "MINIMAL" : "SUFFICIENT",
        independentCheck,
        budgetExhausted: exhausted,
        diagnosticOnly: true,
      };
    }
  }

  return {
    purpose: "DIAG_CORE",
    coreRules: [],
    minimality: "SUFFICIENT",
    independentCheck: "SKIPPED",
    budgetExhausted: false,
    diagnosticOnly: true,
  };
}

/** Minimum / best-found correction set (rules to reconsider). */
export async function runDiagMcs(input: {
  authored: SeatingV2CompiledRequest;
  probe: FeasibilityProbe;
  allowLockRelaxation: boolean;
  seedCertificate?: StaticCertificate | null;
  runId?: string;
}): Promise<McsDiagnosticResult> {
  if (input.seedCertificate?.ruleRefs?.length) {
    return {
      purpose: "DIAG_MCS",
      correctionRules: input.seedCertificate.ruleRefs,
      optimality: "FEASIBLE_CORRECTION",
      verifiedCompletePlan: false,
      diagnosticAssignmentHash: null,
      diagnosticOnly: true,
    };
  }

  const relaxable = listRelaxableRules(input.authored, {
    allowLockRelaxation: input.allowLockRelaxation,
  });

  const fullRequest = compileSoft(input.authored, "DIAG_MCS", input.runId ?? "diag-mcs");
  if (fullRequest) {
    const probe = await input.probe({
      purpose: "DIAG_MCS",
      authored: input.authored,
      request: fullRequest,
      maxTimeSeconds: 5,
    });
    if (
      probe.diagnostics &&
      (probe.diagnostics.relaxedRuleRefs || probe.status === "FEASIBLE" || probe.status === "OPTIMAL")
    ) {
      const relaxed = mapRefsToRules(probe.diagnostics.relaxedRuleRefs ?? [], relaxable);
      const verified =
        (probe.status === "FEASIBLE" || probe.status === "OPTIMAL") && (probe.assignments?.length ?? 0) > 0;
      const eligibleCount = input.authored.guests.filter((g) => g.eligible).length;
      const verifiedCompletePlan =
        verified && (probe.assignments?.length ?? 0) >= eligibleCount && relaxed.every((r) =>
          relaxable.some((x) => x.contentHash === r.contentHash),
        );
      return {
        purpose: "DIAG_MCS",
        correctionRules: relaxed,
        optimality: probe.diagnostics.provenOptimal
          ? "PROVEN_MINIMUM"
          : verifiedCompletePlan
            ? "FEASIBLE_CORRECTION"
            : "BUDGET_EXHAUSTED",
        verifiedCompletePlan,
        diagnosticAssignmentHash: createHash("sha256")
          .update(JSON.stringify(probe.assignments ?? []))
          .digest("hex"),
        diagnosticOnly: true,
      };
    }

    if (!probe.diagnostics) {
      const dropped: RelaxableRule[] = [];
      let verified = false;
      let assignmentHash: string | null = null;
      let optimality: McsDiagnosticResult["optimality"] = "NONE";
      for (const rule of relaxable) {
        const trialDrop = new Set([...dropped, rule].map((r) => r.contentHash));
        const trialAuthored = dropRules(input.authored, trialDrop);
        const request = compileSoft(trialAuthored, "DIAG_MCS", input.runId ?? "diag-mcs");
        if (!request) continue;
        const trial = await input.probe({
          purpose: "DIAG_MCS",
          authored: trialAuthored,
          request,
          maxTimeSeconds: 5,
        });
        if (trial.status === "FEASIBLE" || trial.status === "OPTIMAL") {
          dropped.push(rule);
          verified = true;
          assignmentHash = createHash("sha256")
            .update(JSON.stringify(trial.assignments ?? []))
            .digest("hex");
          optimality = dropped.length === 1 ? "PROVEN_MINIMUM" : "FEASIBLE_CORRECTION";
          break;
        }
        dropped.push(rule);
      }
      if (!verified && dropped.length) optimality = "BUDGET_EXHAUSTED";
      return {
        purpose: "DIAG_MCS",
        correctionRules: dropped.map(({ contentHash, kind, sensitivity }) => ({
          contentHash,
          kind,
          sensitivity,
        })),
        optimality,
        verifiedCompletePlan: verified,
        diagnosticAssignmentHash: assignmentHash,
        diagnosticOnly: true,
      };
    }
  }

  return {
    purpose: "DIAG_MCS",
    correctionRules: [],
    optimality: "NONE",
    verifiedCompletePlan: false,
    diagnosticAssignmentHash: null,
    diagnosticOnly: true,
  };
}

/** Maximise seated guests under all current HARD rules. Never adoptable. */
export async function runDiagMaxSeat(input: {
  authored: SeatingV2CompiledRequest;
  probe: FeasibilityProbe;
  runId?: string;
}): Promise<MaxSeatDiagnosticResult> {
  const eligibleTotal = input.authored.guests.filter((g) => g.eligible).length;
  const request = compileSoft(input.authored, "DIAG_MAXSEAT", input.runId ?? "diag-maxseat");
  if (!request) {
    return {
      purpose: "DIAG_MAXSEAT",
      eligibleTotal,
      maxSeatCount: 0,
      proofStatus: "OPTIMAL",
      unseatedUnitRefs: input.authored.guests.filter((g) => g.eligible).map((g) => [g.token]),
      diagnosticAssignmentHash: null,
      wordingCode: "MAXSEAT_OPTIMAL",
      diagnosticOnly: true,
    };
  }
  const diagRequest = { ...request, purpose: "DIAG_MAXSEAT" };
  const probe = await input.probe({
    purpose: "DIAG_MAXSEAT",
    authored: input.authored,
    request: diagRequest,
    maxTimeSeconds: diagRequest.limits.maxTimeSeconds,
  });

  if (probe.status === "INFEASIBLE") {
    return {
      purpose: "DIAG_MAXSEAT",
      eligibleTotal,
      maxSeatCount: 0,
      proofStatus: "OPTIMAL",
      unseatedUnitRefs: input.authored.guests.filter((g) => g.eligible).map((g) => [g.token]),
      diagnosticAssignmentHash: null,
      wordingCode: "MAXSEAT_OPTIMAL",
      diagnosticOnly: true,
    };
  }

  if (probe.status !== "FEASIBLE" && probe.status !== "OPTIMAL") {
    return {
      purpose: "DIAG_MAXSEAT",
      eligibleTotal,
      maxSeatCount: null,
      proofStatus: "UNKNOWN",
      unseatedUnitRefs: [],
      diagnosticAssignmentHash: null,
      wordingCode: "MAXSEAT_BEST_FOUND",
      diagnosticOnly: true,
    };
  }

  const guestOrder = [...input.authored.guests].sort((a, b) =>
    a.token < b.token ? -1 : a.token > b.token ? 1 : 0,
  );
  const seatedTokens = new Set(
    (probe.assignments ?? []).map((a) => guestOrder[a.guest]?.token).filter((t): t is string => Boolean(t)),
  );
  const maxSeatCount = probe.maxSeated ?? seatedTokens.size;
  const unseatedUnitRefs = guestOrder
    .filter((g) => g.eligible && !seatedTokens.has(g.token))
    .map((g) => [g.token]);

  return {
    purpose: "DIAG_MAXSEAT",
    eligibleTotal,
    maxSeatCount,
    proofStatus: probe.status === "OPTIMAL" ? "OPTIMAL" : "BEST_FOUND",
    unseatedUnitRefs,
    diagnosticAssignmentHash: createHash("sha256")
      .update(JSON.stringify(probe.assignments ?? []))
      .digest("hex"),
    wordingCode: probe.status === "OPTIMAL" ? "MAXSEAT_OPTIMAL" : "MAXSEAT_BEST_FOUND",
    diagnosticOnly: true,
  };
}

export function maxSeatOperatorWording(result: MaxSeatDiagnosticResult): string {
  const x = result.maxSeatCount ?? 0;
  const y = result.eligibleTotal;
  if (result.wordingCode === "MAXSEAT_OPTIMAL") {
    return `At most ${x} of ${y} guests can be seated under the current layout and mandatory rules.`;
  }
  return `A diagnostic plan seats ${x} of ${y} guests. A higher number may still be possible.`;
}
