import "server-only";
import { cookies } from "next/headers";
import { RSVP_SESSION_COOKIE } from "@maison-doclar/shared-platform";
import { cookieSecure, rsvpSessionTtlSeconds } from "./config";

function guestSessionCookie(token: string) {
  return {
    name: RSVP_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge: rsvpSessionTtlSeconds(),
  };
}

export async function setGuestSessionCookie(token: string): Promise<void> {
  (await cookies()).set(guestSessionCookie(token));
}

export async function clearGuestSessionCookie(): Promise<void> {
  (await cookies()).set({
    name: RSVP_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function readGuestSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(RSVP_SESSION_COOKIE)?.value;
}
