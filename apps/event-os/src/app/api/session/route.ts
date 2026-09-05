import { NextResponse } from "next/server";
import {
  NonProductionIdentityAdapter,
  SESSION_COOKIE,
  SignInInputSchema,
  issueSession,
} from "@maison-doclar/shared-platform";
import { cookieSecure, fixturesAllowed, sessionConfig, sessionTtlSeconds } from "../../../server/config";
import { jsonError } from "../../../server/http";
import { getRuntime } from "../../../server/runtime";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!fixturesAllowed()) {
      return NextResponse.json({ ok: false, code: "PRODUCTION_ADAPTER_FORBIDDEN" }, { status: 403 });
    }
    const parsed = SignInInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    }
    const identity = new NonProductionIdentityAdapter(true).resolve({
      externalSubject: parsed.data.externalSubject ?? parsed.data.email ?? "",
      email: parsed.data.email,
    });
    const runtime = getRuntime();
    const person = runtime.service.findPersonByIdentity({
      externalSubject: identity.externalSubject,
      email: parsed.data.email,
    });
    if (!person) {
      return NextResponse.json({ ok: false, code: "AUTH_REQUIRED", message: "Sign in is required." }, { status: 401 });
    }
    const token = issueSession({ personId: person.id, accessToken: parsed.data.accessToken }, sessionConfig());
    runtime.service.recordAuthentication(person.id, new Date().toISOString(), crypto.randomUUID(), "SUCCESS");
    const response = NextResponse.json({ ok: true, personId: person.id });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure(request.url),
      path: "/",
      maxAge: sessionTtlSeconds(),
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request.url),
    path: "/",
    maxAge: 0,
  });
  return response;
}
