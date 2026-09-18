import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("sign-in is reachable and has no serious accessibility violation", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Adaeze Okonkwo/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (item) => item.impact === "serious" || item.impact === "critical",
  );
  expect(serious).toEqual([]);
});

test("sign-in fits a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
});

test("ceo can open the client register", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /Adaeze Okonkwo/ }).click();
  await expect(
    page.getByRole("heading", { name: /Synthetic Maison Doclar Atelier/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clients" }).click();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
});
