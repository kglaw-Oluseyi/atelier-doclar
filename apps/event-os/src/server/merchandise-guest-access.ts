import "server-only";
import { cookies } from "next/headers";
import { MERCHANDISE_GUEST_SESSION_COOKIE } from "@maison-doclar/shared-platform";
import { cookieSecure, rsvpSessionTtlSeconds } from "./config";

function merchGuestSessionCookie(token: string) {
  return {
    name: MERCHANDISE_GUEST_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/offers",
    maxAge: rsvpSessionTtlSeconds(),
  };
}

export async function setMerchandiseGuestSessionCookie(token: string): Promise<void> {
  (await cookies()).set(merchGuestSessionCookie(token));
}

export async function clearMerchandiseGuestSessionCookie(): Promise<void> {
  (await cookies()).set({
    name: MERCHANDISE_GUEST_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/offers",
    maxAge: 0,
  });
}

export async function readMerchandiseGuestSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(MERCHANDISE_GUEST_SESSION_COOKIE)?.value;
}
