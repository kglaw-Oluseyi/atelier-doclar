import { exactHash } from "./eec-hash.js";
import { defaultSolverConfig } from "./seating-solver-v1.js";
import type {
  SolverConstraint,
  SolverGuestToken,
  SolverPositionToken,
  SolverRequest,
  SolverReservation,
} from "./seating-solver-types.js";

/** Deterministic 600-guest capacity qualification corpus edition. */
export const CAPACITY_CORPUS_EDITION = "eos-s06-capacity-600-v1";

export const CAPACITY_SCENARIO_IDS = ["A_LIGHT", "B_TYPICAL", "C_HEAVY", "D_INFEASIBLE"] as const;
export type CapacityScenarioId = (typeof CAPACITY_SCENARIO_IDS)[number];

export const CAPACITY_SCENARIO_SEEDS: Record<CapacityScenarioId, string> = {
  A_LIGHT: "eos-s06-cap-A-light-600-v1",
  B_TYPICAL: "eos-s06-cap-B-typical-600-v1",
  C_HEAVY: "eos-s06-cap-C-heavy-600-v1",
  D_INFEASIBLE: "eos-s06-cap-D-infeasible-600-v1",
};

export type CapacityScenarioMeta = {
  id: CapacityScenarioId;
  seed: string;
  description: string;
  expectedStatus: "FEASIBLE" | "INFEASIBLE";
  guestCount: number;
  eligibleCount: number;
  seatCount: number;
};

function pad(prefix: string, index: number, width = 4): string {
  return `${prefix}${String(index).padStart(width, "0")}`;
}

function hashSeedToUint32(seed: string): number {
  let hash = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function uniformInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickUnique(rng: () => number, count: number, min: number, max: number): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  const picked: number[] = [];
  for (let index = 0; index < count && pool.length > 0; index += 1) {
    const slot = Math.floor(rng() * pool.length);
    picked.push(pool[slot]!);
    pool.splice(slot, 1);
  }
  return picked.sort((left, right) => left - right);
}

type TableSpec = { tableIndex: number; seats: number; zoneCodes: string[]; wheelchairSeats: number };

function buildPositions(tableSpecs: TableSpec[]): SolverPositionToken[] {
  const positions: SolverPositionToken[] = [];
  for (const table of tableSpecs) {
    const tableToken = pad("t", table.tableIndex);
    for (let seat = 1; seat <= table.seats; seat += 1) {
      positions.push({
        token: `${tableToken}:${String(seat).padStart(2, "0")}`,
        tableToken,
        zoneCodes: table.zoneCodes,
        capabilityCodes: seat <= table.wheelchairSeats ? ["A11Y_WHEELCHAIR"] : [],
      });
    }
  }
  return positions;
}

function uniformTables(count: number, seatsPerTable: number, zoneCode: string): TableSpec[] {
  return Array.from({ length: count }, (_, index) => ({
    tableIndex: index + 1,
    seats: seatsPerTable,
    zoneCodes: [zoneCode],
    wheelchairSeats: 0,
  }));
}

function mixedTypicalTables(): TableSpec[] {
  const specs: TableSpec[] = [];
  for (let index = 1; index <= 30; index += 1) {
    specs.push({
      tableIndex: index,
      seats: 8,
      zoneCodes: index <= 12 ? ["ZONE_VIP"] : ["ZONE_GENERAL"],
      wheelchairSeats: index <= 15 ? 2 : 0,
    });
  }
  for (let index = 31; index <= 60; index += 1) {
    specs.push({
      tableIndex: index,
      seats: 12,
      zoneCodes: ["ZONE_GENERAL"],
      wheelchairSeats: 0,
    });
  }
  return specs;
}

function buildGuests600(options: {
  wheelchairGuestIndices?: number[];
  partyPairs?: Array<[number, number]>;
  protocolGuestIndices?: number[];
}): SolverGuestToken[] {
  const wheelchair = new Set(options.wheelchairGuestIndices ?? []);
  const protocol = new Set(options.protocolGuestIndices ?? []);
  const partyByGuest = new Map<number, string>();
  for (const [left, right] of options.partyPairs ?? []) {
    const token = pad("p", Math.min(left, right));
    partyByGuest.set(left, token);
    partyByGuest.set(right, token);
  }
  return Array.from({ length: 600 }, (_, index) => {
    const guestIndex = index + 1;
    return {
      token: pad("g", guestIndex),
      eligible: true,
      partyToken: partyByGuest.get(guestIndex),
      capabilityCodes: wheelchair.has(guestIndex) ? ["A11Y_WHEELCHAIR"] : [],
      protocolCodes: protocol.has(guestIndex) ? ["PROTOCOL_HIGH"] : [],
    };
  });
}

