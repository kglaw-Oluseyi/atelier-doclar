import { createHash } from "node:crypto";
import {
  FORECAST_MODEL_VERSION,
  FORECAST_RATE_SCALE,
  FORECAST_STALE_AFTER_MS,
  type FORECAST_RSVP_CLASSES,
  type UNCERTAINTY_DRIVER_CODES,
} from "./constants.js";
import type { ModelParameterSet } from "./forecast-schemas.js";

export type ForecastRsvpClass = (typeof FORECAST_RSVP_CLASSES)[number];
export type UncertaintyDriverCode = (typeof UNCERTAINTY_DRIVER_CODES)[number];

export interface ForecastEligiblePerson {
  guestId: string;
  phaseIds: readonly string[];
  rsvpClass: ForecastRsvpClass;
  inclusionReason: string;
}

export interface ForecastUnnamedAllowance {
  entitlementId: string;
  principalGuestId: string;
  allowance: number;
  phaseIds: readonly string[];
  inclusionReason: string;
}

export interface ForecastPopulationInput {
  eventId: string;
  asOf: string;
  people: readonly ForecastEligiblePerson[];
  unnamed: readonly ForecastUnnamedAllowance[];
}

export interface ScopedCount {
  scope: "PROGRAMME" | "PHASE";
  phaseId?: string;
  countsPeople: boolean;
  eligiblePeople: number;
  unnamedAllowanceUnits: number;
  exactLow: number;
  exactExpected: number;
  exactHigh: number;
  low: number;
  expected: number;
  high: number;
  observedYes: number;
  observedNo: number;
  observedNoResponse: number;
  observedUnknown: number;
  drivers: Array<{ code: UncertaintyDriverCode; contribution: number; explanation: string; hostSafeLabel: string }>;
  confidence: {
    level: "HIGH" | "MEDIUM" | "LOW";
    responseCoverage: number;
    stale: boolean;
    dataQualityReason: string;
    plainLanguage: string;
  };
}

function bandFor(rsvpClass: ForecastRsvpClass, parameters: ModelParameterSet): { low: number; central: number; high: number } {
  if (rsvpClass === "YES") return parameters.yesBand;
  if (rsvpClass === "NO") return parameters.noBand;
  if (rsvpClass === "NO_RESPONSE") return parameters.noResponseBand;
  return { low: 0, central: 0, high: 1 };
}

function toMillis(value: number): number {
  return Math.round(value * FORECAST_RATE_SCALE);
}

function fromMillis(value: number): number {
  return value / FORECAST_RATE_SCALE;
}

export function displayRange(exactLow: number, exactExpected: number, exactHigh: number, maxPopulation: number): {
  low: number;
  expected: number;
  high: number;
} {
  const cap = Math.max(0, maxPopulation);
  let low = Math.min(cap, Math.max(0, Math.floor(exactLow + 1e-12)));
  let high = Math.min(cap, Math.max(low, Math.ceil(exactHigh - 1e-12)));
  let expected = Math.round(exactExpected);
  if (expected < low) expected = low;
  if (expected > high) expected = high;
  return { low, expected, high };
}

export function classifyAttendanceIntent(intent: string | undefined, hasResponse: boolean): ForecastRsvpClass {
  if (!hasResponse) return "NO_RESPONSE";
  if (intent === "ATTENDING") return "YES";
  if (intent === "NOT_ATTENDING") return "NO";
  if (intent === "UNCERTAIN" || intent === "NOT_SUPPLIED") return "NO_RESPONSE";
  return "UNKNOWN";
}

function uniqueGuestIds(people: readonly ForecastEligiblePerson[], phaseId?: string): ForecastEligiblePerson[] {
  const seen = new Set<string>();
  const out: ForecastEligiblePerson[] = [];
  for (const person of people) {
    if (phaseId && !person.phaseIds.includes(phaseId)) continue;
    if (seen.has(person.guestId)) continue;
    seen.add(person.guestId);
    out.push(person);
  }
  return out;
}

function unnamedUnits(unnamed: readonly ForecastUnnamedAllowance[], phaseId?: string): ForecastUnnamedAllowance[] {
  const out: ForecastUnnamedAllowance[] = [];
  for (const item of unnamed) {
    if (phaseId && !item.phaseIds.includes(phaseId)) continue;
    out.push(item);
  }
  return out;
}

function staleAt(asOf: string, now: string): boolean {
  return Date.parse(now) - Date.parse(asOf) >= FORECAST_STALE_AFTER_MS;
}

