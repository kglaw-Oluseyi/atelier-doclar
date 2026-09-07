import "server-only";
import { cookies } from "next/headers";
import { VENDOR_SESSION_COOKIE } from "@maison-doclar/shared-platform";
import { cookieSecure } from "./config";

const TTL = 2 * 60 * 60;

function vendorSessionCookie(token: string) {
  return {
    name: VENDOR_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/vendor",
    maxAge: TTL,
  };
}

export async function setVendorSessionCookie(token: string): Promise<void> {
  (await cookies()).set(vendorSessionCookie(token));
}

export async function clearVendorSessionCookie(): Promise<void> {
  (await cookies()).set({
    name: VENDOR_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/vendor",
    maxAge: 0,
  });
}

export async function readVendorSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(VENDOR_SESSION_COOKIE)?.value;
}
