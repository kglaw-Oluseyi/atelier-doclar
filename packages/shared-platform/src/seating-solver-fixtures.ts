import { defaultSolverConfig } from "./seating-solver-v1.js";
import type { SolverConstraint, SolverGuestToken, SolverPositionToken, SolverRequest, SolverReservation } from "./seating-solver-types.js";

function pad(prefix: string, index: number, width = 4): string {
  return `${prefix}${String(index).padStart(width, "0")}`;
}

function guests(count: number, ineligibleEvery = 0): SolverGuestToken[] {
  return Array.from({ length: count }, (_, index) => {
    const token = pad("g", index + 1);
    const wheelchair = (index + 1) % 37 === 0;
    const protocol = (index + 1) % 41 === 0;
    return {
      token,
      eligible: ineligibleEvery === 0 || (index + 1) % ineligibleEvery !== 0,
      partyToken: (index + 1) % 11 === 0 || (index + 1) % 11 === 1 ? pad("p", Math.floor(index / 2) + 1) : undefined,
      capabilityCodes: wheelchair ? ["A11Y_WHEELCHAIR"] : [],
      protocolCodes: protocol ? ["PROTOCOL_HIGH"] : [],
    };
  });
}

function positions(tables: number, seatsPerTable: number): SolverPositionToken[] {
  const list: SolverPositionToken[] = [];
  for (let table = 1; table <= tables; table += 1) {
    const tableToken = pad("t", table);
    for (let seat = 1; seat <= seatsPerTable; seat += 1) {
      list.push({
        token: `${tableToken}:${String(seat).padStart(2, "0")}`,
        tableToken,
        zoneCodes: table <= Math.ceil(tables / 5) ? ["ZONE_VIP"] : ["ZONE_GENERAL"],
        capabilityCodes: table === 1 && seat <= 2 ? ["A11Y_WHEELCHAIR"] : [],
      });
    }
  }
  return list;
}

function togetherPairs(count: number, span: number): SolverConstraint[] {
  const constraints: SolverConstraint[] = [];
  for (let index = 0; index < count; index += 1) {
    const left = index * span + 1;
    const right = left + 1;
    constraints.push({
      id: pad("hard-together-", index + 1, 3),
      kind: "HARD",
      predicateType: "KEEP_TOGETHER",
      payload: { predicateType: "KEEP_TOGETHER", guestTokens: [pad("g", left), pad("g", right)] },
    });
  }
  return constraints;
}

function apartPairs(count: number, offset: number): SolverConstraint[] {
  return Array.from({ length: count }, (_, index) => ({
    id: pad("hard-apart-", index + 1, 3),
    kind: "HARD" as const,
    predicateType: "KEEP_APART" as const,
    payload: { predicateType: "KEEP_APART" as const, guestTokens: [pad("g", offset + index * 3), pad("g", offset + index * 3 + 2)] },
  }));
}

function preferences(count: number): SolverConstraint[] {
  return Array.from({ length: count }, (_, index) => ({
    id: pad("pref-table-", index + 1, 3),
    kind: "WEIGHTED" as const,
    predicateType: "PREFER_TABLE" as const,
    weight: 3,
    payload: { predicateType: "PREFER_TABLE" as const, guestTokens: [pad("g", index * 5 + 3)], tableTokens: [pad("t", (index % 5) + 1)] },
  }));
}

export function seatingCorpus50(): SolverRequest {
  return {
    guests: guests(50),
    positions: positions(5, 10),
    constraints: [...togetherPairs(4, 4), ...apartPairs(3, 7), ...preferences(6)],
    reservations: [],
    config: defaultSolverConfig({ seed: "s06-corpus-50", timeLimitMs: 10_000, alternativeCount: 2 }),
  };
}

