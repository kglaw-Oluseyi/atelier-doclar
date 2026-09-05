import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@maison-doclar/programme-tower";

function clearSession(response: NextResponse): NextResponse {
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

function publicOrigin(request: Request): string {
  const configured = process.env.PROGRAMME_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto.split(",")[0]?.trim() ?? "https"}://${host.split(",")[0]?.trim()}`;
  return new URL(request.url).origin;
}

export async function GET(request: Request): Promise<Response> {
  const login = new URL("/programme/login", `${publicOrigin(request)}/`);
  return clearSession(NextResponse.redirect(login));
}
