import { readAttendanceProjection, type AttendanceProjectionRead } from "./venue-attendance.js";
import type { PlatformSnapshot } from "./store.js";
import type { SpatialObject } from "./spatial-schemas.js";
import type { LayoutCapacityStatement } from "./layout-assurance-schemas.js";
import type { EventVenueFact, Layout as VenueLayout, VenueFact as SourceVenueFact } from "./venue-schemas.js";

export type CapacityProductKind =
  | "DECLARED_VENUE_CAPACITY"
  | "GEOMETRIC_CAPACITY"
  | "OPERATIONAL_CAPACITY"
  | "EXPECTED_ATTENDANCE"
  | "OBSERVED_RSVP"
  | "FORECAST_RANGE"
  | "PHASE_OCCUPANCY"
  | "OPERATIONAL_PROVISION"
  | "OBSERVED_ATTENDANCE";

export type CapacityProduct = {
  product: CapacityProductKind;
  present: boolean;
  quantity?: number;
  low?: number;
  high?: number;
  ownerLabel?: string;
  sourceLabel?: string;
  verificationState?: string;
  applicability?: string;
  freshness?: "CURRENT" | "STALE" | "UNKNOWN";
  notWholeEventPeople?: true;
  substitutesAnotherProduct: false;
  explanation: string;
};

export type TableCapacityBreakdown = {
  objectId: string;
  label: string;
  declaredCapacity: number;
  physicalSeatCount: number;
};

export type CapacityReport = {
  layoutId: string;
  eventId: string;
  declaredVenueCapacity: CapacityProduct;
  geometricCapacity: CapacityProduct;
  operationalCapacity: CapacityProduct;
  expectedAttendance: CapacityProduct;
  observedRsvp: CapacityProduct;
  forecastRange: CapacityProduct;
  phaseOccupancy: CapacityProduct[];
  operationalProvision: CapacityProduct;
  observedAttendance: CapacityProduct;
  tableBreakdown: TableCapacityBreakdown[];
  phaseCountsMustNotBeSummedAsWholeEventPeople: true;
  noUniversalReductionPercentage: true;
  attendanceAdapterMutatesSource: false;
  attendance: AttendanceProjectionRead;
};

function tableDeclared(object: SpatialObject): number {
  if (object.objectType !== "TABLE") return 0;
  const subtype = object.subtype as { declaredCapacity?: number };
  return subtype.declaredCapacity ?? 0;
}

export function geometricCapacityFromObjects(objects: readonly SpatialObject[]): {
  quantity: number;
  tableBreakdown: TableCapacityBreakdown[];
} {
  const live = objects.filter((item) => !item.tombstoned);
  const seats = live.filter((item) => item.objectType === "SEAT");
  const tables = live.filter((item) => item.objectType === "TABLE");
  const tableBreakdown = tables.map((table) => ({
    objectId: table.id,
    label: table.label,
    declaredCapacity: tableDeclared(table),
    physicalSeatCount: seats.filter((seat) => (seat.subtype as { tableId?: string }).tableId === table.id).length,
  }));
  const quantity = tableBreakdown.reduce((sum, item) => sum + item.declaredCapacity, 0);
  return { quantity, tableBreakdown };
}

