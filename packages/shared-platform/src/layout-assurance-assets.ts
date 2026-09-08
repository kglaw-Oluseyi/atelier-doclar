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
  signatureAgreed: boolean;
  mimeAgreed: boolean;
  extensionAgreed: boolean;
  inert: boolean;
  rejected: boolean;
  quarantine: boolean;
  storageState: "REJECTED" | "QUARANTINED" | "CONFIGURATION_REQUIRED";
  scanStatus: "NOT_RUN" | "FAILED_CLOSED" | "SYNTHETIC_INERT";
  notes: string;
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

const ACTIVE_PDF = [/\/JavaScript/i, /\/JS[\s/]/, /\/OpenAction/i, /\/RichMedia/i];

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function kindFromMagic(hex: string | undefined): FloorPlanKind | "UNKNOWN" {
  if (!hex) return "UNKNOWN";
  const bytes = hex.toLowerCase();
  if (bytes.startsWith("25504446")) return "PDF";
  if (bytes.startsWith("89504e47")) return "PNG";
  if (bytes.startsWith("ffd8ff")) return "JPEG";
  const ascii = Buffer.from(bytes.slice(0, 40), "hex").toString("utf8").trimStart();
  if (ascii.startsWith("<svg") || ascii.startsWith("<?xml")) return "SVG";
  return "UNKNOWN";
}

function svgOrPdfActive(kind: FloorPlanKind | "UNKNOWN", svgText?: string, magicBytesHex?: string): boolean {
  if (kind === "SVG" && svgText) return ACTIVE_SVG.some((pattern) => pattern.test(svgText));
  if (kind === "PDF" && magicBytesHex) {
    const ascii = Buffer.from(magicBytesHex, "hex").toString("latin1");
    return ACTIVE_PDF.some((pattern) => pattern.test(ascii));
  }
  if (kind === "SVG" && svgText === undefined && magicBytesHex) {
    const ascii = Buffer.from(magicBytesHex, "hex").toString("utf8");
    return ACTIVE_SVG.some((pattern) => pattern.test(ascii));
  }
  return false;
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
}): FloorPlanInspection {
  if (input.byteSize < 1 || input.byteSize > LAYOUT_ASSET_MAX_BYTES) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan payload exceeds size limits", {
      publicMessage: "This file is outside the allowed size limits. Nothing was stored.",
    });
  }
  if (!/^[a-f0-9]{64}$/i.test(input.checksumSha256)) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan checksum must be SHA-256 hex", {
      publicMessage: "A SHA-256 checksum is required. Nothing was stored.",
    });
  }
  const extension = extensionOf(input.originalFileName);
  const magicKind = kindFromMagic(input.magicBytesHex);
  const detectedKind = magicKind === "UNKNOWN" ? input.detectedKind : magicKind;
  const mimeAgreed = MIME_BY_KIND[input.detectedKind].includes(input.declaredMime.toLowerCase());
  const extensionAgreed = EXTENSION_BY_KIND[input.detectedKind].includes(extension);
  const signatureAgreed = !input.magicBytesHex || magicKind === input.detectedKind;
  const active = svgOrPdfActive(detectedKind, input.svgText, input.magicBytesHex);
  if (!mimeAgreed || !extensionAgreed || !signatureAgreed || detectedKind !== input.detectedKind) {
    return {
      detectedKind: magicKind,
      extension,
      declaredMime: input.declaredMime,
      signatureAgreed,
      mimeAgreed,
      extensionAgreed,
      inert: false,
      rejected: true,
      quarantine: false,
      storageState: "REJECTED",
      scanStatus: "NOT_RUN",
      notes: "Declared MIME, extension and detected signature must agree. No bytes were stored.",
    };
  }
  if (active) {
    return {
      detectedKind,
      extension,
      declaredMime: input.declaredMime,
      signatureAgreed,
      mimeAgreed,
      extensionAgreed,
      inert: false,
      rejected: true,
      quarantine: true,
      storageState: "QUARANTINED",
      scanStatus: "NOT_RUN",
      notes: "SVG/PDF contained script or active external references. The payload was quarantined and not stored.",
    };
  }
  if (LAYOUT_ASSET_PROVIDER_CONFIGURED) {
    throw new PlatformError("INTERNAL_ERROR", "asset provider flag is true without an approved adapter");
  }
  return {
    detectedKind,
    extension,
    declaredMime: input.declaredMime,
    signatureAgreed,
    mimeAgreed,
    extensionAgreed,
    inert: true,
    rejected: false,
    quarantine: false,
    storageState: "CONFIGURATION_REQUIRED",
    scanStatus: input.syntheticInert ? "SYNTHETIC_INERT" : "NOT_RUN",
    notes: input.syntheticInert
      ? "Synthetic inert fixture exercised the internal inspector. Live upload, scan, quarantine storage and signed access remain unavailable."
      : "No approved object storage, malware scanner or derivative processor is configured. Intent is recorded; live binary upload remains disabled.",
  };
}

export function assertNoAssetSecrets(raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (lower.includes("signedurl") || lower.includes("storagekey") || lower === "bytes" || lower === "filebytes") {
      throw new PlatformError("VALIDATION_FAILED", "asset records must not store access secrets or binaries", {
        field: key,
        publicMessage: "Floor-plan records cannot store storage keys, signed URLs or file bytes.",
      });
    }
  }
}
