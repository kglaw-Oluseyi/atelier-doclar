import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "md_programme_session";

const PUBLIC = new Set([
  "/programme/login",
  "/api/session",
  "/api/session/logout",
  "/api/programme/github/webhook",
]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/programme") && !pathname.startsWith("/api/programme")) {
    return NextResponse.next();
  }
  if (PUBLIC.has(pathname) || pathname.startsWith("/programme/login")) {
    return NextResponse.next();
  }
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ state: "denied" }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/programme/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/programme/:path*", "/api/programme/:path*", "/api/session"],
};
