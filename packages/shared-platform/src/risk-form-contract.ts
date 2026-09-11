import { z } from "zod";
import { PLATFORM_ERROR_CODES, PlatformError } from "./errors.js";
import { nfc } from "./eec-hash.js";
import { EventIdSchema, UuidSchema } from "./schemas.js";
import { RISK_CLAUSE_FAMILIES, RISK_POLICY_TYPES, RISK_SOURCE_AUTHORITIES, RiskCommandEnvelopeSchema } from "./risk-schemas.js";

export const PROTECTION_VALIDATION_SUMMARY = "Check the highlighted information";

export const PROTECTION_PUBLIC_FIELDS = [
  "organisationId",
  "eventId",
  "assignmentId",
  "expectedVersion",
  "idempotencyKey",
  "reason",
  "policyType",
  "insurerPartyId",
  "insurerLabel",
  "policyId",
  "currency",
  "startOn",
  "endOn",
  "coverageKey",
  "limitMinor",
  "limitBasis",
  "deductibleMinor",
  "insuredPartyLabels",
  "territorialScope",
  "activityScope",
  "endorsementNotes",
  "exclusionNotes",
  "documentEditionId",
  "documentId",
  "title",
  "classification",
  "originalFilename",
  "contentType",
  "byteLength",
  "decision",
  "publisher",
  "locator",
  "authority",
  "jurisdiction",
  "summary",
  "ruleKey",
  "proposition",
  "sourceEditionIds",
  "requirementKey",
  "mandatory",
  "family",
  "body",
  "variableKeys",
  "gate",
  "vendorId",
  "vendorLabel",
  "role",
  "criticalFunctionKey",
  "commercialStatus",
  "factKey",
  "value",
  "unknown",
  "choice",
  "severity",
  "lifeSafety",
  "recoveryObjectiveMinutes",
  "maximumTolerableInterruptionMinutes",
  "decisionRole",
  "planId",
  "triggerEvidence",
  "impact",
  "driverKind",
  "assumptionLabel",
  "kind",
  "status",
  "nextReviewOn",
  "nextReviewAt",
  "confirmedHash",
  "reviewAction",
  "editionId",
  "sourceId",
  "ruleId",
  "targetKind",
  "testRunId",
  "authorityPromptId",
  "lineage",
  "createdByAutomation",
  "selections",
] as const;

export type ProtectionPublicField = (typeof PROTECTION_PUBLIC_FIELDS)[number];

const SENSITIVE_FORM_KEYS = new Set([
  "policyNumber",
  "objectKey",
  "byteChecksum",
  "password",
  "secret",
  "token",
  "accessToken",
  "sessionSecret",
]);

export const PROTECTION_FIELD_MESSAGES: Record<string, string> = {
  insurerPartyId: "Choose an insurer from the governed party register.",
  vendorId: "Choose a vendor from the governed party register.",
  policyType: "Choose a policy type.",
  title: "Enter a short title.",
  publisher: "Enter the publisher.",
  locator: "Enter a locator for this source.",
  authority: "Choose the source authority.",
  jurisdiction: "Enter the jurisdiction.",
  summary: "Enter a short summary.",
  ruleKey: "Enter a rule key.",
  proposition: "Enter the cited proposition.",
  sourceEditionIds: "Choose at least one governed source edition.",
  requirementKey: "Enter the requirement key.",
  family: "Choose a clause family.",
  body: "Enter the clause body.",
  factKey: "Choose the fact to record.",
  value: "Enter the fact value, or mark it unknown.",
  severity: "Choose an incident severity.",
  decision: "Choose a decision.",
  reason: "Enter the reason for this decision.",
  confirmedHash: "Confirm the exact edition content hash.",
  testRunId: "Enter the fixture test run identity.",
  authorityPromptId: "Enter the authority prompt identity.",
  lineage: "Enter the exact synthetic lineage.",
  selections: "Confirm the exact selected edition bindings.",
  nextReviewOn: "Choose a Review again by date later than today.",
  nextReviewAt: "Choose a Review again by date later than today.",
  vendorLabel: "Enter a non-sensitive vendor label.",
  role: "Choose a roster role.",
  criticalFunctionKey: "Enter the critical function.",
  commercialStatus: "Choose the commercial status.",
  startOn: "Enter a valid cover start date.",
  endOn: "Enter a valid cover end date.",
  policyId: "Choose a policy from this organisation.",
  documentEditionId: "Choose an evidence document.",
  documentId: "Choose an evidence document.",
  classification: "Choose a classification.",
  originalFilename: "Enter the original filename.",
  currency: "Enter the currency.",
  coverageKey: "Enter the coverage key.",
  limitMinor: "Enter the limit in whole minor units.",
  limitBasis: "Enter the limit basis.",
  insuredPartyLabels: "Enter the insured party labels.",
  organisationId: "This organisation is not available for the command.",
  assignmentId: "A current assignment is required.",
  expectedVersion: "Reload the current record before saving.",
  idempotencyKey: "Submit the form again from this page.",
  eventId: "This event is not available for the command.",
};

