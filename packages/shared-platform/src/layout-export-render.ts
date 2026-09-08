import { inflateSync, deflateSync } from "node:zlib";
import type { SpatialObject } from "./spatial-schemas.js";

export type LayoutExportMarking = "DRAFT" | "APPROVED" | "PUBLISHED" | "SUPERSEDED" | "WITHDRAWN";

export type LayoutExportRenderInput = {
  format: "PDF" | "PNG";
  marking: LayoutExportMarking;
  eventName: string;
  layoutName: string;
  contentHash: string;
  publicationNumber?: number;
  generatedAt: string;
  widthMm: number;
  heightMm: number;
  objects: Array<{
    id: string;
    objectType: string;
    label: string;
    geometry: SpatialObject["geometry"] | { kind: "MASKED" };
  }>;
};

const IVORY = { r: 245, g: 240, b: 232 };
const ONYX = { r: 17, g: 16, b: 15 };
const BRASS = { r: 139, g: 110, b: 56 };
const FONT_COLS = 5;
const FONT_ROWS = 7;
const CHAR_GAP = 1;
const CHAR_PITCH = FONT_COLS + CHAR_GAP;
const LINE_GAP = 3;
const LINE_PITCH = FONT_ROWS + LINE_GAP;
const PNG_PAD = 8;
const PNG_MIN_WIDTH = 720;
const NAME_WRAP_LINES = 2;

/**
 * 5×7 glyphs for printable ASCII 32–126. Each character is seven 5-bit rows,
 * packed as hex. Unknown characters render as a hollow box so output stays
 * self-contained and does not depend on host fonts.
 */
const FONT_5X7: Record<string, readonly number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 0, 4, 0],
  '"': [10, 10, 0, 0, 0, 0, 0],
  "#": [10, 31, 10, 31, 10, 0, 0],
  $: [4, 14, 20, 14, 5, 14, 4],
  "%": [17, 18, 4, 8, 19, 0, 0],
  "&": [8, 20, 8, 21, 18, 13, 0],
  "'": [4, 4, 0, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "*": [0, 4, 21, 14, 21, 4, 0],
  "+": [0, 4, 4, 31, 4, 4, 0],
  ",": [0, 0, 0, 0, 4, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 4, 0],
  "/": [1, 2, 4, 8, 16, 0, 0],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [14, 17, 1, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  ":": [0, 4, 0, 0, 4, 0, 0],
  ";": [0, 4, 0, 0, 4, 4, 8],
  "<": [2, 4, 8, 16, 8, 4, 2],
  "=": [0, 0, 31, 0, 31, 0, 0],
  ">": [8, 4, 2, 1, 2, 4, 8],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "@": [14, 17, 23, 21, 23, 16, 14],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 14],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [1, 1, 1, 1, 17, 17, 14],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [14, 17, 16, 14, 1, 17, 14],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "[": [14, 8, 8, 8, 8, 8, 14],
  "\\": [16, 8, 4, 2, 1, 0, 0],
  "]": [14, 2, 2, 2, 2, 2, 14],
  "^": [4, 10, 17, 0, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 31],
  "`": [8, 4, 0, 0, 0, 0, 0],
  a: [0, 0, 14, 1, 15, 17, 15],
  b: [16, 16, 30, 17, 17, 17, 30],
  c: [0, 0, 14, 17, 16, 17, 14],
  d: [1, 1, 15, 17, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14],
  f: [6, 8, 28, 8, 8, 8, 8],
  g: [0, 0, 15, 17, 15, 1, 14],
  h: [16, 16, 30, 17, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14],
  j: [2, 0, 6, 2, 2, 18, 12],
  k: [16, 16, 18, 20, 24, 20, 18],
  l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21],
  n: [0, 0, 30, 17, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14],
  p: [0, 0, 30, 17, 30, 16, 16],
  q: [0, 0, 15, 17, 15, 1, 1],
  r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30],
  t: [8, 8, 28, 8, 8, 8, 6],
  u: [0, 0, 17, 17, 17, 17, 15],
  v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 17, 21, 21, 10],
  x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14],
  z: [0, 0, 31, 2, 4, 8, 31],
  "{": [6, 8, 8, 16, 8, 8, 6],
  "|": [4, 4, 4, 4, 4, 4, 4],
  "}": [12, 2, 2, 1, 2, 2, 12],
  "~": [0, 8, 21, 2, 0, 0, 0],
};

