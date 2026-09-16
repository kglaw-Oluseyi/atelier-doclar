import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { CANONICAL_CSV_COLUMNS, type CanonicalCsvColumn } from "./guest-intake.js";
import { PlatformError } from "./errors.js";
import { HV_INTAKE_MAX_BYTES, HV_INTAKE_MAX_ROWS, type GuestMappingEdition } from "./guest-hv-intake-schemas.js";

export type HvParsedTable = {
  headers: string[];
  rows: string[][];
  sheetName?: string;
  formulaCellCount: number;
  macroDetected: boolean;
};

type MappingColumn = GuestMappingEdition["columns"][number];

export function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, " ").trim();
  const clipped = base.slice(0, 160) || "upload.csv";
  return clipped;
}

export function hashContent(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function detectFormulaInjection(value: string): boolean {
  const trimmed = value.replace(/^[\t\r\n ]+/, "");
  if (!trimmed) return false;
  // Leading + on international phone numbers is not formula injection.
  if (/^\+\d/.test(trimmed)) return false;
  return /^[=+\-@]/.test(trimmed) || trimmed.startsWith("\t=") || trimmed.startsWith("\r=");
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

export function parseHvCsv(text: string): HvParsedTable {
  const normalised = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < normalised.length; i += 1) {
    const char = normalised[i];
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && normalised[i + 1] === "\n") i += 1;
      if (current.trim().length > 0 || lines.length === 0) lines.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length > 0) lines.push(current);
  if (lines.length === 0) {
    throw new PlatformError("VALIDATION_FAILED", "The file is empty.");
  }
  const headers = splitCsvLine(lines[0] ?? "").map((item) => item.trim());
  if (headers.every((h) => !h)) {
    throw new PlatformError("VALIDATION_FAILED", "The file has no usable header row.");
  }
  const rows: string[][] = [];
  let formulaCellCount = 0;
  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index] ?? "");
    while (cells.length < headers.length) cells.push("");
    for (const cell of cells) {
      if (detectFormulaInjection(cell)) formulaCellCount += 1;
    }
    rows.push(cells.slice(0, headers.length));
    if (rows.length > HV_INTAKE_MAX_ROWS) {
      throw new PlatformError("VALIDATION_FAILED", `Row limit of ${HV_INTAKE_MAX_ROWS} exceeded.`);
    }
  }
  return { headers, rows, formulaCellCount, macroDetected: false };
}

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const compression = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const uncompSize = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const compressed = buffer.subarray(dataStart, dataStart + compSize);
    let data: Buffer;
    if (compression === 0) data = Buffer.from(compressed);
    else if (compression === 8) data = inflateRawSync(compressed);
    else throw new PlatformError("VALIDATION_FAILED", `Unsupported ZIP compression for ${name}.`);
    if (uncompSize > 0 && data.length !== uncompSize && compression === 0) {
      // tolerate mismatch for stored entries with zip64-less writers
    }
    entries.set(name, data);
    offset = dataStart + compSize;
  }
  return entries;
}

function xmlLocalTexts(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    out.push(
      (match[1] ?? "")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
    );
  }
  return out;
}

function colRowFromRef(ref: string): { col: number; row: number } {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref);
  if (!match) return { col: 0, row: 1 };
  const letters = (match[1] ?? "A").toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i += 1) col = col * 26 + (letters.charCodeAt(i) - 64);
  return { col: col - 1, row: Number(match[2] ?? "1") };
}

