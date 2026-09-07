import "server-only";
import { cookies } from "next/headers";
import { ATELIER_SESSION_COOKIE } from "@maison-doclar/shared-platform";
import { cookieSecure } from "./config";

const TTL = 2 * 60 * 60;

function atelierSessionCookie(token: string) {
  return {
    name: ATELIER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/atelier",
    maxAge: TTL,
  };
}

export async function setAtelierSessionCookie(token: string): Promise<void> {
  (await cookies()).set(atelierSessionCookie(token));
}

export async function clearAtelierSessionCookie(): Promise<void> {
  (await cookies()).set({
    name: ATELIER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/atelier",
    maxAge: 0,
  });
}

export async function readAtelierSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(ATELIER_SESSION_COOKIE)?.value;
}

export function hostClockNow(): string {
  if (process.env.EVENT_OS_ALLOW_FIXTURES === "1") {
    const fixed = process.env.EVENT_OS_TEST_NOW?.trim();
    if (fixed) return fixed;
  }
  return new Date().toISOString();
}
