import { NextResponse, type NextRequest } from "next/server";
import { AuthenticateStaffInputSchema, NonProductionIdentityAdapter, SESSION_COOKIE } from "@maison-doclar/shared-platform";
import { fixturesAllowed } from "../../../server/config";
import { jsonError } from "../../../server/http";
import { getRuntime, withDurable } from "../../../server/runtime";
import { staffSessionClearCookie, staffSessionSetCookie } from "../../../server/staff-session-cookie";

export async function POST(request: Request): Promise<Response> {
  return withDurable(async () => {
  try {
    if (!fixturesAllowed()) {
      return NextResponse.json({ ok: false, code: "PRODUCTION_ADAPTER_FORBIDDEN" }, { status: 403 });
    }
    const parsed = AuthenticateStaffInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    }
    new NonProductionIdentityAdapter(true).resolve({
      externalSubject: parsed.data.email,
      email: parsed.data.email,
    });
    const issued = getRuntime().service.authenticateNamedStaff(parsed.data);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(staffSessionSetCookie(issued.token));
    return response;
  } catch (error) {
    return jsonError(error);
  }
  });
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return withDurable(async () => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    getRuntime().service.logoutStaffSession(token);
  } catch {
    const failed = NextResponse.json({ ok: false, code: "INTERNAL_ERROR" }, { status: 500 });
    failed.cookies.set(staffSessionClearCookie());
    return failed;
  }
  const response = NextResponse.json({ ok: true, status: "signed-out" });
  response.cookies.set(staffSessionClearCookie());
  return response;
  });
}
