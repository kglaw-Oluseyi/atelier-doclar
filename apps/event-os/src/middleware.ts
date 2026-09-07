import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "md_event_os_session";
const PUBLIC = new Set(["/sign-in", "/api/session", "/api/health/live", "/api/health/ready"]);

function withPrivateCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (PUBLIC.has(pathname) || pathname.startsWith("/api/health/") || pathname.startsWith("/rsvp") || pathname.startsWith("/vendor")) {
    return withPrivateCache(NextResponse.next());
  }
  if (pathname === "/") {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    const url = request.nextUrl.clone();
    url.pathname = cookie ? "/app" : "/sign-in";
    return withPrivateCache(NextResponse.redirect(url));
  }
  if (pathname.startsWith("/app") || pathname.startsWith("/access-") || pathname.startsWith("/api/")) {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie) {
      if (pathname.startsWith("/api/")) {
        return withPrivateCache(NextResponse.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 }));
      }
      const login = request.nextUrl.clone();
      login.pathname = "/sign-in";
      login.searchParams.set("next", pathname);
      login.searchParams.set("status", "session-required");
      return withPrivateCache(NextResponse.redirect(login));
    }
    return withPrivateCache(NextResponse.next());
  }
  return withPrivateCache(NextResponse.next());
}

export const config = {
  matcher: ["/", "/app/:path*", "/access-:path*", "/api/:path*", "/sign-in", "/rsvp", "/rsvp/:path*", "/vendor", "/vendor/:path*"],
};
