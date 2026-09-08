import { NextResponse } from "next/server";
import { LAYOUT_ASSET_MAX_BYTES } from "@maison-doclar/shared-platform";
import { jsonError } from "../../../../../../../server/http";
import { ingestLayoutFloorPlan } from "../../../../../../../server/layout-asset-ingest";
import { getRuntime, withDurable } from "../../../../../../../server/runtime";
import { requireActor } from "../../../../../../../server/with-session";

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string; layoutId: string }> },
): Promise<Response> {
  return withDurable(async () => {
    try {
      const contentLength = Number(request.headers.get("content-length") ?? "0");
      if (contentLength > LAYOUT_ASSET_MAX_BYTES + 1_000_000) {
        return NextResponse.json(
          { ok: false, code: "VALIDATION_FAILED", message: "This file is outside the allowed size limits. Nothing was stored." },
          { status: 413 },
        );
      }
      const { actor } = await requireActor();
      const { eventId, layoutId } = await context.params;
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "A floor-plan file is required." }, { status: 400 });
      }
      const organisationId =
        String(form.get("organisationId") ?? "") || getRuntime().service.listOrganisations(actor)[0]?.id;
      if (!organisationId) {
        return NextResponse.json({ ok: false, code: "VALIDATION_FAILED", message: "No organisation assignment is available." }, { status: 400 });
      }
      const asset = await ingestLayoutFloorPlan({
        actor,
        organisationId,
        eventId,
        layoutId,
        expectedVersion: Number(form.get("expectedVersion") || 1),
        expectedRevisionNumber: Number(form.get("expectedRevisionNumber") || 1),
        reason: String(form.get("reason") || "Upload floor-plan asset"),
        idempotencyKey: String(form.get("idempotencyKey") || "") || undefined,
        supersedesAssetId: String(form.get("supersedesAssetId") || "") || undefined,
        file,
      });
      return NextResponse.json({
        ok: true,
        asset: {
          id: asset.id,
          storageState: asset.storageState,
          scanStatus: asset.scanStatus,
          uploadAvailable: asset.uploadAvailable,
          calibrated: asset.calibrated,
          notes: asset.notes,
        },
      });
    } catch (error) {
      return jsonError(error);
    }
  });
}
