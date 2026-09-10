import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S05B organisation policy and source authoring", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Protection" }).click();
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Policies" }).click();
  const policyForm = page.getByTestId("protection-create-policy");
  await policyForm.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
  await policyForm.getByLabel("Insurer party id").fill("00000000-0000-4000-8000-000000000202");
  await policyForm.getByLabel("Insurer label").fill("Playwright insurer");
  await policyForm.getByRole("button", { name: "Create policy" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Rules and Sources" }).click();
  const sourceForm = page.getByTestId("protection-create-source");
  await sourceForm.getByLabel("Source title").fill("NSITF compensation guidance");
  await sourceForm.getByLabel("Publisher").fill("NSITF");
  await sourceForm.getByLabel("Locator").fill("https://nsitf.gov.ng/compensation/");
  await sourceForm.getByLabel("Authority").selectOption("REGULATOR");
  await sourceForm.getByLabel("Jurisdiction").fill("NG");
  await sourceForm.getByLabel("Summary").fill("Synthetic discovery source for Playwright.");
  await sourceForm.getByRole("button", { name: "Record discovery source" }).click();
  await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
});

test("S05B System Administrator is denied Protection Command", async ({ page }) => {
  test.setTimeout(60_000);
  await loginAs(page, "admin");
  await page.goto("/app/protection");
  await expect(page.getByText(/cannot open Protection Command/i)).toBeVisible({ timeout: 20_000 });
});
