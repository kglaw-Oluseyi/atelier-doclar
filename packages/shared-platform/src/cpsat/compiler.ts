/**
 * Together-closure and domain compiler from V2 compiled authority
 * into the integer-indexed CP-SAT child request.
 */
import { createHash } from "node:crypto";
import { exactHash } from "../eec-hash.js";
import type { SeatingV2CompiledRequest, SeatingV2CompiledRule } from "../seating-v2-schemas.js";
import {
  CPSAT_MODEL_VERSION,
  CPSAT_PREFERENCE_BANDS,
  CPSAT_REQUEST_CONTRACT,
  type CpsatPreferenceBand,
} from "./contract.js";

export type CpsatSolveRequest = {
  contractVersion: typeof CPSAT_REQUEST_CONTRACT;
  modelVersion: typeof CPSAT_MODEL_VERSION;
  runId: string;
  mode: "REPLAY" | "PERFORMANCE";
  seed: number;
  purpose: string;
  tables: Array<{ i: number; capacity: number; token: string }>;
  seats: Array<{ i: number; table: number; token: string; attrs: string[] }>;
  guests: Array<{
    i: number;
    token: string;
    eligible: boolean;
    attrs: string[];
    lockedSeat: number | null;
    lockedTable: number | null;
  }>;
  units: Array<{ i: number; members: number[]; domainTables: number[] }>;
  togetherPairs: number[][];
  apartPairs: number[][];
  requireTable: Array<{ unit: number; tables: number[] }>;
  forbidTable: Array<{ unit: number; tables: number[] }>;
  reservations: Array<{ kind: "GUARANTEE" | "HOLD"; seat: number; holderGuest: number | null }>;
  preferences: Array<{ guest: number; table: number; band: CpsatPreferenceBand; weight: number }>;
  baseline: Array<{ guest: number; table: number; seat: number }>;
  limits: { maxTimeSeconds: number; workers: number; wallSeconds: number };
  movementTolerance: number;
  closureHash: string;
  indexMapHash: string;
  unsupportedHardRules: string[];
};

function unionFind(pairs: number[][], n: number): number[] {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]!;
      x = parent[x]!;
    }
    return x;
  };
  for (const [a, b] of pairs) {
    if (a == null || b == null) continue;
    if (a < 0 || b < 0 || a >= n || b >= n) continue;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }
  return parent.map((_, i) => find(i));
}

/** Build transitive together units; do not bridge through ineligible guests (D1). */
export function buildTogetherUnits(
  eligible: boolean[],
  togetherPairs: number[][],
): { units: number[][]; closureHash: string; filteredPairs: number[][] } {
  const n = eligible.length;
  const filteredPairs = togetherPairs.filter(([a, b]) => {
    if (a == null || b == null) return false;
    return eligible[a] === true && eligible[b] === true;
  });
  const roots = unionFind(filteredPairs, n);
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (!eligible[i]) continue;
    const r = roots[i]!;
    const list = buckets.get(r) ?? [];
    list.push(i);
    buckets.set(r, list);
  }
  const units = [...buckets.values()]
    .map((members) => [...members].sort((x, y) => x - y))
    .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0) || a.length - b.length);
  // Must match Python model.closure.closure_hash_from_units (units-only canonical JSON).
  const closureHash = createHash("sha256")
    .update(JSON.stringify(units))
    .digest("hex");
  return { units, closureHash, filteredPairs };
}

function bandFromWeight(weight: number | undefined): CpsatPreferenceBand {
  if (weight == null || weight <= 1) return "LOW";
  if (weight <= 3) return "MEDIUM";
  if (weight <= 10) return "HIGH";
  return "PRINCIPAL";
}

const SEAT_RELATIONAL_HARD = new Set(["PROTOCOL_SEAT_ORDER", "ADJACENCY", "SEAT_ORDER"]);

function seedFromCompiled(seed: string | number | undefined): number {
  let n: number;
  if (typeof seed === "number" && Number.isFinite(seed)) n = Math.trunc(seed);
  else if (typeof seed === "string" && /^\d+$/.test(seed)) n = Number(seed);
  else if (typeof seed === "string" && seed.length) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    n = h >>> 0;
  } else {
    n = 1;
  }
  // OR-Tools random_seed is a signed int32.
  const INT32_MAX = 0x7fffffff;
  n = ((n % INT32_MAX) + INT32_MAX) % INT32_MAX;
  return n === 0 ? 1 : n;
}

