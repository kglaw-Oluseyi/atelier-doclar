import { NextResponse } from "next/server";
import { evaluateRuntimeConfig } from "@maison-doclar/programme-tower";
import { handleProgrammeWebhook, webhookSecret } from "../../../../../server/webhook";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const config = evaluateRuntimeConfig();
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, kind: "rejected", code: "UNCONFIGURED", message: "webhook secret absent" },
      { status: 503 },
    );
  }
  if (config.mode === "production" && !config.webhookConfigured) {
    return NextResponse.json(
      { ok: false, kind: "rejected", code: "UNCONFIGURED", message: "production webhook is not configured" },
      { status: 503 },
    );
  }
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const result = await handleProgrammeWebhook({ headers, rawBody }, secret);
  const status =
    result.kind === "accepted" || result.kind === "duplicate" || result.kind === "ignored"
      ? 200
      : result.kind === "quarantined"
        ? 202
        : 400;
  return NextResponse.json(
    {
      ok: result.ok,
      kind: result.kind,
      code: result.code,
      message: result.message,
      eventsAppended: result.eventsAppended,
      duplicates: result.duplicates,
    },
    { status },
  );
}