export type ProtectionFieldErrors = Record<string, string>;

export type ProtectionFormState = {
  status: "idle" | "validation";
  application: "APPLIED" | "REPLAYED" | "NOT_APPLIED" | null;
  didDataChange: boolean;
  fieldErrors: ProtectionFieldErrors;
  attemptedValues: Record<string, string>;
  summary?: string;
  focusField?: string;
  correlationId?: string;
  sensitiveCleared?: string[];
};

export const idleProtectionFormState: ProtectionFormState = {
  status: "idle",
  application: null,
  didDataChange: false,
  fieldErrors: {},
  attemptedValues: {},
};

type ZodIssueLike = {
  path: Array<string | number | symbol>;
  message: string;
  code?: string;
};

export function isZodLikeError(error: unknown): error is { name?: string; issues: ZodIssueLike[] } {
  if (!error || typeof error !== "object" || !("issues" in error)) return false;
  return Array.isArray((error as { issues: unknown }).issues);
}

export function publicFieldMessage(field: string, fallback?: string): string {
  return PROTECTION_FIELD_MESSAGES[field] ?? fallback ?? "Correct this field and submit once.";
}

export function zodIssuesToFieldErrors(issues: readonly ZodIssueLike[]): ProtectionFieldErrors {
  const errors: ProtectionFieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    if (errors[field]) continue;
    const raw = issue.message ?? "";
    const looksInternal =
      /invalid uuid|invalid_type|too_small|too_big|expected |received |required/i.test(raw) ||
      raw.includes("{") ||
      raw.includes("[") ||
      raw.startsWith("Invalid ");
    errors[field] = publicFieldMessage(field, looksInternal ? undefined : raw.slice(0, 180));
  }
  return errors;
}

export function fieldErrorsToPlatformError(fieldErrors: ProtectionFieldErrors): PlatformError {
  const fields = Object.keys(fieldErrors);
  return new PlatformError("VALIDATION_FAILED", PROTECTION_VALIDATION_SUMMARY, {
    field: fields[0],
    publicMessage: "The submitted information is not valid.",
    details: fields.map((field) => `${field}:${fieldErrors[field]}`),
  });
}

function isPlatformErrorShape(error: unknown): error is PlatformError {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && (PLATFORM_ERROR_CODES as readonly string[]).includes(code);
}

export function platformErrorFromUnknown(error: unknown): PlatformError {
  if (error instanceof PlatformError) return error;
  if (isZodLikeError(error)) return fieldErrorsToPlatformError(zodIssuesToFieldErrors(error.issues));
  if (isPlatformErrorShape(error)) {
    const shaped = error as PlatformError;
    return new PlatformError(shaped.code, shaped.message || shaped.publicMessage, {
      field: shaped.field,
      publicMessage: shaped.publicMessage,
      details: shaped.details ? [...shaped.details] : undefined,
    });
  }
  return new PlatformError("INTERNAL_ERROR", "The request could not be completed.", {
    publicMessage: "The request could not be completed.",
  });
}

export function parseRiskSchema<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: ZodIssueLike[] } } },
  value: unknown,
): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw fieldErrorsToPlatformError(zodIssuesToFieldErrors(parsed.error.issues));
}

