import { CANONICAL_INTAKE_MAPPING_VERSION } from "./constants.js";
import type { IntakeGuestInput } from "./guest-schemas.js";

export const CANONICAL_CSV_COLUMNS = [
  "givenName",
  "familyName",
  "preferredName",
  "email",
  "phone",
  "householdKey",
  "dietary",
  "accessibility",
  "note",
] as const;

export type CanonicalCsvColumn = (typeof CANONICAL_CSV_COLUMNS)[number];

export interface ParsedCsvRow {
  rowNumber: number;
  raw: Record<string, string>;
  issues: Array<{ field: string; code: string; severity: "ERROR" | "WARNING" }>;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCanonicalCsv(csv: string): { mappingVersion: typeof CANONICAL_INTAKE_MAPPING_VERSION; rows: ParsedCsvRow[] } {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { mappingVersion: CANONICAL_INTAKE_MAPPING_VERSION, rows: [] };
  }
  const header = splitCsvLine(lines[0] ?? "").map((item) => item.trim());
  const unknown = header.filter((column) => column && !CANONICAL_CSV_COLUMNS.includes(column as CanonicalCsvColumn));
  const rows: ParsedCsvRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index] ?? "");
    const raw: Record<string, string> = {};
    header.forEach((column, columnIndex) => {
      if (column) raw[column] = cells[columnIndex] ?? "";
    });
    const issues: ParsedCsvRow["issues"] = unknown.map((field) => ({
      field,
      code: "UNKNOWN_COLUMN",
      severity: "ERROR",
    }));
    if (!raw.givenName && !raw.familyName && !raw.preferredName && !raw.email) {
      issues.push({ field: "row", code: "INSUFFICIENT_IDENTITY", severity: "ERROR" });
    }
    if (raw.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
      issues.push({ field: "email", code: "INVALID_EMAIL", severity: "ERROR" });
    }
    rows.push({ rowNumber: index, raw, issues });
  }
  return { mappingVersion: CANONICAL_INTAKE_MAPPING_VERSION, rows };
}

export function rowToIntakeFields(raw: Record<string, string>): Omit<IntakeGuestInput, "organisationId" | "eventId" | "reason" | "idempotencyKey"> {
  return {
    ...(raw.givenName ? { givenName: raw.givenName } : {}),
    ...(raw.familyName ? { familyName: raw.familyName } : {}),
    ...(raw.preferredName ? { preferredName: raw.preferredName } : {}),
    ...(raw.email ? { email: raw.email } : {}),
    ...(raw.phone ? { phone: raw.phone } : {}),
    ...(raw.dietary ? { dietaryRequirement: raw.dietary } : {}),
    ...(raw.accessibility ? { accessibilityRequirement: raw.accessibility } : {}),
    ...(raw.note ? { operationalNote: raw.note } : {}),
    ...(raw.householdKey ? { householdKey: raw.householdKey } : {}),
  };
}