function togetherConstraint(id: string, left: number, right: number): SolverConstraint {
  return {
    id,
    kind: "HARD",
    predicateType: "KEEP_TOGETHER",
    payload: { predicateType: "KEEP_TOGETHER", guestTokens: [pad("g", left), pad("g", right)] },
  };
}

function apartConstraint(id: string, left: number, right: number): SolverConstraint {
  return {
    id,
    kind: "HARD",
    predicateType: "KEEP_APART",
    payload: { predicateType: "KEEP_APART", guestTokens: [pad("g", left), pad("g", right)] },
  };
}

function preferTableConstraint(id: string, guestIndex: number, tableIndex: number, weight = 3): SolverConstraint {
  return {
    id,
    kind: "WEIGHTED",
    predicateType: "PREFER_TABLE",
    weight,
    payload: {
      predicateType: "PREFER_TABLE",
      guestTokens: [pad("g", guestIndex)],
      tableTokens: [pad("t", tableIndex)],
    },
  };
}

function requireZoneConstraint(id: string, guestIndex: number, zoneCode: string): SolverConstraint {
  return {
    id,
    kind: "HARD",
    predicateType: "REQUIRE_ZONE",
    payload: {
      predicateType: "REQUIRE_ZONE",
      guestTokens: [pad("g", guestIndex)],
      zoneCodes: [zoneCode],
    },
  };
}

function lockAssignmentConstraint(id: string, guestIndex: number, tableIndex: number, seat: number): SolverConstraint {
  return {
    id,
    kind: "HARD",
    predicateType: "LOCK_ASSIGNMENT",
    payload: {
      predicateType: "LOCK_ASSIGNMENT",
      guestToken: pad("g", guestIndex),
      positionToken: `${pad("t", tableIndex)}:${String(seat).padStart(2, "0")}`,
    },
  };
}

function requireTableConstraint(id: string, guestIndices: number[], tableIndex: number): SolverConstraint {
  return {
    id,
    kind: "HARD",
    predicateType: "REQUIRE_TABLE",
    payload: {
      predicateType: "REQUIRE_TABLE",
      guestTokens: guestIndices.map((index) => pad("g", index)),
      tableTokens: [pad("t", tableIndex)],
    },
  };
}

function headReservation(): SolverReservation {
  return {
    id: "res-head",
    eligibleGuestTokens: Array.from({ length: 10 }, (_, index) => pad("g", index + 1)),
    tableTokens: ["t0001"],
    min: 8,
    max: 10,
    priority: 100,
  };
}

