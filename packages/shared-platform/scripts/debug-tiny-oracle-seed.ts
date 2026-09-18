import { solveSeatingV2CompiledCpSat } from "../src/cpsat/local-solve.js";
import { exactHash } from "../src/eec-hash.js";
import { SEATING_V2_SOLVER_CONTRACT, SEATING_V2_SOLVER_VERSION } from "../src/seating-v2-schemas.js";
import { compileV2ToCpsatRequest } from "../src/cpsat/compiler.js";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = Number(process.argv[2] ?? 1000064);
const rng = mulberry32(seed);
const nGuests = 3 + Math.floor(rng() * 4);
const nTables = 2 + Math.floor(rng() * 2);
const seatsPer = Math.ceil(nGuests / nTables) + (rng() < 0.3 ? 0 : 1);
const guests = Array.from({ length: nGuests }, (_, i) => ({
  token: `g${String(i + 1).padStart(4, "0")}`,
  eligible: true,
  capabilityCodes: [] as string[],
  groupTokens: [] as string[],
}));
const positions = [];
for (let t = 1; t <= nTables; t++) {
  for (let s = 1; s <= seatsPer; s++) {
    positions.push({
      token: `t${String(t).padStart(4, "0")}:${String(s).padStart(2, "0")}`,
      tableToken: `t${String(t).padStart(4, "0")}`,
      zoneCodes: [] as string[],
      capabilityCodes: [] as string[],
    });
  }
}
const rules = [];
if (nGuests >= 2 && rng() < 0.7) {
  rules.push({
    contentHash: exactHash({ seed, together: true }),
    kind: "KEEP_TOGETHER" as const,
    hardness: "HARD" as const,
    weight: null,
    scope: "TABLE" as const,
    subjectTokens: [guests[0]!.token, guests[1]!.token],
    tableTokens: [] as string[],
    zoneCodes: [] as string[],
    capabilityCodes: [] as string[],
    positionToken: null,
  });
}
if (nGuests >= 3 && rng() < 0.5) {
  rules.push({
    contentHash: exactHash({ seed, apart: true }),
    kind: "KEEP_APART" as const,
    hardness: "HARD" as const,
    weight: null,
    scope: "TABLE" as const,
    subjectTokens: [guests[0]!.token, guests[2]!.token],
    tableTokens: [],
    zoneCodes: [],
    capabilityCodes: [],
    positionToken: null,
  });
}
if (rng() < 0.15 && nGuests >= 3) {
  rules.push({
    contentHash: exactHash({ seed, big: true }),
    kind: "KEEP_TOGETHER" as const,
    hardness: "HARD" as const,
    weight: null,
    scope: "TABLE" as const,
    subjectTokens: guests.slice(0, 3).map((g) => g.token),
    tableTokens: [],
    zoneCodes: [],
    capabilityCodes: [],
    positionToken: null,
  });
}
console.log({ nGuests, nTables, seatsPer, seats: positions.length, rules: rules.map((r) => ({ kind: r.kind, subj: r.subjectTokens })) });
const compiled = {
  contract: SEATING_V2_SOLVER_CONTRACT,
  version: SEATING_V2_SOLVER_VERSION,
  configHash: exactHash({ seed }),
  seed: String(seed),
  guests,
  positions,
  rules,
  reservations: [],
};
const req = compileV2ToCpsatRequest(compiled, { runId: "dbg", maxTimeSeconds: 5 });
console.log({ units: req.units, apart: req.apartPairs, together: req.togetherPairs });
const r = await solveSeatingV2CompiledCpSat(compiled, { runId: "dbg", maxTimeSeconds: 5 });
console.log({ product: r.productResult, fault: r.fault, seated: r.assignments.filter((a) => a.state === "SEATED").length, assignments: r.assignments });
