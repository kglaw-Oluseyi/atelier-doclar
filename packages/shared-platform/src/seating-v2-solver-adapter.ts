import { exactHash } from "./eec-hash.js";
import { defaultSolverConfig, solveSeatingV1 } from "./seating-solver-v1.js";
import type { SolverConstraint, SolverRequest } from "./seating-solver-types.js";
import type { SeatingV2Assignment, SeatingV2CompiledRequest, SeatingV2CompiledRule } from "./seating-v2-schemas.js";

function v1Kind(hardness: SeatingV2CompiledRule["hardness"]): SolverConstraint["kind"] {
  if (hardness === "SOFT") return "WEIGHTED";
  if (hardness === "INFORMATIONAL") return "INFORMATION";
  return "HARD";
}

function v1Constraint(rule: SeatingV2CompiledRule): SolverConstraint {
  const kind = v1Kind(rule.hardness);
  const base = {
    id: rule.contentHash.slice(0, 32),
    kind,
    predicateType: rule.kind,
    ...(kind === "WEIGHTED" && rule.weight ? { weight: rule.weight } : {}),
  };
  if (rule.kind === "LOCK_ASSIGNMENT") {
    return {
      ...base,
      predicateType: "LOCK_ASSIGNMENT",
      payload: {
        predicateType: "LOCK_ASSIGNMENT",
        guestToken: rule.subjectTokens[0] ?? "missing-guest",
        positionToken: rule.positionToken ?? "missing-position",
      },
    };
  }
  if (rule.kind === "REQUIRE_TABLE" || rule.kind === "FORBID_TABLE" || rule.kind === "PREFER_TABLE") {
    return {
      ...base,
      predicateType: rule.kind,
      payload: { predicateType: rule.kind, guestTokens: rule.subjectTokens, tableTokens: rule.tableTokens },
    };
  }
  if (rule.kind === "REQUIRE_ZONE" || rule.kind === "FORBID_ZONE" || rule.kind === "PREFER_ZONE") {
    return {
      ...base,
      predicateType: rule.kind,
      payload: { predicateType: rule.kind, guestTokens: rule.subjectTokens, zoneCodes: rule.zoneCodes },
    };
  }
  if (rule.kind === "REQUIRE_POSITION_CAPABILITY") {
    return {
      ...base,
      predicateType: "REQUIRE_POSITION_CAPABILITY",
      payload: { predicateType: "REQUIRE_POSITION_CAPABILITY", guestTokens: rule.subjectTokens, capabilityCodes: rule.capabilityCodes },
    };
  }
  if (rule.kind === "RESERVE_CAPACITY") {
    return {
      ...base,
      predicateType: "RESERVE_CAPACITY",
      payload: { predicateType: "RESERVE_CAPACITY", reservationId: rule.contentHash.slice(0, 32) },
    };
  }
  if (rule.kind === "MINIMIZE_CHANGE") {
    return {
      ...base,
      predicateType: "MINIMIZE_CHANGE",
      payload: { predicateType: "MINIMIZE_CHANGE", previous: [] },
    };
  }
  return {
    ...base,
    predicateType: rule.kind,
    payload: { predicateType: rule.kind, guestTokens: rule.subjectTokens.length >= 2 ? rule.subjectTokens : [...rule.subjectTokens, ...rule.subjectTokens] },
  };
}

export function solveSeatingV2Compiled(request: SeatingV2CompiledRequest): {
  solverClaim: "FEASIBLE" | "INFEASIBLE" | "TIMED_OUT";
  assignments: SeatingV2Assignment[];
  rawOutputHash: string;
} {
  if (!request.guests.length || !request.positions.length) {
    return { solverClaim: "INFEASIBLE", assignments: [], rawOutputHash: exactHash({ empty: true }) };
  }
  const solverRequest: SolverRequest = {
    guests: request.guests.map((guest) => ({
      token: guest.token,
      eligible: guest.eligible,
      capabilityCodes: guest.capabilityCodes,
      protocolCodes: [],
      ...(guest.groupTokens[0] ? { partyToken: guest.groupTokens[0] } : {}),
    })),
    positions: request.positions.map((position) => ({
      token: position.token,
      tableToken: position.tableToken,
      zoneCodes: position.zoneCodes,
      capabilityCodes: position.capabilityCodes,
    })),
    constraints: request.rules.map(v1Constraint),
    reservations: request.reservations
      .filter((item) => item.eligibleGuestTokens.length > 0)
      .map((item) => ({
        id: item.contentHash.slice(0, 32),
        eligibleGuestTokens: item.eligibleGuestTokens,
        tableTokens: item.tableTokens,
        zoneCodes: item.zoneCodes,
        min: item.min ?? undefined,
        max: item.max ?? undefined,
        exact: item.exact ?? undefined,
        priority: 1,
      })),
    config: defaultSolverConfig({ seed: request.seed, timeLimitMs: 10_000, memoryLimitMb: 256 }),
  };
  const solved = solveSeatingV1(solverRequest);
  return {
    solverClaim: solved.status,
    assignments: solved.assignments.map((item) => ({
      guestToken: item.guestToken,
      state: item.state,
      positionToken: item.positionToken ?? null,
      typedReasonCodes: item.reasonCodes,
    })),
    rawOutputHash: solved.resultHash,
  };
}
