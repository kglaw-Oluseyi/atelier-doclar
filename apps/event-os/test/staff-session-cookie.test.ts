import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_COOKIE } from "@maison-doclar/shared-platform";
import {
  canonicalStaffCookiePolicy,
  staffSessionClearCookieOptions,
  staffSessionSetCookieOptions,
} from "../src/server/staff-session-cookie-policy";

describe("canonical staff cookie policy", () => {
  it("uses one attribute set for form and API issuance", () => {
    const form = staffSessionSetCookieOptions("issued", 28800, false);
    const api = staffSessionSetCookieOptions("issued", 28800, false);
    assert.deepEqual(form, api);
    assert.equal(form.name, SESSION_COOKIE);
    assert.equal(form.httpOnly, true);
    assert.equal(form.sameSite, "lax");
    assert.equal(form.path, "/");
    assert.equal(form.secure, false);
    assert.equal(form.maxAge, 28800);
  });

  it("deletes an HTTPS-issued Secure cookie with the matching Secure policy", () => {
    const issued = staffSessionSetCookieOptions("issued", 28800, true);
    const cleared = staffSessionClearCookieOptions(true);
    assert.deepEqual(canonicalStaffCookiePolicy(true), {
      name: SESSION_COOKIE,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    assert.equal(issued.secure, true);
    assert.equal(cleared.secure, true);
    assert.equal(cleared.maxAge, 0);
    assert.equal(cleared.value, "");
    assert.equal(issued.httpOnly, cleared.httpOnly);
    assert.equal(issued.sameSite, cleared.sameSite);
    assert.equal(issued.path, cleared.path);
    assert.equal(issued.name, cleared.name);
  });

  it("keeps HttpOnly, SameSite and Secure aligned for insecure issuance", () => {
    const issued = staffSessionSetCookieOptions("issued", 1, false);
    const cleared = staffSessionClearCookieOptions(false);
    assert.equal(issued.httpOnly, true);
    assert.equal(issued.sameSite, "lax");
    assert.equal(issued.secure, false);
    assert.equal(cleared.secure, false);
  });
});
