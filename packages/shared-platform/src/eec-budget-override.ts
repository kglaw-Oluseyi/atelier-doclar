import { z } from "zod";
import { PlatformError } from "./errors.js";
import { EventIdSchema, NonEmptySchema, OrganisationIdSchema, UuidSchema } from "./schemas.js";
import { EngagementIdSchema } from "./eec-schemas.js";
import { governingGuestCountFromBrief, type BudgetGuestCountSource } from "./eec-operations.js";
import type { PlatformSnapshot } from "./store.js";

export const MAX_GUEST_COUNT = 100_000;
export const GUEST_TARGET_COUNT = "guest.target_count" as const;

const emptyToUndefined = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalWholeGuestCount = z.preprocess((value) => {
  const next = emptyToUndefined(value);
  if (next === undefined) return undefined;
  const raw = String(next).trim();
  if (!/^\d+$/.test(raw)) {
    throw new PlatformError("VALIDATION_FAILED", "guest count must be a whole number");
  }
  return Number(raw);
}, z.number().int().min(1).max(MAX_GUEST_COUNT).optional());

export const CalculateBudgetScenarioCommandSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema.optional(),
    engagementId: EngagementIdSchema.optional(),
    baseScenarioId: UuidSchema.optional(),
    governingBriefEditionId: UuidSchema.optional(),
    governingBriefContentHash: NonEmptySchema.max(128).optional(),
    expectedScenarioVersion: z.preprocess(emptyToUndefined, z.coerce.number().int().nonnegative().optional()),
    purpose: z
      .enum(["PROTECT_INVESTMENT", "PROTECT_PRIORITIES", "PROTECT_FULL_BRIEF", "MAISON_RECOMMENDED", "CLIENT_ALTERNATIVE"])
      .optional(),
    archetype: z.string().min(1).max(80).optional(),
    guests: z.preprocess(emptyToUndefined, z.string().optional()),
    guestCountOverride: optionalWholeGuestCount,
    guestCountOverrideReason: z.preprocess(emptyToUndefined, z.string().trim().min(8).max(500).optional()),
    assumptionAcknowledged: z.boolean().optional(),
    reason: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(500).optional()),
    idempotencyKey: NonEmptySchema.max(120),
  })
  .strict();

export type CalculateBudgetScenarioCommand = z.infer<typeof CalculateBudgetScenarioCommandSchema>;

export type BudgetDriver = {
  code: string;
  value: number;
  unit?: string;
  overridable?: boolean;
};

export type BudgetScenarioAssumptionInput = {
  id?: string;
  driverCode: string;
  value: number;
  source: "SCENARIO_OVERRIDE";
  governingValue: number;
  governingBriefEditionId?: string;
  governingAssertionId?: string;
  reason: string;
};

export type EffectiveBudgetDriver = {
  code: string;
  value: number;
  provenance:
    | { kind: "CURRENT_BRIEF"; briefEditionId: string; assertionId: string }
    | {
        kind: "SCENARIO_OVERRIDE";
        assumptionId: string;
        governingBriefEditionId: string;
        governingAssertionId: string;
        governingValue: number;
        reason: string;
      };
};

export type PreparedBudgetCalculation = {
  guests: string;
  guestSourceKind: "BRIEF" | "SCENARIO";
  sourceAssertionId?: string;
  assumptionAcknowledged?: boolean;
  guestCountOverride?: number;
  guestCountOverrideReason?: string;
  governingGuestCount?: number;
  governingBriefEditionId?: string;
  governingBriefContentHash?: string;
  governingAssertionId?: string;
  effectiveDrivers: readonly EffectiveBudgetDriver[];
  scenarioAssumptions: readonly BudgetScenarioAssumptionInput[];
};

