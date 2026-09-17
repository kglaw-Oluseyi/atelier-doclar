/**
 * Map V1 SolverRequest corpora into SeatingV2CompiledRequest for CP-SAT local product.
 */
import { exactHash } from "../eec-hash.js";
import type { SolverRequest } from "../seating-solver-types.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2CompiledRule,
} from "../seating-v2-schemas.js";

export function solverRequestToV2Compiled(request: SolverRequest): SeatingV2CompiledRequest {
  const rules: SeatingV2CompiledRule[] = request.constraints.map((c) => {
    const payload = c.payload as Record<string, unknown>;
    const guestTokens =
      (payload.guestTokens as string[] | undefined) ??
      (payload.guestToken ? [payload.guestToken as string] : []);
    const hardness =
      c.kind === "HARD" ? ("HARD" as const) : c.kind === "WEIGHTED" ? ("SOFT" as const) : ("INFORMATIONAL" as const);
    return {
      contentHash: exactHash({ id: c.id, predicateType: c.predicateType, payload: c.payload }),
      kind: c.predicateType as SeatingV2CompiledRule["kind"],
      hardness,
      weight: c.weight ?? null,
      scope: "TABLE",
      subjectTokens: guestTokens,
      tableTokens: (payload.tableTokens as string[] | undefined) ?? [],
      zoneCodes: (payload.zoneCodes as string[] | undefined) ?? [],
      capabilityCodes: (payload.capabilityCodes as string[] | undefined) ?? [],
      positionToken: (payload.positionToken as string | undefined) ?? null,
    };
  });

  return {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash(request.config ?? {}),
    seed: String(request.config?.seed ?? "1"),
    guests: request.guests.map((g) => ({
      token: g.token,
      eligible: g.eligible,
      capabilityCodes: g.capabilityCodes ?? [],
      groupTokens: g.partyToken ? [g.partyToken] : [],
    })),
    positions: request.positions.map((p) => ({
      token: p.token,
      tableToken: p.tableToken,
      zoneCodes: p.zoneCodes ?? [],
      capabilityCodes: p.capabilityCodes ?? [],
    })),
    rules,
    reservations: (request.reservations ?? []).map((r) => ({
      contentHash: exactHash({ id: r.id, eligible: r.eligibleGuestTokens, tables: r.tableTokens }),
      eligibleGuestTokens: r.eligibleGuestTokens,
      tableTokens: r.tableTokens ?? [],
      zoneCodes: r.zoneCodes ?? [],
      min: r.min ?? null,
      max: r.max ?? null,
      exact: r.exact ?? null,
    })),
  };
}
