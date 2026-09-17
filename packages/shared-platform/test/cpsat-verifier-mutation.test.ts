import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyCpsatAssignments } from "../src/cpsat-verifier/verify.js";
import { exactHash } from "../src/eec-hash.js";
import {
  SEATING_V2_SOLVER_CONTRACT,
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2Assignment,
  type SeatingV2CompiledRequest,
} from "../src/seating-v2-schemas.js";

function fixture(): { compiled: SeatingV2CompiledRequest; good: SeatingV2Assignment[] } {
  const compiled: SeatingV2CompiledRequest = {
    contract: SEATING_V2_SOLVER_CONTRACT,
    version: SEATING_V2_SOLVER_VERSION,
    configHash: exactHash({ mut: 1 }),
    seed: "mutation-1",
    guests: [
      { token: "g0001", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0002", eligible: true, capabilityCodes: [], groupTokens: [] },
      { token: "g0003", eligible: true, capabilityCodes: [], groupTokens: [] },
    ],
    positions: [
      { token: "t0001:01", tableToken: "t0001", zoneCodes: ["ZONE_A"], capabilityCodes: [] },
      { token: "t0001:02", tableToken: "t0001", zoneCodes: ["ZONE_A"], capabilityCodes: [] },
      { token: "t0002:01", tableToken: "t0002", zoneCodes: ["ZONE_B"], capabilityCodes: [] },
      { token: "t0002:02", tableToken: "t0002", zoneCodes: ["ZONE_B"], capabilityCodes: [] },
    ],
    rules: [
      {
        contentHash: exactHash({ together: "12" }),
        kind: "KEEP_TOGETHER",
        hardness: "HARD",
        weight: null,
        scope: "TABLE",
        subjectTokens: ["g0001", "g0002"],
        tableTokens: [],
        zoneCodes: [],
        capabilityCodes: [],
        positionToken: null,
      },
      {
        contentHash: exactHash({ apart: "13" }),
        kind: "KEEP_APART",
        hardness: "HARD",
        weight: null,
        scope: "TABLE",
        subjectTokens: ["g0001", "g0003"],
        tableTokens: [],
        zoneCodes: [],
        capabilityCodes: [],
        positionToken: null,
      },
    ],
    reservations: [],
  };
  const good: SeatingV2Assignment[] = [
    { guestToken: "g0001", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: ["GROUP"] },
    { guestToken: "g0002", state: "SEATED", positionToken: "t0001:02", typedReasonCodes: ["GROUP"] },
    { guestToken: "g0003", state: "SEATED", positionToken: "t0002:01", typedReasonCodes: ["SEPARATED"] },
  ];
  return { compiled, good };
}

test("verifier accepts honest together/apart seating", () => {
  const { compiled, good } = fixture();
  const report = verifyCpsatAssignments(compiled, good);
  assert.equal(report.ok, true);
  assert.equal(report.seatedEligible, 3);
});

test("mutation: break together → VIOLATED detected", () => {
  const { compiled, good } = fixture();
  const mutated = good.map((a) =>
    a.guestToken === "g0002" ? { ...a, positionToken: "t0002:02" } : a,
  );
  const report = verifyCpsatAssignments(compiled, mutated);
  assert.equal(report.ok, false);
  assert.ok(report.ruleOutcomes.some((r) => r.kind === "KEEP_TOGETHER" && r.outcome === "VIOLATED"));
});

test("mutation: break apart → VIOLATED detected", () => {
  const { compiled, good } = fixture();
  const mutated = good.map((a) =>
    a.guestToken === "g0003" ? { ...a, positionToken: "t0001:02" } : { ...a, positionToken: a.guestToken === "g0002" ? "t0002:02" : a.positionToken },
  );
  // place g0003 with g0001 on t0001 — also need g0002 elsewhere; simplify:
  const broken: SeatingV2Assignment[] = [
    { guestToken: "g0001", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
    { guestToken: "g0002", state: "SEATED", positionToken: "t0001:02", typedReasonCodes: [] },
    { guestToken: "g0003", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] }, // duplicate seat + apart fail
  ];
  const report = verifyCpsatAssignments(compiled, [
    { guestToken: "g0001", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
    { guestToken: "g0002", state: "SEATED", positionToken: "t0001:02", typedReasonCodes: [] },
    { guestToken: "g0003", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
  ]);
  // duplicate seat → structural fail; also use clean apart break:
  const apartBroken: SeatingV2Assignment[] = [
    { guestToken: "g0001", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
    { guestToken: "g0002", state: "SEATED", positionToken: "t0001:02", typedReasonCodes: [] },
    { guestToken: "g0003", state: "SEATED", positionToken: "t0002:01", typedReasonCodes: [] },
  ];
  // move g0003 to same table as g0001 without duplicate: use t0001 but only 2 seats — use t0002 for g0002 and put g0003 on t0001
  const apartOnly: SeatingV2Assignment[] = [
    { guestToken: "g0001", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
    { guestToken: "g0002", state: "SEATED", positionToken: "t0002:01", typedReasonCodes: [] }, // together broken too
    { guestToken: "g0003", state: "SEATED", positionToken: "t0001:02", typedReasonCodes: [] },
  ];
  const r2 = verifyCpsatAssignments(compiled, apartOnly);
  assert.equal(r2.ok, false);
  assert.ok(r2.ruleOutcomes.some((r) => r.kind === "KEEP_APART" && r.outcome === "VIOLATED"));
  void mutated;
  void broken;
  void report;
});

test("mutation: duplicate seat → structural failure", () => {
  const { compiled } = fixture();
  const report = verifyCpsatAssignments(compiled, [
    { guestToken: "g0001", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
    { guestToken: "g0002", state: "SEATED", positionToken: "t0001:01", typedReasonCodes: [] },
    { guestToken: "g0003", state: "SEATED", positionToken: "t0002:01", typedReasonCodes: [] },
  ]);
  assert.equal(report.ok, false);
  assert.equal(report.structuralOk, false);
});

test("mutation: eligible unseated without governed reason → failure", () => {
  const { compiled, good } = fixture();
  const report = verifyCpsatAssignments(compiled, [
    good[0]!,
    good[1]!,
    { guestToken: "g0003", state: "UNSEATED", positionToken: null, typedReasonCodes: [] },
  ]);
  assert.equal(report.ok, false);
});

test("mutation: lock violation detected", () => {
  const { compiled, good } = fixture();
  const withLock: SeatingV2CompiledRequest = {
    ...compiled,
    rules: [
      ...compiled.rules,
      {
        contentHash: exactHash({ lock: "g3" }),
        kind: "LOCK_ASSIGNMENT",
        hardness: "HARD",
        weight: null,
        scope: "TABLE",
        subjectTokens: ["g0003"],
        tableTokens: [],
        zoneCodes: [],
        capabilityCodes: [],
        positionToken: "t0002:02",
      },
    ],
  };
  const report = verifyCpsatAssignments(withLock, good);
  assert.equal(report.ok, false);
  assert.ok(report.ruleOutcomes.some((r) => r.kind === "LOCK_ASSIGNMENT" && r.outcome === "VIOLATED"));
});
