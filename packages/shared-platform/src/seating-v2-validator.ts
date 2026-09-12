import { exactHash } from "./eec-hash.js";
import { seatingV2AssignmentsHash } from "./seating-v2-hash.js";
import {
  SEATING_V2_VALIDATOR_VERSION,
  SeatingV2ValidationReportSchema,
  type SeatingV2Assignment,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledRule,
  type SeatingV2RuleOutcome,
  type SeatingV2StructuralOutcome,
  type SeatingV2ValidationReport,
} from "./seating-v2-schemas.js";

export type SeatingV2ValidatePackage = {
  contentHash: string;
  compiledRequest: SeatingV2CompiledRequest;
};

function tableOf(
  assignment: Map<string, string>,
  positions: Map<string, SeatingV2CompiledRequest["positions"][number]>,
  guestToken: string,
): string | undefined {
  const position = assignment.get(guestToken);
  return position ? positions.get(position)?.tableToken : undefined;
}

function zonesOf(
  assignment: Map<string, string>,
  positions: Map<string, SeatingV2CompiledRequest["positions"][number]>,
  guestToken: string,
): string[] {
  const position = assignment.get(guestToken);
  return position ? (positions.get(position)?.zoneCodes ?? []) : [];
}

function evaluateRule(
  rule: SeatingV2CompiledRule,
  seated: Map<string, string>,
  positions: Map<string, SeatingV2CompiledRequest["positions"][number]>,
): SeatingV2RuleOutcome {
  if (rule.hardness === "INFORMATIONAL") {
    return {
      ruleContentHash: rule.contentHash,
      outcome: "NOT_EVALUATED",
      typedReasonCodes: ["INFORMATIONAL"],
      affectedGuestTokens: [],
    };
  }
  const seatedSubjects = rule.subjectTokens.filter((token) => seated.has(token));
  let violated = false;
  const affected: string[] = [];
  if (rule.kind === "KEEP_TOGETHER") {
    if (rule.scope === "TABLE") {
      const tables = new Set(seatedSubjects.map((token) => tableOf(seated, positions, token)));
      violated = seatedSubjects.length >= 2 && tables.size > 1;
    } else if (rule.scope === "ZONE") {
      const zones = seatedSubjects.map((token) => zonesOf(seated, positions, token).sort().join(","));
      violated = seatedSubjects.length >= 2 && new Set(zones).size > 1;
    } else {
      const tables = seatedSubjects.map((token) => tableOf(seated, positions, token));
      violated = seatedSubjects.length >= 2 && new Set(tables).size > 1;
    }
    if (violated) affected.push(...seatedSubjects);
  } else if (rule.kind === "KEEP_APART") {
    if (rule.scope === "TABLE") {
      const tables = seatedSubjects.map((token) => tableOf(seated, positions, token));
      violated = tables.length >= 2 && new Set(tables).size !== tables.length;
    } else if (rule.scope === "ZONE") {
      const zoneSets = seatedSubjects.map((token) => new Set(zonesOf(seated, positions, token)));
      for (let i = 0; i < zoneSets.length; i += 1) {
        for (let j = i + 1; j < zoneSets.length; j += 1) {
          if ([...zoneSets[i]!].some((code) => zoneSets[j]!.has(code))) violated = true;
        }
      }
    } else {
      const tables = seatedSubjects.map((token) => tableOf(seated, positions, token));
      violated = tables.length >= 2 && new Set(tables).size !== tables.length;
    }
    if (violated) affected.push(...seatedSubjects);
  } else if (rule.kind === "REQUIRE_TABLE" || rule.kind === "FORBID_TABLE") {
    for (const token of seatedSubjects) {
      const table = tableOf(seated, positions, token);
      if (!table) continue;
      const listed = rule.tableTokens.includes(table);
      if (rule.kind === "REQUIRE_TABLE" ? !listed : listed) {
        violated = true;
        affected.push(token);
      }
    }
  } else if (rule.kind === "REQUIRE_ZONE" || rule.kind === "FORBID_ZONE") {
    for (const token of seatedSubjects) {
      const zones = zonesOf(seated, positions, token);
      const listed = rule.zoneCodes.some((code) => zones.includes(code));
      if (rule.kind === "REQUIRE_ZONE" ? !listed : listed) {
        violated = true;
        affected.push(token);
      }
    }
  } else if (rule.kind === "REQUIRE_POSITION_CAPABILITY") {
    for (const token of seatedSubjects) {
      const position = seated.get(token);
      if (!position) continue;
      const caps = positions.get(position)?.capabilityCodes ?? [];
      if (!rule.capabilityCodes.every((code) => caps.includes(code))) {
        violated = true;
        affected.push(token);
      }
    }
  } else if (rule.kind === "LOCK_ASSIGNMENT") {
    const token = rule.subjectTokens[0];
    const seatedAt = token ? seated.get(token) : undefined;
    if (token && seatedAt && rule.positionToken && seatedAt !== rule.positionToken) {
      violated = true;
      affected.push(token);
    }
  }
  return {
    ruleContentHash: rule.contentHash,
    outcome: violated ? "VIOLATED" : "SATISFIED",
    typedReasonCodes: violated ? [`${rule.kind}_VIOLATED`] : [`${rule.kind}_SATISFIED`],
    affectedGuestTokens: [...new Set(affected)].sort((left, right) => left.localeCompare(right)),
  };
}

