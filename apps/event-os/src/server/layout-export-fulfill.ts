import "server-only";
import { createHash } from "node:crypto";
import {
  layoutExportObjectKey,
  PlatformError,
  renderLayoutExport,
  type ActorContext,
  type LayoutExportJob,
} from "@maison-doclar/shared-platform";
import { resolveLayoutBinaryStore } from "./layout-s3-store";
import { getRuntime } from "./runtime";

export async function fulfillLayoutExport(actor: ActorContext, job: LayoutExportJob): Promise<LayoutExportJob> {
  if (job.status === "COMPLETED") return job;
  const store = resolveLayoutBinaryStore();
  const service = getRuntime().service;
  if (!store?.configured) {
    return service.failLayoutExport(actor, {
      organisationId: job.organisationId,
      eventId: job.eventId,
      layoutId: job.layoutId,
      jobId: job.id,
      notes: "Export failed closed because private object storage is not bound. No file was fabricated.",
      reason: "Export storage unavailable",
    });
  }
  try {
    const source = service.describeLayoutExportSource(actor, job.organisationId, job.eventId, job.layoutId, job.id);
    const generatedAt = new Date().toISOString();
    const rendered = renderLayoutExport({
      format: job.format,
      marking: job.marking === "PUBLISHED" ? "PUBLISHED" : job.marking,
      eventName: source.eventName,
      layoutName: source.layoutName,
      contentHash: job.contentHash,
      publicationNumber: job.publicationNumber,
      generatedAt,
      widthMm: source.widthMm,
      heightMm: source.heightMm,
      objects: source.objects,
    });
    const objectKey = layoutExportObjectKey({
      organisationId: job.organisationId,
      eventId: job.eventId,
      layoutId: job.layoutId,
      jobId: job.id,
      format: job.format,
    });
    await store.put({ key: objectKey, bytes: rendered.bytes, contentType: rendered.contentType });
    const stored = await store.get(objectKey);
    if (!stored || stored.bytes.byteLength !== rendered.bytes.byteLength) {
      throw new PlatformError("INTERNAL_ERROR", "export object was not durably stored", {
        publicMessage: "Export storage failed. No success was recorded.",
      });
    }
    return service.completeLayoutExport(actor, {
      organisationId: job.organisationId,
      eventId: job.eventId,
      layoutId: job.layoutId,
      jobId: job.id,
      objectKey,
      byteSize: rendered.bytes.byteLength,
      checksumSha256: createHash("sha256").update(rendered.bytes).digest("hex"),
      generatedAt,
      reason: "Record durable export object",
      idempotencyKey: `export-complete:${job.id}`,
    });
  } catch (error) {
    if (error instanceof PlatformError && error.code === "FORBIDDEN") return job;
    const message = error instanceof PlatformError ? error.publicMessage : "Export storage or rendering failed. No success was recorded.";
    return service.failLayoutExport(actor, {
      organisationId: job.organisationId,
      eventId: job.eventId,
      layoutId: job.layoutId,
      jobId: job.id,
      notes: message.slice(0, 400),
      reason: "Export failed closed",
    });
  }
}