function confidenceFor(input: {
  people: readonly ForecastEligiblePerson[];
  unnamedUnits: number;
  stale: boolean;
  unknown: number;
}): ScopedCount["confidence"] {
  const responded = input.people.filter((item) => item.rsvpClass === "YES" || item.rsvpClass === "NO").length;
  const coverage = input.people.length === 0 ? 0 : responded / input.people.length;
  const incomplete = input.people.some((item) => item.rsvpClass === "NO_RESPONSE" || item.rsvpClass === "UNKNOWN");
  let level: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (!input.stale && !incomplete && input.unnamedUnits === 0 && input.unknown === 0 && coverage >= 0.8) {
    level = "HIGH";
  } else if (coverage >= 0.5 && input.unknown === 0) {
    level = "MEDIUM";
  }
  const reasons: string[] = [];
  if (incomplete) reasons.push("some guests have not responded");
  if (input.unnamedUnits > 0) reasons.push("unnamed companion allowances remain unresolved");
  if (input.stale) reasons.push("the forecast is older than 24 hours");
  if (input.unknown > 0) reasons.push("some records are missing usable RSVP evidence");
  if (coverage < 0.5) reasons.push("response coverage is below half of eligible people");
  const dataQualityReason =
    reasons.length > 0 ? reasons.join("; ") : "Most eligible people have a usable RSVP and there is no unresolved unnamed allowance.";
  const plainLanguage =
    level === "HIGH"
      ? "Confidence is high. Most people have responded and the remaining uncertainty is small."
      : level === "MEDIUM"
        ? "Confidence is medium. Treat the range as planning advice, not a counted attendance."
        : "Confidence is low. Do not treat any single number as certain.";
  return { level, responseCoverage: coverage, stale: input.stale, dataQualityReason, plainLanguage };
}

function driversFor(people: readonly ForecastEligiblePerson[], unnamed: readonly ForecastUnnamedAllowance[], parameters: ModelParameterSet): ScopedCount["drivers"] {
  const noResponse = people.filter((item) => item.rsvpClass === "NO_RESPONSE").length;
  const unknown = people.filter((item) => item.rsvpClass === "UNKNOWN").length;
  const unnamedUnitsCount = unnamed.reduce((sum, item) => sum + item.allowance, 0);
  const drivers: ScopedCount["drivers"] = [];
  if (noResponse > 0) {
    drivers.push({
      code: "NON_RESPONSE",
      contribution: noResponse * (parameters.noResponseBand.high - parameters.noResponseBand.low),
      explanation: `${noResponse} eligible ${noResponse === 1 ? "person has" : "people have"} not responded.`,
      hostSafeLabel: `${noResponse} guest ${noResponse === 1 ? "has" : "have"} not yet replied`,
    });
  }
  if (unnamedUnitsCount > 0) {
    drivers.push({
      code: "UNNAMED_ENTITLEMENT",
      contribution: unnamedUnitsCount * (parameters.unnamedEntitlementBand.high - parameters.unnamedEntitlementBand.low),
      explanation: `${unnamedUnitsCount} unnamed companion ${unnamedUnitsCount === 1 ? "allowance is" : "allowances are"} modelled as uncertainty, not as fabricated guests.`,
      hostSafeLabel: `${unnamedUnitsCount} unnamed companion ${unnamedUnitsCount === 1 ? "place remains" : "places remain"} unresolved`,
    });
  }
  if (unknown > 0) {
    drivers.push({
      code: "DATA_GAP",
      contribution: unknown,
      explanation: `${unknown} ${unknown === 1 ? "record has" : "records have"} no usable RSVP class. No silent attendance rate was applied.`,
      hostSafeLabel: "Some guest records are incomplete",
    });
  }
  drivers.push({
    code: "PROVISIONAL_DEFAULTS",
    contribution: 0,
    explanation: `Rates come from ${parameters.parameterSetVersion}. ${parameters.localityLabel.replaceAll("_", " ").toLowerCase()}.`,
    hostSafeLabel: "Planning rates are provisional defaults, not a local census",
  });
  return drivers;
}

function sumPeople(people: readonly ForecastEligiblePerson[], parameters: ModelParameterSet): { low: number; expected: number; high: number } {
  let low = 0;
  let expected = 0;
  let high = 0;
  for (const person of people) {
    const band = bandFor(person.rsvpClass, parameters);
    low += toMillis(band.low);
    expected += toMillis(band.central);
    high += toMillis(band.high);
  }
  return { low: fromMillis(low), expected: fromMillis(expected), high: fromMillis(high) };
}

function sumUnnamed(unnamed: readonly ForecastUnnamedAllowance[], parameters: ModelParameterSet): { low: number; expected: number; high: number; units: number } {
  let low = 0;
  let expected = 0;
  let high = 0;
  let units = 0;
  for (const item of unnamed) {
    units += item.allowance;
    low += toMillis(parameters.unnamedEntitlementBand.low) * item.allowance;
    expected += toMillis(parameters.unnamedEntitlementBand.central) * item.allowance;
    high += toMillis(parameters.unnamedEntitlementBand.high) * item.allowance;
  }
  return { low: fromMillis(low), expected: fromMillis(expected), high: fromMillis(high), units };
}

