import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SessionError,
  deniedPortfolio,
  isViewFixture,
  loadCorpusPortfolio,
  readSession,
} from "@maison-doclar/programme-tower";
import { fixturesAllowed, sessionConfig } from "../../../../server/config";

export async function GET(request: Request): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    const fixtureParam = new URL(request.url).searchParams.get("fixture") ?? undefined;
    const fixture = fixturesAllowed() && isViewFixture(fixtureParam) ? fixtureParam : undefined;
    const view = loadCorpusPortfolio({
      actor,
      ...(fixture ? { fixture, allowFixtures: true } : {}),
    });
    return NextResponse.json(view);
  } catch (error) {
    if (error instanceof SessionError) {
      return NextResponse.json(deniedPortfolio(), { status: 401 });
    }
    return NextResponse.json({ state: "error", message: "programme view failed" }, { status: 500 });
  }
}