const BOX = [14, 17, 17, 17, 17, 17, 14] as const;

export function layoutExportProvenanceLines(input: Omit<LayoutExportRenderInput, "format" | "widthMm" | "heightMm" | "objects">): string[] {
  const lines = [
    `Status: ${input.marking}`,
    `Event: ${sanitiseExportLabel(input.eventName)}`,
    `Layout: ${sanitiseExportLabel(input.layoutName)}`,
    `Hash: ${input.contentHash}`,
  ];
  if (input.publicationNumber !== undefined) lines.push(`Publication: ${input.publicationNumber}`);
  lines.push(`Generated: ${input.generatedAt}`);
  return lines;
}

function sanitiseExportLabel(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E]/g, "?").trim() || "unnamed";
}

function wrapLine(text: string, columns: number): string[] {
  if (columns < 8) return [text];
  const prefixMatch = /^(Status|Event|Layout|Hash|Publication|Generated): /.exec(text);
  const label = prefixMatch?.[0] ?? "";
  const body = label ? text.slice(label.length) : text;
  const firstWidth = Math.max(8, columns - label.length);
  if (body.length <= firstWidth) return [text];
  const lines = [`${label}${body.slice(0, firstWidth)}`];
  let rest = body.slice(firstWidth);
  const continuation = columns;
  while (rest.length > 0) {
    lines.push(rest.slice(0, continuation));
    rest = rest.slice(continuation);
  }
  return lines;
}

function wrapProvenance(lines: string[], columns: number): string[] {
  const wrapped: string[] = [];
  for (const line of lines) {
    const isName = line.startsWith("Event: ") || line.startsWith("Layout: ");
    const parts = wrapLine(line, columns);
    if (isName && parts.length > NAME_WRAP_LINES) {
      const kept = parts.slice(0, NAME_WRAP_LINES);
      const last = kept[NAME_WRAP_LINES - 1] ?? "";
      kept[NAME_WRAP_LINES - 1] = last.length > 3 ? `${last.slice(0, last.length - 3)}...` : last;
      wrapped.push(...kept);
    } else {
      wrapped.push(...parts);
    }
  }
  return wrapped;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength);
  const typeBytes = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

function encodePng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    raw.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), row + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk("IHDR", ihdr),
      pngChunk("IDAT", deflateSync(raw)),
      pngChunk("IEND", new Uint8Array()),
    ]),
  );
}

function fillRect(pixels: Uint8Array, width: number, height: number, x: number, y: number, w: number, h: number, colour: { r: number; g: number; b: number }): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(width, Math.ceil(x + w));
  const y1 = Math.min(height, Math.ceil(y + h));
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const i = (py * width + px) * 3;
      pixels[i] = colour.r;
      pixels[i + 1] = colour.g;
      pixels[i + 2] = colour.b;
    }
  }
}

function glyphFor(char: string): readonly number[] {
  return FONT_5X7[char] ?? BOX;
}

function drawGlyph(
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  char: string,
  colour: { r: number; g: number; b: number },
): void {
  const rows = glyphFor(char);
  for (let row = 0; row < FONT_ROWS; row += 1) {
    const bits = rows[row] ?? 0;
    for (let col = 0; col < FONT_COLS; col += 1) {
      if (bits & (1 << (FONT_COLS - 1 - col))) {
        const px = x + col;
        const py = y + row;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const i = (py * width + px) * 3;
        pixels[i] = colour.r;
        pixels[i + 1] = colour.g;
        pixels[i + 2] = colour.b;
      }
    }
  }
}

