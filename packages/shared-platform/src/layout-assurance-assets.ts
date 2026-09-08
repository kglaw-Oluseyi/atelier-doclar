import { createHash } from "node:crypto";
import {
  LAYOUT_ASSET_MAX_BYTES,
  LAYOUT_ASSET_PROVIDER_CONFIGURED,
  LAYOUT_FLOOR_PLAN_KINDS,
} from "./constants.js";
import { PlatformError } from "./errors.js";

export type FloorPlanKind = (typeof LAYOUT_FLOOR_PLAN_KINDS)[number];

export type FloorPlanInspection = {
  detectedKind: FloorPlanKind | "UNKNOWN";
  extension: string;
  declaredMime: string;
  sanitisedFileName: string;
  signatureAgreed: boolean;
  mimeAgreed: boolean;
  extensionAgreed: boolean;
  inert: boolean;
  rejected: boolean;
  quarantine: boolean;
  storageState: "REJECTED" | "QUARANTINED" | "CONFIGURATION_REQUIRED" | "AVAILABLE";
  scanStatus: "NOT_RUN" | "FAILED_CLOSED" | "SYNTHETIC_INERT" | "CLEAN" | "REJECTED";
  notes: string;
  storedBytes?: Uint8Array;
  derivative?: { kind: "INERT_SVG" | "RASTER_PNG" | "JPEG" | "PDF_SANDBOX"; bytes: Uint8Array; contentType: string; ext: string };
};

const MIME_BY_KIND: Record<FloorPlanKind, readonly string[]> = {
  PDF: ["application/pdf"],
  SVG: ["image/svg+xml", "text/xml"],
  PNG: ["image/png"],
  JPEG: ["image/jpeg"],
};

const EXTENSION_BY_KIND: Record<FloorPlanKind, readonly string[]> = {
  PDF: [".pdf"],
  SVG: [".svg"],
  PNG: [".png"],
  JPEG: [".jpg", ".jpeg"],
};