const COMMAND_KEYS = [
  "organisationId",
  "eventId",
  "engagementId",
  "baseScenarioId",
  "governingBriefEditionId",
  "governingBriefContentHash",
  "expectedScenarioVersion",
  "purpose",
  "archetype",
  "guests",
  "guestCountOverride",
  "guestCountOverrideReason",
  "assumptionAcknowledged",
  "reason",
  "idempotencyKey",
] as const;

export function parseCalculateBudgetScenarioCommand(raw: unknown): CalculateBudgetScenarioCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new PlatformError("VALIDATION_FAILED", "budget calculation command is invalid");
  }
  const record = raw as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of COMMAND_KEYS) {
    if (key in record) picked[key] = record[key];
  }
  const parsed = CalculateBudgetScenarioCommandSchema.safeParse(picked);
  if (!parsed.success) {
    throw new PlatformError("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "budget calculation command is invalid");
  }
  const command = parsed.data;
  if (command.guests !== undefined && !/^\d+$/.test(command.guests)) {
    throw new PlatformError("VALIDATION_FAILED", "guest count must be a whole number");
  }
  if (command.guestCountOverride === undefined && command.guests) {
    return { ...command, guestCountOverride: Number(command.guests) };
  }
  return command;
}

export function parseBudgetCalculateFormData(formData: FormData): CalculateBudgetScenarioCommand {
  const acknowledged = String(formData.get("assumptionAcknowledged") ?? "");
  return parseCalculateBudgetScenarioCommand({
    organisationId: String(formData.get("organisationId") ?? ""),
    eventId: String(formData.get("eventId") ?? "") || undefined,
    engagementId: String(formData.get("engagementId") ?? "") || undefined,
    baseScenarioId: String(formData.get("baseScenarioId") ?? "") || undefined,
    governingBriefEditionId: String(formData.get("governingBriefEditionId") ?? "") || undefined,
    governingBriefContentHash: String(formData.get("governingBriefContentHash") ?? "") || undefined,
    expectedScenarioVersion: emptyToUndefined(formData.get("expectedScenarioVersion")),
    purpose: String(formData.get("purpose") ?? "") || undefined,
    archetype: String(formData.get("archetype") ?? "") || undefined,
    guestCountOverride: emptyToUndefined(formData.get("guestCountOverride")),
    guestCountOverrideReason: emptyToUndefined(formData.get("guestCountOverrideReason")),
    assumptionAcknowledged: acknowledged === "1" || acknowledged === "true",
    reason: emptyToUndefined(formData.get("reason")),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
}

export function resolveEffectiveBudgetDrivers(input: {
  governingDrivers: readonly BudgetDriver[];
  scenarioAssumptions: readonly BudgetScenarioAssumptionInput[];
}): readonly EffectiveBudgetDriver[] {
  const seen = new Set<string>();
  for (const assumption of input.scenarioAssumptions) {
    if (seen.has(assumption.driverCode)) {
      throw new PlatformError("VALIDATION_FAILED", `duplicate active override for ${assumption.driverCode}`);
    }
    seen.add(assumption.driverCode);
    const governing = input.governingDrivers.find((item) => item.code === assumption.driverCode);
    if (governing && governing.overridable === false) {
      throw new PlatformError("VALIDATION_FAILED", `${assumption.driverCode} is not overridable`);
    }
  }
  return input.governingDrivers.map((driver) => {
    const assumption = input.scenarioAssumptions.find((item) => item.driverCode === driver.code);
    if (!assumption) {
      return {
        code: driver.code,
        value: driver.value,
        provenance: {
          kind: "CURRENT_BRIEF" as const,
          briefEditionId: "",
          assertionId: "",
        },
      };
    }
    return {
      code: driver.code,
      value: assumption.value,
      provenance: {
        kind: "SCENARIO_OVERRIDE" as const,
        assumptionId: assumption.id ?? "",
        governingBriefEditionId: assumption.governingBriefEditionId ?? "",
        governingAssertionId: assumption.governingAssertionId ?? "",
        governingValue: assumption.governingValue,
        reason: assumption.reason,
      },
    };
  });
}

export function prepareBudgetScenarioCalculation(
  snap: PlatformSnapshot,
  command: CalculateBudgetScenarioCommand,
): PreparedBudgetCalculation {
  const governing = command.engagementId ? governingGuestCountFromBrief(snap, command.engagementId) : { kind: "UNKNOWN" as const };
  if (command.engagementId) {
    requireEngagementLineage(snap, command.organisationId, command.engagementId, command.eventId);
  }
  if (command.governingBriefEditionId && command.engagementId) {
    const edition = snap.eventBriefEditions.find((item) => item.id === command.governingBriefEditionId);
    if (!edition || edition.engagementId !== command.engagementId || edition.organisationId !== command.organisationId) {
      throw new PlatformError("SCOPE_MISMATCH", "brief edition is not in this engagement");
    }
  }
  if (governing.kind === "CURRENT_BRIEF") {
    if (command.governingBriefEditionId && command.governingBriefEditionId !== governing.briefEditionId) {
      throw new PlatformError("VERSION_CONFLICT", "stale Event Brief edition for budget calculation");
    }
    if (command.governingBriefContentHash && command.governingBriefContentHash !== governing.briefContentHash) {
      throw new PlatformError("VERSION_CONFLICT", "stale Event Brief hash for budget calculation");
    }
  }
  const submitted = command.guestCountOverride;
  if (governing.kind === "CURRENT_BRIEF") {
    const governingCount = governing.value;
    const noVariance = submitted === undefined || submitted === governingCount;
    if (!noVariance && !command.guestCountOverrideReason) {
      throw new PlatformError("VALIDATION_FAILED", "a scenario assumption that differs from the current Event Brief requires a reason");
    }
    if (noVariance) {
      const drivers = [
        {
          code: GUEST_TARGET_COUNT,
          value: governingCount,
          provenance: {
            kind: "CURRENT_BRIEF" as const,
            briefEditionId: governing.briefEditionId,
            assertionId: governing.assertionId,
          },
        },
      ];
      return {
        guests: String(governingCount),
        guestSourceKind: "BRIEF",
        sourceAssertionId: governing.assertionId,
        assumptionAcknowledged: command.assumptionAcknowledged,
        governingGuestCount: governingCount,
        governingBriefEditionId: governing.briefEditionId,
        governingBriefContentHash: governing.briefContentHash,
        governingAssertionId: governing.assertionId,
        effectiveDrivers: drivers,
        scenarioAssumptions: [],
      };
    }
    const assumption: BudgetScenarioAssumptionInput = {
      driverCode: GUEST_TARGET_COUNT,
      value: submitted,
      source: "SCENARIO_OVERRIDE",
      governingValue: governingCount,
      governingBriefEditionId: governing.briefEditionId,
      governingAssertionId: governing.assertionId,
      reason: command.guestCountOverrideReason!,
    };
    const effectiveDrivers = resolveEffectiveBudgetDrivers({
      governingDrivers: [{ code: GUEST_TARGET_COUNT, value: governingCount, unit: "PERSON", overridable: true }],
      scenarioAssumptions: [assumption],
    }).map((item) =>
      item.provenance.kind === "CURRENT_BRIEF"
        ? {
            ...item,
            provenance: {
              kind: "CURRENT_BRIEF" as const,
              briefEditionId: governing.briefEditionId,
              assertionId: governing.assertionId,
            },
          }
        : item,
    );
    return {
      guests: String(submitted),
      guestSourceKind: "SCENARIO",
      sourceAssertionId: governing.assertionId,
      assumptionAcknowledged: true,
      guestCountOverride: submitted,
      guestCountOverrideReason: command.guestCountOverrideReason,
      governingGuestCount: governingCount,
      governingBriefEditionId: governing.briefEditionId,
      governingBriefContentHash: governing.briefContentHash,
      governingAssertionId: governing.assertionId,
      effectiveDrivers,
      scenarioAssumptions: [assumption],
    };
  }
  if (submitted === undefined) {
    throw new PlatformError("VALIDATION_FAILED", "a planning guest count is required");
  }
  if (command.assumptionAcknowledged === false) {
    throw new PlatformError("VALIDATION_FAILED", "a planning guest-count assumption must be acknowledged before calculation");
  }
  return {
    guests: String(submitted),
    guestSourceKind: "SCENARIO",
    assumptionAcknowledged: command.assumptionAcknowledged,
    guestCountOverride: submitted,
    guestCountOverrideReason: command.guestCountOverrideReason,
    effectiveDrivers: [
      {
        code: GUEST_TARGET_COUNT,
        value: submitted,
        provenance: {
          kind: "SCENARIO_OVERRIDE",
          assumptionId: "",
          governingBriefEditionId: "",
          governingAssertionId: "",
          governingValue: submitted,
          reason: command.guestCountOverrideReason ?? command.reason ?? "Planning assumption",
        },
      },
    ],
    scenarioAssumptions: [],
  };
}

function requireEngagementLineage(
  snap: PlatformSnapshot,
  organisationId: string,
  engagementId: string,
  eventId?: string,
): void {
  const engagement = snap.discoveryEngagements.find((item) => item.id === engagementId);
  if (!engagement) throw new PlatformError("NOT_FOUND", "discovery engagement was not found");
  if (engagement.organisationId !== organisationId) {
    throw new PlatformError("SCOPE_MISMATCH", "engagement is not in this organisation");
  }
  if (eventId) {
    const event = snap.events.find((item) => item.id === eventId);
    if (!event || event.organisationId !== organisationId) {
      throw new PlatformError("SCOPE_MISMATCH", "event is not in this organisation");
    }
  }
}

export function assertBudgetFormDataMatchesVisible(formData: FormData, visibleGuestCount: string): void {
  const submitted = String(formData.get("guestCountOverride") ?? "");
  if (submitted !== visibleGuestCount) {
    throw new PlatformError("VALIDATION_FAILED", "visible guest count was not the submitted override");
  }
}

export function describeEffectiveGuestDriver(driver: EffectiveBudgetDriver | undefined): string {
  if (!driver) return "guest.target_count unavailable";
  if (driver.provenance.kind === "CURRENT_BRIEF") {
    return `guest.target_count governing=${driver.value} effective=${driver.value}`;
  }
  return `guest.target_count governing=${driver.provenance.governingValue} assumption=${driver.value} effective=${driver.value}`;
}

export function budgetCalculationPayloadHash(command: CalculateBudgetScenarioCommand, prepared: PreparedBudgetCalculation): string {
  return JSON.stringify({
    organisationId: command.organisationId,
    engagementId: command.engagementId ?? "",
    purpose: command.purpose ?? "PROTECT_PRIORITIES",
    archetype: command.archetype ?? "WEDDING",
    guests: prepared.guests,
    source: prepared.guestSourceKind,
    reason: prepared.guestCountOverrideReason ?? "",
  });
}

export function findReusableBudgetScenario(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    engagementId?: string;
    purpose?: string;
    guests: string;
    guestCountOverrideReason?: string;
  },
) {
  const purpose = input.purpose ?? "PROTECT_PRIORITIES";
  const reason = input.guestCountOverrideReason ?? "";
  return snap.budgetScenarioEditions.find(
    (item) =>
      item.organisationId === input.organisationId &&
      item.engagementId === input.engagementId &&
      item.purpose === purpose &&
      (item.effectiveDrivers ?? []).some((driver) => driver.code === GUEST_TARGET_COUNT && driver.value === input.guests) &&
      (item.guestCountOverrideReason ?? "") === reason,
  );
}

export type { BudgetGuestCountSource };
