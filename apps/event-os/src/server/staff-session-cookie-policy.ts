import { SESSION_COOKIE } from "@maison-doclar/shared-platform";

export type StaffCookiePolicy = {
  name: typeof SESSION_COOKIE;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
};

/** One policy for every staff-session cookie issuance and deletion. */
export function canonicalStaffCookiePolicy(secure: boolean): StaffCookiePolicy {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  };
}

export function staffSessionSetCookieOptions(value: string, maxAge: number, secure: boolean) {
  return { ...canonicalStaffCookiePolicy(secure), value, maxAge };
}

export function staffSessionClearCookieOptions(secure: boolean) {
  return { ...canonicalStaffCookiePolicy(secure), value: "", maxAge: 0 };
}
