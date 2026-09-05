import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SessionError,
  isTowerRole,
  issueSession,
} from "@maison-doclar/programme-tower";
import { sessionConfig, sessionTtlSeconds } from "../../../server/config";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { actorId?: unknown; role?: unknown; accessToken?: unknown };
  const actorId = typeof body.actorId === "string" ? body.actorId : "";
  const role = typeof body.role === "string" ? body.role : "";
  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  if (!isTowerRole(role)) {
    return NextResponse.json({ ok: false, code: "INVALID_ROLE" }, { status: 400 });
  }
  try {
    const token = issueSession({ actorId, role, accessToken }, sessionConfig());
    const response = NextResponse.json({ ok: true, role, actorId });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionTtlSeconds(),
    });
    return response;
  } catch (error) {
    if (error instanceof SessionError) {
      return NextResponse.json({ ok: false, code: error.code }, { status: 401 });
    }
    return NextResponse.json({ ok: false, code: "ERROR" }, { status: 500 });
  }
}

export async function DELETE(): Promise<Response> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