export function seatingCorpus200(): SolverRequest {
  const reservations: SolverReservation[] = [
    {
      id: "res-vip",
      eligibleGuestTokens: Array.from({ length: 8 }, (_, index) => pad("g", index + 1)),
      tableTokens: ["t0001"],
      exact: 8,
      priority: 90,
    },
    {
      id: "res-access",
      eligibleGuestTokens: ["g0037"],
      tableTokens: ["t0001"],
      min: 1,
      max: 2,
      priority: 95,
    },
  ];
  return {
    guests: guests(200, 25),
    positions: positions(20, 10),
    constraints: [
      ...togetherPairs(12, 6),
      ...apartPairs(8, 15),
      ...preferences(16),
      {
        id: "lock-g0002",
        kind: "HARD",
        predicateType: "LOCK_ASSIGNMENT",
        payload: { predicateType: "LOCK_ASSIGNMENT", guestToken: "g0011", positionToken: "t0002:01" },
      },
      {
        id: "need-wheelchair",
        kind: "HARD",
        predicateType: "REQUIRE_POSITION_CAPABILITY",
        payload: { predicateType: "REQUIRE_POSITION_CAPABILITY", guestTokens: ["g0037"], capabilityCodes: ["A11Y_WHEELCHAIR"] },
      },
    ],
    reservations,
    config: defaultSolverConfig({ seed: "s06-corpus-200", timeLimitMs: 10_000, alternativeCount: 2 }),
  };
}

export function seatingCorpus600(): SolverRequest {
  return {
    guests: guests(600, 40),
    positions: positions(60, 10),
    constraints: [
      ...togetherPairs(24, 8),
      ...apartPairs(16, 20),
      ...preferences(24),
      {
        id: "lock-g0010",
        kind: "HARD",
        predicateType: "LOCK_ASSIGNMENT",
        payload: { predicateType: "LOCK_ASSIGNMENT", guestToken: "g0020", positionToken: "t0003:01" },
      },
    ],
    reservations: [
      {
        id: "res-head",
        eligibleGuestTokens: Array.from({ length: 10 }, (_, index) => pad("g", index + 1)),
        tableTokens: ["t0001"],
        min: 8,
        max: 10,
        priority: 100,
      },
    ],
    config: defaultSolverConfig({ seed: "s06-corpus-600", timeLimitMs: 10_000, alternativeCount: 1, materialityThreshold: 8 }),
  };
}

export function seatingImpossibleCapacity(): SolverRequest {
  return {
    guests: guests(12),
    positions: positions(1, 6),
    constraints: [],
    reservations: [],
    config: defaultSolverConfig({ seed: "s06-impossible-capacity", alternativeCount: 0 }),
  };
}

export function seatingImpossibleLocks(): SolverRequest {
  return {
    guests: guests(4),
    positions: positions(2, 2),
    constraints: [
      {
        id: "lock-a",
        kind: "HARD",
        predicateType: "LOCK_ASSIGNMENT",
        payload: { predicateType: "LOCK_ASSIGNMENT", guestToken: "g0001", positionToken: "t0001:01" },
      },
      {
        id: "lock-b",
        kind: "HARD",
        predicateType: "LOCK_ASSIGNMENT",
        payload: { predicateType: "LOCK_ASSIGNMENT", guestToken: "g0002", positionToken: "t0001:01" },
      },
    ],
    reservations: [],
    config: defaultSolverConfig({ seed: "s06-impossible-locks", alternativeCount: 0 }),
  };
}

export function seatingImpossibleCapability(): SolverRequest {
  return {
    guests: [
      {
        token: "g0001",
        eligible: true,
        capabilityCodes: ["A11Y_WHEELCHAIR"],
        protocolCodes: [],
      },
    ],
    positions: positions(2, 4).map((position) => ({ ...position, capabilityCodes: [] })),
    constraints: [
      {
        id: "need",
        kind: "HARD",
        predicateType: "REQUIRE_POSITION_CAPABILITY",
        payload: { predicateType: "REQUIRE_POSITION_CAPABILITY", guestTokens: ["g0001"], capabilityCodes: ["A11Y_WHEELCHAIR"] },
      },
    ],
    reservations: [],
    config: defaultSolverConfig({ seed: "s06-impossible-capability", alternativeCount: 0 }),
  };
}

export function seatingContradictoryGroup(): SolverRequest {
  return {
    guests: guests(3),
    positions: positions(2, 3),
    constraints: [
      {
        id: "together",
        kind: "HARD",
        predicateType: "KEEP_TOGETHER",
        payload: { predicateType: "KEEP_TOGETHER", guestTokens: ["g0001", "g0002"] },
      },
      {
        id: "apart",
        kind: "HARD",
        predicateType: "KEEP_APART",
        payload: { predicateType: "KEEP_APART", guestTokens: ["g0001", "g0002"] },
      },
    ],
    reservations: [],
    config: defaultSolverConfig({ seed: "s06-contradiction", alternativeCount: 0 }),
  };
}
