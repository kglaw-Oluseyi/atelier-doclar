/**
 * Prove a HARD-valid full assignment exists for B_TYPICAL by displacement repair
 * of the failing together-pair, without changing the corpus.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCapacity1000Corpus } from "../src/seating-capacity-1000-corpus.js";
import { solveSeatingV1 } from "../src/seating-solver-v1.js";

type Detail = { id: string; reason: string };

function scoreHard(state: Map<string, string>, request: ReturnType<typeof buildCapacity1000Corpus>, complete: boolean) {
  const byPosition = new Map(request.positions.map((item) => [item.token, item]));
  const guestByToken = new Map(request.guests.map((item) => [item.token, item]));
  const tableOf = (guest: string) => {
    const token = state.get(guest);
    return token ? byPosition.get(token)?.tableToken : undefined;
  };
  const details: Detail[] = [];
  let hardViolations = 0;
  const push = (id: string, reason: string) => {
    hardViolations += 1;
    details.push({ id, reason });
  };
  for (const constraint of request.constraints) {
    if (constraint.kind !== "HARD") continue;
    const payload = constraint.payload;
    if (payload.predicateType === "KEEP_TOGETHER") {
      const seated = payload.guestTokens.filter((token) => state.has(token));
      const tables = new Set(seated.map((token) => tableOf(token)));
      if (seated.length >= 2 && tables.size > 1) push(constraint.id, "split");
    }
    if (payload.predicateType === "KEEP_APART") {
      const seated = payload.guestTokens.filter((token) => state.has(token));
      const tables = seated.map((token) => tableOf(token));
      if (new Set(tables).size !== tables.length) push(constraint.id, "same-table");
    }
    if (payload.predicateType === "LOCK_ASSIGNMENT") {
      const seatedAt = state.get(payload.guestToken);
      if (seatedAt && seatedAt !== payload.positionToken) push(constraint.id, "lock-miss");
      else if (complete && guestByToken.get(payload.guestToken)?.eligible && !seatedAt) push(constraint.id, "lock-unseated");
    }
    if (payload.predicateType === "REQUIRE_TABLE" || payload.predicateType === "FORBID_TABLE") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const table = tableOf(guest);
        if (payload.predicateType === "FORBID_TABLE") {
          if (table && payload.tableTokens.includes(table)) push(constraint.id, "forbid");
          continue;
        }
        if (table && !payload.tableTokens.includes(table)) push(constraint.id, "require-miss");
        else if (complete && !table) push(constraint.id, "require-unseated");
      }
    }
    if (payload.predicateType === "REQUIRE_ZONE" || payload.predicateType === "FORBID_ZONE") {
      for (const guest of payload.guestTokens) {
        if (!guestByToken.get(guest)?.eligible) continue;
        const token = state.get(guest);
        const zones = token ? byPosition.get(token)?.zoneCodes ?? [] : [];
        if (payload.predicateType === "FORBID_ZONE") {
          if (token && payload.zoneCodes.some((code) => zones.includes(code))) push(constraint.id, "forbid-zone");
          continue;
        }
        if (token && !payload.zoneCodes.some((code) => zones.includes(code))) push(constraint.id, "zone-miss");
        else if (complete && !token) push(constraint.id, "zone-unseated");
      }
    }
  }
  for (const [guest, position] of state) {
    const need = guestByToken.get(guest)?.capabilityCodes ?? [];
    const have = byPosition.get(position)?.capabilityCodes ?? [];
    if (!need.every((code) => have.includes(code))) push(`capability:${guest}`, "cap");
  }
  const occupied = [...state.values()];
  if (new Set(occupied).size !== occupied.length) push("unique-position", "dup");
  const tableFill = new Map<string, number>();
  const tableCap = new Map<string, number>();
  for (const position of request.positions) tableCap.set(position.tableToken, (tableCap.get(position.tableToken) ?? 0) + 1);
  for (const positionToken of state.values()) {
    const table = byPosition.get(positionToken)?.tableToken;
    if (!table) continue;
    tableFill.set(table, (tableFill.get(table) ?? 0) + 1);
  }
  for (const [table, fill] of tableFill) {
    if (fill > (tableCap.get(table) ?? 0)) push(`capacity:${table}`, "over");
  }
  for (const reservation of request.reservations) {
    if (reservation.released) continue;
    const seatedIn = reservation.eligibleGuestTokens.filter((guest) => {
      const token = state.get(guest);
      if (!token) return false;
      const position = byPosition.get(token);
      if (!position) return false;
      const tableOk = !reservation.tableTokens?.length || reservation.tableTokens.includes(position.tableToken);
      const zoneOk = !reservation.zoneCodes?.length || reservation.zoneCodes.some((code) => position.zoneCodes.includes(code));
      return tableOk && zoneOk;
    }).length;
    const exactOk = reservation.exact === undefined || seatedIn === reservation.exact;
    const minOk = reservation.min === undefined || seatedIn >= reservation.min;
    const maxOk = reservation.max === undefined || seatedIn <= reservation.max;
    if (!(exactOk && minOk && maxOk) && complete && (reservation.exact !== undefined || reservation.min !== undefined)) {
      push(`reservation:${reservation.id}`, `unmet ${seatedIn}`);
    }
  }
  if (complete) {
    for (const guest of request.guests) {
      if (guest.eligible && !state.has(guest.token)) push(`unseated-required:${guest.token}`, "unseated");
    }
  }
  return { hardViolations, details };
}

function hardLinked(token: string, request: ReturnType<typeof buildCapacity1000Corpus>) {
  return request.constraints.some((constraint) => {
    if (constraint.kind !== "HARD") return false;
    const payload = constraint.payload as { guestToken?: string; guestTokens?: string[] };
    if (payload.guestToken === token) return true;
    return payload.guestTokens?.includes(token) ?? false;
  }) || request.reservations.some((reservation) => reservation.eligibleGuestTokens.includes(token));
}

const request = buildCapacity1000Corpus("B_TYPICAL");
const result = solveSeatingV1(request);
const byPos = new Map(request.positions.map((item) => [item.token, item]));
const state = new Map(
  result.assignments
    .filter((item) => item.state === "SEATED" && item.positionToken)
    .map((item) => [item.guestToken, item.positionToken!]),
);

const freeSeat = request.positions.map((item) => item.token).find((token) => ![...state.values()].includes(token));
const before = scoreHard(state, request, true);

// Find a table with two disposable (non-HARD-linked) occupants; swap them to freeSeat + g0146 seat, place pair.
let witness: Record<string, unknown> | undefined;
const g146Seat = state.get("g0146");
if (freeSeat && g146Seat) {
  const tables = [...new Set(request.positions.map((item) => item.tableToken))];
  for (const table of tables) {
    const occupants = [...state.entries()]
      .filter(([, position]) => byPos.get(position)?.tableToken === table)
      .map(([guest, position]) => ({ guest, position }));
    const disposable = occupants.filter(
      (item) => item.guest !== "g0146" && item.guest !== "g0147" && !hardLinked(item.guest, request),
    );
    if (disposable.length < 2) continue;
    const a = disposable[0]!;
    const b = disposable[1]!;
    const trial = new Map(state);
    trial.delete("g0146");
    trial.delete(a.guest);
    trial.delete(b.guest);
    trial.set(a.guest, freeSeat);
    trial.set(b.guest, g146Seat);
    const open = request.positions
      .filter((item) => item.tableToken === table)
      .map((item) => item.token)
      .filter((token) => ![...trial.values()].includes(token));
    if (open.length < 2) continue;
    trial.set("g0146", open[0]!);
    trial.set("g0147", open[1]!);
    const after = scoreHard(trial, request, true);
    if (after.hardViolations === 0 && trial.size === 1000) {
      witness = {
        strategy: "displace-two-unconstrained-guests-then-seat-pair",
        table,
        displaced: [a.guest, b.guest],
        pairSeats: open.slice(0, 2),
        beforeHard: before.hardViolations,
        afterHard: after.hardViolations,
        seated: trial.size,
      };
      break;
    }
  }
}

const out = {
  solverStatus: result.status,
  solverHard: result.score.hardViolations,
  beforeRepair: before,
  globalWitnessFound: Boolean(witness),
  witness,
  incompleteScoreOnSolverState: scoreHard(state, request, false),
};
writeFileSync(
  join(process.cwd(), "../../docs/control/evidence/eos-s06-capacity-1000/B_TYPICAL_GLOBAL_WITNESS.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(JSON.stringify(out, null, 2));
