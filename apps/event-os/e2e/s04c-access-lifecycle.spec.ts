import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const MERCH = `/app/events/${ALPHA}/merchandise`;
const EXPIRY = "2026-12-31T23:59";

test("guest and vendor access issue, renew, revoke and forged denial", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await login(page);
  await page.goto(MERCH);

  const guestIssue = page.getByTestId("merch-guest-access-issue");
  await guestIssue.getByLabel("Guest with an issued offer").selectOption({ index: 0 });
  await guestIssue.locator('input[name="expiresAt"]').fill(EXPIRY);
  await guestIssue.getByRole("button", { name: "Issue guest access" }).click();
  await expect(page.getByTestId("merch-open-guest-view")).toBeVisible();
  const guestHref = await page.getByTestId("merch-open-guest-view").getAttribute("href");
  expect(guestHref).toBeTruthy();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(guestHref!);
  await expect(guestPage.getByRole("heading", { name: "Your attire and merchandise" })).toBeVisible();
  const guestAxe = await new AxeBuilder({ page: guestPage }).analyze();
  expect(guestAxe.violations, JSON.stringify(guestAxe.violations, null, 2)).toEqual([]);
  await guestContext.close();

  await login(page);
  await page.goto(MERCH);
  const guestCard = page.locator("article").filter({ has: page.getByTestId("merch-guest-renew") }).first();
  await guestCard.locator('input[name="expiresAt"]').fill("2027-01-15T23:59");
  await guestCard.getByRole("button", { name: "Renew" }).click();
  await expect(page.getByText("Private merchandise guest access was issued or already active.").or(page.getByText("The change was recorded."))).toBeVisible();

  const issueVendor = page.getByTestId("merch-vendor-issue");
  await issueVendor.getByLabel("Vendor identifier").fill("playwright-lifecycle-vendor");
  await issueVendor.getByLabel("Display name").fill("Playwright lifecycle vendor");
  await issueVendor.locator('input[name="expiresAt"]').fill(EXPIRY);
  await issueVendor.getByRole("button", { name: "Issue vendor access" }).click();
  await expect(page.getByTestId("vendor-access-link")).toBeVisible();
  const vendorHref = await page.getByTestId("vendor-access-link").getAttribute("href");
  expect(vendorHref).toBeTruthy();

  const vendorContext = await browser.newContext();
  const vendorPage = await vendorContext.newPage();
  await vendorPage.goto(vendorHref!);
  await expect(vendorPage.getByText("Separate vendor portal")).toBeVisible();
  const vendorAxe = await new AxeBuilder({ page: vendorPage }).analyze();
  expect(vendorAxe.violations, JSON.stringify(vendorAxe.violations, null, 2)).toEqual([]);

  await login(page);
  await page.goto(MERCH);
  const vendorCard = page.locator("article").filter({ hasText: "Playwright lifecycle vendor" });
  await vendorCard.locator('input[name="expiresAt"]').fill("2027-01-15T23:59");
  await vendorCard.getByRole("button", { name: "Renew" }).click();
  await expect(page.getByTestId("vendor-access-link")).toBeVisible();
  await vendorPage.reload();
  await expect(vendorPage.getByText("expired, revoked or no longer available")).toBeVisible({ timeout: 20_000 });

  const renewedHref = await page.getByTestId("vendor-access-link").getAttribute("href");
  expect(renewedHref).toBeTruthy();
  await vendorPage.goto(renewedHref!);
  await expect(vendorPage.getByText("Separate vendor portal")).toBeVisible();

  await login(page);
  await page.goto(MERCH);
  await page.locator("article").filter({ hasText: "Playwright lifecycle vendor" }).getByTestId("merch-vendor-revoke").getByRole("button", { name: "Revoke" }).click();
  await vendorPage.reload();
  await expect(vendorPage.getByText("expired, revoked or no longer available")).toBeVisible({ timeout: 20_000 });
  await vendorContext.close();

  await page.goto("/vendor/forged-not-a-real-token");
  await expect(page.getByText("expired, revoked or no longer available")).toBeVisible();
});
