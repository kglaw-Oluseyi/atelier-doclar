import "server-only";
import { createHash, randomUUID } from "node:crypto";
import {
  inspectFloorPlanPayload,
  LAYOUT_ASSET_MAX_BYTES,
  layoutDerivativeObjectKey,
  layoutSourceObjectKey,
  PlatformError,
  type ActorContext,
  type LayoutFloorPlanAsset,
} from "@maison-doclar/shared-platform";
import { createLayoutBinaryStoreFromEnv } from "./layout-s3-store";
import { getRuntime } from "./runtime";

const KIND_BY_MIME: Record<string, "PDF" | "SVG" | "PNG" | "JPEG"> = {
  "application/pdf": "PDF",
  "image/svg+xml": "SVG",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
};

function kindFromName(name: string): "PDF" | "SVG" | "PNG" | "JPEG" | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".svg")) return "SVG";
  if (lower.endsWith(".png")) return "PNG";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPEG";
  return undefined;
}

export async function ingestLayoutFloorPlan(input: {
  actor: ActorContext;
  organisationId: string;
  eventId: string;
  layoutId: string;
  expectedVersion: number;
  expectedRevisionNumber: number;
  reason: string;
  idempotencyKey?: string;
  supersedesAssetId?: string;
  file: File;
}): Promise<LayoutFloorPlanAsset> {
  const store = createLayoutBinaryStoreFromEnv();
  if (!store?.configured) {
    throw new PlatformError("CAPABILITY_NOT_ENABLED", "layout asset store is not bound", {
      publicMessage: "Private floor-plan storage is not bound. Nothing was stored.",
    });
  }
  if (input.file.size < 1 || input.file.size > LAYOUT_ASSET_MAX_BYTES) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan payload exceeds size limits", {
      publicMessage: "This file is outside the allowed size limits. Nothing was stored.",
    });
  }
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const detectedKind = KIND_BY_MIME[input.file.type.toLowerCase()] ?? kindFromName(input.file.name);
  if (!detectedKind) {
    throw new PlatformError("VALIDATION_FAILED", "floor-plan type is not allowlisted", {
      publicMessage: "Only PDF, SVG, PNG and JPEG floor-plans are accepted. Nothing was stored.",
    });
  }
  const declaredMime =
    input.file.type ||
    (detectedKind === "PDF"
      ? "application/pdf"
      : detectedKind === "SVG"
        ? "image/svg+xml"
        : detectedKind === "PNG"
          ? "image/png"
          : "image/jpeg");
  const inspection = inspectFloorPlanPayload({
    originalFileName: input.file.name,
    declaredMime,
    detectedKind,
    byteSize: bytes.byteLength,
    checksumSha256,
    bytes,
    storeConfigured: true,
  });
  const service = getRuntime().service;
  const cas = {
    organisationId: input.organisationId,
    eventId: input.eventId,
    layoutId: input.layoutId,
    expectedVersion: input.expectedVersion,
    expectedRevisionNumber: input.expectedRevisionNumber,
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
    supersedesAssetId: input.supersedesAssetId,
  };
  if (inspection.rejected || !inspection.storedBytes || !inspection.derivative) {
    return service.recordFloorPlanIntent(input.actor, {
      ...cas,
      originalFileName: input.file.name,
      declaredMime: inspection.declaredMime,
      detectedKind,
      byteSize: bytes.byteLength,
      checksumSha256,
      svgText: detectedKind === "SVG" ? Buffer.from(bytes).toString("utf8").slice(0, 20_000) : undefined,
      magicBytesHex: Buffer.from(bytes.subarray(0, 8)).toString("hex"),
    });
  }
  const assetId = randomUUID();
  const ext = inspection.derivative.ext;
  const objectKey = layoutSourceObjectKey({
    organisationId: input.organisationId,
    eventId: input.eventId,
    layoutId: input.layoutId,
    assetId,
    ext,
  });
  const derivativeObjectKey = layoutDerivativeObjectKey({
    organisationId: input.organisationId,
    eventId: input.eventId,
    layoutId: input.layoutId,
    assetId,
    ext: inspection.derivative.ext,
  });
  try {
    await store.put({ key: objectKey, bytes: inspection.storedBytes, contentType: inspection.declaredMime });
    await store.put({
      key: derivativeObjectKey,
      bytes: inspection.derivative.bytes,
      contentType: inspection.derivative.contentType,
    });
    const storedSource = await store.get(objectKey);
    if (!storedSource || storedSource.bytes.byteLength !== inspection.storedBytes.byteLength) {
      throw new PlatformError("INTERNAL_ERROR", "floor-plan object was not durably stored", {
        publicMessage: "Storage failed. No successful upload was recorded.",
      });
    }
    return service.recordStoredFloorPlan(input.actor, {
      ...cas,
      id: assetId,
      originalFileName: inspection.sanitisedFileName,
      declaredMime: inspection.declaredMime,
      detectedKind,
      byteSize: inspection.storedBytes.byteLength,
      checksumSha256: createHash("sha256").update(inspection.storedBytes).digest("hex"),
      objectKey,
      derivativeObjectKey,
      derivativeKind: inspection.derivative.kind,
      scanStatus: "CLEAN",
      storageState: "AVAILABLE",
    });
  } catch (error) {
    await Promise.resolve(store.delete(objectKey)).catch(() => undefined);
    await Promise.resolve(store.delete(derivativeObjectKey)).catch(() => undefined);
    throw error;
  }
}
