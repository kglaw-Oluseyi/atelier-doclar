import { expect, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";

export async function selectOptionContaining(select: Locator, text: string | RegExp): Promise<void> {
  const option = select.locator("option").filter({ hasText: text }).first();
  const value = await option.getAttribute("value");
  if (!value) throw new Error(`no select option matching ${String(text)}`);
  await select.selectOption(value);
}

export const STAFF_IDENTITIES = {
  ceo: { email: "ceo@maison-doclar.test", displayName: "George Lawson", roleLabel: "CEO" },
  director: { email: "director@maison-doclar.test", displayName: "Event Director", roleLabel: "Event Director" },
  planner: { email: "planner@maison-doclar.test", displayName: "Assigned Planner", roleLabel: "Planner" },
  auditor: { email: "auditor@maison-doclar.test", displayName: "Read Only Auditor", roleLabel: "Read-only Auditor" },
  admin: { email: "admin@maison-doclar.test", displayName: "System Administrator", roleLabel: "System Administrator" },
  reviewer: { email: "reviewer@maison-doclar.test", displayName: "Risk Governance Reviewer", roleLabel: "Risk Governance Reviewer" },
} as const;

export type StaffIdentityKey = keyof typeof STAFF_IDENTITIES;

export function staffNavIdentity(page: Page) {
  return page.getByRole("navigation", { name: "Staff" }).locator(".staff-identity");
}

export async function login(page: Page, email = STAFF_IDENTITIES.ceo.email): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Staff email").fill(email);
  const localToken = "event-os-access-token-not-for-production";
  const accessToken =
    process.env.PLAYWRIGHT_LIVE === "1" ? (process.env.EVENT_OS_ACCESS_TOKEN ?? localToken) : localToken;
  await page.getByLabel("Access token").fill(accessToken);
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
  const signedInName = staffNavIdentity(page).locator(".staff-identity-name");
  if (await signedInName.count()) {
    await expect(signedInName).toHaveText(staff.displayName);
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