function observed(people: readonly ForecastEligiblePerson[]): {
  yes: number;
  no: number;
  noResponse: number;
  unknown: number;
} {
  return {
    yes: people.filter((item) => item.rsvpClass === "YES").length,
    no: people.filter((item) => item.rsvpClass === "NO").length,
    noResponse: people.filter((item) => item.rsvpClass === "NO_RESPONSE").length,
    unknown: people.filter((item) => item.rsvpClass === "UNKNOWN").length,
  };
}

function scopedCount(
  scope: "PROGRAMME" | "PHASE",
  people: readonly ForecastEligiblePerson[],
  unnamed: readonly ForecastUnnamedAllowance[],
  parameters: ModelParameterSet,
  asOf: string,
  now: string,
  countsPeople: boolean,
  phaseId?: string,
): ScopedCount {
  const personSum = sumPeople(people, parameters);
  const unnamedSum = countsPeople ? { low: 0, expected: 0, high: 0, units: 0 } : sumUnnamed(unnamed, parameters);
  const exactLow = personSum.low + unnamedSum.low;
  const exactExpected = personSum.expected + unnamedSum.expected;
  const exactHigh = personSum.high + unnamedSum.high;
  const cap = countsPeople ? people.length : people.length + unnamedSum.units;
  const displayed = displayRange(exactLow, exactExpected, exactHigh, cap);
  const counts = observed(people);
  return {
    scope,
    phaseId,
    countsPeople,
    eligiblePeople: people.length,
    unnamedAllowanceUnits: unnamedSum.units,
    exactLow,
    exactExpected,
    exactHigh,
    ...displayed,
    observedYes: counts.yes,
    observedNo: counts.no,
    observedNoResponse: counts.noResponse,
    observedUnknown: counts.unknown,
    drivers: driversFor(people, countsPeople ? [] : unnamed, parameters),
    confidence: confidenceFor({
      people,
      unnamedUnits: countsPeople ? 0 : unnamedSum.units,
      stale: staleAt(asOf, now),
      unknown: counts.unknown,
    }),
  };
}

export function computeForecast(input: ForecastPopulationInput, parameters: ModelParameterSet, now: string): {
  modelVersion: typeof FORECAST_MODEL_VERSION;
  programmePeople: ScopedCount;
  programmeOccupancy: ScopedCount;
  phases: Array<{ phaseId: string; people: ScopedCount; occupancy: ScopedCount }>;
  populationChecksum: string;
} {
  const programmePeopleList = uniqueGuestIds(input.people);
  const programmeUnnamed = unnamedUnits(input.unnamed);
  const phaseIds = [...new Set(input.people.flatMap((item) => item.phaseIds))];
  const phases = phaseIds.map((phaseId) => {
    const people = uniqueGuestIds(input.people, phaseId);
    const unnamed = unnamedUnits(input.unnamed, phaseId);
    return {
      phaseId,
      people: scopedCount("PHASE", people, unnamed, parameters, input.asOf, now, true, phaseId),
      occupancy: scopedCount("PHASE", people, unnamed, parameters, input.asOf, now, false, phaseId),
    };
  });
  const checksumBody = {
    modelVersion: FORECAST_MODEL_VERSION,
    parameterSetId: parameters.id,
    parameterSetVersion: parameters.parameterSetVersion,
    asOf: input.asOf,
    eventId: input.eventId,
    people: programmePeopleList
      .map((item) => ({ guestId: item.guestId, rsvpClass: item.rsvpClass, phaseIds: [...item.phaseIds].sort() }))
      .sort((left, right) => left.guestId.localeCompare(right.guestId)),
    unnamed: programmeUnnamed
      .map((item) => ({ entitlementId: item.entitlementId, allowance: item.allowance, phaseIds: [...item.phaseIds].sort() }))
      .sort((left, right) => left.entitlementId.localeCompare(right.entitlementId)),
  };
  return {
    modelVersion: FORECAST_MODEL_VERSION,
    programmePeople: scopedCount("PROGRAMME", programmePeopleList, programmeUnnamed, parameters, input.asOf, now, true),
    programmeOccupancy: scopedCount("PROGRAMME", programmePeopleList, programmeUnnamed, parameters, input.asOf, now, false),
    phases,
    populationChecksum: createHash("sha256").update(JSON.stringify(checksumBody)).digest("hex"),
  };
}

export function memberProbabilities(rsvpClass: ForecastRsvpClass, parameters: ModelParameterSet): {
  low: number;
  central: number;
  high: number;
} {
  return bandFor(rsvpClass, parameters);
}

export function currentInputChecksum(input: ForecastPopulationInput, parameterSetId: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        eventId: input.eventId,
        parameterSetId,
        people: uniqueGuestIds(input.people)
          .map((item) => `${item.guestId}:${item.rsvpClass}`)
          .sort(),
        unnamed: unnamedUnits(input.unnamed).map((item) => `${item.entitlementId}:${item.allowance}`).sort(),
      }),
    )
    .digest("hex");
}
