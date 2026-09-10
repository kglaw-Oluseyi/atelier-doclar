import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext, selectOptionContaining } from "./login";

test("S05B CEO no-blind-spots headlines link to composing records", async ({ page }) => {
  test.setTimeout(90_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: /high-consequence unknowns/i }).click();
  await expect(page.locator("#protection-portfolio")).toBeVisible();
});

test("S05B two-tab concurrency keeps the later stale write from silently winning", async ({ browser }) => {
  test.setTimeout(180_000);
  const first = await openStaffContext(browser, "ceo");
  const second = await openStaffContext(browser, "ceo");
  await first.page.goto("/app/protection");
  await second.page.goto("/app/protection");
  await expect(first.page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await expect(second.page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  const formA = first.page.getByTestId("protection-create-policy");
  const formB = second.page.getByTestId("protection-create-policy");
  await formA.getByLabel("Policy type").selectOption("PUBLIC_LIABILITY");
  await selectOptionContaining(formA.getByLabel("Insurer"), "Synthetic Insurer");
  await formB.getByLabel("Policy type").selectOption("EVENT_CANCELLATION");
  await selectOptionContaining(formB.getByLabel("Insurer"), "Secondary Synthetic Cover");
  await formA.getByRole("button", { name: "Create policy" }).click();
  await expect(first.page.getByText(/Protection command applied|No change|changed while you were editing/i)).toBeVisible({ timeout: 20_000 });
  await formB.getByRole("button", { name: "Create policy" }).click();
  await expect(second.page.getByText(/Protection command applied|No change|changed while you were editing/i)).toBeVisible({ timeout: 20_000 });
  await first.page.reload();
  await expect(first.page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await expect(first.page.locator('select[name="policyId"] option', { hasText: "PUBLIC_LIABILITY" })).toHaveCount(1);
  await expect(first.page.locator('select[name="policyId"] option', { hasText: "EVENT_CANCELLATION" })).toHaveCount(1);
  await first.context.close();
  await second.context.close();
});
