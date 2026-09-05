import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./login";

test("authorised operator can intake, search and amend a guest", async ({ page }) => {
  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021");
  await expect(page.getByRole("heading", { name: "Alpha One" })).toBeVisible();
  await page.getByRole("link", { name: "Guest directory" }).click();
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  await expect(page.getByText("Event: Alpha One")).toBeVisible();
  await expect(page.getByText("No guest records in this event yet")).toBeVisible();
  await page.getByRole("link", { name: "New guest intake" }).click();
  await page.getByLabel("Given name").fill("Kemi");
  await page.getByLabel("Family name").fill("Balogun");
  await page.getByLabel("Email").fill("kemi.balogun@example.test");
  await page.getByRole("button", { name: "Create guest record" }).click();
  await expect(page.getByRole("heading", { name: "Kemi Balogun" })).toBeVisible();
  await page.getByRole("link", { name: "Back to directory" }).click();
  await expect(page.getByRole("link", { name: "Kemi Balogun" })).toBeVisible();
  await page.getByLabel("Search").fill("Balogun");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("link", { name: "Kemi Balogun" })).toBeVisible();
  await page.getByRole("link", { name: "Kemi Balogun" }).click();
  await page.getByLabel("Preferred name").fill("Kemi B");
  await page.locator("form").filter({ hasText: "Save amendment" }).getByRole("textbox", { name: "Reason" }).fill("Operator confirmed preferred name");
  await page.getByRole("button", { name: "Save amendment" }).click();
  await expect(page.getByRole("heading", { name: "Kemi B" })).toBeVisible();
});

test("auditor cannot intake and planner cannot open another event directory", async ({ page }) => {
  await login(page, "auditor@maison-doclar.test");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests");
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New guest intake" })).toHaveCount(0);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/new");
  await expect(page.getByText("Your assignment does not include guest intake")).toBeVisible();

  await login(page, "planner@maison-doclar.test");
  await page.goto("/app/events/00000000-0000-4000-8000-000000000022/guests");
  await expect(page.getByText("Alpha Two")).toHaveCount(0);
  await expect(page.getByText("not available in this assignment")).toBeVisible();
});

test("guest directory is accessible on desktop and mobile", async ({ page }) => {
  await login(page);
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests");
  await expect(page.getByRole("heading", { name: "Guest directory" })).toBeVisible();
  const desktop = await new AxeBuilder({ page }).analyze();
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/events/00000000-0000-4000-8000-000000000021/guests/new");
  await expect(page.getByRole("heading", { name: "Manual guest intake" })).toBeVisible();
  const mobile = await new AxeBuilder({ page }).analyze();
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);
});
