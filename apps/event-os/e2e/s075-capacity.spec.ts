import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./login";

const EVENT = "/app/events/00000000-0000-4000-8000-000000000021";
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

async function openNewLayoutStudio(page: Page) {
  await loginAs(page, "planner");
  await page.goto(`${EVENT}/layouts/new`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-create-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("layout-create-form").locator('input[name="name"]').fill("S075 capacity studio");
  await page.getByRole("button", { name: "Save layout" }).click();
  await page.waitForURL(/\/layouts\/[0-9a-f-]{36}/i, { timeout: 30_000 });
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  if (await page.getByRole("button", { name: "Acquire lease" }).count()) {
    await page.getByRole("button", { name: "Acquire lease" }).click();
  }
  if (await page.getByRole("button", { name: "Show object library" }).count()) {
    await page.getByRole("button", { name: "Show object library" }).click();
  }
  await page.getByRole("button", { name: "Add Table" }).click();
  await expect.poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
    timeout: 30_000,
  }).toMatch(/saved/);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Table · table/i, { timeout: 20_000 });
  await page.getByRole("button", { name: /Table · table/i }).click();
  return page.getByLabel("Physical seat count");
}

test("S075 studio derives seat count from persisted layout truth and lists usable seats", async ({ page }) => {
  test.setTimeout(90_000);
  const seatCount = await openNewLayoutStudio(page);
  await expect(seatCount).toBeVisible();
  await expect(seatCount).toHaveValue("8");
  await expect(page.getByTestId("studio-usable-seats")).toContainText(/declared synthesised seat/i);

  await seatCount.fill("4");
  await page.getByRole("button", { name: "Generate seats" }).click();
  await expect.poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
    timeout: 30_000,
  }).toMatch(/saved/);
  await expect(page.getByTestId("studio-navigator")).toContainText(/Seat/i, { timeout: 20_000 });
  await page.getByRole("button", { name: /Table · table/i }).click();
  await expect(page.getByTestId("studio-usable-seats")).toContainText(/physical seat/i);
  await expect(page.getByTestId("studio-usable-seats")).not.toContainText(/declared synthesised seat/i);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("layout-studio")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Table · table/i }).click();
  await expect(page.getByLabel("Physical seat count")).toHaveValue("4");

  await page.getByLabel("Physical seat count").fill("6");
  await page.getByRole("button", { name: "Generate seats" }).click();
  await expect(page.getByText(/confirm destructive/i)).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Confirm destructive seat regeneration").focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Confirm destructive seat regeneration")).toBeChecked();
  await page.getByRole("button", { name: "Generate seats" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await page.getByTestId("studio-persist").getAttribute("data-state")) ?? "", {
    timeout: 30_000,
  }).toMatch(/saved/);
  await page.getByRole("button", { name: /Table · table/i }).click();
  await expect(page.getByLabel("Physical seat count")).toHaveValue("6");

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId("layout-studio")).toBeVisible();
    await expect(page.getByLabel("Physical seat count")).toBeVisible();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflowX, `overflow at ${viewport.width}`).toBeLessThanOrEqual(8);
  }
});