function drawTextLine(
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  text: string,
  colour: { r: number; g: number; b: number },
): void {
  for (let i = 0; i < text.length; i += 1) {
    const px = x + i * CHAR_PITCH;
    if (px + FONT_COLS > width - PNG_PAD) break;
    drawGlyph(pixels, width, height, px, y, text[i] ?? " ", colour);
  }
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function objectBox(geometry: LayoutExportRenderInput["objects"][number]["geometry"]): { x: number; y: number; w: number; h: number } | undefined {
  if (geometry.kind === "MASKED") return undefined;
  if (geometry.kind === "RECTANGLE") return { x: geometry.xMm, y: geometry.yMm, w: geometry.widthMm, h: geometry.heightMm };
  if (geometry.kind === "ELLIPSE") {
    return { x: geometry.cxMm - geometry.radiusXMm, y: geometry.cyMm - geometry.radiusYMm, w: geometry.radiusXMm * 2, h: geometry.radiusYMm * 2 };
  }
  const xs = geometry.points.map((point) => point.xMm);
  const ys = geometry.points.map((point) => point.yMm);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export function renderLayoutExport(input: LayoutExportRenderInput): { bytes: Uint8Array; contentType: string } {
  const provenance = layoutExportProvenanceLines(input);
  if (input.format === "PNG") {
    const maxWidth = 1600;
    const scale = Math.min(maxWidth / Math.max(input.widthMm, 1), 900 / Math.max(input.heightMm, 1));
    const width = Math.max(PNG_MIN_WIDTH, Math.round(input.widthMm * scale));
    const columns = Math.max(16, Math.floor((width - PNG_PAD * 2) / CHAR_PITCH));
    const headerLines = wrapProvenance(provenance, columns);
    const header = PNG_PAD * 2 + headerLines.length * LINE_PITCH;
    const height = Math.max(240, Math.round(input.heightMm * scale) + header);
    const pixels = new Uint8Array(width * height * 3);
    fillRect(pixels, width, height, 0, 0, width, height, IVORY);
    fillRect(pixels, width, height, 0, 0, width, header, ONYX);
    headerLines.forEach((line, index) => {
      const y = PNG_PAD + index * LINE_PITCH;
      const colour = line.startsWith("Status: ") ? BRASS : IVORY;
      drawTextLine(pixels, width, height, PNG_PAD, y, line, colour);
    });
    for (const object of input.objects) {
      const box = objectBox(object.geometry);
      if (!box) continue;
      const colour = object.objectType === "MASKED" ? { r: 180, g: 180, b: 176 } : BRASS;
      fillRect(pixels, width, height, box.x * scale, box.y * scale + header, Math.max(2, box.w * scale), Math.max(2, box.h * scale), colour);
    }
    return { bytes: encodePng(width, height, pixels), contentType: "image/png" };
  }

  const pageW = 842;
  const pageH = 595;
  const pdfColumns = 96;
  const headerLines = wrapProvenance(provenance, pdfColumns);
  const headerHeight = 28 + headerLines.length * 12;
  const scale = Math.min((pageW - 48) / Math.max(input.widthMm, 1), (pageH - headerHeight - 24) / Math.max(input.heightMm, 1));
  const ops: string[] = ["0.067 0.063 0.059 rg", "BT /F1 9 Tf"];
  headerLines.forEach((line, index) => {
    const y = pageH - 22 - index * 12;
    ops.push(`1 0 0 1 24 ${y.toFixed(2)} Tm`, `(${pdfEscape(line)}) Tj`);
  });
  ops.push("ET", "0.545 0.431 0.220 rg");
  for (const object of input.objects) {
    const box = objectBox(object.geometry);
    if (!box) continue;
    const x = 24 + box.x * scale;
    const y = pageH - headerHeight - (box.y + box.h) * scale;
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${Math.max(1, box.w * scale).toFixed(2)} ${Math.max(1, box.h * scale).toFixed(2)} re f`);
  }
  const stream = ops.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let offset = 9;
  const offsets = [0];
  const chunks = ["%PDF-1.4\n"];
  for (const object of objects) {
    offsets.push(offset);
    chunks.push(`${object}\n`);
    offset += Buffer.byteLength(`${object}\n`);
  }
  const xrefStart = offset;
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
  for (const value of offsets.slice(1)) xref.push(`${String(value).padStart(10, "0")} 00000 n \n`);
  chunks.push(xref.join(""));
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return { bytes: new Uint8Array(Buffer.from(chunks.join(""))), contentType: "application/pdf" };
}

export function inspectLayoutExportPdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const texts: string[] = [];
  const pattern = /\(((?:\\[\\()]|[^\\)])*)\)\s*Tj/g;
  for (const match of raw.matchAll(pattern)) {
    texts.push((match[1] ?? "").replace(/\\([\\()])/g, "$1"));
  }
  return texts.join("\n");
}

export function inspectLayoutExportPngText(bytes: Uint8Array): string {
  const { width, height, pixels } = decodeRgbPng(bytes);
  const headerEnd = detectOnyxHeaderHeight(pixels, width, height);
  const lines: string[] = [];
  for (let y = PNG_PAD; y + FONT_ROWS <= headerEnd; y += LINE_PITCH) {
    let line = "";
    for (let x = PNG_PAD; x + FONT_COLS <= width - PNG_PAD; x += CHAR_PITCH) {
      line += recogniseGlyph(pixels, width, x, y);
    }
    const trimmed = line.replace(/ +$/g, "");
    if (trimmed) lines.push(trimmed);
  }
  return lines.join("\n");
}

function decodeRgbPng(bytes: Uint8Array): { width: number; height: number; pixels: Uint8Array } {
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) throw new Error("not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset + 8 <= bytes.byteLength) {
    const length = Buffer.from(bytes.subarray(offset, offset + 4)).readUInt32BE(0);
    const type = Buffer.from(bytes.subarray(offset + 4, offset + 8)).toString("latin1");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = Buffer.from(data).readUInt32BE(0);
      height = Buffer.from(data).readUInt32BE(4);
    }
    if (type === "IDAT") idat.push(Buffer.from(data));
    if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * 3);
  const rowBytes = width * 3 + 1;
  for (let y = 0; y < height; y += 1) {
    if (raw[y * rowBytes] !== 0) throw new Error("unsupported PNG filter");
    pixels.set(raw.subarray(y * rowBytes + 1, y * rowBytes + 1 + width * 3), y * width * 3);
  }
  return { width, height, pixels };
}

function detectOnyxHeaderHeight(pixels: Uint8Array, width: number, height: number): number {
  let header = 0;
  for (let y = 0; y < height; y += 1) {
    let onyx = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      if ((pixels[i] ?? 0) < 40 && (pixels[i + 1] ?? 0) < 40 && (pixels[i + 2] ?? 0) < 40) onyx += 1;
    }
    if (onyx < width * 0.08) break;
    header = y + 1;
  }
  return header;
}

function recogniseGlyph(pixels: Uint8Array, width: number, x: number, y: number): string {
  let best = " ";
  let bestError = FONT_COLS * FONT_ROWS;
  for (const [char, rows] of Object.entries(FONT_5X7)) {
    let error = 0;
    for (let row = 0; row < FONT_ROWS; row += 1) {
      const bits = rows[row] ?? 0;
      for (let col = 0; col < FONT_COLS; col += 1) {
        const i = ((y + row) * width + (x + col)) * 3;
        const lit = (pixels[i] ?? 0) + (pixels[i + 1] ?? 0) + (pixels[i + 2] ?? 0) > 180;
        const expected = Boolean(bits & (1 << (FONT_COLS - 1 - col)));
        if (lit !== expected) error += 1;
      }
    }
    if (error < bestError) {
      bestError = error;
      best = char;
    }
  }
  return bestError <= 6 ? best : " ";
}
