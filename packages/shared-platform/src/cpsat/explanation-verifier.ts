/**
 * Explanation predicate verification + ordinary-role leak/redaction check.
 */
import {
  CPSAT_SHORT_REASON_TEXT,
  type CpsatShortReasonCode,
} from "./contract.js";
import type { CpsatSolveRequest } from "./compiler.js";
import type { CpsatExplanation } from "./explanations.js";
import { redactExplanationForOrdinaryRole } from "./explanations.js";

function predicateHolds(
  request: CpsatSolveRequest,
  explanation: CpsatExplanation,
  assignment: { guest: number; table: number; seat: number },
): boolean {
  const g = request.guests[explanation.guest];
  if (!g?.eligible) return false;
  if (assignment.guest !== explanation.guest) return false;
  const unit = request.units.find((u) => u.members.includes(explanation.guest));
  const baseline = request.baseline.find((b) => b.guest === explanation.guest);
  const prefs = request.preferences.filter((p) => p.guest === explanation.guest);

  switch (explanation.code) {
    case "LOCKED_SEAT":
      return g.lockedSeat != null && assignment.seat === g.lockedSeat;
    case "LOCKED_TABLE":
      return g.lockedTable != null && assignment.table === g.lockedTable;
    case "RESERVED":
      return request.reservations.some(
        (r) => r.kind === "GUARANTEE" && r.seat === assignment.seat && r.holderGuest === explanation.guest,
      );
    case "ONLY_PERMITTED":
      return Boolean(unit && unit.domainTables.length === 1 && unit.domainTables[0] === assignment.table);
    case "GROUP":
      return Boolean(unit && unit.members.length > 1);
    case "RETAINED":
      return Boolean(baseline && baseline.table === assignment.table && baseline.seat === assignment.seat);
    case "MOVED_FIT":
      return Boolean(baseline && baseline.table !== assignment.table);
    case "PREF_MET":
      return prefs.some((p) => p.table === assignment.table);
    case "SEPARATED":
      return request.apartPairs.length > 0;
    case "MOVED_RULE":
    case "EQUAL_OPTIONS":
    case "GLOBAL":
      return explanation.text === CPSAT_SHORT_REASON_TEXT[explanation.code as CpsatShortReasonCode];
    default:
      return false;
  }
}

export function verifyExplanations(
  request: CpsatSolveRequest,
  assignments: Array<{ guest: number; table: number; seat: number }>,
  explanations: CpsatExplanation[],
  options: { discretionMode?: boolean } = {},
): { ok: true } | { ok: false; fault: string } {
  const eligible = request.guests.filter((g) => g.eligible);
  if (explanations.length !== eligible.length) {
    return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):count_mismatch" };
  }
  if (explanations.length !== assignments.length) {
    return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):assignment_count_mismatch" };
  }
  const byGuest = new Map(assignments.map((a) => [a.guest, a]));
  const seen = new Set<number>();
  for (const explanation of explanations) {
    if (seen.has(explanation.guest)) {
      return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):duplicate_guest" };
    }
    seen.add(explanation.guest);
    const assignment = byGuest.get(explanation.guest);
    if (!assignment) {
      return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):missing_assignment" };
    }
    if (explanation.text !== CPSAT_SHORT_REASON_TEXT[explanation.code]) {
      return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):invented_prose" };
    }
    if (/best placement|best possible/i.test(explanation.text)) {
      return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):forbidden_prose" };
    }
    if (!predicateHolds(request, explanation, assignment)) {
      return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):predicate_failure" };
    }
    const redacted = redactExplanationForOrdinaryRole(explanation, Boolean(options.discretionMode));
    if (/@|guest:|name=/i.test(redacted.text)) {
      return { ok: false, fault: "SOLVER_FAULT(EXPLANATION_INVALID):leak" };
    }
  }
  return { ok: true };
}
