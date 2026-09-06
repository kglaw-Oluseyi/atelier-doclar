import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@maison-doclar/shared-platform";
import { cookieSecure, sessionTtlSeconds } from "./config";
import { staffSessionClearCookieOptions, staffSessionSetCookieOptions } from "./staff-session-cookie-policy";

export {
  canonicalStaffCookiePolicy,
  staffSessionClearCookieOptions,
  staffSessionSetCookieOptions,
} from "./staff-session-cookie-policy";

export function staffSessionSetCookie(value: string, maxAge = sessionTtlSeconds()) {
  return staffSessionSetCookieOptions(value, maxAge, cookieSecure());
}

export function staffSessionClearCookie() {
  return staffSessionClearCookieOptions(cookieSecure());
}

export async function writeStaffSessionCookie(value: string): Promise<void> {
  (await cookies()).set(staffSessionSetCookie(value));
}

export async function clearStaffSessionCookie(): Promise<void> {
  (await cookies()).set(staffSessionClearCookie());
}

export async function readStaffSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
