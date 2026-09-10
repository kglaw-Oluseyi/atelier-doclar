import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B organisation clause template authoring", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Clause Templates" }).click();
  const clause = page.getByTestId("protection-create-clause");
  await clause.getByLabel("Family").selectOption("RETENTION");
  await clause.getByLabel("Title").fill("Playwright retention template");
  await clause.getByLabel("Jurisdiction").fill("NG");
  await clause.getByLabel("Body").fill("Retention of {{PERCENT}} remains a contract condition.");
  await clause.getByLabel("Variable keys").fill("PERCENT");
  await clause.getByRole("button", { name: "Save clause template" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
});

test("S05B organisation vendor assessment is operator-entered", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await page.getByRole("link", { name: "Vendors" }).click();
  const assess = page.getByTestId("protection-assess-vendor");
  await assess.getByLabel("Vendor id").fill("00000000-0000-4000-8000-000000000201");
  await assess.getByRole("button", { name: "Run vendor assessment" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
});
