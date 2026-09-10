import { exactHash } from "./eec-hash.js";
import { moneyFromDto } from "./eec-hash.js";
import { calculateBudgetScenarioOnSnap } from "./eec-intelligence.js";
import { PlatformError } from "./errors.js";
import {
  assertSameEvent,
  assertSameOrganisation,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import { governingEditionFingerprint } from "./risk-repository.js";
import {
  RiskBudgetProjectionSchema,
  type RiskBudgetDriver,
  type RiskBudgetProjection,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export const RISK_BUDGET_MODEL = "s05a-protect-investment-v1";

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

function sourcedLines(drivers: readonly RiskBudgetDriver[]) {
  const lines: Array<{
    code: string;
    expectedMinor: string;
    currency: string;
    evidenceHash?: string;
    labelledAssumption?: string;
  }> = [];
  const unquantifiedReasons: string[] = [];
  for (const driver of drivers) {
    if (driver.kind === "UNQUANTIFIED_EXPOSURE") {
      unquantifiedReasons.push(driver.reason);
      continue;
    }
    if (driver.kind === "INSURANCE_PREMIUM_ASSUMPTION") {
      if (!driver.evidenceIds.length) throw new PlatformError("VALIDATION_FAILED", "an unevidenced premium cannot be invented");
      const money = moneyFromDto(driver.money);
      lines.push({
        code: "RISK_INSURANCE_PREMIUM",
        expectedMinor: money.minor.toString(),
        currency: money.currency,
        evidenceHash: exactHash(driver.evidenceIds),
        labelledAssumption: driver.assumptionLabel,
      });
      continue;
    }
    if (driver.kind === "DEDUCTIBLE_EXPOSURE" || driver.kind === "FALLBACK_REPLACEMENT_EXPOSURE") {
      const money = moneyFromDto(driver.money);
      lines.push({
        code: driver.kind === "DEDUCTIBLE_EXPOSURE" ? "RISK_DEDUCTIBLE" : "RISK_FALLBACK_REPLACEMENT",
        expectedMinor: money.minor.toString(),
        currency: money.currency,
      });
      continue;
    }
    if (driver.kind === "CONTINUITY_RESERVE" && driver.basis === "BUDGET_PERCENTAGE") {
      if (driver.value === 5) {
        unquantifiedReasons.push("5% reserve is a labelled scenario assumption, not a default");
      }
    }
  }
  return { lines, unquantifiedReasons };
}

function assertGoverningUnchanged(
  before: ReturnType<typeof governingEditionFingerprint>,
  clone: object,
  reloaded: Parameters<typeof governingEditionFingerprint>[0] | undefined,
): void {
  if (!reloaded) {
    throw new PlatformError("VALIDATION_FAILED", "risk must not mutate an approved or published Budget edition");
  }
  if (clone === reloaded) {
    throw new PlatformError("VALIDATION_FAILED", "risk must not mutate an approved or published Budget edition");
  }
  if (JSON.stringify(before) !== JSON.stringify(governingEditionFingerprint(reloaded))) {
    throw new PlatformError("VALIDATION_FAILED", "risk must not mutate an approved or published Budget edition");
  }
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
    governingScenarioHash?: string;
    expectedScenarioVersion?: number;
  },
  now: string,
  actorPersonId: string,
): RiskBudgetProjection {
  envelope(input, input.organisationId, input.eventId);
  const contentHash = exactHash({ drivers: input.drivers });
  const existing = snap.riskBudgetProjections.find(
    (item) => item.organisationId === input.organisationId && item.eventId === input.eventId && item.contentHash === contentHash,
  );
  if (existing) return existing;
  const approvedCurrent = snap.budgetScenarioEditions.filter(
    (item) =>
      item.organisationId === input.organisationId &&
      item.current &&
      (item.status === "APPROVED" || item.status === "PUBLISHED"),
  );
  const governing =
    approvedCurrent.find((item) => item.eventId === input.eventId) ??
    approvedCurrent.find((item) => !item.eventId);
  if (input.governingScenarioHash && governing && governing.resultHash !== input.governingScenarioHash) {
    throw new PlatformError("VERSION_CONFLICT", "stale Budget hash/version is NOT_APPLIED");
  }
  if (input.expectedScenarioVersion !== undefined && governing && governing.version !== input.expectedScenarioVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale Budget hash/version is NOT_APPLIED");
  }
  const governingClone = governing ? structuredClone(governing) : undefined;
  const governingBefore = governingClone ? governingEditionFingerprint(governingClone) : undefined;
  const converted = sourcedLines(input.drivers);
  const guests =
    governing?.effectiveDrivers?.find((item) => item.code === "guest.target_count")?.value ??
    "1";
  const generatedAt = input.generatedAt ?? now;
  const successor = calculateBudgetScenarioOnSnap(
    snap,
    {
      organisationId: input.organisationId,
      engagementId: governing?.engagementId,
      eventId: input.eventId,
      purpose: "PROTECT_INVESTMENT",
      archetype: "WEDDING",
      guests,
      expectedScenarioVersion: input.expectedScenarioVersion,
      branchFromScenarioEditionId: governing?.id,
      activateAsCurrent: false,
      riskSourcedLines: converted.lines,
      manualAssumptions: converted.unquantifiedReasons.map(() => ({
        key: "RISK_UNQUANTIFIED",
        value: "unknown",
        unit: "NOTE",
      })),
    },
    generatedAt,
    actorPersonId,
  );
  if (governing && governingClone && governingBefore) {
    const reloaded = snap.budgetScenarioEditions.find((item) => item.id === governingClone.id);
    if (!reloaded) {
      throw new PlatformError("VALIDATION_FAILED", "risk must not mutate an approved or published Budget edition");
    }
    assertGoverningUnchanged(governingBefore, governingClone, reloaded);
  }
  const engineSourced = snap.budgetLines.filter(
    (item) => item.scenarioId === successor.id && item.itemCode.startsWith("RISK_"),
  );
  const sourcedMinor = engineSourced.reduce((sum, line) => sum + BigInt(line.expectedMinor), 0n);
  if (!successor.calculationResultId || successor.calculationResultId === successor.id) {
    throw new PlatformError("VALIDATION_FAILED", "Budget calculation result must have its own identity");
  }
  const record = RiskBudgetProjectionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    budgetScenarioEditionId: governing?.id,
    successorScenarioEditionId: successor.id,
    calculationResultId: successor.calculationResultId,
    governingScenarioUnchanged: Boolean(governing && governing.current && (governing.status === "APPROVED" || governing.status === "PUBLISHED")),
    drivers: input.drivers,
    quantifiedMinor: sourcedMinor.toString(),
    currency: successor.currency,
    unquantifiedReasons: converted.unquantifiedReasons,
    modelEdition: RISK_BUDGET_MODEL,
    trace: (successor.trace ?? []).slice(0, 32).map((step) => ({
      op: String(step.op).slice(0, 40),
      detail: String(step.detail).slice(0, 400),
      value: String(step.value).slice(0, 80),
    })),
    generatedAt: successor.calculationGeneratedAt ?? generatedAt,
    createdByPersonId: actorPersonId,
    contentHash,
    ...riskStamp(generatedAt),
  });
  snap.riskBudgetProjections.push(record);
  return record;
}
