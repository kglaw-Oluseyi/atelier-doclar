import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const STAFF_IDENTITIES = {
  ceo: { email: "ceo@maison-doclar.test", displayName: "George Lawson" },
  director: { email: "director@maison-doclar.test", displayName: "Event Director" },
  planner: { email: "planner@maison-doclar.test", displayName: "Assigned Planner" },
  auditor: { email: "auditor@maison-doclar.test", displayName: "Read Only Auditor" },
} as const;

export type StaffIdentityKey = keyof typeof STAFF_IDENTITIES;

export async function login(page: Page, email = STAFF_IDENTITIES.ceo.email): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Staff email").fill(email);
  await page.getByLabel("Access token").fill(process.env.EVENT_OS_ACCESS_TOKEN ?? "event-os-access-token-not-for-production");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/app(?:\/|$)/, { timeout: 20_000 });
  await page.getByRole("heading", { name: "Home" }).waitFor({ timeout: 20_000 });
}

export async function loginAs(page: Page, identity: StaffIdentityKey): Promise<void> {
  const staff = STAFF_IDENTITIES[identity];
  await login(page, staff.email);
  await expect(page.getByRole("navigation", { name: "Staff" }).getByText(staff.displayName, { exact: true })).toBeVisible();
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
