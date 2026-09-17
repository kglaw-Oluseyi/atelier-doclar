/**
 * Strip identity tokens before crossing the child boundary.
 * Index maps remain in TypeScript / PostgreSQL only.
 */
import type { CpsatSolveRequest } from "./compiler.js";
import { assertCpsatWireSeed } from "./seed.js";

export function toChildPayload(request: CpsatSolveRequest): Record<string, unknown> {
  const seed = assertCpsatWireSeed(request.seed);
  return {
    contractVersion: request.contractVersion,
    modelVersion: request.modelVersion,
    runId: request.runId,
    mode: request.mode,
    seed,
    purpose: request.purpose,
    tables: request.tables.map(({ i, capacity }) => ({ i, capacity })),
    seats: request.seats.map(({ i, table, attrs }) => ({ i, table, attrs })),
    guests: request.guests.map(({ i, eligible, attrs, lockedSeat, lockedTable }) => ({
      i,
      eligible,
      attrs,
      lockedSeat,
      lockedTable,
    })),
    units: request.units,
    togetherPairs: request.togetherPairs,
    apartPairs: request.apartPairs,
    requireTable: request.requireTable,
    forbidTable: request.forbidTable,
    reservations: request.reservations,
    preferences: request.preferences,
    baseline: request.baseline,
    limits: request.limits,
    movementTolerance: request.movementTolerance,
    closureHash: request.closureHash,
  };
}

export function mapChildAssignmentsToV2(
  request: CpsatSolveRequest,
  childAssignments: Array<{ guest: number; table: number; seat: number }>,
  shortReasons: Array<{ guest: number; code: string }>,
): Array<{ guestToken: string; state: "SEATED" | "UNSEATED"; positionToken: string | null; typedReasonCodes: string[] }> {
  const reasonByGuest = new Map(shortReasons.map((r) => [r.guest, r.code]));
  const seated = new Set(childAssignments.map((a) => a.guest));
  const out: Array<{
    guestToken: string;
    state: "SEATED" | "UNSEATED";
    positionToken: string | null;
    typedReasonCodes: string[];
  }> = [];
  for (const a of childAssignments) {
    const guest = request.guests[a.guest];
    const seat = request.seats[a.seat];
    if (!guest || !seat) continue;
    out.push({
      guestToken: guest.token,
      state: "SEATED",
      positionToken: seat.token,
      typedReasonCodes: [reasonByGuest.get(a.guest) ?? "GLOBAL"],
    });
  }
  for (const g of request.guests) {
    if (!g.eligible || seated.has(g.i)) continue;
    out.push({
      guestToken: g.token,
      state: "UNSEATED",
      positionToken: null,
      typedReasonCodes: ["UNSEATED"],
    });
  }
  return out.sort((a, b) => a.guestToken.localeCompare(b.guestToken));
}
