/**
 * Infeasibility / incomplete-search operator experience copy and presentation model.
 * Never claims percentage complete, ETA, or impossibility without proof.
 */
import type { CertificateRuleRef, StaticCertificate } from "./certificates.js";
import type { CoreDiagnosticResult, McsDiagnosticResult, MaxSeatDiagnosticResult } from "./models.js";
import { maxSeatOperatorWording } from "./models.js";

export type InfeasibilityExperienceModel = {
  resultCode: "INFEASIBLE" | "SEARCH_INCOMPLETE" | "TIMED_OUT";
  evidenceGrade: string | null;
  primaryMessage: string;
  supportingMessage: string;
  sections: {
    resultAndGrade: string;
    whatConflicts: string;
    plainExplanation: string;
    affectedGroups: Array<{ label: string; restricted: boolean }>;
    correctionOptions: Array<{ ruleRef: string; kind: string; restricted: boolean; provenMinimum: boolean }>;
    maximumSeating: string | null;
    limitations: string[];
    actions: string[];
  };
  showPercentComplete: false;
  showHeuristicFallback: false;
  adoptable: false;
};

export function buildInfeasibilityExperience(input: {
  productResult: "INFEASIBLE" | "SEARCH_INCOMPLETE" | "TIMED_OUT";
  evidenceGrade: string | null;
  certificate?: StaticCertificate | null;
  core?: CoreDiagnosticResult | null;
  mcs?: McsDiagnosticResult | null;
  maxSeat?: MaxSeatDiagnosticResult | null;
  roleCanSeeRestricted: boolean;
}): InfeasibilityExperienceModel {
  if (input.productResult === "SEARCH_INCOMPLETE") {
    return {
      resultCode: "SEARCH_INCOMPLETE",
      evidenceGrade: input.evidenceGrade,
      primaryMessage: "No complete plan was found within the search allowance. This does not mean one is impossible.",
      supportingMessage: "Retrying with the same governed authority may help.",
      sections: emptySections("Search incomplete — not a proof of impossibility."),
      showPercentComplete: false,
      showHeuristicFallback: false,
      adoptable: false,
    };
  }
  if (input.productResult === "TIMED_OUT") {
    return {
      resultCode: "TIMED_OUT",
      evidenceGrade: input.evidenceGrade,
      primaryMessage: "The run reached its time limit without a complete plan. This does not mean one is impossible.",
      supportingMessage: "No plan was sealed.",
      sections: emptySections("Timed out — not a proof of impossibility."),
      showPercentComplete: false,
      showHeuristicFallback: false,
      adoptable: false,
    };
  }

  const certified = input.evidenceGrade === "CERTIFIED" || Boolean(input.certificate && input.certificate.evidenceGrade === "CERTIFIED");
  const primaryMessage = certified
    ? "No complete plan is possible with the current rules and layout. The conflict is shown below."
    : "No complete plan is possible with the current rules and layout. The specific conflict could not be isolated.";

  const ruleRefs: CertificateRuleRef[] =
    input.mcs?.correctionRules ?? input.core?.coreRules ?? input.certificate?.ruleRefs ?? [];

  const whatConflicts = certified
    ? `Certified conflict: ${input.certificate?.type ?? "STATIC_CERTIFICATE"}`
    : "Solver proof without an independently certified conflict certificate.";

  const plainExplanation = certified
    ? explainCertificate(input.certificate!)
    : "The exact CP-SAT model reported infeasibility and confirmation did not overturn it, but a minimal conflicting rule set was not certified.";

  const affected = extractAffected(input.certificate, input.roleCanSeeRestricted);
  const corrections = ruleRefs.map((r) => ({
    ruleRef: r.contentHash.slice(0, 12),
    kind: r.sensitivity === "RESTRICTED" && !input.roleCanSeeRestricted ? "RESTRICTED_RULE" : r.kind,
    restricted: r.sensitivity === "RESTRICTED",
    provenMinimum: input.mcs?.optimality === "PROVEN_MINIMUM",
  }));

  const limitations: string[] = [];
  if (input.core?.budgetExhausted) limitations.push("Core deletion budget exhausted — minimality not fully proven.");
  if (input.mcs && input.mcs.optimality !== "PROVEN_MINIMUM") {
    limitations.push("Correction set is not proven minimum.");
  }
  if (input.maxSeat?.proofStatus === "BEST_FOUND" || input.maxSeat?.proofStatus === "UNKNOWN") {
    limitations.push("Maximum-seating diagnostic is not proven optimal.");
  }
  if (!certified) limitations.push("Conflict certificate not independently certified.");

  return {
    resultCode: "INFEASIBLE",
    evidenceGrade: input.evidenceGrade,
    primaryMessage,
    supportingMessage: certified
      ? "Evidence grade: CERTIFIED."
      : `Evidence grade: ${input.evidenceGrade ?? "SOLVER_PROOF"}.`,
    sections: {
      resultAndGrade: `INFEASIBLE · ${input.evidenceGrade ?? "SOLVER_PROOF"}`,
      whatConflicts,
      plainExplanation,
      affectedGroups: affected,
      correctionOptions: corrections,
      maximumSeating: input.maxSeat ? maxSeatOperatorWording(input.maxSeat) : null,
      limitations,
      actions: [
        "Review governed rules",
        "Review layout capacity",
        "Start a new run after an authorised change",
        "No automatic relaxation",
        "No heuristic fallback",
      ],
    },
    showPercentComplete: false,
    showHeuristicFallback: false,
    adoptable: false,
  };
}

