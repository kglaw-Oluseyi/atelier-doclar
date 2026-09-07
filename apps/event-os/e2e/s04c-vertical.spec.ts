import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, loginAs } from "./login";

async function selectContaining(form: Locator, label: string, text: string): Promise<void> {
  const select = form.getByLabel(label);
  const value = await select.locator("option").filter({ hasText: text }).first().getAttribute("value");
  expect(value, `option containing ${text}`).toBeTruthy();
  await select.selectOption(value!);
}

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ALPHA_TWO = "00000000-0000-4000-8000-000000000022";
const OLUFEMI = "00000000-0000-4000-8000-000000000073";
const VENDOR_TOKEN = "s04c-vendor-token-not-for-production-aso-oke";
const OTHER_VENDOR = "s04c-other-vendor-token-not-for-production";
const MERCH = `/app/events/${ALPHA}/merchandise`;
const EXPIRY = "2026-12-31T23:59";

test("S04C vertical: staff offers, guest choice, cap consent, vendor isolation and denials", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  await page.goto(MERCH);
  await expect(page).toHaveURL(/sign-in/);

  await login(page);
  await page.goto(`/app/events/${ALPHA}`);
  await page.getByRole("link", { name: "Merchandise" }).click();
  await expect(page.getByRole("heading", { name: "Merchandise coordination" })).toBeVisible();
  await expect(page.getByTestId("merch-offer-count")).toHaveText(/^[1-9][0-9]*$/);
  await expect(page.getByRole("heading", { name: "Parents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Family" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bàbátúndé" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ọmọ́tọ́lá complementary gele" })).toBeVisible();
  await expect(page.getByText("not Maison Doclar payment truth").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Save collection" })).toBeVisible();

  const addCollection = page.locator("form").filter({ has: page.getByRole("heading", { name: "Add collection" }) });
  await addCollection.getByLabel("Name").fill("Studio collection");
  await addCollection.getByLabel("Window start").fill("2026-09-08T10:00");
  await addCollection.getByLabel("Window end").fill("2026-10-08T10:00");
  await addCollection.getByRole("button", { name: "Save collection" }).click();
  await expect(page.getByText("The merchandise collection was recorded.")).toBeVisible();
  await expect(page.getByTestId("merch-empty-collection-next")).toBeVisible();

  const addItem = page.getByTestId("merch-create-item");
  await selectContaining(addItem, "Collection", "Studio collection");
  await addItem.getByLabel("Name").fill("Studio gele");
  await addItem.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByText("The merchandise item was recorded.")).toBeVisible();

  const createOffer = page.getByTestId("merch-create-offer");
  await selectContaining(createOffer, "Collection", "Studio collection");
  await selectContaining(createOffer, "Item", "Studio gele");
  await selectContaining(createOffer, "Option", "Studio gele");
  await createOffer.getByLabel("Named guest").selectOption({ index: 1 });
  await createOffer.getByRole("button", { name: "Preview target set" }).click();
  await expect(page.getByTestId("merch-audience-preview")).toBeVisible();
  const createOfferAgain = page.getByTestId("merch-create-offer");
  await selectContaining(createOfferAgain, "Collection", "Studio collection");
  await selectContaining(createOfferAgain, "Item", "Studio gele");
  await selectContaining(createOfferAgain, "Option", "Studio gele");
  await createOfferAgain.getByLabel("Named guest").selectOption({ index: 1 });
  await createOfferAgain.getByRole("button", { name: "Create offer" }).click();
  await expect(page.getByText("The merchandise offer was recorded.")).toBeVisible();

  await page.goto(`/app/events/${ALPHA}/guests/${OLUFEMI}`);
  await expect(page.getByRole("heading", { name: "Merchandise" })).toBeVisible();
  await expect(page.getByText("Made-to-measure fila").or(page.getByText("fila"))).toBeVisible();

  await login(page);
  await page.goto(MERCH);
  const guestIssue = page.getByTestId("merch-guest-access-issue");
  await selectContaining(guestIssue, "Guest with an issued offer", "Olúfẹ́mi");
  await guestIssue.locator('input[name="expiresAt"]').fill(EXPIRY);
  await guestIssue.getByRole("button", { name: "Issue guest access" }).click();
  await expect(page.getByTestId("merch-open-guest-view")).toBeVisible();
  const guestHref = await page.getByTestId("merch-open-guest-view").getAttribute("href");
  expect(guestHref).toBeTruthy();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(guestHref!);
  await expect(guestPage.getByRole("heading", { name: "Your attire and merchandise" })).toBeVisible();
  await expect(guestPage.getByText("not an invitation")).toBeVisible();
  const guestAxe = await new AxeBuilder({ page: guestPage }).analyze();
  expect(guestAxe.violations, JSON.stringify(guestAxe.violations, null, 2)).toEqual([]);
  const capCard = guestPage.getByRole("article").filter({ hasText: "Made-to-measure fila" });
  if (await capCard.getByLabel("Head circumference (inches)").count()) {
    await capCard.getByLabel("Head circumference (inches)").fill("22.5");
    await capCard.getByLabel(/I consent to store this measurement/).check();
    await capCard.getByRole("button", { name: "Save consented measurement" }).click();
    await expect(guestPage.getByText("The consented cap circumference was stored")).toBeVisible();
  }
  await expect(guestPage.getByLabel("Chest").or(guestPage.getByLabel("Waist")).or(guestPage.getByLabel("Dress size"))).toHaveCount(0);
  const choiceCard = guestPage.getByRole("article").filter({ hasText: "Made-to-measure fila" });
  await choiceCard.getByLabel("Your choice").selectOption("FULL_PARTICIPATION");
  await choiceCard.getByRole("button", { name: "Save private choice" }).click();
  await expect(guestPage.getByText("Your private merchandise choice was recorded")).toBeVisible();
  await guestContext.close();

  await login(page);
  await page.goto(MERCH);
  const issueVendor = page.getByTestId("merch-vendor-issue");
  await issueVendor.locator('input[name="expiresAt"]').fill(EXPIRY);
  await issueVendor.getByRole("button", { name: "Issue vendor access" }).click();
  await expect(page.getByTestId("vendor-access-link")).toBeVisible();
  const vendorHref = await page.getByTestId("vendor-access-link").getAttribute("href");
  expect(vendorHref).toBeTruthy();

  const vendorContext = await browser.newContext();
  const vendorPage = await vendorContext.newPage();
  await vendorPage.goto(vendorHref!);
  await expect(vendorPage.getByText("Separate vendor portal")).toBeVisible();
  await expect(vendorPage.getByTestId("vendor-scope")).toContainText("assigned fulfilments");
  await expect(vendorPage.getByText("Guest list, RSVP and core records stay hidden.")).toBeVisible();
  await expect(vendorPage.getByRole("heading", { name: "RSVP" })).toHaveCount(0);
  const vendorAxe = await new AxeBuilder({ page: vendorPage }).analyze();
  expect(vendorAxe.violations, JSON.stringify(vendorAxe.violations, null, 2)).toEqual([]);
  const firstCard = vendorPage.getByRole("article").filter({ hasText: "Bàbátúndé" }).first();
  if (await firstCard.count()) {
    await firstCard.getByLabel("Report milestone").selectOption("IN_PREPARATION");
    await firstCard.getByRole("button", { name: "Submit attributed update" }).click();
    await expect(vendorPage.getByTestId("vendor-update-success")).toBeVisible({ timeout: 20_000 });
  }

  await login(page);
  await page.goto(MERCH);
  await page.locator("article").filter({ hasText: "Synthetic aso-oke house" }).getByTestId("merch-vendor-revoke").getByRole("button", { name: "Revoke" }).click();
  await vendorPage.reload();
  await expect(vendorPage.getByText("expired, revoked or no longer available")).toBeVisible({ timeout: 20_000 });
  await vendorContext.close();

  await page.goto(`/vendor/${OTHER_VENDOR}`);
  await expect(page.getByText("expired, revoked or no longer available").or(page.getByTestId("vendor-scope"))).toBeVisible();
  if (await page.getByTestId("vendor-scope").count()) {
    await expect(page.getByText("Adéwálé")).toHaveCount(0);
  }

  await page.goto("/vendor/forged-not-a-real-token");
  await expect(page.getByText("expired, revoked or no longer available")).toBeVisible();

  await loginAs(page, "planner");
  await page.goto(MERCH);
  await expect(page.getByTestId("planner-sponsor-denial")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept attributed report" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Issue vendor access" })).toHaveCount(0);

  await loginAs(page, "auditor");
  await page.goto(MERCH);
  await expect(page.getByRole("button", { name: "Save collection" })).toHaveCount(0);
  await expect(page.getByText("cannot create them").first()).toBeVisible();

  await page.goto(`/app/events/${ALPHA_TWO}/merchandise`);
  await expect(page.getByText("not available in this assignment").or(page.getByText("No merchandise collections"))).toBeVisible();

  await page.goto(`/app/events/00000000-0000-4000-8000-ffffffffffff/merchandise`);
  await expect(page.getByText("not available in this assignment")).toBeVisible();

  const context = await browser.newContext();
  const anonymous = await context.newPage();
  await anonymous.goto(MERCH);
  await expect(anonymous).toHaveURL(/sign-in/);
  await anonymous.goto(`/vendor/${VENDOR_TOKEN}`);
  await expect(anonymous.getByText("Separate vendor portal").or(anonymous.getByText("expired, revoked or no longer available"))).toBeVisible();
  await expect(anonymous).not.toHaveURL(/sign-in/);
  await context.close();
});

test("ACA-S04C assignment, assessment and no-authority-on-completion", async ({ page }) => {
  await login(page);
  await page.goto("/app/academy");
  await page.getByRole("link", { name: "Open ACA-S04C" }).click();
  await expect(page.getByRole("heading", { name: /aso-ebi|merchandise coordination/i })).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
  await page.getByRole("button", { name: /Assessment/ }).click();
  const fieldsets = page.locator("form.atelier-intake fieldset");
  const count = await fieldsets.count();
  expect(count).toBeGreaterThan(7);
  for (let index = 0; index < count; index += 1) {
    await fieldsets.nth(index).locator("input[type=radio]").first().check();
  }
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByText(/DISTINCTION|PASS|RETAKE/).first()).toBeVisible();
  await expect(page.getByRole("note")).toContainText(/does not grant Event OS permissions/i);
});
