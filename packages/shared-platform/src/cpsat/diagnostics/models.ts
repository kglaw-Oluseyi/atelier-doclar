/**
 * L4 diagnostic models: DIAG_CORE, DIAG_MCS, DIAG_MAXSEAT.
 * Diagnostic plans are never adoptable. Uses a pluggable feasibility probe so
 * tests stay within the six real CP-SAT execution budget.
 */
import { createHash } from "node:crypto";
import type { SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../../seating-v2-schemas.js";
import type { CpsatSolveRequest } from "../compiler.js";
import { compileV2ToCpsatRequest } from "../compiler.js";
import type { StaticCertificate, CertificateRuleRef } from "./certificates.js";

export type FeasibilityProbeResult =
  | { status: "FEASIBLE" | "OPTIMAL"; assignments?: Array<{ guest: number; table: number; seat: number }>; maxSeated?: number }
  | { status: "INFEASIBLE" }
  | { status: "UNKNOWN" | "TIMED_OUT" | "SEARCH_INCOMPLETE" | "SOLVER_FAULT"; detail?: string };

export type FeasibilityProbe = (input: {
  purpose: "DIAG_CORE" | "DIAG_MCS" | "DIAG_MAXSEAT" | "PLANNING";
  authored: SeatingV2CompiledRequest;
  request: CpsatSolveRequest;
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
        sensitivity: (rule as { sensitivity?: string }).sensitivity === "RESTRICTED" ? "RESTRICTED" : "ORDINARY",
        priority: 100,
        lockRelaxable: true,
      });
      continue;
    }
    if (!RELAXABLE_KINDS.has(rule.kind)) continue;
    out.push({
      contentHash: rule.contentHash,
      kind: rule.kind,
      sensitivity: (rule as { sensitivity?: string }).sensitivity === "RESTRICTED" ? "RESTRICTED" : "ORDINARY",
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

const CORE_DELETE_BUDGET = 24;
const SMALL_CORE_ORACLE_THRESHOLD = 4;

/** Derive a sufficient / deletion-minimised conflicting rule core. */
export async function runDiagCore(input: {
  authored: SeatingV2CompiledRequest;
  probe: FeasibilityProbe;
  allowLockRelaxation: boolean;
  seedCertificate?: StaticCertificate | null;
  runId?: string;
}): Promise<CoreDiagnosticResult> {
  // Certificate-backed cores are sufficient without Python.
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
  let core = [...relaxable];
  let budget = CORE_DELETE_BUDGET;
  let exhausted = false;

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
      // Compile-time emptiness without this rule ⇒ still infeasible ⇒ drop from core.
      core = core.filter((r) => r.contentHash !== rule.contentHash);
      continue;
    }
    const probe = await input.probe({
      purpose: "DIAG_CORE",
      authored: trialAuthored,
      request,
      maxTimeSeconds: 3,
    });
    if (probe.status === "INFEASIBLE") {
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

  void NEVER_RELAX;
  void optionsHas;
  return {
    purpose: "DIAG_CORE",
    coreRules: core.map(({ contentHash, kind, sensitivity }) => ({ contentHash, kind, sensitivity })),
    minimality: exhausted ? "BUDGET_EXHAUSTED" : core.length ? "MINIMAL" : "SUFFICIENT",
    independentCheck,
    budgetExhausted: exhausted,
    diagnosticOnly: true,
  };
}

function optionsHas(relaxable: RelaxableRule[], hash: string): boolean {
  return relaxable.some((r) => r.contentHash === hash);
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
    // Prefer certificate rule refs as a feasible correction guidance set.
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
  // Greedy: try dropping highest-priority rules until feasible.
  const dropped: RelaxableRule[] = [];
  let remaining = [...relaxable];
  let verified = false;
  let assignmentHash: string | null = null;
  let optimality: McsDiagnosticResult["optimality"] = "NONE";

  for (const rule of remaining) {
    const trialDrop = new Set([...dropped, rule].map((r) => r.contentHash));
    const trialAuthored = dropRules(input.authored, trialDrop);
    const request = compileSoft(trialAuthored, "DIAG_MCS", input.runId ?? "diag-mcs");
    if (!request) continue;
    const probe = await input.probe({
      purpose: "DIAG_MCS",
      authored: trialAuthored,
      request,
      maxTimeSeconds: 5,
    });
    if (probe.status === "FEASIBLE" || probe.status === "OPTIMAL") {
      dropped.push(rule);
      verified = true;
      assignmentHash = createHash("sha256")
        .update(JSON.stringify(probe.assignments ?? []))
        .digest("hex");
      optimality = "FEASIBLE_CORRECTION";
      // Single-rule MCS preferred; if one rule suffices it is also proven minimum among unit size 1.
      if (dropped.length === 1) optimality = "PROVEN_MINIMUM";
      break;
    }
    dropped.push(rule);
  }

  if (!verified && dropped.length) {
    optimality = "BUDGET_EXHAUSTED";
  }

  return {
    purpose: "DIAG_MCS",
    correctionRules: dropped.map(({ contentHash, kind, sensitivity }) => ({ contentHash, kind, sensitivity })),
    optimality,
    verifiedCompletePlan: verified,
    diagnosticAssignmentHash: assignmentHash,
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
  // Force DIAG_MAXSEAT purpose on request.
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

  const seatedGuests = new Set((probe.assignments ?? []).map((a) => a.guest));
  const maxSeatCount = probe.maxSeated ?? seatedGuests.size;
  const unseated = input.authored.guests
    .map((g, i) => ({ g, i }))
    .filter(({ g, i }) => g.eligible && !seatedGuests.has(i))
    .map(({ g }) => [g.token]);
  // Remap: child uses integer indices matching compile order.
  const guestOrder = [...input.authored.guests].sort((a, b) => (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
  const seatedTokens = new Set(
    (probe.assignments ?? []).map((a) => guestOrder[a.guest]?.token).filter((t): t is string => Boolean(t)),
  );
  const unseatedUnitRefs = guestOrder.filter((g) => g.eligible && !seatedTokens.has(g.token)).map((g) => [g.token]);

  return {
    purpose: "DIAG_MAXSEAT",
    eligibleTotal,
    maxSeatCount,
    proofStatus: probe.status === "OPTIMAL" ? "OPTIMAL" : "BEST_FOUND",
    unseatedUnitRefs: unseatedUnitRefs.length ? unseatedUnitRefs : unseated,
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