function emptySections(plain: string): InfeasibilityExperienceModel["sections"] {
  return {
    resultAndGrade: plain,
    whatConflicts: "None isolated",
    plainExplanation: plain,
    affectedGroups: [],
    correctionOptions: [],
    maximumSeating: null,
    limitations: [],
    actions: ["Start a new run when ready", "No heuristic fallback"],
  };
}

function explainCertificate(cert: StaticCertificate): string {
  switch (cert.type) {
    case "EMPTY_DOMAIN":
      return "At least one mandatory group has no legal table under the current requirements, prohibitions, locks and eligibility.";
    case "LOCKS_SPLIT_UNIT":
      return "Members of a mandatory-together group are locked to different tables.";
    case "APART_WITHIN_UNIT":
      return "A mandatory-apart rule applies inside a mandatory-together group.";
    case "TOTAL_CAPACITY":
      return "Eligible guest demand exceeds total usable seating capacity.";
    case "HALL_VIOLATION":
      return "A set of groups requires more seats than the tables they can legally reach.";
    case "APART_PIGEONHOLE":
      return "Too many mutually apart groups must occupy distinct tables among too few permitted tables.";
    default:
      return "A certified static conflict was detected.";
  }
}

function extractAffected(
  cert: StaticCertificate | null | undefined,
  roleCanSeeRestricted: boolean,
): Array<{ label: string; restricted: boolean }> {
  if (!cert) return [];
  const tokens = (cert.facts.unitGuestTokens as string[]) ??
    (cert.facts.cliqueUnitGuestTokens as string[][])?.flat() ??
    [];
  const restricted = cert.ruleRefs.some((r) => r.sensitivity === "RESTRICTED");
  if (restricted && !roleCanSeeRestricted) {
    return [{ label: "Restricted parties (details withheld)", restricted: true }];
  }
  return tokens.slice(0, 12).map((t) => ({ label: t.slice(0, 8), restricted: false }));
}

export function keepBestSuccessCopy(): { primary: string; supporting: string } {
  return {
    primary: "Complete plan ready for review. Every guest is seated and every mandatory rule is met. The search stopped before proving that no better arrangement exists.",
    supporting: "Replay optimality is not claimed.",
  };
}

export function stoppingSafelyCopy(): string {
  return "Stopping safely and checking the best complete plan…";
}

export { cancelConfirmCopy, keepBestConfirmCopy } from "../client-contract.js";
