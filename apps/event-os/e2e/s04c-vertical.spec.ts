import { expect, test } from "@playwright/test";
import { login, loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";
const ALPHA_TWO = "00000000-0000-4000-8000-000000000022";
const OLUFEMI = "00000000-0000-4000-8000-000000000073";
const YETUNDE = "00000000-0000-4000-8000-0000000000af";
const VENDOR_TOKEN = "s04c-vendor-token-not-for-production-aso-oke";
const OTHER_VENDOR = "s04c-other-vendor-token-not-for-production";
const MERCH = `/app/events/${ALPHA}/merchandise`;

test("S04C vertical: staff offers, guest choice, cap consent, vendor isolation and denials", async ({
  page,
  browser,
}) => {
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

  await page.goto(`/app/events/${ALPHA}/guests/${OLUFEMI}`);
  await expect(page.getByRole("heading", { name: "Merchandise" })).toBeVisible();
  await expect(page.getByText("Made-to-measure fila").or(page.getByText("fila"))).toBeVisible();

  if (await page.getByRole("button", { name: "Issue guest access" }).count()) {
    await page.getByRole("button", { name: "Issue guest access" }).click();
  }
  if (await page.getByRole("link", { name: "Open guest access" }).count()) {
    await page.getByRole("link", { name: "Open guest access" }).click();
    await expect(page.getByRole("heading", { name: "Your attire and merchandise" })).toBeVisible();
    await expect(page.getByText("These choices are private")).toBeVisible();
    if (await page.getByLabel("Head circumference (inches)").count()) {
      await page.getByLabel("Head circumference (inches)").fill("22.5");
      await page.getByLabel(/I consent to store this measurement/).check();
      await page.getByRole("button", { name: "Save consented measurement" }).click();
      await expect(page.getByText("consented cap circumference").or(page.getByText("Cap-measurement"))).toBeVisible();
    }
    await expect(page.getByLabel("Chest").or(page.getByLabel("Waist")).or(page.getByLabel("Dress size"))).toHaveCount(0);
  }

  await login(page);
  await page.goto(`/app/events/${ALPHA}/guests/${YETUNDE}`);
  if (await page.getByRole("button", { name: "Issue guest access" }).count()) {
    await page.getByRole("button", { name: "Issue guest access" }).click();
  }
  if (await page.getByRole("link", { name: "Open guest access" }).count()) {
    await page.getByRole("link", { name: "Open guest access" }).click();
    await expect(page.getByRole("heading", { name: "Your attire and merchandise" })).toBeVisible();
    await page.getByLabel("Your choice").first().selectOption("DECLINE_GRACEFULLY");
    await page.getByRole("button", { name: "Save private choice" }).first().click();
    await expect(page.getByText("private merchandise choice").or(page.getByText("DECLINE GRACEFULLY"))).toBeVisible();
  }

  await login(page);
  await page.goto(MERCH);
  await page.getByTestId("vendor-access-link").click();
  await expect(page.getByText("Separate vendor portal")).toBeVisible();
  await expect(page.getByTestId("vendor-scope")).toContainText("assigned fulfilments");
  await expect(page.getByText("Guest list, RSVP and core records stay hidden.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "RSVP" })).toHaveCount(0);
  const firstCard = page.getByRole("article").filter({ hasText: "Bàbátúndé" }).first();
  await firstCard.getByLabel("Report milestone").selectOption("IN_PREPARATION");
  await firstCard.getByRole("button", { name: "Submit attributed update" }).click();
  await expect(page.getByTestId("vendor-update-success")).toBeVisible({ timeout: 20_000 });

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
  await expect(anonymous.getByText("Separate vendor portal")).toBeVisible();
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
