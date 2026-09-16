import assert from "node:assert/strict";
import type { SolverRequest, SolverResult } from "../src/seating-solver-types.js";

export type CapacityInvariantResult = {
  eligibleCount: number;
  seatedCount: number;
  unseatedCount: number;
  duplicateGuests: number;
  duplicatePositions: number;
  overCapacityTables: string[];
  hardViolations: number;
  passed: boolean;
  failures: string[];
};

export function evaluateCapacityInvariants(request: SolverRequest, result: SolverResult): CapacityInvariantResult {
  const failures: string[] = [];
  const eligibleTokens = request.guests.filter((guest) => guest.eligible).map((guest) => guest.token);
  const seated = result.assignments.filter((item) => item.state === "SEATED");
  const seatedTokens = seated.map((item) => item.guestToken);
  const occupiedPositions = seated.map((item) => item.positionToken).filter(Boolean) as string[];

  const duplicateGuests = seatedTokens.length - new Set(seatedTokens).size;
  const duplicatePositions = occupiedPositions.length - new Set(occupiedPositions).size;

  const capacityByTable = new Map<string, number>();
  for (const position of request.positions) {
    capacityByTable.set(position.tableToken, (capacityByTable.get(position.tableToken) ?? 0) + 1);
  }
  const occupiedByTable = new Map<string, number>();
  for (const positionToken of occupiedPositions) {
    const tableToken = positionToken.split(":")[0] ?? positionToken;
    occupiedByTable.set(tableToken, (occupiedByTable.get(tableToken) ?? 0) + 1);
  }
  const overCapacityTables = [...occupiedByTable.entries()]
    .filter(([tableToken, count]) => count > (capacityByTable.get(tableToken) ?? 0))
    .map(([tableToken]) => tableToken);

  if (duplicateGuests > 0) failures.push(`duplicate guest placements: ${duplicateGuests}`);
  if (duplicatePositions > 0) failures.push(`duplicate position assignments: ${duplicatePositions}`);
  if (overCapacityTables.length > 0) failures.push(`over-capacity tables: ${overCapacityTables.join(", ")}`);

  return {
    eligibleCount: eligibleTokens.length,
    seatedCount: seated.length,
    unseatedCount: result.assignments.filter((item) => item.state === "UNSEATED").length,
    duplicateGuests,
    duplicatePositions,
    overCapacityTables,
    hardViolations: result.score.hardViolations,
    passed: failures.length === 0,
    failures,
  };
}

export function assertFeasibleCapacityInvariants(request: SolverRequest, result: SolverResult): CapacityInvariantResult {
  const evaluation = evaluateCapacityInvariants(request, result);
  assert.equal(result.status, "FEASIBLE", `expected FEASIBLE, got ${result.status}`);
  assert.equal(result.score.hardViolations, 0, "expected zero HARD-rule violations");
  assert.equal(evaluation.seatedCount, evaluation.eligibleCount, "every eligible guest must be seated");
  assert.equal(evaluation.duplicateGuests, 0);
  assert.equal(evaluation.duplicatePositions, 0);
  assert.equal(evaluation.overCapacityTables.length, 0);
  return evaluation;
}

export function assertInfeasibleTruth(request: SolverRequest, result: SolverResult): CapacityInvariantResult {
  const evaluation = evaluateCapacityInvariants(request, result);
  assert.notEqual(result.status, "FEASIBLE", "infeasible scenario must not report FEASIBLE");
  assert.ok(result.score.hardViolations > 0 || result.findings.length > 0, "infeasible scenario must surface violations or findings");
  assert.ok(result.score.hardViolations > 0, "deliberately infeasible scenario must have HARD violations");
  return evaluation;
}

export function percentile(values: number[], ratio: number): number {
  const ranked = [...values].sort((left, right) => left - right);
  return ranked[Math.min(ranked.length - 1, Math.ceil(ranked.length * ratio) - 1)] ?? Number.POSITIVE_INFINITY;
}