export function isSensitiveFormKey(key: string): boolean {
  const lowered = key.toLowerCase();
  if (SENSITIVE_FORM_KEYS.has(key) || SENSITIVE_FORM_KEYS.has(lowered)) return true;
  return /password|secret|token|ciphertext|objectkey/.test(lowered);
}

export function safeAttemptedValues(raw: Record<string, string | string[]>): {
  values: Record<string, string>;
  sensitiveCleared: string[];
} {
  const values: Record<string, string> = {};
  const sensitiveCleared: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (isSensitiveFormKey(key)) {
      sensitiveCleared.push(key);
      continue;
    }
    const joined = Array.isArray(value) ? value.filter(Boolean).join(",") : value;
    values[key] = nfc(joined).slice(0, 2000);
  }
  return { values, sensitiveCleared };
}

export function formDataToRecord(formData: FormData): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  const keys = new Set<string>();
  for (const key of formData.keys()) keys.add(key);
  for (const key of keys) {
    if (isSensitiveFormKey(key)) {
      record[key] = "";
      continue;
    }
    const all = formData.getAll(key).flatMap((item) => (typeof item === "string" ? [item] : []));
    record[key] = all.length > 1 ? all : (all[0] ?? "");
  }
  return record;
}

export function firstInvalidField(fieldErrors: ProtectionFieldErrors): string | undefined {
  const preferred = ["insurerPartyId", "vendorId", "policyType", "title", "value", "decision", "nextReviewOn", "nextReviewAt", "confirmedHash", "reason"];
  return preferred.find((field) => fieldErrors[field]) ?? Object.keys(fieldErrors)[0];
}

export function validationFormState(input: {
  fieldErrors: ProtectionFieldErrors;
  attemptedValues: Record<string, string>;
  sensitiveCleared?: string[];
  correlationId?: string;
}): ProtectionFormState {
  return {
    status: "validation",
    application: "NOT_APPLIED",
    didDataChange: false,
    fieldErrors: input.fieldErrors,
    attemptedValues: input.attemptedValues,
    summary: PROTECTION_VALIDATION_SUMMARY,
    focusField: firstInvalidField(input.fieldErrors),
    correlationId: input.correlationId,
    sensitiveCleared: input.sensitiveCleared?.length ? input.sensitiveCleared : undefined,
  };
}

const optionalEventId = z.preprocess((value) => (value === "" || value === undefined ? undefined : value), EventIdSchema.optional());

export const ProtectionCommandFormSchema = RiskCommandEnvelopeSchema.extend({
  eventId: optionalEventId,
  expectedVersion: z.coerce.number().int().nonnegative(),
}).strict();

export const CreateRiskPolicyFormSchema = ProtectionCommandFormSchema.extend({
  policyType: z.enum(RISK_POLICY_TYPES),
  insurerPartyId: UuidSchema,
}).strict();

export const AssessRiskVendorFormSchema = ProtectionCommandFormSchema.extend({
  vendorId: UuidSchema,
}).strict();

export const AssignRiskRosterFormSchema = ProtectionCommandFormSchema.extend({
  eventId: EventIdSchema,
  vendorId: UuidSchema,
  vendorLabel: z.string().trim().min(1).max(160).optional(),
  role: z.enum(["PRIMARY", "ALTERNATE", "STANDBY"]),
  criticalFunctionKey: z.string().trim().min(1).max(80),
  commercialStatus: z.enum(["UNCONFIRMED", "NOT_ENGAGED", "PROPOSED", "CONTRACTED"]),
}).strict();

export const CreateRiskSourceFormSchema = ProtectionCommandFormSchema.extend({
  title: z.string().trim().min(1).max(240),
  publisher: z.string().trim().min(1).max(160),
  locator: z.string().trim().min(1).max(400),
  authority: z.enum(RISK_SOURCE_AUTHORITIES),
  jurisdiction: z.string().trim().min(1).max(32),
  summary: z.string().trim().min(1).max(2000),
  nextReviewOn: z.string().date(),
}).strict();

