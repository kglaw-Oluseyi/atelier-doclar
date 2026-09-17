/**
 * Reconstruct Seating V2 compiled authority from a frozen CP-SAT request
 * for independent verification (no compiler import in the verifier module itself).
 */
import { exactHash } from "../eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledRule,
} from "../seating-v2-schemas.js";
import type { CpsatSolveRequest } from "./compiler.js";

export function authoredAuthorityFromCpsatRequest(request: CpsatSolveRequest): SeatingV2CompiledRequest {
  const rules: SeatingV2CompiledRule[] = [];
  for (const [a, b] of request.togetherPairs) {
    const ga = request.guests[a!];
    const gb = request.guests[b!];
    if (!ga || !gb) continue;
    rules.push({
      contentHash: exactHash({ kind: "KEEP_TOGETHER", a: ga.token, b: gb.token }),
      kind: "KEEP_TOGETHER",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: [ga.token, gb.token],
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    });
  }
  for (const [a, b] of request.apartPairs) {
    const ga = request.guests[a!];
    const gb = request.guests[b!];
    if (!ga || !gb) continue;
    rules.push({
      contentHash: exactHash({ kind: "KEEP_APART", a: ga.token, b: gb.token }),
      kind: "KEEP_APART",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: [ga.token, gb.token],
      tableTokens: [],
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    });
  }
  for (const g of request.guests) {
    if (g.lockedSeat != null) {
      const seat = request.seats[g.lockedSeat];
      if (seat) {
        rules.push({
          contentHash: exactHash({ kind: "LOCK_ASSIGNMENT", g: g.token, seat: seat.token }),
          kind: "LOCK_ASSIGNMENT",
          hardness: "HARD",
          weight: null,
          scope: "POSITION",
          subjectTokens: [g.token],
          tableTokens: [],
          zoneCodes: [],
          capabilityCodes: [],
          positionToken: seat.token,
        });
      }
    }
  }
  for (const req of request.requireTable) {
    const unit = request.units[req.unit];
    if (!unit) continue;
    const subjects = unit.members.map((m) => request.guests[m]?.token).filter(Boolean) as string[];
    const tables = req.tables.map((t) => request.tables[t]?.token).filter(Boolean) as string[];
    rules.push({
      contentHash: exactHash({ kind: "REQUIRE_TABLE", subjects, tables }),
      kind: "REQUIRE_TABLE",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: subjects,
      tableTokens: tables,
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    });
  }
  for (const req of request.forbidTable) {
    const unit = request.units[req.unit];
    if (!unit) continue;
    const subjects = unit.members.map((m) => request.guests[m]?.token).filter(Boolean) as string[];
    const tables = req.tables.map((t) => request.tables[t]?.token).filter(Boolean) as string[];
    rules.push({
      contentHash: exactHash({ kind: "FORBID_TABLE", subjects, tables }),
      kind: "FORBID_TABLE",
      hardness: "HARD",
      weight: null,
      scope: "TABLE",
      subjectTokens: subjects,
      tableTokens: tables,
      zoneCodes: [],
      capabilityCodes: [],
      positionToken: null,
    });
  }

  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({
      movementTolerance: request.movementTolerance,
      purpose: request.purpose,
      mode: request.mode,
    }),
    seed: String(request.seed),
    guests: request.guests.map((g) => ({
      token: g.token,
      eligible: g.eligible,
      capabilityCodes: [...g.attrs],
      groupTokens: [],
      protocolCodes: [],
    })),
    positions: request.seats.map((s) => ({
      token: s.token,
      tableToken: request.tables[s.table]?.token ?? `table-${s.table}`,
      zoneCodes: [],
      capabilityCodes: [...s.attrs],
    })),
    rules,
    reservations: request.reservations.map((r, i) => ({
      contentHash: exactHash({ i, kind: r.kind, seat: r.seat, holder: r.holderGuest }),
      eligibleGuestTokens:
        r.holderGuest != null && request.guests[r.holderGuest]
          ? [request.guests[r.holderGuest]!.token]
          : [],
      tableTokens: request.seats[r.seat] ? [request.tables[request.seats[r.seat]!.table]?.token].filter(Boolean) as string[] : [],
      zoneCodes: [],
      min: null,
      max: null,
      exact: null,
    })),
  };
}

export function parseFrozenCpsatRequest(raw: unknown): CpsatSolveRequest {
  if (!raw || typeof raw !== "object") {
    throw new Error("INVALID_INPUT:missing_request_json");
  }
  return raw as CpsatSolveRequest;
}

export function parseAuthoredAuthority(
  raw: unknown,
  fallbackRequest: CpsatSolveRequest,
): SeatingV2CompiledRequest {
  if (raw && typeof raw === "object" && Array.isArray((raw as SeatingV2CompiledRequest).guests)) {
    return raw as SeatingV2CompiledRequest;
  }
  return authoredAuthorityFromCpsatRequest(fallbackRequest);
}
