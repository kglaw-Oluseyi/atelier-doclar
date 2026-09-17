/**
 * Independent CP-SAT verifier — MUST NOT import cpsat/compiler or solver modules.
 * Reads frozen authored / V2 compiled authority and evaluates primitive rules.
 */
import { seatingV2AssignmentsHash } from "../seating-v2-hash.js";
import type { SeatingV2Assignment, SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../seating-v2-schemas.js";

export type CpsatRuleEval = "SATISFIED" | "VIOLATED" | "NOT_EVALUABLE";

export type CpsatVerifierReport = {
  ok: boolean;
  faultCode?: "VERIFICATION_FAILED";
  structuralOk: boolean;
  ruleOutcomes: Array<{ ruleHash: string; kind: string; outcome: CpsatRuleEval; guests: string[] }>;
  seatedEligible: number;
  eligibleCount: number;
  assignmentsHash: string;
};

function tableOf(
  seated: Map<string, string>,
  positions: Map<string, SeatingV2CompiledRequest["positions"][number]>,
  guest: string,
): string | undefined {
  const pos = seated.get(guest);
  return pos ? positions.get(pos)?.tableToken : undefined;
}

export function verifyCpsatAssignments(
  compiled: SeatingV2CompiledRequest,
  assignments: SeatingV2Assignment[],
): CpsatVerifierReport {
  const positions = new Map(compiled.positions.map((p) => [p.token, p]));
  const guests = new Map(compiled.guests.map((g) => [g.token, g]));
  const seated = new Map<string, string>();
  const usedSeats = new Set<string>();
  const tableLoad = new Map<string, number>();

  let structuralOk = true;
  for (const a of assignments) {
    const guest = guests.get(a.guestToken);
    if (!guest) {
      structuralOk = false;
      continue;
    }
    if (a.state === "SEATED") {
      if (!guest.eligible) structuralOk = false;
      if (!a.positionToken || !positions.has(a.positionToken)) {
        structuralOk = false;
        continue;
      }
      if (usedSeats.has(a.positionToken)) structuralOk = false;
      usedSeats.add(a.positionToken);
      seated.set(a.guestToken, a.positionToken);
      const table = positions.get(a.positionToken)!.tableToken;
      tableLoad.set(table, (tableLoad.get(table) ?? 0) + 1);
    } else if (guest.eligible) {
      // eligible unseated is a HARD violation unless governed exception
      if (!(a.typedReasonCodes ?? []).includes("GOVERNED_UNSEATED")) structuralOk = false;
    }
  }

  const capacity = new Map<string, number>();
  for (const p of compiled.positions) {
    capacity.set(p.tableToken, (capacity.get(p.tableToken) ?? 0) + 1);
  }
  for (const [table, load] of tableLoad) {
    if (load > (capacity.get(table) ?? 0)) structuralOk = false;
  }

  const eligibleCount = compiled.guests.filter((g) => g.eligible).length;
  const seatedEligible = [...seated.keys()].filter((t) => guests.get(t)?.eligible).length;

  const ruleOutcomes: CpsatVerifierReport["ruleOutcomes"] = [];
  for (const rule of compiled.rules as SeatingV2CompiledRule[]) {
    if (rule.hardness === "INFORMATIONAL") {
      ruleOutcomes.push({
        ruleHash: rule.contentHash,
        kind: rule.kind,
        outcome: "NOT_EVALUABLE",
        guests: rule.subjectTokens,
      });
      continue;
    }
    if (rule.hardness !== "HARD") {
      ruleOutcomes.push({
        ruleHash: rule.contentHash,
        kind: rule.kind,
        outcome: "NOT_EVALUABLE",
        guests: rule.subjectTokens,
      });
      continue;
    }
    const subjects = rule.subjectTokens.filter((t) => guests.get(t)?.eligible);
    let outcome: CpsatRuleEval = "SATISFIED";
    if (rule.kind === "KEEP_TOGETHER") {
      const unseated = subjects.filter((t) => !seated.has(t));
      if (unseated.length) {
        // Vacuous satisfaction forbidden — unseated required subjects violate
        outcome = "VIOLATED";
      } else if (subjects.length >= 2) {
        const tables = new Set(subjects.map((t) => tableOf(seated, positions, t)));
        if (tables.size > 1) outcome = "VIOLATED";
      }
    } else if (rule.kind === "KEEP_APART") {
      const seatedSubjects = subjects.filter((t) => seated.has(t));
      for (let i = 0; i < seatedSubjects.length; i++) {
        for (let j = i + 1; j < seatedSubjects.length; j++) {
          if (tableOf(seated, positions, seatedSubjects[i]!) === tableOf(seated, positions, seatedSubjects[j]!)) {
            outcome = "VIOLATED";
          }
        }
      }
    } else if (rule.kind === "LOCK_ASSIGNMENT") {
      const g = rule.subjectTokens[0];
      const pos = rule.positionToken;
      if (g && pos && guests.get(g)?.eligible) {
        if (seated.get(g) !== pos) outcome = "VIOLATED";
      }
    } else if (rule.kind === "REQUIRE_TABLE") {
      for (const g of subjects) {
        const table = tableOf(seated, positions, g);
        if (!table || !rule.tableTokens.includes(table)) outcome = "VIOLATED";
      }
    } else if (rule.kind === "FORBID_TABLE") {
      for (const g of subjects) {
        const table = tableOf(seated, positions, g);
        if (table && rule.tableTokens.includes(table)) outcome = "VIOLATED";
      }
    } else if (rule.kind === "REQUIRE_ZONE") {
      for (const g of subjects) {
        const pos = seated.get(g);
        const zones = pos ? positions.get(pos)?.zoneCodes ?? [] : [];
        if (!rule.zoneCodes.some((z) => zones.includes(z))) outcome = "VIOLATED";
      }
    } else if (rule.kind === "FORBID_ZONE") {
      for (const g of subjects) {
        const pos = seated.get(g);
        const zones = pos ? positions.get(pos)?.zoneCodes ?? [] : [];
        if (rule.zoneCodes.some((z) => zones.includes(z))) outcome = "VIOLATED";
      }
    } else if (rule.kind === "REQUIRE_POSITION_CAPABILITY") {
      for (const g of subjects) {
        const pos = seated.get(g);
        const caps = pos ? positions.get(pos)?.capabilityCodes ?? [] : [];
        if (!rule.capabilityCodes.every((c) => caps.includes(c))) outcome = "VIOLATED";
      }
    }
    ruleOutcomes.push({ ruleHash: rule.contentHash, kind: rule.kind, outcome, guests: subjects });
    if (outcome === "VIOLATED") structuralOk = false;
  }

  const ok = structuralOk && seatedEligible === eligibleCount && ruleOutcomes.every((r) => r.outcome !== "VIOLATED");
  return {
    ok,
    faultCode: ok ? undefined : "VERIFICATION_FAILED",
    structuralOk,
    ruleOutcomes,
    seatedEligible,
    eligibleCount,
    assignmentsHash: seatingV2AssignmentsHash(assignments),
  };
}