export const ApproveRiskSourceFormSchema = ProtectionCommandFormSchema.extend({
  sourceId: UuidSchema,
  nextReviewOn: z.string().date(),
}).strict();

export const CreateRiskRuleFormSchema = ProtectionCommandFormSchema.extend({
  ruleKey: z.string().trim().min(1).max(80),
  jurisdiction: z.string().trim().min(1).max(32),
  proposition: z.string().trim().min(1).max(2000),
  sourceEditionIds: z.array(UuidSchema).min(1).max(16),
  requirementKey: z.string().trim().min(1).max(80),
  policyType: z.enum(RISK_POLICY_TYPES).optional(),
  mandatory: z.enum(["true", "false"]),
  nextReviewOn: z.string().date(),
}).strict();

export const RecordAuthorityReviewFormSchema = ProtectionCommandFormSchema.extend({
  targetKind: z.enum(["RULE", "SOURCE"]),
  reviewAction: z.enum(["RECORD_CURRENT_REVIEW", "CREATE_REVIEW_SUCCESSOR"]),
  editionId: UuidSchema,
  nextReviewOn: z.string().date(),
  reason: z.string().trim().min(1).max(2000),
  confirmedHash: z.string().trim().min(16).max(128),
}).strict();

export const WithdrawRiskAuthorityFormSchema = ProtectionCommandFormSchema.extend({
  ruleId: UuidSchema,
  confirmedHash: z.string().trim().min(16).max(128),
  reason: z.string().trim().min(1).max(2000),
}).strict();

export const ClassifyFixtureAuthorityFormSchema = ProtectionCommandFormSchema.extend({
  editionId: UuidSchema,
  confirmedHash: z.string().trim().min(16).max(128),
  testRunId: z.string().trim().min(1).max(80),
  authorityPromptId: z.string().trim().min(1).max(80),
  lineage: z.string().trim().min(1).max(400),
  createdByAutomation: z.enum(["true", "false"]),
}).strict();

export const ExactSelectionWithdrawFormSchema = ProtectionCommandFormSchema.extend({
  selections: z.string().trim().min(1).max(8000),
  reason: z.string().trim().min(1).max(2000),
}).strict();

export const CreateRiskClauseTemplateFormSchema = ProtectionCommandFormSchema.extend({
  family: z.enum(RISK_CLAUSE_FAMILIES),
  title: z.string().trim().min(1).max(240),
  jurisdiction: z.string().trim().min(1).max(32),
  body: z.string().trim().min(1).max(8000),
  variableKeys: z.string().optional(),
}).strict();

export const RecordRiskFactFormSchema = ProtectionCommandFormSchema.extend({
  eventId: EventIdSchema,
  factKey: z.string().trim().min(1).max(80),
  value: z.string().trim().max(400),
  unknown: z.enum(["true", "false"]).optional(),
}).strict();

export const CreateContinuityPlanFormSchema = ProtectionCommandFormSchema.extend({
  eventId: EventIdSchema,
  title: z.string().trim().min(1).max(240),
  recoveryObjectiveMinutes: z.coerce.number().int().positive(),
  maximumTolerableInterruptionMinutes: z.coerce.number().int().positive(),
  decisionRole: z.string().trim().min(1).max(80),
}).strict();

export const ReportIncidentFormSchema = ProtectionCommandFormSchema.extend({
  eventId: EventIdSchema,
  title: z.string().trim().min(1).max(240),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "LIFE_SAFETY"]),
  lifeSafety: z.enum(["true", "false"]).optional(),
}).strict();

export const RecordClientDossierMessageFormSchema = ProtectionCommandFormSchema.extend({
  eventId: EventIdSchema,
  kind: z.enum(["QUESTION", "ACKNOWLEDGE"]),
  body: z.string().trim().min(1).max(2000),
}).strict();

export function parseFormSchema<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: ZodIssueLike[] } } },
  value: unknown,
): { success: true; data: T } | { success: false; fieldErrors: ProtectionFieldErrors } {
  const parsed = schema.safeParse(value);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) };
}

export function stringListFromForm(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
