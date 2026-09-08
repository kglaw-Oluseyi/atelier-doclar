import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

const ALPHA = "00000000-0000-4000-8000-000000000021";

async function openLayout(page: import("@playwright/test").Page) {
  await page.goto(`/app/events/${ALPHA}/venue`);
  await expect(page.getByTestId("event-venue-setup")).toBeVisible();
  if (await page.getByRole("button", { name: "Adopt venue" }).count()) {
    await page.getByRole("button", { name: "Adopt venue" }).click();
    await expect(page.getByTestId("event-venue-setup")).not.toHaveText(/No venue adopted/i);
  }
  if (await page.getByRole("link", { name: "Create blank layout" }).count()) {
    await page.getByRole("link", { name: "Create blank layout" }).first().click();
    await page.getByRole("button", { name: "Save layout" }).click();
  } else {
    await page.getByRole("link", { name: "Layout list" }).click();
    await page.locator(".atelier-folio a").first().click();
  }
  await expect(page.getByTestId("layout-studio")).toBeVisible();
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
}

test("S05 Milestone 3 assurance: validation, snapshot, maker/checker, publication", async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await openLayout(page);
  await page.getByRole("button", { name: "Add Table" }).click();
  await expect(page.getByTestId("studio-navigator")).toContainText(/table/i);
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/EOS-S05-VALIDATION|Engine/i);
  await page.getByLabel("Operational quantity").fill("8");
  await page.getByLabel("Source label").fill("Planner count");
  await page.getByLabel("Rationale").fill("Match table design");
  await page.getByRole("button", { name: "Record operational capacity" }).click();
  await expect(page.getByTestId("capacity-report")).toContainText(/Operational capacity/i);
  await page.getByLabel("Snapshot name").fill("Milestone 3 baseline");
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await expect(page.getByTestId("layout-snapshots")).toContainText("Milestone 3 baseline", { timeout: 20_000 });
  await page.getByRole("button", { name: "Run validation" }).click();
  await expect(page.getByTestId("validation-centre")).toContainText(/Engine EOS-S05-VALIDATION/i);
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible({ timeout: 20_000 });
  const layoutUrl = page.url().split("?")[0] ?? page.url();
  await loginAs(page, "director");
  await page.goto(layoutUrl);
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
  await expect(page.getByTestId("layout-approval-SUBMITTED")).toBeVisible();
  await page.getByRole("button", { name: "Record decision" }).click();
  await expect(page.getByTestId("layout-approval-APPROVED")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish approved hash" }).click();
  await expect(page.getByTestId("publication-status")).toContainText(/CURRENT/i, { timeout: 20_000 });
  await page.getByRole("button", { name: "Request export" }).click();
  await expect(page.getByTestId("layout-publication")).toContainText(/DISABLED|COMPLETED|PENDING|FAILED|PUBLISHED/i);
  await expect(page.getByTestId("studio-mobile-limit")).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});

test("S05 Milestone 3 keyboard, 360px, 200% zoom", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "director");
  await openLayout(page);
  await page.getByRole("button", { name: "Run validation" }).focus();
  await expect(page.getByRole("button", { name: "Run validation" })).toBeFocused();
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(page.url());
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeFalsy();
  }
  await page.setViewportSize({ width: 720, height: 450 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("layout-assurance")).toBeVisible();
});
