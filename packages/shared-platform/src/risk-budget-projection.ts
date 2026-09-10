import { exactHash } from "./eec-hash.js";
import { moneyFromDto } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertSameEvent,
  assertSameOrganisation,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import {
  RiskBudgetProjectionSchema,
  type RiskBudgetDriver,
  type RiskBudgetProjection,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const RISK_BUDGET_MODEL = "s05b-exposure-model-v1";

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

export function calculateExposure(drivers: readonly RiskBudgetDriver[]): {
  quantifiedMinor: bigint;
  currency: string;
  unquantifiedReasons: string[];
  trace: RiskBudgetProjection["trace"];
} {
  let quantified = 0n;
  let currency = "NGN";
  const unquantifiedReasons: string[] = [];
  const trace: RiskBudgetProjection["trace"] = [];
  for (const driver of drivers) {
    if (driver.kind === "UNQUANTIFIED_EXPOSURE") {
      unquantifiedReasons.push(driver.reason);
      trace.push({ op: "UNQUANTIFIED", detail: driver.reason, value: "unknown" });
      continue;
    }
    if (driver.kind === "INSURANCE_PREMIUM_ASSUMPTION") {
      if (!driver.evidenceIds.length) throw new PlatformError("VALIDATION_FAILED", "an unevidenced premium cannot be invented");
      const money = moneyFromDto(driver.money);
      currency = money.currency;
      quantified += money.minor;
      trace.push({ op: "PREMIUM", detail: driver.assumptionLabel ?? "sourced premium assumption", value: money.minor.toString() });
      continue;
    }
    if (driver.kind === "DEDUCTIBLE_EXPOSURE" || driver.kind === "FALLBACK_REPLACEMENT_EXPOSURE") {
      const money = moneyFromDto(driver.money);
      currency = money.currency;
      quantified += money.minor;
      trace.push({ op: driver.kind, detail: driver.kind, value: money.minor.toString() });
      continue;
    }
    if (driver.kind === "CONTRACT_RETENTION") {
      trace.push({ op: "RETENTION", detail: `basis points ${driver.basisPoints}`, value: String(driver.basisPoints) });
      continue;
    }
    if (driver.kind === "CONTINUITY_RESERVE") {
      if (driver.basis === "BUDGET_PERCENTAGE" && driver.value === 5) {
        trace.push({ op: "RESERVE", detail: `${driver.provenance}: 5% is a labelled scenario assumption`, value: "5" });
      } else {
        trace.push({ op: "RESERVE", detail: driver.reason, value: String(driver.value) });
      }
    }
  }
  return { quantifiedMinor: quantified, currency, unquantifiedReasons, trace };
}

export function projectRiskBudgetOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    drivers: RiskBudgetDriver[];
    generatedAt?: string;
  },
  now: string,
  actorPersonId: string,
): RiskBudgetProjection {
  envelope(input, input.organisationId, input.eventId);
  const existing = snap.riskBudgetProjections.find(
    (item) => item.organisationId === input.organisationId && item.eventId === input.eventId && item.contentHash === exactHash({ drivers: input.drivers }),
  );
  if (existing) return existing;
  const governing = snap.budgetScenarioEditions.find(
    (item) => item.organisationId === input.organisationId && (item.eventId === input.eventId || !item.eventId) && item.current && (item.status === "APPROVED" || item.status === "PUBLISHED"),
  );
  const computed = calculateExposure(input.drivers);
  const generatedAt = input.generatedAt ?? now;
  const record = RiskBudgetProjectionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    budgetScenarioEditionId: governing?.id,
    governingScenarioUnchanged: true,
    drivers: input.drivers,
    quantifiedMinor: computed.quantifiedMinor.toString(),
    currency: computed.currency,
    unquantifiedReasons: computed.unquantifiedReasons,
    modelEdition: RISK_BUDGET_MODEL,
    trace: computed.trace,
    generatedAt,
    createdByPersonId: actorPersonId,
    contentHash: exactHash({ drivers: input.drivers }),
    ...riskStamp(generatedAt),
  });
  snap.riskBudgetProjections.push(record);
  return record;
}
