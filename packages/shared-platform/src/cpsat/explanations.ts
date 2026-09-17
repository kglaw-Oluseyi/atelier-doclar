/**
 * Build verified short reasons for every seated guest (explanation edition 1).
 */
import {
  CPSAT_SHORT_REASON_CODES,
  CPSAT_SHORT_REASON_TEXT,
  type CpsatShortReasonCode,
} from "./contract.js";
import type { CpsatSolveRequest } from "./compiler.js";

export const CPSAT_EXPLANATION_EDITION = "cpsat-explain-v1";

export type CpsatExplanation = {
  guest: number;
  code: CpsatShortReasonCode;
  text: string;
  evidence: Record<string, unknown>;
};

function isCode(value: string): value is CpsatShortReasonCode {
  return (CPSAT_SHORT_REASON_CODES as readonly string[]).includes(value);
}

export function buildExplanations(
  request: CpsatSolveRequest,
  assignments: Array<{ guest: number; table: number; seat: number }>,
): { explanations: CpsatExplanation[]; ok: boolean; fault?: string } {
  const byGuest = new Map(assignments.map((a) => [a.guest, a]));
  const unitOf = new Map<number, number>();
  for (const u of request.units) for (const m of u.members) unitOf.set(m, u.i);
  const baseline = new Map(request.baseline.map((b) => [b.guest, b]));
  const prefTables = new Map<number, Set<number>>();
  for (const p of request.preferences) {
    const set = prefTables.get(p.guest) ?? new Set();
    set.add(p.table);
    prefTables.set(p.guest, set);
  }

  const explanations: CpsatExplanation[] = [];
  for (const g of request.guests) {
    if (!g.eligible) continue;
    const a = byGuest.get(g.i);
    if (!a) {
      return { explanations: [], ok: false, fault: "EXPLANATION_INVALID:missing_assignment" };
    }
    let code: CpsatShortReasonCode = "GLOBAL";
    const evidence: Record<string, unknown> = { table: a.table, seat: a.seat };

    if (g.lockedSeat != null && a.seat === g.lockedSeat) {
      code = "LOCKED_SEAT";
      evidence.lock = g.lockedSeat;
    } else if (g.lockedTable != null && a.table === g.lockedTable) {
      code = "LOCKED_TABLE";
      evidence.lock = g.lockedTable;
    } else {
      const unit = request.units[unitOf.get(g.i) ?? -1];
      if (unit && unit.domainTables.length === 1 && unit.domainTables[0] === a.table) {
        code = "ONLY_PERMITTED";
      } else if (unit && unit.members.length > 1) {
        code = "GROUP";
        evidence.unitSize = unit.members.length;
      } else {
        const base = baseline.get(g.i);
        if (base && base.table === a.table && base.seat === a.seat) {
          code = "RETAINED";
        } else if (base && base.table !== a.table) {
          code = "MOVED_FIT";
        } else if (prefTables.get(g.i)?.has(a.table)) {
          code = "PREF_MET";
        } else if (request.apartPairs.length) {
          code = "SEPARATED";
        } else {
          code = "GLOBAL";
        }
      }
    }

    // Reservation overlay
    for (const r of request.reservations) {
      if (r.kind === "GUARANTEE" && r.seat === a.seat && r.holderGuest === g.i) {
        code = "RESERVED";
        evidence.reservation = r.kind;
      }
    }

    if (!isCode(code)) {
      return { explanations: [], ok: false, fault: "EXPLANATION_INVALID:bad_code" };
    }
    explanations.push({
      guest: g.i,
      code,
      text: CPSAT_SHORT_REASON_TEXT[code],
      evidence,
    });
  }

  if (explanations.length !== request.guests.filter((g) => g.eligible).length) {
    return { explanations: [], ok: false, fault: "EXPLANATION_INVALID:incomplete" };
  }
  return { explanations, ok: true };
}

export function redactExplanationForOrdinaryRole(
  explanation: CpsatExplanation,
  discretionMode: boolean,
): { code: CpsatShortReasonCode; text: string } {
  if (discretionMode) {
    const allowed = new Set<CpsatShortReasonCode>([
      "LOCKED_SEAT",
      "LOCKED_TABLE",
      "RESERVED",
      "RETAINED",
      "MOVED_FIT",
      "MOVED_RULE",
      "GLOBAL",
    ]);
    if (!allowed.has(explanation.code)) {
      return { code: "GLOBAL", text: CPSAT_SHORT_REASON_TEXT.GLOBAL };
    }
  }
  // Never leak counterpart names — evidence has only indices
  return { code: explanation.code, text: explanation.text };
}
