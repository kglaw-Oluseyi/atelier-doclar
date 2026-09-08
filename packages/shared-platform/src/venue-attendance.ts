import type { PlatformSnapshot } from "./store.js";

export type AttendanceProductKind =
  | "OBSERVED_RSVP"
  | "WHOLE_EVENT_FORECAST"
  | "PHASE_OCCUPANCY"
  | "OPERATIONAL_PROVISION"
  | "OBSERVED_ATTENDANCE";

export type AttendanceReadSlice = {
  product: AttendanceProductKind;
  present: boolean;
  mutable: false;
  sourceCollection: string;
  quantity?: number;
  low?: number;
  high?: number;
  phaseId?: string;
  notWholeEventPeople?: true;
  explanation: string;
};

export type AttendanceProjectionRead = {
  eventId: string;
  observedRsvp: AttendanceReadSlice;
  wholeEventDistinctPersonForecast: AttendanceReadSlice;
  phaseOccupancy: AttendanceReadSlice[];
  operationalProvision: AttendanceReadSlice;
  observedAttendance: AttendanceReadSlice;
  phaseCountsMustNotBeSummedAsWholeEventPeople: true;
  adapterMutatesSource: false;
};

function latestForEvent<T extends { eventId: string; updatedAt: string }>(items: readonly T[], eventId: string): T | undefined {
  return items
    .filter((item) => item.eventId === eventId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export function readAttendanceProjection(snap: PlatformSnapshot, eventId: string): AttendanceProjectionRead {
  const rsvp = latestForEvent(snap.rsvpEventProjections, eventId);
  const programmeEstimate = snap.forecastEstimates
    .filter((item) => item.eventId === eventId && item.scope === "PROGRAMME" && item.countsPeople && item.product === "FORECAST")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const phaseEstimates = snap.forecastEstimates.filter(
    (item) => item.eventId === eventId && item.scope === "PHASE" && Boolean(item.phaseId),
  );
  const provision = snap.operationalProvisionRecommendations
    .filter((item) => item.eventId === eventId && item.status === "APPROVED")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const observed = snap.calibrationObservations
    .filter((item) => item.eventId === eventId && item.observedCount !== undefined)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  return {
    eventId,
    observedRsvp: {
      product: "OBSERVED_RSVP",
      present: Boolean(rsvp),
      mutable: false,
      sourceCollection: "rsvpEventProjections",
      quantity: rsvp?.attending,
      explanation: rsvp
        ? "Observed RSVP attending quantity from the accepted RSVP projection. This is not distinct-person forecast or observed attendance."
        : "No RSVP projection is available. Observed RSVP remains unknown.",
    },
    wholeEventDistinctPersonForecast: {
      product: "WHOLE_EVENT_FORECAST",
      present: Boolean(programmeEstimate),
      mutable: false,
      sourceCollection: "forecastEstimates",
      low: programmeEstimate?.low,
      high: programmeEstimate?.high,
      quantity: programmeEstimate?.expected,
      explanation: programmeEstimate
        ? "Whole-event distinct-person forecast range from the accepted forecast estimate with PROGRAMME scope."
        : "No whole-event forecast estimate is available.",
    },
    phaseOccupancy: phaseEstimates.map((item) => ({
      product: "PHASE_OCCUPANCY" as const,
      present: true,
      mutable: false as const,
      sourceCollection: "forecastEstimates",
      phaseId: item.phaseId,
      quantity: item.expected,
      low: item.low,
      high: item.high,
      notWholeEventPeople: true as const,
      explanation: "Phase occupancy is not a whole-event distinct-person count and must not be summed.",
    })),
    operationalProvision: {
      product: "OPERATIONAL_PROVISION",
      present: Boolean(provision),
      mutable: false,
      sourceCollection: "operationalProvisionRecommendations",
      quantity: provision?.proposedQuantity,
      explanation: provision
        ? `Operational provision owned by ${provision.ownerLabel}. Distinct from declared, geometric, forecast and observed attendance.`
        : "No approved operational provision exists.",
    },
    observedAttendance: {
      product: "OBSERVED_ATTENDANCE",
      present: Boolean(observed),
      mutable: false,
      sourceCollection: "calibrationObservations",
      quantity: observed?.observedCount,
      explanation: observed
        ? "Observed attendance from a calibration observation. This does not rewrite RSVP or forecast ledgers."
        : "Observed attendance is unknown. Milestone 1 does not invent a count.",
    },
    phaseCountsMustNotBeSummedAsWholeEventPeople: true,
    adapterMutatesSource: false,
  };
}
