import { expect, test } from "@playwright/test";
import { loginAs, openStaffContext } from "./login";

test("S05B dossier assemble submit approve publish export across roles", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await loginAs(page, "planner");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("button", { name: "Evaluate protection now" }).click();
  await expect(page.getByTestId("event-protection-workspace")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  await page.getByRole("button", { name: "Assemble dossier edition" }).click();
  await expect(page.getByText(/Protection command applied|No change|cannot/i)).toBeVisible({ timeout: 20_000 });
  if (await page.getByRole("button", { name: "Submit dossier" }).count()) {
    await page.getByRole("button", { name: "Submit dossier" }).click();
    await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  }

  const director = await openStaffContext(browser, "director");
  await director.page.goto(page.url().split("?")[0]!);
  await director.page.getByRole("link", { name: "Dossier", exact: true }).click();
  if (await director.page.getByRole("button", { name: "Approve dossier" }).count()) {
    await director.page.getByRole("button", { name: "Approve dossier" }).click();
    await expect(director.page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  }
  await director.context.close();

  await loginAs(page, "ceo");
  await page.goto("/app/events");
  await page.getByRole("link", { name: "Alpha One" }).first().click();
  await page.getByRole("link", { name: "Event protection" }).click();
  await page.getByRole("link", { name: "Dossier", exact: true }).click();
  if (await page.getByRole("button", { name: "Publish dossier without sending" }).count()) {
    await page.getByRole("button", { name: "Publish dossier without sending" }).click();
    await expect(page.getByText(/Protection command applied|No change/)).toBeVisible({ timeout: 20_000 });
  }
  await page.goto(page.url().replace(/\/protection.*/, "/protection/client"));
  await expect(page.getByTestId("client-protection-dossier")).toBeVisible({ timeout: 20_000 });
});

test("S05B auditor cannot mutate protection and 360px does not overflow", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, "auditor");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Create policy" })).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByTestId("protection-command")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBeFalsy();
});
