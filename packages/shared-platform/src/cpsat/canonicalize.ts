/**
 * Canonicalise assignments for genuinely symmetric eligible guests.
 * Equivalence: identical attrs, eligibility, locks, unit membership, preference tables.
 * Within each class, assign seats in lexicographic seat-token order by guest-token order.
 */
import type { CpsatSolveRequest } from "./compiler.js";

export type ChildAssignment = { guest: number; table: number; seat: number };

function symmetryKey(request: CpsatSolveRequest, guestIndex: number): string {
  const g = request.guests[guestIndex];
  if (!g) return `missing:${guestIndex}`;
  const unit = request.units.find((u) => u.members.includes(guestIndex));
  const prefs = request.preferences
    .filter((p) => p.guest === guestIndex)
    .map((p) => `${p.table}:${p.band}:${p.weight}`)
    .sort();
  return JSON.stringify({
    eligible: g.eligible,
    attrs: [...g.attrs].sort(),
    lockedSeat: g.lockedSeat,
    lockedTable: g.lockedTable,
    unitMembers: unit ? [...unit.members].sort((a, b) => a - b) : [],
    domainTables: unit ? [...unit.domainTables].sort((a, b) => a - b) : [],
    prefs,
  });
}

export function canonicalizeSymmetricAssignments(
  request: CpsatSolveRequest,
  assignments: ChildAssignment[],
): ChildAssignment[] {
  const byGuest = new Map(assignments.map((a) => [a.guest, { ...a }]));
  const classes = new Map<string, number[]>();
  for (const g of request.guests) {
    if (!g.eligible) continue;
    if (!byGuest.has(g.i)) continue;
    const key = symmetryKey(request, g.i);
    const list = classes.get(key) ?? [];
    list.push(g.i);
    classes.set(key, list);
  }

  for (const members of classes.values()) {
    if (members.length < 2) continue;
    const guestTokens = members
      .map((i) => ({ i, token: request.guests[i]!.token }))
      .sort((a, b) => (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));
    const seats = guestTokens
      .map((g) => byGuest.get(g.i)!)
      .map((a) => ({
        table: a.table,
        seat: a.seat,
        seatToken: request.seats[a.seat]?.token ?? String(a.seat),
      }))
      .sort((a, b) => (a.seatToken < b.seatToken ? -1 : a.seatToken > b.seatToken ? 1 : 0));
    for (let i = 0; i < guestTokens.length; i++) {
      const guest = guestTokens[i]!;
      const seat = seats[i]!;
      byGuest.set(guest.i, { guest: guest.i, table: seat.table, seat: seat.seat });
    }
  }

  return [...byGuest.values()].sort((a, b) => a.guest - b.guest);
}
