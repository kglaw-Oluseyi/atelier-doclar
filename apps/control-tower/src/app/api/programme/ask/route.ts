import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SessionError,
  answerQuestion,
  loadCurrentSnapshot,
  readSession,
} from "@maison-doclar/programme-tower";
import { sessionConfig } from "../../../../server/config";

export async function POST(request: Request): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    const body = (await request.json()) as { question?: unknown; unavailable?: unknown };
    const question = typeof body.question === "string" ? body.question : "";
    const snapshot = loadCurrentSnapshot();
    const result = answerQuestion({
      question,
      role: actor.role,
      snapshot,
      unavailable: body.unavailable === true,
    });
    return NextResponse.json(result, { status: result.state === "denied" ? 401 : 200 });
  } catch (error) {
    if (error instanceof SessionError) {
      return NextResponse.json({ state: "denied", abstained: true, citations: [] }, { status: 401 });
    }
    return NextResponse.json({ state: "error", abstained: true, citations: [] }, { status: 500 });
  }
}
