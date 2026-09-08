import { NextResponse } from "next/server";
import { jsonError } from "../../../../../../../../server/http";
import { createLayoutBinaryStoreFromEnv } from "../../../../../../../../server/layout-s3-store";
import { getRuntime } from "../../../../../../../../server/runtime";
import { requireActor } from "../../../../../../../../server/with-session";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "Referrer-Policy": "no-referrer",
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string; layoutId: string; jobId: string }> },
): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId, layoutId, jobId } = await context.params;
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    const job = getRuntime().service.getStoredLayoutExport(actor, organisationId, eventId, layoutId, jobId);
    const store = createLayoutBinaryStoreFromEnv();
    const object = await store?.get(job.objectKey);
    if (!object) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "completed export was not found" }, { status: 404 });
    const filename = `layout-export-${job.marking.toLowerCase()}-${job.contentHash.slice(0, 12)}.${job.format.toLowerCase()}`;
    return new NextResponse(Buffer.from(object.bytes), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": job.format === "PDF" ? "application/pdf" : "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(object.bytes.byteLength),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
