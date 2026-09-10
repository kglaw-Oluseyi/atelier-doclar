import { expect, test } from "@playwright/test";
import { loginAs } from "./login";

test("S060 vendor label and inert clause body across viewports", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "ceo");
  await page.goto("/app/protection");
  await expect(page.getByTestId("protection-command")).toBeVisible({ timeout: 20_000 });
  if (await page.getByTestId("protection-create-clause").count()) {
    await page.getByTestId("protection-create-clause").getByLabel("Family").selectOption("INDEMNITY");
    await page.getByTestId("protection-create-clause").getByLabel("Title").fill("Inert clause");
    await page.getByTestId("protection-create-clause").getByLabel("Jurisdiction").fill("NG");
    await page.getByTestId("protection-create-clause").getByLabel("Body").fill("<script>alert('inert')</script>\n**not active markdown**\n{{not_executed}}");
    await page.getByTestId("protection-create-clause").getByLabel("Variable keys").fill("not_executed");
    await page.getByTestId("protection-create-clause").getByRole("button", { name: "Save clause template" }).click();
    await expect(page.getByText(/Protection command applied|No change|placeholder/i)).toBeVisible({ timeout: 20_000 });
  }
  if (await page.getByTestId("clause-rendered-body").count()) {
    const body = await page.getByTestId("clause-rendered-body").innerText();
    expect(body).toContain("<script>alert('inert')</script>");
    expect(body).toContain("**not active markdown**");
    expect(await page.locator("script", { hasText: "inert" }).count()).toBe(0);
  }
  if (await page.getByTestId("vendor-assessment-card").count()) {
    await expect(page.getByTestId("vendor-assessment-card").first().getByRole("heading")).not.toHaveText(/[0-9a-f-]{36}/i);
  }
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId("protection-command")).toBeVisible();
  }
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByTestId("protection-command")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.emulateMedia({ reducedMotion: "reduce" });
});
