import { deflateSync } from "node:zlib";
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
  const body = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
  return new Uint8Array(body);
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

function legend(input: LayoutExportRenderInput): string {
  const publication = input.publicationNumber ? ` publication ${input.publicationNumber}` : "";
  return `${input.marking} · ${input.eventName} · ${input.layoutName}${publication} · hash ${input.contentHash} · generated ${input.generatedAt}`;
}

export function renderLayoutExport(input: LayoutExportRenderInput): { bytes: Uint8Array; contentType: string } {
  if (input.format === "PNG") {
    const maxWidth = 1600;
    const scale = Math.min(maxWidth / Math.max(input.widthMm, 1), 900 / Math.max(input.heightMm, 1));
    const width = Math.max(320, Math.round(input.widthMm * scale));
    const header = 48;
    const height = Math.max(240, Math.round(input.heightMm * scale) + header);
    const pixels = new Uint8Array(width * height * 3);
    fillRect(pixels, width, height, 0, 0, width, height, IVORY);
    fillRect(pixels, width, height, 0, 0, width, header, ONYX);
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
  const scale = Math.min((pageW - 48) / Math.max(input.widthMm, 1), (pageH - 72) / Math.max(input.heightMm, 1));
  const ops: string[] = [
    "0.067 0.063 0.059 rg",
    "BT /F1 9 Tf 24 570 Td",
    `(${pdfEscape(legend(input).slice(0, 180))}) Tj`,
    "ET",
    "0.545 0.431 0.220 rg",
  ];
  for (const object of input.objects) {
    const box = objectBox(object.geometry);
    if (!box) continue;
    const x = 24 + box.x * scale;
    const y = pageH - 48 - (box.y + box.h) * scale;
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
