import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const STAFF_IDENTITIES = {
  ceo: { email: "ceo@maison-doclar.test", displayName: "George Lawson", roleLabel: "CEO" },
  director: { email: "director@maison-doclar.test", displayName: "Event Director", roleLabel: "Event Director" },
  planner: { email: "planner@maison-doclar.test", displayName: "Assigned Planner", roleLabel: "Planner" },
  auditor: { email: "auditor@maison-doclar.test", displayName: "Read Only Auditor", roleLabel: "Read-only Auditor" },
  admin: { email: "admin@maison-doclar.test", displayName: "System Administrator", roleLabel: "System Administrator" },
} as const;

export type StaffIdentityKey = keyof typeof STAFF_IDENTITIES;

export function staffNavIdentity(page: Page) {
  return page.getByRole("navigation", { name: "Staff" }).locator(".staff-identity");
}

export async function login(page: Page, email = STAFF_IDENTITIES.ceo.email): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Staff email").fill(email);
  await page.getByLabel("Access token").fill(process.env.EVENT_OS_ACCESS_TOKEN ?? "event-os-access-token-not-for-production");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app(?:\/|$)/, { timeout: 20_000 });
  await page
    .getByRole("heading", { name: "Home" })
    .or(page.getByRole("heading", { name: /not available|cannot|assignment/i }))
    .waitFor({ timeout: 20_000 });
}

export async function loginAs(page: Page, identity: StaffIdentityKey): Promise<void> {
  const staff = STAFF_IDENTITIES[identity];
  await login(page, staff.email);
  const identity = staffNavIdentity(page).locator(".staff-identity-name");
  if (await identity.count()) {
    await expect(identity).toHaveText(staff.displayName);
  }
}

export async function openStaffContext(
  browser: Browser,
  identity: StaffIdentityKey,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, identity);
  return { context, page };
}

export async function readStaffSessionCookie(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((item) => item.name === "md_event_os_session");
  if (!cookie?.value) {
    throw new Error("staff session cookie was not issued");
  }
  return cookie.value;
}
