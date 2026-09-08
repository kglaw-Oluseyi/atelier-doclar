import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "./login";

async function noDocumentOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test("S05A Milestone A: planner authors discovery; auditor cannot mutate; CEO wayfinding", async ({ page }) => {
  test.setTimeout(180_000);

  await loginAs(page, "planner");
  await page.getByRole("navigation", { name: "Staff" }).getByRole("link", { name: "Discovery" }).click();
  await expect(page.getByRole("heading", { name: "Discovery" })).toBeVisible();
  await page.getByLabel("Enquiry name").fill("Playwright Adéwálé enquiry");
  await page.getByRole("button", { name: "Open enquiry and start discovery" }).click();
  await expect(page.getByTestId("discovery-workspace")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Playwright Adéwálé enquiry" })).toBeVisible();

  await page.locator("#discovery-consent").getByRole("button", { name: "Save participation" }).click();
  await expect(page.getByTestId("discovery-consent-list")).toContainText("GRANTED", { timeout: 20_000 });
  await page.locator("#discovery-consent").getByRole("button", { name: "Save AI analysis" }).click();

  await page.locator("#discovery-session").getByRole("button", { name: "Update session" }).click();
  await expect(page.getByTestId("discovery-session-list")).toBeVisible({ timeout: 20_000 });
  await page.locator("#discovery-session").getByRole("button", { name: "Update session" }).click();
  await expect(page.getByTestId("discovery-session-list")).toContainText("ACTIVE", { timeout: 20_000 });

  await page.getByLabel("What was said").fill("The family mentioned 320 guests for the celebration in Yorùbá.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("320 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("AI proposal", { timeout: 20_000 });
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("guest target count");

  await page.getByLabel("Note title").fill("Later note");
  await page.getByLabel("What was said").fill("A later conversation suggested 360 guests.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByTestId("discovery-evidence-list")).toContainText("360 guests", { timeout: 20_000 });
  await page.getByRole("button", { name: "Extract proposals" }).last().click();
  await expect(page.getByTestId("discovery-conflicts")).toContainText("conflict", { timeout: 20_000 });
  await expect(page.getByTestId("discovery-coverage-list")).toContainText("Conflicted");

  await page.getByRole("button", { name: "Review proposal" }).first().click();
  await expect(page.getByTestId("discovery-assertion-list")).toContainText("Staff-reviewed fact", { timeout: 20_000 });

  await loginAs(page, "auditor");
  await page.goto("/app/discovery");
  await expect(page.getByRole("heading", { name: "Discovery" })).toBeVisible();
  await expect(page.getByTestId("discovery-create-blocked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open enquiry and start discovery" })).toHaveCount(0);
  await page.getByRole("link", { name: "Playwright Adéwálé enquiry" }).click();
  await expect(page.getByTestId("discovery-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save note" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review proposal" })).toHaveCount(0);
  await expect(page.getByText("Reviewing a proposal is blocked for this assignment.").first()).toBeVisible();

  await loginAs(page, "ceo");
  await page.goto("/app/discovery");
  await expect(page.getByRole("heading", { name: "Discovery" })).toBeVisible();
  await page.getByRole("link", { name: "Playwright Adéwálé enquiry" }).click();
  await expect(page.getByTestId("discovery-next-action")).toBeVisible();
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("heading", { name: "Playwright Adéwálé enquiry" })).toBeVisible();
    await noDocumentOverflow(page);
  }
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
});
