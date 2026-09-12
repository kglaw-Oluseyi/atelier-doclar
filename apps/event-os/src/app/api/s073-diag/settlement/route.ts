import { listSettlementTraces } from "@maison-doclar/shared-platform";
import { diagnosticGate, diagnosticHeaderToken, diagnosticUnavailableResponse } from "../../../../server/event-os-diagnostic";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const gate = diagnosticGate(diagnosticHeaderToken(request));
  if (gate !== "OK") return diagnosticUnavailableResponse();
  const url = new URL(request.url);
  const commandId = url.searchParams.get("commandId") ?? undefined;
  const resultId = url.searchParams.get("resultId") ?? undefined;
  const requestId = url.searchParams.get("requestId") ?? undefined;
  if (!commandId && !resultId && !requestId) return diagnosticUnavailableResponse();
  return Response.json({ ok: true, traces: listSettlementTraces({ commandId, resultId, requestId }) });
}