function declaredVenueFact(
  snap: PlatformSnapshot,
  layout: VenueLayout,
): SourceVenueFact | EventVenueFact | undefined {
  const eventVenue = snap.eventVenues.find((item) => item.id === layout.eventVenueId && item.status === "ACTIVE");
  if (!eventVenue) return undefined;
  const overrides = snap.eventVenueFacts
    .filter((item) => item.eventVenueId === eventVenue.id && item.factType === "DECLARED_CAPACITY" && item.origin === "EVENT_OVERRIDE")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  if (overrides[0]) return overrides[0];
  const inherited = snap.eventVenueFacts
    .filter((item) => item.eventVenueId === eventVenue.id && item.factType === "DECLARED_CAPACITY")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  if (inherited[0]) return inherited[0];
  return snap.venueFacts
    .filter((item) => item.venueId === eventVenue.venueId && item.factType === "DECLARED_CAPACITY")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function currentOperational(snap: PlatformSnapshot, layoutId: string): LayoutCapacityStatement | undefined {
  return snap.layoutCapacityStatements
    .filter((item) => item.layoutId === layoutId && !item.supersededById)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function freshnessOf(state: string | undefined): CapacityProduct["freshness"] {
  if (!state) return "UNKNOWN";
  if (state === "STALE") return "STALE";
  if (state === "VERIFIED") return "CURRENT";
  return "UNKNOWN";
}

export function buildCapacityReport(
  snap: PlatformSnapshot,
  layout: VenueLayout,
  objects: readonly SpatialObject[],
): CapacityReport {
  const attendance = readAttendanceProjection(snap, layout.eventId);
  const geometric = geometricCapacityFromObjects(objects);
  const declared = declaredVenueFact(snap, layout);
  const operational = currentOperational(snap, layout.id);
  const declaredQuantity = declared?.valueInteger;
  return {
    layoutId: layout.id,
    eventId: layout.eventId,
    declaredVenueCapacity: {
      product: "DECLARED_VENUE_CAPACITY",
      present: declaredQuantity !== undefined,
      quantity: declaredQuantity,
      sourceLabel: declared?.sourceLabel,
      verificationState: declared?.verificationState,
      applicability: declared?.applicability,
      freshness: freshnessOf(declared?.verificationState),
      substitutesAnotherProduct: false,
      explanation: declared
        ? "Declared venue capacity from the venue/event fact ledger. It does not replace geometric or operational capacity."
        : "Declared venue capacity is unknown. No value was inferred.",
    },
    geometricCapacity: {
      product: "GEOMETRIC_CAPACITY",
      present: geometric.tableBreakdown.length > 0,
      quantity: geometric.quantity,
      sourceLabel: "Usable tables — declared/design capacity",
      verificationState: "UNVERIFIED",
      freshness: "CURRENT",
      substitutesAnotherProduct: false,
      explanation: "Geometric capacity is the sum of table declared/design capacities. Physical seats are counted separately and never silently replace table capacity.",
    },
    operationalCapacity: {
      product: "OPERATIONAL_CAPACITY",
      present: Boolean(operational),
      quantity: operational?.quantity,
      ownerLabel: operational?.ownerLabel,
      sourceLabel: operational?.sourceLabel,
      verificationState: operational?.verificationState,
      freshness: freshnessOf(operational?.verificationState),
      substitutesAnotherProduct: false,
      explanation: operational
        ? `Operational capacity owned by ${operational.ownerLabel}. Source ${operational.sourceLabel}. ${operational.rationale}`
        : "Operational capacity has not been recorded. Missing facts remain visible.",
    },
    expectedAttendance: {
      product: "EXPECTED_ATTENDANCE",
      present: attendance.wholeEventDistinctPersonForecast.present,
      quantity: attendance.wholeEventDistinctPersonForecast.quantity,
      low: attendance.wholeEventDistinctPersonForecast.low,
      high: attendance.wholeEventDistinctPersonForecast.high,
      sourceLabel: "Accepted forecast estimate (PROGRAMME scope)",
      freshness: attendance.wholeEventDistinctPersonForecast.present ? "CURRENT" : "UNKNOWN",
      substitutesAnotherProduct: false,
      explanation: attendance.wholeEventDistinctPersonForecast.present
        ? "Expected attendance is the whole-event distinct-person forecast. RSVP is a separate product and was not substituted."
        : "Expected attendance is unknown. Observed RSVP was not used as a substitute.",
    },
    observedRsvp: {
      product: "OBSERVED_RSVP",
      present: attendance.observedRsvp.present,
      quantity: attendance.observedRsvp.quantity,
      sourceLabel: attendance.observedRsvp.sourceCollection,
      substitutesAnotherProduct: false,
      explanation: attendance.observedRsvp.explanation,
    },
    forecastRange: {
      product: "FORECAST_RANGE",
      present: attendance.wholeEventDistinctPersonForecast.present,
      quantity: attendance.wholeEventDistinctPersonForecast.quantity,
      low: attendance.wholeEventDistinctPersonForecast.low,
      high: attendance.wholeEventDistinctPersonForecast.high,
      sourceLabel: attendance.wholeEventDistinctPersonForecast.sourceCollection,
      substitutesAnotherProduct: false,
      explanation: attendance.wholeEventDistinctPersonForecast.explanation,
    },
    phaseOccupancy: attendance.phaseOccupancy.map((item) => ({
      product: "PHASE_OCCUPANCY" as const,
      present: item.present,
      quantity: item.quantity,
      low: item.low,
      high: item.high,
      notWholeEventPeople: true as const,
      substitutesAnotherProduct: false as const,
      explanation: item.explanation,
    })),
    operationalProvision: {
      product: "OPERATIONAL_PROVISION",
      present: attendance.operationalProvision.present,
      quantity: attendance.operationalProvision.quantity,
      sourceLabel: attendance.operationalProvision.sourceCollection,
      substitutesAnotherProduct: false,
      explanation: attendance.operationalProvision.explanation,
    },
    observedAttendance: {
      product: "OBSERVED_ATTENDANCE",
      present: attendance.observedAttendance.present,
      quantity: attendance.observedAttendance.quantity,
      sourceLabel: attendance.observedAttendance.sourceCollection,
      substitutesAnotherProduct: false,
      explanation: attendance.observedAttendance.explanation,
    },
    tableBreakdown: geometric.tableBreakdown,
    phaseCountsMustNotBeSummedAsWholeEventPeople: true,
    noUniversalReductionPercentage: true,
    attendanceAdapterMutatesSource: false,
    attendance,
  };
}
