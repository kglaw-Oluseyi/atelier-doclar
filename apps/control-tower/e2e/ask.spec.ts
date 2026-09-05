import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SYNTHETIC_ACCESS_TOKEN } from "@maison-doclar/programme-tower";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/programme/login");
  await page.getByLabel("Named actor").fill("named-reviewer");
  await page.getByLabel("Role").selectOption("reader");
  await page.getByLabel("Access token").fill(SYNTHETIC_ACCESS_TOKEN);
  await page.getByRole("button", { name: "Enter Control Tower" }).click();
  await expect(page.getByRole("heading", { name: "Executive portfolio" })).toBeVisible();
}

test("ask cites allow-listed sources and abstains without evidence", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { name: "Ask the programme" })).toBeVisible();
  await page.getByLabel("Programme question").fill("What is the Control Tower RAG boundary?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByRole("table", { name: /Citations/ })).toBeVisible();
  await expect(page.getByText(/does not calculate programme status/)).toBeVisible();
  await page.goto("/programme/ask?q=secret%20catering%20menu%20for%20the%202099%20gala", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("status").filter({ hasText: "ABSTAIN" }).first()).toBeVisible();
});

test("RAG outage does not break the roadmap", async ({ page }) => {
  await login(page);
  await page.goto("/programme/ask?rag=unavailable&q=roadmap", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("DEGRADED")).toBeVisible();
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Programme roadmap" })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("MD-CT7");
});

test("ask is accessible", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Control Tower" }).getByRole("link", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { name: "Ask the programme" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