export function parseHvXlsx(buffer: Buffer): HvParsedTable {
  if (buffer.byteLength > HV_INTAKE_MAX_BYTES) {
    throw new PlatformError("VALIDATION_FAILED", `File exceeds ${HV_INTAKE_MAX_BYTES} bytes.`);
  }
  const entries = readZipEntries(buffer);
  const macroDetected = [...entries.keys()].some((name) => /vbaProject\.bin$/i.test(name) || /externalLink/i.test(name));
  if (macroDetected) {
    throw new PlatformError("VALIDATION_FAILED", "Spreadsheets with macros or external links are not accepted.");
  }
  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = xmlLocalTexts(sharedXml, "si").map((item) => item.replace(/\s+/g, " ").trim());
  const sheetEntry =
    [...entries.entries()].find(([name]) => /^xl\/worksheets\/sheet1\.xml$/i.test(name)) ??
    [...entries.entries()].find(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name));
  if (!sheetEntry) throw new PlatformError("VALIDATION_FAILED", "No worksheet was found in the workbook.");
  const sheetXml = sheetEntry[1].toString("utf8");
  const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
  const grid = new Map<string, string>();
  let maxCol = 0;
  let maxRow = 0;
  let formulaCellCount = 0;
  let match: RegExpExecArray | null;
  while ((match = cellRe.exec(sheetXml))) {
    const attrs = match[1] ?? match[3] ?? "";
    const body = match[2] ?? "";
    const refMatch = /\br="([^"]+)"/.exec(attrs);
    if (!refMatch) continue;
    const ref = refMatch[1] ?? "A1";
    const { col, row } = colRowFromRef(ref);
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
    const typeMatch = /\bt="([^"]+)"/.exec(attrs);
    const type = typeMatch?.[1];
    if (/<f[\s>]/.test(body)) formulaCellCount += 1;
    const vMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
    let value = vMatch?.[1] ?? "";
    if (type === "s") {
      const idx = Number(value);
      value = Number.isFinite(idx) ? (shared[idx] ?? "") : "";
    } else if (type === "inlineStr") {
      value = xmlLocalTexts(body, "t").join("") || value;
    }
    value = value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
    grid.set(`${row}:${col}`, value.trim());
  }
  if (maxRow < 1) throw new PlatformError("VALIDATION_FAILED", "The worksheet is empty.");
  const headers: string[] = [];
  for (let col = 0; col <= maxCol; col += 1) headers.push(grid.get(`1:${col}`) ?? "");
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new PlatformError("VALIDATION_FAILED", "The worksheet has no usable header row.");
  }
  const rows: string[][] = [];
  for (let row = 2; row <= maxRow; row += 1) {
    const cells = headers.map((_, col) => grid.get(`${row}:${col}`) ?? "");
    if (cells.every((cell) => !cell)) continue;
    for (const cell of cells) {
      if (detectFormulaInjection(cell)) formulaCellCount += 1;
    }
    rows.push(cells);
    if (rows.length > HV_INTAKE_MAX_ROWS) {
      throw new PlatformError("VALIDATION_FAILED", `Row limit of ${HV_INTAKE_MAX_ROWS} exceeded.`);
    }
  }
  return { headers, rows, sheetName: sheetEntry[0], formulaCellCount, macroDetected: false };
}

export function decodeUploadContent(contentBase64: string): Buffer {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(contentBase64, "base64");
  } catch {
    throw new PlatformError("VALIDATION_FAILED", "Upload encoding is invalid.");
  }
  if (buffer.byteLength === 0) throw new PlatformError("VALIDATION_FAILED", "The file is empty.");
  if (buffer.byteLength > HV_INTAKE_MAX_BYTES) {
    throw new PlatformError("VALIDATION_FAILED", `File exceeds ${HV_INTAKE_MAX_BYTES} bytes.`);
  }
  return buffer;
}

export function parseUploadedTable(contentType: string, buffer: Buffer): HvParsedTable {
  if (contentType === "text/csv") return parseHvCsv(buffer.toString("utf8"));
  if (contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return parseHvXlsx(buffer);
  }
  throw new PlatformError("VALIDATION_FAILED", "Unsupported file type. Use CSV or XLSX.");
}

export function autoMapHeaders(headers: string[]): MappingColumn[] {
  const used = new Set<string>();
  return headers.map((header) => {
    const normalised = header.trim();
    const lower = normalised.toLowerCase();
    const exact = CANONICAL_CSV_COLUMNS.find((column) => column.toLowerCase() === lower);
    if (exact && !used.has(exact)) {
      used.add(exact);
      return {
        sourceHeader: normalised || "(blank)",
        targetField: exact,
        required: exact === "givenName" || exact === "familyName" || exact === "email",
      };
    }
    const aliases: Record<string, CanonicalCsvColumn> = {
      firstname: "givenName",
      first_name: "givenName",
      "given name": "givenName",
      lastname: "familyName",
      last_name: "familyName",
      "family name": "familyName",
      "preferred name": "preferredName",
      e_mail: "email",
      "e-mail": "email",
      mobile: "phone",
      telephone: "phone",
      household: "householdKey",
      "household key": "householdKey",
      diet: "dietary",
      "dietary requirements": "dietary",
      access: "accessibility",
      "accessibility requirements": "accessibility",
      notes: "note",
      comments: "note",
    };
    const alias = aliases[lower];
    if (alias && !used.has(alias)) {
      used.add(alias);
      return {
        sourceHeader: normalised || "(blank)",
        targetField: alias,
        required: alias === "givenName" || alias === "familyName" || alias === "email",
      };
    }
    return {
      sourceHeader: normalised || "(blank)",
      targetField: "UNMAPPED",
      required: false,
    };
  });
}

export function canonicalTemplateCsv(): string {
  return `${CANONICAL_CSV_COLUMNS.join(",")}\n`;
}
