/**
 * Second-pass B_TYPICAL trace: seat geography for g0146/g0147 + large-component seating.
 * No corpus mutation. At most one solve.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCapacity1000Corpus } from "../src/seating-capacity-1000-corpus.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";

const request = buildCapacity1000Corpus("B_TYPICAL");
const result = solveSeatingV1(request);
const byPos = new Map(request.positions.map((item) => [item.token, item]));
const seated = new Map(
  result.assignments
    .filter((item) => item.state === "SEATED" && item.positionToken)
    .map((item) => [item.guestToken, item.positionToken!]),
);

const g146 = seated.get("g0146");
const table146 = g146 ? byPos.get(g146)?.tableToken : undefined;
const fill = new Map<string, number>();
const cap = new Map<string, number>();
for (const position of request.positions) cap.set(position.tableToken, (cap.get(position.tableToken) ?? 0) + 1);
for (const positionToken of seated.values()) {
  const table = byPos.get(positionToken)?.tableToken;
  if (table) fill.set(table, (fill.get(table) ?? 0) + 1);
}
const free = [...cap.entries()]
  .map(([table, capacity]) => ({
    table,
    capacity,
    fill: fill.get(table) ?? 0,
    free: capacity - (fill.get(table) ?? 0),
  }))
  .filter((item) => item.free > 0);

const fillAfterFree = new Map(fill);
if (table146) fillAfterFree.set(table146, Math.max(0, (fillAfterFree.get(table146) ?? 0) - 1));
const tablesWithPairAfterFree = [...cap.entries()]
  .map(([table, capacity]) => ({ table, free: capacity - (fillAfterFree.get(table) ?? 0) }))
  .filter((item) => item.free >= 2);

// Independent proof: empty hall, place g0146+g0147 on any table with >=2 seats
let emptyHallPairOk = false;
for (const table of cap.keys()) {
  const seats = request.positions.filter((item) => item.tableToken === table);
  if (seats.length >= 2) {
    emptyHallPairOk = true;
    break;
  }
}

// Independent proof against fixed exterior after freeing the pair
let pairFeasibleAgainstExterior = false;
let witness: { table: string; seats: string[] } | undefined;
for (const candidate of tablesWithPairAfterFree) {
  const freeSeats = request.positions
    .filter((item) => item.tableToken === candidate.table)
    .map((item) => item.token)
    .filter((token) => {
      // occupied if some non-pair guest sits there
      for (const [guest, position] of seated) {
        if (guest === "g0146" || guest === "g0147") continue;
        if (position === token) return false;
      }
      return true;
    });
  if (freeSeats.length >= 2) {
    pairFeasibleAgainstExterior = true;
    witness = { table: candidate.table, seats: freeSeats.slice(0, 2) };
    break;
  }
}

const parent = new Map<string, string>();
for (const guest of request.guests) parent.set(guest.token, guest.token);
const find = (token: string): string => {
  const current = parent.get(token)!;
  if (current !== token) {
    const root = find(current);
    parent.set(token, root);
    return root;
  }
  return current;
};
const union = (left: string, right: string) => {
  const a = find(left);
  const b = find(right);
  if (a !== b) parent.set(a, b);
};
for (const constraint of request.constraints) {
  if (constraint.kind !== "HARD") continue;
  const payload = constraint.payload as { guestToken?: string; guestTokens?: string[] };
  const tokens = payload.guestToken ? [payload.guestToken] : payload.guestTokens ?? [];
  for (let index = 1; index < tokens.length; index += 1) union(tokens[0]!, tokens[index]!);
}
for (const reservation of request.reservations) {
  for (let index = 1; index < reservation.eligibleGuestTokens.length; index += 1) {
    union(reservation.eligibleGuestTokens[0]!, reservation.eligibleGuestTokens[index]!);
  }
}
const groups = new Map<string, string[]>();
for (const guest of request.guests) {
  const root = find(guest.token);
  const list = groups.get(root) ?? [];
  list.push(guest.token);
  groups.set(root, list);
}
const large = [...groups.values()]
  .filter((item) => item.length > 8)
  .map((item) => ({
    size: item.length,
    missing: item.filter((token) => !seated.has(token)),
    sample: item.slice(0, 12),
  }));

const reservations = request.reservations.map((reservation) => {
  const seatedIn = reservation.eligibleGuestTokens.filter((guest) => {
    const position = seated.get(guest);
    if (!position) return false;
    const table = byPos.get(position)?.tableToken;
    return !reservation.tableTokens?.length || (table !== undefined && reservation.tableTokens.includes(table));
  });
  return {
    id: reservation.id,
    min: reservation.min,
    max: reservation.max,
    seatedIn: seatedIn.length,
    missingEligible: reservation.eligibleGuestTokens.filter((guest) => !seated.has(guest)),
  };
});

const out = {
  status: result.status,
  score: result.score,
  elapsedMs: result.metrics.elapsedMs,
  g0146: { position: g146, table: table146 },
  g0147Unseated: true,
  freeSeatTotal: free.reduce((sum, item) => sum + item.free, 0),
  freeTables: free.length,
  table146State: free.find((item) => item.table === table146) ?? null,
  tablesWithPairAfterFreeingG0146: tablesWithPairAfterFree.length,
  emptyHallPairOk,
  pairFeasibleAgainstExterior,
  witness,
  largeComponents: large,
  reservations,
  note:
    "Result.score.hardViolations with incomplete scoring is often 0 for sole-unseated; TIMED_OUT path uses complete seed scoring + searchIncomplete from components>8.",
};

writeFileSync(
  join(process.cwd(), "../../docs/control/evidence/eos-s06-capacity-1000/B_TYPICAL_DIAGNOSIS_TRACE.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(JSON.stringify(out, null, 2));
