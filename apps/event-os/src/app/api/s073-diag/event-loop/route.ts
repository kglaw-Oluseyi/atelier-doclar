import { diagnosticGate, diagnosticHeaderToken, diagnosticUnavailableResponse, sampleEventLoop } from "../../../../server/event-os-diagnostic";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const gate = diagnosticGate(diagnosticHeaderToken(request));
  if (gate !== "OK") return diagnosticUnavailableResponse();
  return Response.json(sampleEventLoop());
}
