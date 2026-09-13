import { PlatformError } from "./errors.js";
import { seatingV2TableToken } from "./seating-v2-hash.js";

export type SeatingPositionSource = "PHYSICAL" | "DECLARED_SYNTHETIC";

export type SeatingTableCapacityTruth = {
  tableObjectId: string;
  tableToken: string;
  positionSource: SeatingPositionSource;
  declaredCapacity: number;
  physicalPositionCount: number;
  effectiveCapacity: number;
  mismatch: boolean;
};

export function seatingV2TableCapacityTruth(input: {
  tableObjectId: string;
  declaredCapacity: number;
  physicalPositionCount: number;
}): SeatingTableCapacityTruth {
  const declaredCapacity = Number.isFinite(input.declaredCapacity) ? Math.max(0, Math.trunc(input.declaredCapacity)) : 0;
  const physicalPositionCount = Number.isFinite(input.physicalPositionCount)
    ? Math.max(0, Math.trunc(input.physicalPositionCount))
    : 0;
  const mismatch = physicalPositionCount > 0 && physicalPositionCount !== declaredCapacity;
  const positionSource: SeatingPositionSource = physicalPositionCount > 0 ? "PHYSICAL" : "DECLARED_SYNTHETIC";
  return {
    tableObjectId: input.tableObjectId,
    tableToken: seatingV2TableToken(input.tableObjectId),
    positionSource,
    declaredCapacity,
    physicalPositionCount,
    effectiveCapacity: physicalPositionCount > 0 ? physicalPositionCount : declaredCapacity,
    mismatch,
  };
}

export function assertSeatingV2CapacityTruth(tables: readonly SeatingTableCapacityTruth[]): void {
  const mismatched = tables.filter((item) => item.mismatch);
  if (mismatched.length === 0) return;
  throw new PlatformError("SEAT_CAPACITY_MISMATCH", "physical seat count conflicts with declared capacity", {
    publicMessage:
      "Physical seat count and declared capacity disagree. Correct the layout before freezing a seating package.",
    details: mismatched.map(
      (item) => `${item.tableToken}: ${item.physicalPositionCount} physical vs ${item.declaredCapacity} declared`,
    ),
  });
}
