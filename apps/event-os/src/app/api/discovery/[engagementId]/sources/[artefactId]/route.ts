import { NextResponse } from "next/server";
import { jsonError } from "../../../../../../server/http";
import { createLayoutBinaryStoreFromEnv } from "../../../../../../server/layout-s3-store";
import { getRuntime } from "../../../../../../server/runtime";
import { requireActor } from "../../../../../../server/with-session";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "Referrer-Policy": "no-referrer",
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ engagementId: string; artefactId: string }> },
): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { engagementId, artefactId } = await context.params;
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    const artefact = getRuntime().service.getStoredDiscoverySource(actor, organisationId, engagementId, artefactId);
    const store = createLayoutBinaryStoreFromEnv();
    const object = await store?.get(artefact.objectKey);
    if (!object) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "private source object is not available" }, { status: 404 });
    const safeName = artefact.title.replace(/["\\/]/g, "").slice(0, 80) || "source-object";
    return new NextResponse(Buffer.from(object.bytes), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": object.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(object.bytes.byteLength),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