export function compileV2ToCpsatRequest(
  compiled: SeatingV2CompiledRequest,
  options: {
    runId: string;
    mode?: "REPLAY" | "PERFORMANCE";
    purpose?: string;
    maxTimeSeconds?: number;
    wallSeconds?: number;
    workers?: number;
    movementTolerance?: number;
    baseline?: Array<{ guestToken: string; positionToken: string }>;
  },
): CpsatSolveRequest {
  const tableTokenToIndex = new Map<string, number>();
  const tables: CpsatSolveRequest["tables"] = [];
  for (const position of compiled.positions) {
    if (!tableTokenToIndex.has(position.tableToken)) {
      const i = tableTokenToIndex.size;
      tableTokenToIndex.set(position.tableToken, i);
      tables.push({ i, capacity: 0, token: position.tableToken });
    }
  }
  const seats: CpsatSolveRequest["seats"] = compiled.positions.map((position, i) => {
    const table = tableTokenToIndex.get(position.tableToken)!;
    tables[table]!.capacity += 1;
    return {
      i,
      table,
      token: position.token,
      attrs: [...(position.capabilityCodes ?? [])].sort(),
    };
  });
  const seatTokenToIndex = new Map(seats.map((s) => [s.token, s.i]));
  const guestTokenToIndex = new Map(compiled.guests.map((g, i) => [g.token, i]));
  const guests: CpsatSolveRequest["guests"] = compiled.guests.map((g, i) => ({
    i,
    token: g.token,
    eligible: g.eligible,
    attrs: [...(g.capabilityCodes ?? [])].sort(),
    lockedSeat: null,
    lockedTable: null,
  }));

  const togetherPairs: number[][] = [];
  const apartPairs: number[][] = [];
  const preferences: CpsatSolveRequest["preferences"] = [];
  const unsupportedHardRules: string[] = [];
  const guestRequire = new Map<number, Set<number>>();
  const guestForbid = new Map<number, Set<number>>();

  const tablesByZone = new Map<string, Set<number>>();
  for (const position of compiled.positions) {
    const ti = tableTokenToIndex.get(position.tableToken)!;
    for (const zone of position.zoneCodes ?? []) {
      const set = tablesByZone.get(zone) ?? new Set<number>();
      set.add(ti);
      tablesByZone.set(zone, set);
    }
  }

  /** Per-table count of seats offering each attribute (Hall-family projection). */
  const attrSeatCountByTable = new Map<number, Map<string, number>>();
  for (const seat of seats) {
    const byAttr = attrSeatCountByTable.get(seat.table) ?? new Map<string, number>();
    for (const attr of seat.attrs) {
      byAttr.set(attr, (byAttr.get(attr) ?? 0) + 1);
    }
    attrSeatCountByTable.set(seat.table, byAttr);
  }

  for (const rule of compiled.rules as SeatingV2CompiledRule[]) {
    if (rule.hardness === "INFORMATIONAL") continue;
    if (rule.hardness === "HARD" && SEAT_RELATIONAL_HARD.has(rule.kind)) {
      unsupportedHardRules.push(rule.kind);
      continue;
    }
    const subjects = rule.subjectTokens
      .map((t) => guestTokenToIndex.get(t))
      .filter((x): x is number => x != null);
    if (rule.kind === "KEEP_TOGETHER" && subjects.length >= 2) {
      for (let i = 0; i < subjects.length; i++) {
        for (let j = i + 1; j < subjects.length; j++) {
          togetherPairs.push([subjects[i]!, subjects[j]!]);
        }
      }
    } else if (rule.kind === "KEEP_APART" && subjects.length >= 2) {
      for (let i = 0; i < subjects.length; i++) {
        for (let j = i + 1; j < subjects.length; j++) {
          apartPairs.push([subjects[i]!, subjects[j]!]);
        }
      }
    } else if (rule.kind === "LOCK_ASSIGNMENT") {
      const g = guestTokenToIndex.get(rule.subjectTokens[0] ?? "");
      const seat = seatTokenToIndex.get(rule.positionToken ?? "");
      if (g != null && seat != null) {
        guests[g]!.lockedSeat = seat;
        guests[g]!.lockedTable = seats[seat]!.table;
      }
    } else if (rule.kind === "REQUIRE_TABLE" || rule.kind === "FORBID_TABLE") {
      const tableIdx = rule.tableTokens
        .map((t) => tableTokenToIndex.get(t))
        .filter((x): x is number => x != null);
      for (const g of subjects) {
        const map = rule.kind === "REQUIRE_TABLE" ? guestRequire : guestForbid;
        const set = map.get(g) ?? new Set<number>();
        for (const t of tableIdx) set.add(t);
        map.set(g, set);
      }
    } else if (rule.kind === "REQUIRE_ZONE" || rule.kind === "FORBID_ZONE") {
      const zoneTables = new Set<number>();
      for (const zone of rule.zoneCodes) {
        for (const t of tablesByZone.get(zone) ?? []) zoneTables.add(t);
      }
      for (const g of subjects) {
        if (rule.kind === "REQUIRE_ZONE") {
          const set = guestRequire.get(g) ?? new Set<number>(tables.map((t) => t.i));
          const next = new Set([...set].filter((t) => zoneTables.has(t)));
          guestRequire.set(g, next);
        } else {
          const set = guestForbid.get(g) ?? new Set<number>();
          for (const t of zoneTables) set.add(t);
          guestForbid.set(g, set);
        }
      }
    } else if (rule.kind === "PREFER_TABLE" && rule.hardness === "SOFT") {
      const band = bandFromWeight(rule.weight ?? undefined);
      const tableIdx = rule.tableTokens
        .map((t) => tableTokenToIndex.get(t))
        .filter((x): x is number => x != null);
      for (const g of subjects) {
        for (const t of tableIdx) {
          preferences.push({ guest: g, table: t, band, weight: CPSAT_PREFERENCE_BANDS[band] });
        }
      }
    }
  }

  // Block / capacity reservations → domain projection for eligible guests (Checkpoint 2 local product).
  for (const reservation of compiled.reservations ?? []) {
    const tableIdx = reservation.tableTokens
      .map((t) => tableTokenToIndex.get(t))
      .filter((x): x is number => x != null);
    if (!tableIdx.length) continue;
    const eligibleHolders = reservation.eligibleGuestTokens
      .map((t) => guestTokenToIndex.get(t))
      .filter((x): x is number => x != null && guests[x]?.eligible === true);
    // When min === eligible count (or exact), force all holders into reserved tables.
    const forceAll =
      (reservation.exact != null && reservation.exact === eligibleHolders.length) ||
      (reservation.min != null && reservation.min >= eligibleHolders.length);
    if (forceAll) {
      for (const g of eligibleHolders) {
        const set = guestRequire.get(g) ?? new Set<number>(tables.map((t) => t.i));
        guestRequire.set(g, new Set([...set].filter((t) => tableIdx.includes(t))));
      }
    }
  }

  if (unsupportedHardRules.length) {
    throw new Error(`UNSUPPORTED_SEAT_RELATIONAL_HARD:${[...new Set(unsupportedHardRules)].join(",")}`);
  }

  const eligible = guests.map((g) => g.eligible);
  const { units: memberUnits, closureHash, filteredPairs } = buildTogetherUnits(eligible, togetherPairs);

  const units: CpsatSolveRequest["units"] = memberUnits.map((members, i) => {
    let domain = new Set(tables.map((t) => t.i));
    for (const m of members) {
      const g = guests[m]!;
      if (g.lockedTable != null) domain = new Set([g.lockedTable]);
      const req = guestRequire.get(m);
      if (req?.size) domain = new Set([...domain].filter((t) => req.has(t)));
      const forb = guestForbid.get(m);
      if (forb?.size) domain = new Set([...domain].filter((t) => !forb.has(t)));
    }
    // Hall-family: table must supply enough attribute seats for unit members requiring each attr.
    const attrDemand = new Map<string, number>();
    for (const m of members) {
      for (const attr of guests[m]!.attrs) {
        attrDemand.set(attr, (attrDemand.get(attr) ?? 0) + 1);
      }
    }
    if (attrDemand.size) {
      domain = new Set(
        [...domain].filter((t) => {
          const supply = attrSeatCountByTable.get(t) ?? new Map();
          for (const [attr, need] of attrDemand) {
            if ((supply.get(attr) ?? 0) < need) return false;
          }
          return true;
        }),
      );
    }
    if (!domain.size) {
      throw new Error(`EMPTY_DOMAIN:unit=${i}`);
    }
    return { i, members, domainTables: [...domain].sort((a, b) => a - b) };
  });

  const baseline: CpsatSolveRequest["baseline"] = [];
  for (const b of options.baseline ?? []) {
    const g = guestTokenToIndex.get(b.guestToken);
    const seat = seatTokenToIndex.get(b.positionToken);
    if (g == null || seat == null) continue;
    baseline.push({ guest: g, table: seats[seat]!.table, seat });
  }

  const indexMapHash = exactHash({
    guests: guests.map((g) => g.token),
    seats: seats.map((s) => s.token),
    tables: tables.map((t) => t.token),
  });

  return {
    contractVersion: CPSAT_REQUEST_CONTRACT,
    modelVersion: CPSAT_MODEL_VERSION,
    runId: options.runId,
    mode: options.mode ?? "REPLAY",
    seed: seedFromCompiled(compiled.seed),
    purpose: options.purpose ?? "PLANNING",
    tables: tables.map(({ i, capacity, token }) => ({ i, capacity, token })),
    seats: seats.map(({ i, table, token, attrs }) => ({ i, table, token, attrs })),
    guests,
    units,
    togetherPairs: filteredPairs,
    apartPairs,
    requireTable: [],
    forbidTable: [],
    reservations: [],
    preferences,
    baseline,
    limits: {
      maxTimeSeconds: options.maxTimeSeconds ?? 30,
      workers: options.workers ?? 1,
      wallSeconds: options.wallSeconds ?? 90,
    },
    movementTolerance: options.movementTolerance ?? 0,
    closureHash,
    indexMapHash,
    unsupportedHardRules: [],
  };
}
