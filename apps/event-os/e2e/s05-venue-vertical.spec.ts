import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";

test("S05 Milestone 1 vertical: registry, facts, adopt, blank layout and role isolation", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/app/venues");
  await expect(page).toHaveURL(/sign-in/);

  await loginAs(page, "director");
  await page.goto("/app/venues");
  await expect(page.getByTestId("venue-registry")).toBeVisible();
  await page.getByRole("link", { name: "Register venue" }).click();
  await expect(page.getByTestId("venue-create-form")).toBeVisible();
  await page.getByLabel("Display name").fill("Playwright Garden Court");
  await page.getByRole("button", { name: "Save venue" }).click();
  await expect(page.getByTestId("venue-detail")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playwright Garden Court" })).toBeVisible();
  await page.getByRole("textbox", { name: "Count" }).fill("120");
  await page.getByLabel("Source label").fill("Synthetic playwright note");
  await page.getByRole("button", { name: "Save fact" }).click();
  await expect(page.getByTestId("venue-detail")).toContainText("UNVERIFIED");
  await page.getByRole("button", { name: "Verify fact" }).click();
  await expect(page.getByTestId("venue-detail")).toContainText("VERIFIED");
  await expect(page.getByText(/Binary upload unavailable/i)).toBeVisible();

  await page.goto(`/app/events/${ALPHA}`);
  await page.getByRole("link", { name: "Venue and layout" }).click();
  await expect(page.getByTestId("event-venue-setup")).toBeVisible();
  const adoptSelect = page.locator('select[name="venueId"]');
  if (await adoptSelect.count()) {
    await adoptSelect.selectOption({ label: "Playwright Garden Court" });
    await page.getByRole("button", { name: "Adopt venue" }).click();
    await expect(page.getByTestId("event-venue-setup")).toContainText("Playwright Garden Court");
    await expect(page.getByTestId("event-venue-setup")).toContainText("Inherited");
  } else {
    await expect(page.getByTestId("event-venue-setup")).not.toHaveText(/No venue adopted/i);
  }
  await page.getByLabel("Event-only value").fill("Ceremony-only floral set");
  await page.getByRole("button", { name: "Save override" }).click();
  await expect(page.getByTestId("event-venue-setup")).toContainText("Event override");
  await page.getByRole("link", { name: "Create blank layout" }).first().click();
  await expect(page.getByTestId("layout-create-form")).toBeVisible();
  await page.getByRole("button", { name: "Save layout" }).click();
  await expect(page.getByTestId("layout-setup")).toBeVisible();
  await expect(page.getByTestId("layout-hash")).toHaveText(/^[a-f0-9]{64}$/);
  await page.getByLabel("Width (mm)").fill("26000");
  await page.getByRole("button", { name: "Save layout" }).click();
  await expect(page.getByTestId("layout-setup")).toContainText("26000");

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

  await loginAs(page, "auditor");
  await page.goto("/app/venues");
  await expect(page.getByTestId("venue-registry")).toBeVisible();
  await expect(page.getByRole("link", { name: "Register venue" })).toHaveCount(0);
  await page.goto(`/app/events/${ALPHA}/venue`);
  await expect(page.getByRole("button", { name: "Adopt venue" })).toHaveCount(0);
});