function buildLightCorpus(): SolverRequest {
  const partyPairs: Array<[number, number]> = [
    [1, 2],
    [11, 12],
    [21, 22],
    [31, 32],
    [41, 42],
    [51, 52],
    [61, 62],
    [71, 72],
  ];
  const constraints: SolverConstraint[] = [
    ...partyPairs.map(([left, right], index) => togetherConstraint(`cap-a-together-${index + 1}`, left, right)),
    apartConstraint("cap-a-apart-1", 3, 5),
    apartConstraint("cap-a-apart-2", 7, 9),
    apartConstraint("cap-a-apart-3", 13, 15),
    preferTableConstraint("cap-a-pref-1", 20, 2),
    preferTableConstraint("cap-a-pref-2", 40, 4),
    preferTableConstraint("cap-a-pref-3", 60, 6),
    preferTableConstraint("cap-a-pref-4", 80, 8),
    preferTableConstraint("cap-a-pref-5", 100, 10),
    preferTableConstraint("cap-a-pref-6", 120, 12),
  ];
  return {
    guests: buildGuests600({ partyPairs }),
    positions: buildPositions(uniformTables(60, 10, "ZONE_GENERAL")),
    constraints,
    reservations: [headReservation()],
    config: defaultSolverConfig({
      seed: CAPACITY_SCENARIO_SEEDS.A_LIGHT,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

function buildTypicalCorpus(): SolverRequest {
  const rng = mulberry32(hashSeedToUint32(CAPACITY_SCENARIO_SEEDS.B_TYPICAL));
  const wheelchairGuests = pickUnique(rng, 15, 1, 600);
  const protocolGuests = pickUnique(rng, 8, 1, 600);
  const partyPairs: Array<[number, number]> = [];
  for (let index = 0; index < 20; index += 1) {
    const left = 100 + index * 2;
    partyPairs.push([left, left + 1]);
  }
  const constraints: SolverConstraint[] = [
    ...partyPairs.map(([left, right], index) => togetherConstraint(`cap-b-together-${index + 1}`, left, right)),
    apartConstraint("cap-b-apart-1", 5, 25),
    apartConstraint("cap-b-apart-2", 15, 35),
    apartConstraint("cap-b-apart-3", 45, 65),
    apartConstraint("cap-b-apart-4", 75, 95),
    apartConstraint("cap-b-apart-5", 105, 125),
    apartConstraint("cap-b-apart-6", 135, 155),
    apartConstraint("cap-b-apart-7", 165, 185),
    apartConstraint("cap-b-apart-8", 195, 215),
    apartConstraint("cap-b-apart-9", 225, 245),
    apartConstraint("cap-b-apart-10", 255, 275),
    requireZoneConstraint("cap-b-zone-1", 1, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-2", 2, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-3", 3, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-4", 4, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-5", 5, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-6", 6, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-7", 7, "ZONE_VIP"),
    requireZoneConstraint("cap-b-zone-8", 8, "ZONE_VIP"),
  ];
  for (let index = 0; index < 25; index += 1) {
    constraints.push(
      preferTableConstraint(`cap-b-pref-${index + 1}`, 300 + index * 10, (index % 12) + 1, uniformInt(rng, 2, 5)),
    );
  }
  const reservations: SolverReservation[] = [
    headReservation(),
    {
      id: "res-access",
      eligibleGuestTokens: wheelchairGuests.map((index) => pad("g", index)),
      tableTokens: Array.from({ length: 15 }, (_, index) => pad("t", index + 1)),
      min: wheelchairGuests.length,
      max: wheelchairGuests.length,
      priority: 95,
    },
  ];
  return {
    guests: buildGuests600({ wheelchairGuestIndices: wheelchairGuests, partyPairs, protocolGuestIndices: protocolGuests }),
    positions: buildPositions(mixedTypicalTables()),
    constraints,
    reservations,
    config: defaultSolverConfig({
      seed: CAPACITY_SCENARIO_SEEDS.B_TYPICAL,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

function buildHeavyCorpus(): SolverRequest {
  const rng = mulberry32(hashSeedToUint32(CAPACITY_SCENARIO_SEEDS.C_HEAVY));
  const partyTriples: Array<[number, number, number]> = [];
  for (let index = 0; index < 8; index += 1) {
    const base = 400 + index * 3;
    partyTriples.push([base, base + 1, base + 2]);
  }
  const constraints: SolverConstraint[] = [];
  for (const [left, middle, right] of partyTriples) {
    constraints.push(togetherConstraint(`cap-c-chain-${left}`, left, middle));
    constraints.push(togetherConstraint(`cap-c-chain-${middle}`, middle, right));
  }
  const apartAnchors = pickUnique(rng, 12, 50, 320);
  for (let index = 0; index < apartAnchors.length - 1; index += 2) {
    const left = apartAnchors[index]!;
    const right = apartAnchors[index + 1]!;
    constraints.push(apartConstraint(`cap-c-apart-${left}-${right}`, left, right));
  }
  for (let index = 0; index < 4; index += 1) {
    constraints.push(requireTableConstraint(`cap-c-req-${index + 1}`, [500 + index, 510 + index], index + 3));
  }
  constraints.push(lockAssignmentConstraint("cap-c-lock-1", 1, 1, 1));
  constraints.push(lockAssignmentConstraint("cap-c-lock-2", 2, 1, 2));
  for (let index = 0; index < 24; index += 1) {
    constraints.push(
      preferTableConstraint(`cap-c-pref-${index + 1}`, 50 + index * 15, uniformInt(rng, 1, 60), uniformInt(rng, 2, 5)),
    );
  }
  const reservations: SolverReservation[] = [
    {
      id: "res-head-heavy",
      eligibleGuestTokens: Array.from({ length: 12 }, (_, index) => pad("g", index + 1)),
      tableTokens: ["t0001", "t0002"],
      min: 10,
      max: 12,
      priority: 100,
    },
    {
      id: "res-companion",
      eligibleGuestTokens: ["g0400", "g0401", "g0402", "g0403"],
      tableTokens: ["t0030"],
      exact: 4,
      priority: 90,
    },
    {
      id: "res-pressure",
      eligibleGuestTokens: Array.from({ length: 16 }, (_, index) => pad("g", 550 + index)),
      tableTokens: ["t0055", "t0056"],
      min: 14,
      max: 16,
      priority: 85,
    },
  ];
  return {
    guests: buildGuests600({}),
    positions: buildPositions(uniformTables(60, 10, "ZONE_GENERAL")),
    constraints,
    reservations,
    config: defaultSolverConfig({
      seed: CAPACITY_SCENARIO_SEEDS.C_HEAVY,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

function buildInfeasibleCorpus(): SolverRequest {
  return {
    guests: buildGuests600({}),
    positions: buildPositions(uniformTables(60, 10, "ZONE_GENERAL")),
    constraints: [
      lockAssignmentConstraint("cap-d-lock-a", 1, 1, 1),
      lockAssignmentConstraint("cap-d-lock-b", 2, 1, 1),
      apartConstraint("cap-d-contradiction-apart", 3, 4),
      togetherConstraint("cap-d-contradiction-together", 3, 4),
    ],
    reservations: [],
    config: defaultSolverConfig({
      seed: CAPACITY_SCENARIO_SEEDS.D_INFEASIBLE,
      timeLimitMs: 20_000,
      alternativeCount: 0,
      materialityThreshold: 8,
    }),
  };
}

export function buildCapacityCorpus(scenario: CapacityScenarioId): SolverRequest {
  switch (scenario) {
    case "A_LIGHT":
      return buildLightCorpus();
    case "B_TYPICAL":
      return buildTypicalCorpus();
    case "C_HEAVY":
      return buildHeavyCorpus();
    case "D_INFEASIBLE":
      return buildInfeasibleCorpus();
    default: {
      const exhaustive: never = scenario;
      throw new Error(`unknown capacity scenario ${exhaustive}`);
    }
  }
}

export function capacityCorpusHash(scenario: CapacityScenarioId): string {
  return exactHash(buildCapacityCorpus(scenario));
}

export function capacityScenarioMeta(scenario: CapacityScenarioId): CapacityScenarioMeta {
  const request = buildCapacityCorpus(scenario);
  const eligibleCount = request.guests.filter((guest) => guest.eligible).length;
  const seatCount = request.positions.length;
  const descriptions: Record<CapacityScenarioId, string> = {
    A_LIGHT: "Light constraint density: households, mixed tables, small HARD/SOFT set, feasible placement.",
    B_TYPICAL: "Typical constraint density: families, accessibility, protocol, adjacency, reservations, feasible.",
    C_HEAVY: "Heavy constraint density: dense HARD/SOFT interaction, reservations, companions, feasible but demanding.",
    D_INFEASIBLE: "Deliberately infeasible: conflicting locks and contradictory together/apart on the same pair.",
  };
  return {
    id: scenario,
    seed: CAPACITY_SCENARIO_SEEDS[scenario],
    description: descriptions[scenario],
    expectedStatus: scenario === "D_INFEASIBLE" ? "INFEASIBLE" : "FEASIBLE",
    guestCount: request.guests.length,
    eligibleCount,
    seatCount,
  };
}

export function capacityCorpusManifest(): {
  edition: string;
  scenarios: Array<CapacityScenarioMeta & { datasetHash: string }>;
} {
  return {
    edition: CAPACITY_CORPUS_EDITION,
    scenarios: CAPACITY_SCENARIO_IDS.map((scenario) => ({
      ...capacityScenarioMeta(scenario),
      datasetHash: capacityCorpusHash(scenario),
    })),
  };
}

/** Named synthetic guests for browser/search journeys (deterministic, no real data). */
export function capacityBrowserGuestNames(): Array<{ givenName: string; familyName: string; guestIndex: number }> {
  const families = ["Okeke", "Adeyemi", "Nwosu", "Fashola", "Bello", "Okonkwo", "Eze", "Yusuf"];
  return Array.from({ length: 600 }, (_, index) => {
    const guestIndex = index + 1;
    const familyName = families[index % families.length]!;
    const givenName = `Cap${String(guestIndex).padStart(3, "0")}`;
    return { givenName, familyName, guestIndex };
  });
}
