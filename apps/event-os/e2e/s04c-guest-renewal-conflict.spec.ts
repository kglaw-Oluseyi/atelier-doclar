import { expect, test, type Page } from "@playwright/test";
import { login, loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const MERCH = `/app/events/${ALPHA}/merchandise`;
const EXPIRY_A = "2027-03-01T12:00";
const EXPIRY_B = "2027-06-15T18:30";
const EXPIRY_C = "2027-09-01T09:00";
const EXPIRY_IDENTICAL = "2027-11-11T11:11";

function activeGuestCard(page: Page) {
  return page.locator("[data-testid='merch-guest-grant']").filter({ has: page.getByTestId("merch-guest-renew") }).first();
}

function guestRenewForm(page: Page) {
  return activeGuestCard(page).getByTestId("merch-guest-renew");
}

async function clearAccessFlash(page: Page): Promise<void> {
  await page.context().clearCookies({ name: "md_event_os_issued_access" });
  await page.context().clearCookies({ name: "md_event_os_action_state" });
}

async function ensureGuestGrant(page: Page): Promise<void> {
  await page.goto(MERCH);
  if ((await page.getByTestId("merch-guest-renew").count()) > 0) return;
  const guestIssue = page.getByTestId("merch-guest-access-issue");
  await guestIssue.getByLabel("Guest with an issued offer").selectOption({ index: 0 });
  await guestIssue.locator('input[name="expiresAt"]').fill("2026-12-31T23:59");
  await guestIssue.getByRole("button", { name: "Issue guest access" }).click();
  await expect(page.getByTestId("merch-guest-renew")).toBeVisible();
  await clearAccessFlash(page);
  await page.goto(MERCH);
}

test("stale two-tab guest renewal surfaces a conflict, keeps the winner, and recovers on reload", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await login(page);
  await ensureGuestGrant(page);
  await clearAccessFlash(page);
  await page.goto(MERCH);

  const tabACard = activeGuestCard(page);
  await expect(tabACard).toBeVisible();
  const sharedVersion = await guestRenewForm(page).locator('input[name="expectedVersion"]').inputValue();
  expect(sharedVersion).toMatch(/^[1-9][0-9]*$/);

  const tabB = await context.newPage();
  await tabB.goto(MERCH);
  await expect(guestRenewForm(tabB).locator('input[name="expectedVersion"]')).toHaveValue(sharedVersion);

  await guestRenewForm(page).locator('input[name="expiresAt"]').fill(EXPIRY_A);
  await guestRenewForm(page).getByRole("button", { name: "Renew" }).click();
  await expect(page.locator(".atelier-state[data-kind='success']")).toBeVisible();
  await expect(page.getByText("Private merchandise guest access was renewed. Prior sessions lost authority.")).toBeVisible();
  const winnerExpiry = (await activeGuestCard(page).getByTestId("merch-guest-expiry").innerText()).trim();
  expect(winnerExpiry.length).toBeGreaterThan(8);
  await expect(page.getByTestId("merch-open-guest-view")).toBeVisible();

  await guestRenewForm(tabB).locator('input[name="expiresAt"]').fill(EXPIRY_B);
  await guestRenewForm(tabB).getByRole("button", { name: "Renew" }).click();
  const conflict = tabB.locator(".atelier-state[data-kind='conflict']");
  await expect(conflict).toHaveCount(1);
  await expect(conflict).toBeVisible();
  await expect(conflict).toHaveAttribute("role", "alert");
  await expect(tabB.locator("#operational-state")).toBeFocused();
  await expect(conflict).toContainText(/changed elsewhere/i);
  await expect(conflict).toContainText(/not saved/i);
  await expect(conflict).toContainText(/durable record was left unchanged/i);
  await expect(tabB.locator(".atelier-state[data-kind='success']")).toHaveCount(0);
  await expect(tabB.getByText("Private merchandise guest access was issued or already active.")).toHaveCount(0);
  await expect(tabB.getByText("Private merchandise guest access was renewed. Prior sessions lost authority.")).toHaveCount(0);
  await expect(tabB.getByTestId("merch-open-guest-view")).toHaveCount(0);
  await expect(tabB.getByTestId("merch-copy-guest-link")).toHaveCount(0);
  await expect(tabB.getByTestId("conflict-reload")).toHaveCount(1);
  await expect(tabB.getByTestId("merch-guest-renew").locator("button[type='submit']")).toBeDisabled();
  await expect(tabB.getByTestId("merch-guest-revoke").locator("button[type='submit']")).toBeDisabled();
  await expect(activeGuestCard(tabB).getByTestId("merch-guest-expiry")).toHaveText(winnerExpiry);
  await expect(activeGuestCard(tabB).getByTestId("merch-guest-expiry")).not.toContainText("2027-06-15");

  const auditPage = await context.newPage();
  await auditPage.goto("/app/admin/audit");
  const staleAudit = auditPage
    .locator("table.data-table tbody tr")
    .filter({ hasText: "merch.guestAccess.renewed" })
    .filter({ hasText: "FAILED" });
  await expect(staleAudit.first()).toBeVisible();
  await expect(
    auditPage
      .locator("table.data-table tbody tr")
      .filter({ hasText: "merch.guestAccess.renewed" })
      .filter({ hasText: "SUCCESS" })
      .first(),
  ).toBeVisible();
  await auditPage.close();

  await tabB.getByTestId("conflict-reload").click();
  await expect(tabB.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await expect(tabB.locator(".atelier-state[data-kind='success']")).toHaveCount(0);
  await expect(activeGuestCard(tabB).getByTestId("merch-guest-expiry")).toHaveText(winnerExpiry);
  await expect(tabB.getByTestId("merch-guest-renew").getByRole("button", { name: "Renew" })).toBeEnabled();

  await guestRenewForm(tabB).locator('input[name="expiresAt"]').fill(EXPIRY_C);
  await guestRenewForm(tabB).getByRole("button", { name: "Renew" }).click();
  await expect(tabB.locator(".atelier-state[data-kind='success']")).toBeVisible();
  await expect(tabB.getByTestId("merch-open-guest-view")).toBeVisible();
});

test("rapid identical guest renewal remains one logical mutation", async ({ page, context }) => {
  test.setTimeout(180_000);
  await login(page);
  await ensureGuestGrant(page);
  await clearAccessFlash(page);
  await page.goto(MERCH);

  const tabB = await context.newPage();
  await tabB.goto(MERCH);
  await guestRenewForm(page).locator('input[name="expiresAt"]').fill(EXPIRY_IDENTICAL);
  await guestRenewForm(tabB).locator('input[name="expiresAt"]').fill(EXPIRY_IDENTICAL);
  await Promise.all([
    guestRenewForm(page).getByRole("button", { name: "Renew" }).click(),
    guestRenewForm(tabB).getByRole("button", { name: "Renew" }).click(),
  ]);
  await expect(page.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await expect(tabB.locator(".atelier-state[data-kind='conflict']")).toHaveCount(0);
  await page.goto(MERCH);
  await expect(page.getByTestId("merch-guest-renew")).toHaveCount(1);
});

test("staff cookie without a vendor cookie cannot open /vendor", async ({ browser }) => {
  const isolated = await browser.newContext();
  const page = await isolated.newPage();
  try {
    await loginAs(page, "director");
    const cookies = await isolated.cookies();
    expect(cookies.some((item) => item.name === "md_event_os_session")).toBeTruthy();
    expect(cookies.some((item) => item.name === "md_event_os_vendor")).toBeFalsy();
    await page.goto("/vendor");
    await expect(page).toHaveURL(/\/vendor\/unavailable/);
    await expect(page.getByText("expired, revoked or no longer available")).toBeVisible();
    await expect(page.getByTestId("vendor-scope")).toHaveCount(0);
  } finally {
    await isolated.close();
  }
});
