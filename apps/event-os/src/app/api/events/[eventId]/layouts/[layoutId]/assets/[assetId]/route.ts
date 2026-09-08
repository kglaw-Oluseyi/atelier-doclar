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
  context: { params: Promise<{ eventId: string; layoutId: string; assetId: string }> },
): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId, layoutId, assetId } = await context.params;
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    const wantDerivative = new URL(request.url).searchParams.get("derivative") === "1";
    const asset = getRuntime().service.getStoredLayoutAsset(actor, organisationId, eventId, layoutId, assetId);
    const key = wantDerivative ? asset.derivativeObjectKey : asset.objectKey;
    if (!key) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "stored floor-plan asset is not available" }, { status: 404 });
    const store = createLayoutBinaryStoreFromEnv();
    const object = await store?.get(key);
    if (!object) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "stored floor-plan asset is not available" }, { status: 404 });
    return new NextResponse(Buffer.from(object.bytes), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": object.contentType,
        "Content-Disposition": `attachment; filename="${asset.originalFileName.replace(/"/g, "")}"`,
        "Content-Length": String(object.bytes.byteLength),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
