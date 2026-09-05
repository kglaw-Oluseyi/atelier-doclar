import type { ZodIssue } from "zod";
import {
  type EntityType,
  type ProgrammeValidationError,
  validationError,
} from "./errors.js";

function issueField(issue: ZodIssue): string {
  return issue.path.length > 0 ? issue.path.map(String).join(".") : "";
}

function issueValue(issue: ZodIssue): string | undefined {
  if (issue.code === "invalid_enum_value") {
    return String(issue.received);
  }
  if (issue.code === "invalid_string" && issue.validation === "regex") {
    return undefined;
  }
  if (issue.code === "unrecognized_keys") {
    return issue.keys.join(",");
  }
  return undefined;
}

function issueCode(issue: ZodIssue): ProgrammeValidationError["code"] {
  if (issue.code === "unrecognized_keys") return "SCHEMA_INVALID";
  if (issue.code === "invalid_string" && issue.validation === "regex") {
    return "INVALID_IDENTITY";
  }
  if (issue.message.startsWith("ACCEPTED")) {
    return "ACCEPTANCE_EVIDENCE_MISSING";
  }
  if (issue.message.includes("acceptedBy must be a named reviewer")) {
    return "ACCEPTANCE_EVIDENCE_MISSING";
  }
  return "SCHEMA_INVALID";
}

export function zodIssuesToErrors(
  issues: ZodIssue[],
  entityType: EntityType,
  entityId: string | undefined,
  sourceFile: string | undefined,
): ProgrammeValidationError[] {
  return issues.map((issue) => {
    const field = issueField(issue);
    const value = issueValue(issue);
    return validationError({
      code: issueCode(issue),
      entityType,
      entityId,
      field: field || undefined,
      value,
      message: issue.message,
      sourceFile,
    });
  });
}

export function entityIdFromUnknown(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string") return record.id;
  if (typeof record.code === "string") return record.code;
  return undefined;
}
