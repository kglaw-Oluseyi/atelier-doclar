/**
 * Strip identity tokens before crossing the child boundary.
 * Index maps remain in TypeScript / PostgreSQL only.
 */
import type { CpsatSolveRequest } from "./compiler.js";
import { assertCpsatWireSeed } from "./seed.js";

export function toChildPayload(
  request: CpsatSolveRequest & {
    diagnostic?: unknown;
    counterfactual?: unknown;
    testHooks?: unknown;
    confirmation?: unknown;
  },
  options: { allowTestHooks?: boolean } = {},
): Record<string, unknown> {
  const seed = assertCpsatWireSeed(request.seed);
  const mapGuestOrUnit = (items: Array<{ unit?: number; guestOrUnit?: number; tables: number[] }>) =>
    items.map((item) => ({
      guestOrUnit: item.guestOrUnit ?? item.unit ?? 0,
      tables: item.tables,
    }));
  if (request.testHooks != null && !options.allowTestHooks) {
    throw new Error("production_request_rejects_testHooks");
  }
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
    requireTable: mapGuestOrUnit(request.requireTable as Array<{ unit?: number; guestOrUnit?: number; tables: number[] }>),
    forbidTable: mapGuestOrUnit(request.forbidTable as Array<{ unit?: number; guestOrUnit?: number; tables: number[] }>),
    reservations: request.reservations,
    preferences: request.preferences,
    baseline: request.baseline,
    limits: request.limits,
    movementTolerance: request.movementTolerance,
    closureHash: request.closureHash,
    ...(request.diagnostic ? { diagnostic: request.diagnostic } : {}),
    ...(request.counterfactual ? { counterfactual: request.counterfactual } : {}),
    ...(options.allowTestHooks && request.testHooks ? { testHooks: request.testHooks } : {}),
    ...(request.confirmation ? { confirmation: request.confirmation } : {}),
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
