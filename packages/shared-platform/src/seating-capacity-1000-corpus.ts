import assert from "node:assert/strict";
import { exactHash } from "./eec-hash.js";
import { defaultSolverConfig } from "./seating-solver-v1.js";
import type {
  SolverConstraint,
  SolverGuestToken,
  SolverPositionToken,
  SolverRequest,
  SolverReservation,
} from "./seating-solver-types.js";
/** Deterministic 1,000-guest stretch qualification corpus edition. */
export const CAPACITY_1000_CORPUS_EDITION = "eos-s06-capacity-1000-v1";

export const CAPACITY_1000_SCENARIO_IDS = ["A_LIGHT", "B_TYPICAL", "C_HEAVY", "D_INFEASIBLE", "E_RECOVERY"] as const;
export type Capacity1000ScenarioId = (typeof CAPACITY_1000_SCENARIO_IDS)[number];

export const CAPACITY_1000_SCENARIO_SEEDS: Record<Capacity1000ScenarioId, string> = {
  A_LIGHT: "eos-s06-cap-A-light-1000-v1",
  B_TYPICAL: "eos-s06-cap-B-typical-1000-v1",
  C_HEAVY: "eos-s06-cap-C-heavy-1000-v1",
  D_INFEASIBLE: "eos-s06-cap-D-infeasible-1000-v1",
  E_RECOVERY: "eos-s06-cap-E-recovery-1000-v1",
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

/** Product layout profile seats mapped into solver positions (110 tables / 1000 seats). */
export function capacity1000ProductTableSpecs(): TableSpec[] {
  const specs: TableSpec[] = [];
  let tableIndex = 1;
  const push = (count: number, seats: number, zone: string, wheelchairSeats = 0) => {
    for (let index = 0; index < count; index += 1) {
      specs.push({
        tableIndex,
        seats,
        zoneCodes: [zone],
        wheelchairSeats,
      });
      tableIndex += 1;
    }
  };
  push(5, 4, "ZONE_GENERAL");
  push(10, 6, "ZONE_GENERAL");
  push(25, 8, "ZONE_GENERAL", 1);
  push(60, 10, "ZONE_GENERAL");
  push(10, 12, "ZONE_VIP", 2);
  assert.equal(specs.length, 110);
  assert.equal(
    specs.reduce((sum, item) => sum + item.seats, 0),
    1000,
  );
  return specs;
}

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

function buildGuests1000(options: {
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
  return Array.from({ length: 1000 }, (_, index) => {
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
    id: "res-head-1000",
    eligibleGuestTokens: Array.from({ length: 12 }, (_, index) => pad("g", index + 1)),
    tableTokens: ["t0101", "t0102"],
    min: 10,
    max: 12,
    priority: 100,
  };
}

function buildLightCorpus(): SolverRequest {
  const partyPairs: Array<[number, number]> = [];
  for (let index = 0; index < 12; index += 1) {
    partyPairs.push([1 + index * 2, 2 + index * 2]);
  }
  const constraints: SolverConstraint[] = [
    ...partyPairs.map(([left, right], index) => togetherConstraint(`cap1k-a-together-${index + 1}`, left, right)),
    apartConstraint("cap1k-a-apart-1", 50, 51),
    apartConstraint("cap1k-a-apart-2", 70, 71),
    apartConstraint("cap1k-a-apart-3", 90, 91),
    preferTableConstraint("cap1k-a-pref-1", 200, 20),
    preferTableConstraint("cap1k-a-pref-2", 400, 40),
    preferTableConstraint("cap1k-a-pref-3", 600, 60),
    preferTableConstraint("cap1k-a-pref-4", 800, 80),
  ];
  return {
    guests: buildGuests1000({ partyPairs }),
    positions: buildPositions(capacity1000ProductTableSpecs()),
    constraints,
    reservations: [headReservation()],
    config: defaultSolverConfig({
      seed: CAPACITY_1000_SCENARIO_SEEDS.A_LIGHT,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

function buildTypicalCorpus(): SolverRequest {
  const rng = mulberry32(hashSeedToUint32(CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL));
  const wheelchairGuests = pickUnique(rng, 12, 200, 1000);
  const protocolGuests = pickUnique(rng, 8, 200, 1000);
  const partyPairs: Array<[number, number]> = [];
  for (let index = 0; index < 28; index += 1) {
    const left = 100 + index * 2;
    partyPairs.push([left, left + 1]);
  }
  const constraints: SolverConstraint[] = [
    ...partyPairs.map(([left, right], index) => togetherConstraint(`cap1k-b-together-${index + 1}`, left, right)),
  ];
  for (let index = 0; index < 12; index += 1) {
    constraints.push(apartConstraint(`cap1k-b-apart-${index + 1}`, 10 + index * 30, 20 + index * 30));
  }
  for (let index = 0; index < 6; index += 1) {
    constraints.push(requireZoneConstraint(`cap1k-b-zone-${index + 1}`, index + 1, "ZONE_VIP"));
  }
  for (let index = 0; index < 24; index += 1) {
    constraints.push(
      preferTableConstraint(`cap1k-b-pref-${index + 1}`, 300 + index * 12, (index % 40) + 1, uniformInt(rng, 2, 5)),
    );
  }
  const specs: TableSpec[] = [];
  for (let index = 1; index <= 25; index += 1) {
    specs.push({
      tableIndex: index,
      seats: 8,
      zoneCodes: index <= 12 ? ["ZONE_VIP"] : ["ZONE_GENERAL"],
      wheelchairSeats: index <= 20 ? 2 : 0,
    });
  }
  for (let index = 26; index <= 105; index += 1) {
    specs.push({
      tableIndex: index,
      seats: 10,
      zoneCodes: ["ZONE_GENERAL"],
      wheelchairSeats: 0,
    });
  }
  // 25×8 + 80×10 = 200 + 800 = 1000
  assert.equal(
    specs.reduce((sum, item) => sum + item.seats, 0),
    1000,
  );
  const reservations: SolverReservation[] = [
    {
      id: "res-head-1000",
      eligibleGuestTokens: Array.from({ length: 12 }, (_, index) => pad("g", index + 1)),
      tableTokens: ["t0001", "t0002"],
      min: 10,
      max: 12,
      priority: 100,
    },
    {
      id: "res-access-1000",
      eligibleGuestTokens: wheelchairGuests.map((index) => pad("g", index)),
      tableTokens: Array.from({ length: 20 }, (_, index) => pad("t", index + 1)),
      min: wheelchairGuests.length,
      max: wheelchairGuests.length,
      priority: 95,
    },
  ];
  return {
    guests: buildGuests1000({ wheelchairGuestIndices: wheelchairGuests, partyPairs, protocolGuestIndices: protocolGuests }),
    positions: buildPositions(specs),
    constraints,
    reservations,
    config: defaultSolverConfig({
      seed: CAPACITY_1000_SCENARIO_SEEDS.B_TYPICAL,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

/** Heavy remains dense but uses uniform 100×10 positions so the accepted 20s solver contract can finish. */
function buildHeavyCorpus(): SolverRequest {
  const rng = mulberry32(hashSeedToUint32(CAPACITY_1000_SCENARIO_SEEDS.C_HEAVY));
  const constraints: SolverConstraint[] = [];
  for (let index = 0; index < 8; index += 1) {
    const base = 700 + index * 3;
    constraints.push(togetherConstraint(`cap1k-c-chain-${base}`, base, base + 1));
    constraints.push(togetherConstraint(`cap1k-c-chain-${base + 1}`, base + 1, base + 2));
  }
  const apartAnchors = pickUnique(rng, 12, 50, 500);
  for (let index = 0; index < apartAnchors.length - 1; index += 2) {
    constraints.push(
      apartConstraint(`cap1k-c-apart-${apartAnchors[index]}-${apartAnchors[index + 1]}`, apartAnchors[index]!, apartAnchors[index + 1]!),
    );
  }
  for (let index = 0; index < 3; index += 1) {
    constraints.push(requireTableConstraint(`cap1k-c-req-${index + 1}`, [800 + index, 810 + index], 90 + index));
  }
  constraints.push(lockAssignmentConstraint("cap1k-c-lock-1", 1, 1, 1));
  constraints.push(lockAssignmentConstraint("cap1k-c-lock-2", 2, 1, 2));
  for (let index = 0; index < 18; index += 1) {
    constraints.push(
      preferTableConstraint(`cap1k-c-pref-${index + 1}`, 40 + index * 20, uniformInt(rng, 1, 100), uniformInt(rng, 2, 5)),
    );
  }
  const uniform: TableSpec[] = Array.from({ length: 100 }, (_, index) => ({
    tableIndex: index + 1,
    seats: 10,
    zoneCodes: ["ZONE_GENERAL"],
    wheelchairSeats: 0,
  }));
  return {
    guests: buildGuests1000({}),
    positions: buildPositions(uniform),
    constraints,
    reservations: [
      {
        id: "res-head-heavy-1000",
        eligibleGuestTokens: Array.from({ length: 12 }, (_, index) => pad("g", index + 1)),
        tableTokens: ["t0001", "t0002"],
        min: 10,
        max: 12,
        priority: 100,
      },
      {
        id: "res-companion-1000",
        eligibleGuestTokens: ["g0700", "g0701", "g0702", "g0703"],
        tableTokens: ["t0050"],
        exact: 4,
        priority: 90,
      },
    ],
    config: defaultSolverConfig({
      seed: CAPACITY_1000_SCENARIO_SEEDS.C_HEAVY,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

function buildInfeasibleCorpus(): SolverRequest {
  return {
    guests: buildGuests1000({}),
    positions: buildPositions(capacity1000ProductTableSpecs()),
    constraints: [
      lockAssignmentConstraint("cap1k-d-lock-a", 1, 1, 1),
      lockAssignmentConstraint("cap1k-d-lock-b", 2, 1, 1),
      apartConstraint("cap1k-d-contradiction-apart", 3, 4),
      togetherConstraint("cap1k-d-contradiction-together", 3, 4),
      requireTableConstraint("cap1k-d-capacity-trap", [10, 11, 12, 13, 14, 15], 1),
    ],
    reservations: [],
    config: defaultSolverConfig({
      seed: CAPACITY_1000_SCENARIO_SEEDS.D_INFEASIBLE,
      timeLimitMs: 20_000,
      alternativeCount: 0,
      materialityThreshold: 8,
    }),
  };
}

/** Recovery corpus mirrors light density — used for idempotent launch/replay proofs. */
function buildRecoveryCorpus(): SolverRequest {
  const base = buildLightCorpus();
  return {
    ...base,
    config: defaultSolverConfig({
      seed: CAPACITY_1000_SCENARIO_SEEDS.E_RECOVERY,
      timeLimitMs: 20_000,
      alternativeCount: 1,
      materialityThreshold: 8,
    }),
  };
}

export function buildCapacity1000Corpus(scenario: Capacity1000ScenarioId): SolverRequest {
  switch (scenario) {
    case "A_LIGHT":
      return buildLightCorpus();
    case "B_TYPICAL":
      return buildTypicalCorpus();
    case "C_HEAVY":
      return buildHeavyCorpus();
    case "D_INFEASIBLE":
      return buildInfeasibleCorpus();
    case "E_RECOVERY":
      return buildRecoveryCorpus();
    default: {
      const exhaustive: never = scenario;
      throw new Error(`unknown capacity-1000 scenario ${exhaustive}`);
    }
  }
}

export function capacity1000CorpusHash(scenario: Capacity1000ScenarioId): string {
  return exactHash(buildCapacity1000Corpus(scenario));
}

export function capacity1000CorpusManifest(): {
  edition: string;
  scenarios: Array<{
    id: Capacity1000ScenarioId;
    seed: string;
    datasetHash: string;
    expectedStatus: "FEASIBLE" | "INFEASIBLE";
    guestCount: number;
    eligibleCount: number;
    seatCount: number;
  }>;
} {
  return {
    edition: CAPACITY_1000_CORPUS_EDITION,
    scenarios: CAPACITY_1000_SCENARIO_IDS.map((scenario) => {
      const request = buildCapacity1000Corpus(scenario);
      return {
        id: scenario,
        seed: CAPACITY_1000_SCENARIO_SEEDS[scenario],
        datasetHash: capacity1000CorpusHash(scenario),
        expectedStatus: scenario === "D_INFEASIBLE" ? "INFEASIBLE" : "FEASIBLE",
        guestCount: request.guests.length,
        eligibleCount: request.guests.filter((guest) => guest.eligible).length,
        seatCount: request.positions.length,
      };
    }),
  };
}

/** Named synthetic guests for browser/search journeys (deterministic, no real data). */
export function capacity1000BrowserGuestNames(): Array<{ givenName: string; familyName: string; guestIndex: number }> {
  const families = ["Okeke", "Adeyemi", "Nwosu", "Fashola", "Bello", "Okonkwo", "Eze", "Yusuf", "Diallo", "Mensah"];
  return Array.from({ length: 1000 }, (_, index) => {
    const guestIndex = index + 1;
    const familyName = families[index % families.length]!;
    const givenName = `Stretch${String(guestIndex).padStart(4, "0")}`;
    return { givenName, familyName, guestIndex };
  });
}