const ACTIVE_SVG = [
  /<script/i,
  /\bon[a-z]+\s*=/i,
  /javascript:/i,
  /<foreignObject/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<animate/i,
  /<set[\s>]/i,
  /xlink:href\s*=\s*["']https?:/i,
  /href\s*=\s*["']https?:/i,
];

const ACTIVE_PDF = [/\/JavaScript/i, /\/JS[\s/]/, /\/OpenAction/i, /\/RichMedia/i, /\/Launch/i, /\/EmbeddedFile/i];

export function sanitiseFloorPlanFileName(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "floor-plan";
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 80);
  return cleaned || "floor-plan";
}

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function kindFromMagic(bytes: Uint8Array | undefined, hex?: string): FloorPlanKind | "UNKNOWN" {
  const head = bytes ? Buffer.from(bytes.subarray(0, 16)).toString("hex") : hex?.toLowerCase();
  if (!head) return "UNKNOWN";
  if (head.startsWith("25504446")) return "PDF";
  if (head.startsWith("89504e47")) return "PNG";
  if (head.startsWith("ffd8ff")) return "JPEG";
  const ascii = Buffer.from(head.slice(0, 40), "hex").toString("utf8").trimStart();
  if (ascii.startsWith("<svg") || ascii.startsWith("<?xml")) return "SVG";
  return "UNKNOWN";
}

function svgOrPdfActive(kind: FloorPlanKind | "UNKNOWN", text?: string): boolean {
  if (!text) return false;
  if (kind === "SVG") return ACTIVE_SVG.some((pattern) => pattern.test(text));
  if (kind === "PDF") return ACTIVE_PDF.some((pattern) => pattern.test(text));
  return false;
}

function sanitiseSvg(source: string): string {
  const withoutDanger = source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/xlink:href\s*=\s*("|')https?:[\s\S]*?\1/gi, "")
    .replace(/href\s*=\s*("|')https?:[\s\S]*?\1/gi, "");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" data-inert="true">${withoutDanger.replace(/^[\s\S]*?<svg[^>]*>/i, "").replace(/<\/svg>[\s\S]*$/i, "")}</svg>`;
}

function clipPng(bytes: Uint8Array): Uint8Array {
  const marker = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  const buffer = Buffer.from(bytes);
  const index = buffer.indexOf(marker);
  if (index < 0) return bytes;
  return Uint8Array.from(buffer.subarray(0, index + marker.length));
}

function clipJpeg(bytes: Uint8Array): Uint8Array {
  let end = -1;
  for (let i = 0; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) end = i + 2;
  }
  return end > 0 ? bytes.subarray(0, end) : bytes;
}

function rejected(partial: Omit<FloorPlanInspection, "inert" | "rejected" | "quarantine" | "storageState" | "scanStatus"> & { notes: string; quarantine?: boolean }): FloorPlanInspection {
  return {
    ...partial,
    inert: false,
    rejected: true,
    quarantine: Boolean(partial.quarantine),
    storageState: partial.quarantine ? "QUARANTINED" : "REJECTED",
    scanStatus: "REJECTED",
  };
}

export function inspectFloorPlanPayload(input: {
  originalFileName: string;
  declaredMime: string;
  detectedKind: FloorPlanKind;
  byteSize: number;
  checksumSha256: string;
  svgText?: string;
  magicBytesHex?: string;
  syntheticInert?: boolean;
  bytes?: Uint8Array;
  storeConfigured?: boolean;
}): FloorPlanInspection {
  if ((input.bytes?.byteLength ?? input.byteSize) < 1 || (input.bytes?.byteLength ?? input.byteSize) > LAYOUT_ASSET_MAX_BYTES) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan payload exceeds size limits", {
      publicMessage: "This file is outside the allowed size limits. Nothing was stored.",
    });
  }
  if (!/^[a-f0-9]{64}$/i.test(input.checksumSha256)) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan checksum must be SHA-256 hex", {
      publicMessage: "A SHA-256 checksum is required. Nothing was stored.",
    });
  }
  const sanitisedFileName = sanitiseFloorPlanFileName(input.originalFileName);
  const extension = extensionOf(sanitisedFileName);
  const magicKind = kindFromMagic(input.bytes, input.magicBytesHex);
  const detectedKind = magicKind === "UNKNOWN" ? input.detectedKind : magicKind;
  const mimeAgreed = MIME_BY_KIND[input.detectedKind]?.includes(input.declaredMime.toLowerCase()) ?? false;
  const extensionAgreed = EXTENSION_BY_KIND[input.detectedKind]?.includes(extension) ?? false;
  const signatureAgreed = !input.magicBytesHex && !input.bytes ? true : magicKind === input.detectedKind;
  const text =
    input.svgText ??
    (detectedKind === "SVG" || detectedKind === "PDF"
      ? Buffer.from(input.bytes ?? Buffer.from(input.magicBytesHex ?? "", "hex")).toString(detectedKind === "PDF" ? "latin1" : "utf8")
      : undefined);
  const active = svgOrPdfActive(detectedKind, text);
  const base = {
    detectedKind: magicKind,
    extension,
    declaredMime: input.declaredMime,
    sanitisedFileName,
    signatureAgreed,
    mimeAgreed,
    extensionAgreed,
    notes: "",
  };
  if (!mimeAgreed || !extensionAgreed || !signatureAgreed || detectedKind !== input.detectedKind) {
    return rejected({
      ...base,
      notes: "Declared MIME, extension and detected signature must agree. No bytes were stored.",
    });
  }
  if (active) {
    return rejected({
      ...base,
      detectedKind,
      quarantine: true,
      notes: "SVG/PDF contained script, active content or external references. The payload was quarantined and not stored.",
    });
  }
  if (input.bytes && input.checksumSha256.toLowerCase() !== createHash("sha256").update(input.bytes).digest("hex")) {
    return rejected({
      ...base,
      detectedKind,
      notes: "Checksum did not match the received bytes. Nothing was stored.",
    });
  }
  if (input.storeConfigured && input.bytes) {
    let storedBytes = input.bytes;
    let derivative: FloorPlanInspection["derivative"];
    if (detectedKind === "SVG") {
      const sanitised = sanitiseSvg(Buffer.from(input.bytes).toString("utf8"));
      storedBytes = new TextEncoder().encode(sanitised);
      derivative = { kind: "INERT_SVG", bytes: storedBytes, contentType: "image/svg+xml", ext: "svg" };
    } else if (detectedKind === "PNG") {
      storedBytes = clipPng(input.bytes);
      derivative = { kind: "RASTER_PNG", bytes: storedBytes, contentType: "image/png", ext: "png" };
    } else if (detectedKind === "JPEG") {
      storedBytes = clipJpeg(input.bytes);
      derivative = { kind: "JPEG", bytes: storedBytes, contentType: "image/jpeg", ext: "jpg" };
    } else {
      derivative = { kind: "PDF_SANDBOX", bytes: storedBytes, contentType: "application/pdf", ext: "pdf" };
    }
    return {
      ...base,
      detectedKind,
      inert: true,
      rejected: false,
      quarantine: false,
      storageState: "AVAILABLE",
      scanStatus: "CLEAN",
      notes: "Content-safety scan passed. Source is stored privately and is not spatially authoritative until verified calibration.",
      storedBytes,
      derivative,
    };
  }
  if (LAYOUT_ASSET_PROVIDER_CONFIGURED) {
    throw new PlatformError("INTERNAL_ERROR", "asset provider flag is true without an approved adapter");
  }
  return {
    ...base,
    detectedKind,
    inert: true,
    rejected: false,
    quarantine: false,
    storageState: "CONFIGURATION_REQUIRED",
    scanStatus: input.syntheticInert ? "SYNTHETIC_INERT" : "NOT_RUN",
    notes: input.syntheticInert
      ? "Synthetic inert fixture exercised the internal inspector. Live upload, scan, quarantine storage and signed access remain unavailable."
      : "No approved object storage is bound to this runtime. Intent is recorded; live binary upload remains disabled.",
  };
}

export function assertNoAssetSecrets(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (lower.includes("signedurl") || lower === "storagekey" || lower === "bytes" || lower === "filebytes") {
      throw new PlatformError("VALIDATION_FAILED", "asset records must not store access secrets or binaries", {
        field: key,
        publicMessage: "Floor-plan records cannot store storage keys, signed URLs or file bytes.",
      });
    }
  }
}