function structural(
  checkCode: string,
  passed: boolean,
  typedDetail: string,
): SeatingV2StructuralOutcome {
  return { checkCode, outcome: passed ? "PASSED" : "FAILED", typedDetail };
}

function addStructural(
  outcomes: SeatingV2StructuralOutcome[],
  checkCode: string,
  passed: boolean,
  typedDetail: string,
): void {
  const existing = outcomes.find((item) => item.checkCode === checkCode);
  if (existing) {
    if (!passed) {
      existing.outcome = "FAILED";
      existing.typedDetail = typedDetail;
    }
    return;
  }
  outcomes.push(structural(checkCode, passed, typedDetail));
}

export function validateSeatingV2(
  seatingPackage: SeatingV2ValidatePackage,
  assignments: readonly SeatingV2Assignment[],
  unseated: readonly string[],
  now = "1970-01-01T00:00:00.000Z",
): SeatingV2ValidationReport {
  const request = seatingPackage.compiledRequest;
  const producedAt = now;
  const positions = new Map((request.positions ?? []).map((item) => [item.token, item]));
  const guests = new Map((request.guests ?? []).map((item) => [item.token, item]));
  const seated = new Map<string, string>();
  const structuralOutcomes: SeatingV2StructuralOutcome[] = [];
  const seenGuests = new Set<string>();
  const seenPositions = new Set<string>();

  for (const assignment of assignments) {
    if (seenGuests.has(assignment.guestToken)) {
      addStructural(structuralOutcomes, "UNIQUE_GUEST", false, "guest assigned more than once");
    }
    seenGuests.add(assignment.guestToken);
    const guest = guests.get(assignment.guestToken);
    if (!guest) {
      addStructural(structuralOutcomes, "KNOWN_GUEST", false, "unknown guest token");
      continue;
    }
    if (assignment.state === "SEATED") {
      if (!assignment.positionToken || !positions.has(assignment.positionToken)) {
        addStructural(structuralOutcomes, "KNOWN_POSITION", false, "unknown or missing position token");
        continue;
      }
      if (seenPositions.has(assignment.positionToken)) {
        addStructural(structuralOutcomes, "UNIQUE_POSITION", false, "position assigned more than once");
      }
      seenPositions.add(assignment.positionToken);
      if (!guest.eligible) {
        addStructural(structuralOutcomes, "ELIGIBLE_COHORT", false, "ineligible guest seated");
      }
      seated.set(assignment.guestToken, assignment.positionToken);
    } else if (!(assignment.typedReasonCodes ?? []).length && !unseated.includes(assignment.guestToken)) {
      addStructural(structuralOutcomes, "EXPLICIT_UNSEATED", false, "unseated guest missing typed reason");
    }
  }

  for (const guest of request.guests ?? []) {
    if (guest.eligible && !seenGuests.has(guest.token)) {
      addStructural(structuralOutcomes, "EXPLICIT_UNSEATED", false, "eligible guest missing assignment");
    }
  }

  const occupancy = new Map<string, number>();
  const capacity = new Map<string, number>();
  for (const position of request.positions ?? []) {
    capacity.set(position.tableToken, (capacity.get(position.tableToken) ?? 0) + 1);
  }
  for (const positionToken of seated.values()) {
    const table = positions.get(positionToken)?.tableToken;
    if (!table) continue;
    occupancy.set(table, (occupancy.get(table) ?? 0) + 1);
  }
  for (const [table, count] of occupancy) {
    if (count > (capacity.get(table) ?? 0)) {
      addStructural(structuralOutcomes, "TABLE_CAPACITY", false, "occupancy exceeds table capacity");
    }
  }

  for (const reservation of request.reservations ?? []) {
    const seatedEligible = reservation.eligibleGuestTokens.filter((token) => seated.has(token));
    if (reservation.exact !== null && seatedEligible.length !== reservation.exact) {
      addStructural(structuralOutcomes, "RESERVATION_EXACT", false, "reservation exact commitment missed");
    }
    if (reservation.min !== null && seatedEligible.length < reservation.min) {
      addStructural(structuralOutcomes, "RESERVATION_MIN", false, "reservation minimum missed");
    }
    if (reservation.max !== null && seatedEligible.length > reservation.max) {
      addStructural(structuralOutcomes, "RESERVATION_MAX", false, "reservation maximum exceeded");
    }
    if (reservation.tableTokens.length) {
      for (const token of seatedEligible) {
        const table = tableOf(seated, positions, token);
        if (table && !reservation.tableTokens.includes(table)) {
          addStructural(structuralOutcomes, "RESERVATION_TABLE", false, "reserved guest outside reserved tables");
        }
      }
    }
  }

  if (!structuralOutcomes.some((item) => item.checkCode === "UNIQUE_GUEST")) {
    addStructural(structuralOutcomes, "UNIQUE_GUEST", true, "each guest occupies at most one position");
  }
  if (!structuralOutcomes.some((item) => item.checkCode === "UNIQUE_POSITION")) {
    addStructural(structuralOutcomes, "UNIQUE_POSITION", true, "each position is occupied by at most one guest");
  }
  if (!structuralOutcomes.some((item) => item.checkCode === "TABLE_CAPACITY")) {
    addStructural(structuralOutcomes, "TABLE_CAPACITY", true, "occupancy within table capacity");
  }
  if (!structuralOutcomes.some((item) => item.checkCode === "KNOWN_GUEST" || item.checkCode === "KNOWN_POSITION")) {
    addStructural(structuralOutcomes, "KNOWN_TOKEN", true, "all assigned tokens are in the package");
  }

  const ruleOutcomes = (request.rules ?? []).map((rule) => evaluateRule(rule, seated, positions));
  const hardViolation = ruleOutcomes.some((item) => item.outcome === "VIOLATED" && request.rules.find((rule) => rule.contentHash === item.ruleContentHash)?.hardness === "HARD");
  const structuralFailure = structuralOutcomes.some((item) => item.outcome === "FAILED");
  const assignmentsHash = seatingV2AssignmentsHash(assignments);
  const reportBase = {
    validatorVersion: SEATING_V2_VALIDATOR_VERSION,
    packageContentHash: seatingPackage.contentHash,
    assignmentsHash,
    verdict: hardViolation || structuralFailure ? "INFEASIBLE" : "FEASIBLE",
    producedAt,
    ruleOutcomes,
    structuralOutcomes,
  } as const;
  const reportHash = exactHash({
    validatorVersion: reportBase.validatorVersion,
    packageContentHash: reportBase.packageContentHash,
    assignmentsHash: reportBase.assignmentsHash,
    verdict: reportBase.verdict,
    ruleOutcomes: reportBase.ruleOutcomes,
    structuralOutcomes: reportBase.structuralOutcomes,
  });
  return SeatingV2ValidationReportSchema.parse({
    ...reportBase,
    reportHash,
  });
}
